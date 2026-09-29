-- Stage 11A: persistent staff attendance and privacy-request workflow.
begin;

create or replace function private.stage11_has_permission(target_clinic_id uuid, target_permission text)
returns boolean
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_member uuid;
  v_role text;
  v_override boolean;
begin
  select cm.id, cm.role into v_member, v_role
  from public.clinic_members cm
  where cm.clinic_id=target_clinic_id
    and cm.profile_id=(select auth.uid())
    and cm.active
  limit 1;
  if v_member is null then return false; end if;
  select up.allowed into v_override
  from public.user_permissions up
  where up.clinic_member_id=v_member and up.permission=target_permission
  limit 1;
  if found then return coalesce(v_override,false); end if;
  if v_role='ADMIN' then return true; end if;
  if v_role='RECEPTION' and target_permission in ('marketing.read','communications.read','communications.manage','attribution.manage') then return true; end if;
  return false;
end $$;
revoke all on function private.stage11_has_permission(uuid,text) from public,anon;
grant execute on function private.stage11_has_permission(uuid,text) to authenticated;

create table if not exists public.attendance_punches (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  staff_member_id uuid not null references public.staff_members(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  punch_type text not null check (punch_type in ('IN','OUT')),
  occurred_at timestamptz not null default now(),
  source text not null default 'APP' check (source in ('APP','ADMIN_CORRECTION','IMPORT')),
  created_by uuid references public.profiles(id) on delete set null,
  corrects_punch_id uuid references public.attendance_punches(id) on delete restrict,
  correction_reason text,
  created_at timestamptz not null default now(),
  check ((source='ADMIN_CORRECTION' and corrects_punch_id is not null and nullif(btrim(correction_reason),'') is not null) or source<>'ADMIN_CORRECTION')
);
create index if not exists attendance_punches_staff_time_idx on public.attendance_punches(clinic_id,staff_member_id,occurred_at desc,created_at desc);
create index if not exists attendance_punches_profile_time_idx on public.attendance_punches(profile_id,occurred_at desc);

create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  request_type text not null check (request_type in ('ACCESS','EXPORT','RECTIFICATION','RESTRICTION','ERASURE')),
  status text not null default 'PENDING' check (status in ('PENDING','IN_REVIEW','COMPLETED','REJECTED')),
  requested_at timestamptz not null default now(),
  due_at timestamptz not null default (now()+interval '1 month'),
  assigned_to uuid references public.profiles(id) on delete set null,
  request_note text,
  resolution_note text,
  resolution_document_id uuid references public.documents(id) on delete set null,
  closed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  version integer not null default 1 check (version>0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status in ('COMPLETED','REJECTED') and closed_at is not null) or (status in ('PENDING','IN_REVIEW') and closed_at is null))
);
create index if not exists privacy_requests_clinic_status_idx on public.privacy_requests(clinic_id,status,due_at);
create index if not exists privacy_requests_patient_idx on public.privacy_requests(patient_id,requested_at desc);

alter table public.attendance_punches enable row level security;
alter table public.privacy_requests enable row level security;
revoke all on public.attendance_punches,public.privacy_requests from anon;
revoke insert,update,delete on public.attendance_punches,public.privacy_requests from authenticated;
grant select on public.attendance_punches,public.privacy_requests to authenticated;

drop policy if exists attendance_punches_read on public.attendance_punches;
create policy attendance_punches_read on public.attendance_punches for select to authenticated
using (
  profile_id=(select auth.uid())
  or (select private.stage11_has_permission(clinic_id,'settings.manage'))
);

drop policy if exists privacy_requests_read on public.privacy_requests;
create policy privacy_requests_read on public.privacy_requests for select to authenticated
using (
  (select private.stage11_has_permission(clinic_id,'settings.manage'))
  or (select private.is_patient_owner(patient_id))
);

create or replace function public.clock_attendance(p_clinic_id uuid, p_occurred_at timestamptz default now())
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_staff public.staff_members%rowtype;
  v_last_type text;
  v_type text;
  v_punch public.attendance_punches%rowtype;
begin
  if not (select private.is_clinic_staff(p_clinic_id)) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select sm.* into v_staff from public.staff_members sm
  where sm.clinic_id=p_clinic_id and sm.profile_id=(select auth.uid()) and sm.active limit 1;
  if v_staff.id is null then raise exception 'STAFF_PROFILE_NOT_LINKED' using errcode='23514'; end if;
  perform pg_advisory_xact_lock(hashtextextended('attendance:'||v_staff.id::text,0));
  select ap.punch_type into v_last_type
  from public.attendance_punches ap
  where ap.clinic_id=p_clinic_id and ap.staff_member_id=v_staff.id
  order by ap.occurred_at desc,ap.created_at desc limit 1;
  v_type:=case when v_last_type='IN' then 'OUT' else 'IN' end;
  insert into public.attendance_punches(clinic_id,staff_member_id,profile_id,punch_type,occurred_at,source,created_by)
  values(p_clinic_id,v_staff.id,(select auth.uid()),v_type,coalesce(p_occurred_at,now()),'APP',(select auth.uid()))
  returning * into v_punch;
  return jsonb_build_object('punch',jsonb_build_object('id',v_punch.id,'staffId',v_punch.staff_member_id,'type',v_punch.punch_type,'occurredAt',v_punch.occurred_at,'source',v_punch.source),'nextAction',case when v_type='IN' then 'OUT' else 'IN' end,'date',(v_punch.occurred_at at time zone 'Europe/Madrid')::date::text);
end $$;

create or replace function public.correct_attendance_punch(p_punch_id uuid,p_occurred_at timestamptz,p_reason text)
returns public.attendance_punches
language plpgsql
security definer
set search_path=''
as $$
declare v_old public.attendance_punches%rowtype; v_new public.attendance_punches%rowtype;
begin
  select * into v_old from public.attendance_punches where id=p_punch_id;
  if v_old.id is null then raise exception 'PUNCH_NOT_FOUND' using errcode='P0002'; end if;
  if not (select private.stage11_has_permission(v_old.clinic_id,'settings.manage')) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if nullif(btrim(p_reason),'') is null then raise exception 'CORRECTION_REASON_REQUIRED' using errcode='22023'; end if;
  insert into public.attendance_punches(clinic_id,staff_member_id,profile_id,punch_type,occurred_at,source,created_by,corrects_punch_id,correction_reason)
  values(v_old.clinic_id,v_old.staff_member_id,v_old.profile_id,v_old.punch_type,p_occurred_at,'ADMIN_CORRECTION',(select auth.uid()),v_old.id,btrim(p_reason))
  returning * into v_new;
  return v_new;
end $$;

create or replace function public.create_privacy_request(p_clinic_id uuid,p_patient_id uuid,p_type text,p_note text default null)
returns public.privacy_requests
language plpgsql
security definer
set search_path=''
as $$
declare v_row public.privacy_requests%rowtype;
begin
  if not exists(select 1 from public.patients p where p.id=p_patient_id and p.clinic_id=p_clinic_id) then raise exception 'PATIENT_NOT_IN_CLINIC' using errcode='23514'; end if;
  if not ((select private.stage11_has_permission(p_clinic_id,'settings.manage')) or (select private.is_patient_owner(p_patient_id))) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  insert into public.privacy_requests(clinic_id,patient_id,request_type,request_note,created_by,requested_at,due_at)
  values(p_clinic_id,p_patient_id,p_type,p_note,(select auth.uid()),now(),now()+interval '1 month') returning * into v_row;
  return v_row;
end $$;

create or replace function public.transition_privacy_request(p_request_id uuid,p_status text,p_resolution_note text default null,p_assigned_to uuid default null,p_resolution_document_id uuid default null,p_expected_version integer default null)
returns public.privacy_requests
language plpgsql
security definer
set search_path=''
as $$
declare v_old public.privacy_requests%rowtype; v_row public.privacy_requests%rowtype;
begin
  select * into v_old from public.privacy_requests where id=p_request_id for update;
  if v_old.id is null then raise exception 'PRIVACY_REQUEST_NOT_FOUND' using errcode='P0002'; end if;
  if not (select private.stage11_has_permission(v_old.clinic_id,'settings.manage')) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_expected_version is not null and v_old.version<>p_expected_version then raise exception 'VERSION_CONFLICT' using errcode='40001'; end if;
  if p_assigned_to is not null and not (select private.profile_belongs_to_clinic(p_assigned_to,v_old.clinic_id)) then raise exception 'ASSIGNEE_NOT_IN_CLINIC' using errcode='23514'; end if;
  if p_resolution_document_id is not null and not exists(select 1 from public.documents d where d.id=p_resolution_document_id and d.clinic_id=v_old.clinic_id and d.patient_id=v_old.patient_id) then raise exception 'DOCUMENT_NOT_IN_REQUEST_SCOPE' using errcode='23514'; end if;
  update public.privacy_requests set status=p_status,resolution_note=coalesce(p_resolution_note,resolution_note),assigned_to=coalesce(p_assigned_to,assigned_to),resolution_document_id=coalesce(p_resolution_document_id,resolution_document_id),closed_at=case when p_status in ('COMPLETED','REJECTED') then now() else null end,version=version+1,updated_at=now() where id=p_request_id returning * into v_row;
  return v_row;
end $$;

revoke all on function public.clock_attendance(uuid,timestamptz) from public,anon;
revoke all on function public.correct_attendance_punch(uuid,timestamptz,text) from public,anon;
revoke all on function public.create_privacy_request(uuid,uuid,text,text) from public,anon;
revoke all on function public.transition_privacy_request(uuid,text,text,uuid,uuid,integer) from public,anon;
grant execute on function public.clock_attendance(uuid,timestamptz),public.correct_attendance_punch(uuid,timestamptz,text),public.create_privacy_request(uuid,uuid,text,text),public.transition_privacy_request(uuid,text,text,uuid,uuid,integer) to authenticated;

drop trigger if exists attendance_punches_audit_mutation on public.attendance_punches;
create trigger attendance_punches_audit_mutation after insert or update or delete on public.attendance_punches for each row execute function private.audit_sensitive_mutation();
drop trigger if exists privacy_requests_audit_mutation on public.privacy_requests;
create trigger privacy_requests_audit_mutation after insert or update or delete on public.privacy_requests for each row execute function private.audit_sensitive_mutation();
drop trigger if exists denty_realtime_broadcast on public.attendance_punches;
create trigger denty_realtime_broadcast after insert or update or delete on public.attendance_punches for each row execute function private.broadcast_denty_change();
drop trigger if exists denty_realtime_broadcast on public.privacy_requests;
create trigger denty_realtime_broadcast after insert or update or delete on public.privacy_requests for each row execute function private.broadcast_denty_change();

commit;
