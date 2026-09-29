-- Denty Stage 7: canonical agenda, reception, no-show, waitlist, absences and operational metrics.
-- Extends the Stage 2 transaction boundary instead of creating parallel appointment state.

begin;

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- 1. Canonical scheduling support tables.
-- ---------------------------------------------------------------------------
create table if not exists public.clinic_settings (
  clinic_id uuid primary key references public.clinics(id) on delete cascade,
  default_plan_visit_gap_days integer not null default 7 check (default_plan_visit_gap_days between 0 and 180),
  updated_at timestamptz not null default now()
);

create table if not exists public.staff_settings (
  staff_member_id uuid primary key references public.staff_members(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  default_plan_visit_gap_days integer check (default_plan_visit_gap_days between 0 and 180),
  updated_at timestamptz not null default now()
);
create index if not exists staff_settings_clinic_idx on public.staff_settings(clinic_id, staff_member_id);

create table if not exists public.staff_schedules (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  staff_member_id uuid not null references public.staff_members(id) on delete cascade,
  site_id uuid references public.sites(id) on delete restrict,
  weekday smallint not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  effective_from date,
  effective_until date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_schedules_time_ck check (ends_at > starts_at),
  constraint staff_schedules_effective_ck check (effective_until is null or effective_from is null or effective_until >= effective_from)
);
create index if not exists staff_schedules_lookup_idx on public.staff_schedules(clinic_id, staff_member_id, weekday, active);

create table if not exists public.staff_absences (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  staff_member_id uuid not null references public.staff_members(id) on delete restrict,
  site_id uuid references public.sites(id) on delete restrict,
  type text not null check (type in ('VACATION','SICK_LEAVE','PERMISSION','PERSONAL','OTHER')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'APPROVED' check (status in ('PENDING','APPROVED','CANCELLED')),
  reason text,
  approved_by uuid references public.profiles(id) on delete set null,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_absences_time_ck check (ends_at > starts_at)
);
create index if not exists staff_absences_lookup_idx on public.staff_absences(clinic_id, staff_member_id, starts_at, ends_at) where status = 'APPROVED';

do $$ begin
  alter table public.staff_absences
    add constraint staff_absences_no_overlap
    exclude using gist (
      staff_member_id with =,
      tstzrange(starts_at, ends_at, '[)') with &&
    ) where (status = 'APPROVED');
exception when duplicate_object then null; end $$;

create table if not exists public.patient_waitlist_requests (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete restrict,
  appointment_id uuid references public.appointments(id) on delete set null,
  preferred_staff_id uuid references public.staff_members(id) on delete set null,
  site_id uuid references public.sites(id) on delete set null,
  earliest_at timestamptz,
  latest_at timestamptz,
  duration_min integer not null default 30 check (duration_min between 5 and 480),
  reason text,
  priority integer not null default 0,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','FULFILLED','WITHDRAWN','EXPIRED')),
  fulfilled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patient_waitlist_range_ck check (latest_at is null or earliest_at is null or latest_at > earliest_at)
);
create index if not exists patient_waitlist_active_idx on public.patient_waitlist_requests(clinic_id, status, priority desc, created_at);
create unique index if not exists patient_waitlist_active_appointment_uq
  on public.patient_waitlist_requests(patient_id, appointment_id)
  where appointment_id is not null and status = 'ACTIVE';

create table if not exists public.appointment_requests (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete restrict,
  preferred_staff_id uuid references public.staff_members(id) on delete set null,
  site_id uuid references public.sites(id) on delete set null,
  preferred_start_at timestamptz,
  preferred_end_at timestamptz,
  note text,
  status text not null default 'PENDING' check (status in ('PENDING','SCHEDULED','CANCELLED')),
  scheduled_appointment_id uuid references public.appointments(id) on delete set null,
  requested_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists appointment_requests_queue_idx on public.appointment_requests(clinic_id, status, requested_at);

-- Every tenant-scoped foreign reference introduced by Stage 7 must resolve inside
-- the same clinic. Plain UUID foreign keys cannot express this invariant.
create or replace function private.enforce_stage7_tenant_refs()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'staff_settings' then
    if not exists (select 1 from public.staff_members sm where sm.id=new.staff_member_id and sm.clinic_id=new.clinic_id) then
      raise exception 'STAFF_CLINIC_MISMATCH' using errcode='23514';
    end if;
  elsif tg_table_name = 'staff_schedules' then
    if not exists (select 1 from public.staff_members sm where sm.id=new.staff_member_id and sm.clinic_id=new.clinic_id) then
      raise exception 'STAFF_CLINIC_MISMATCH' using errcode='23514';
    end if;
    if new.site_id is not null and not exists (select 1 from public.sites s where s.id=new.site_id and s.clinic_id=new.clinic_id) then
      raise exception 'SITE_CLINIC_MISMATCH' using errcode='23514';
    end if;
  elsif tg_table_name = 'patient_waitlist_requests' then
    if not exists (select 1 from public.patients p where p.id=new.patient_id and p.clinic_id=new.clinic_id) then
      raise exception 'PATIENT_CLINIC_MISMATCH' using errcode='23514';
    end if;
    if new.preferred_staff_id is not null and not exists (select 1 from public.staff_members sm where sm.id=new.preferred_staff_id and sm.clinic_id=new.clinic_id) then
      raise exception 'STAFF_CLINIC_MISMATCH' using errcode='23514';
    end if;
    if new.site_id is not null and not exists (select 1 from public.sites s where s.id=new.site_id and s.clinic_id=new.clinic_id) then
      raise exception 'SITE_CLINIC_MISMATCH' using errcode='23514';
    end if;
    if new.appointment_id is not null and not exists (
      select 1 from public.appointments a where a.id=new.appointment_id and a.clinic_id=new.clinic_id and a.patient_id=new.patient_id
    ) then
      raise exception 'APPOINTMENT_CLINIC_MISMATCH' using errcode='23514';
    end if;
  elsif tg_table_name = 'appointment_requests' then
    if not exists (select 1 from public.patients p where p.id=new.patient_id and p.clinic_id=new.clinic_id) then
      raise exception 'PATIENT_CLINIC_MISMATCH' using errcode='23514';
    end if;
    if new.preferred_staff_id is not null and not exists (select 1 from public.staff_members sm where sm.id=new.preferred_staff_id and sm.clinic_id=new.clinic_id) then
      raise exception 'STAFF_CLINIC_MISMATCH' using errcode='23514';
    end if;
    if new.site_id is not null and not exists (select 1 from public.sites s where s.id=new.site_id and s.clinic_id=new.clinic_id) then
      raise exception 'SITE_CLINIC_MISMATCH' using errcode='23514';
    end if;
    if new.scheduled_appointment_id is not null and not exists (
      select 1 from public.appointments a where a.id=new.scheduled_appointment_id and a.clinic_id=new.clinic_id and a.patient_id=new.patient_id
    ) then
      raise exception 'APPOINTMENT_CLINIC_MISMATCH' using errcode='23514';
    end if;
  end if;
  return new;
end; $$;
revoke all on function private.enforce_stage7_tenant_refs() from public,anon,authenticated;

drop trigger if exists staff_settings_tenant_refs on public.staff_settings;
create trigger staff_settings_tenant_refs before insert or update on public.staff_settings for each row execute function private.enforce_stage7_tenant_refs();
drop trigger if exists staff_schedules_tenant_refs on public.staff_schedules;
create trigger staff_schedules_tenant_refs before insert or update on public.staff_schedules for each row execute function private.enforce_stage7_tenant_refs();
drop trigger if exists patient_waitlist_requests_tenant_refs on public.patient_waitlist_requests;
create trigger patient_waitlist_requests_tenant_refs before insert or update on public.patient_waitlist_requests for each row execute function private.enforce_stage7_tenant_refs();
drop trigger if exists appointment_requests_tenant_refs on public.appointment_requests;
create trigger appointment_requests_tenant_refs before insert or update on public.appointment_requests for each row execute function private.enforce_stage7_tenant_refs();

alter table public.appointment_blocks add column if not exists staff_id uuid references public.staff_members(id) on delete cascade;
alter table public.appointment_blocks add column if not exists site_id uuid references public.sites(id) on delete cascade;
alter table public.appointment_blocks add column if not exists cabinet_id uuid references public.cabinets(id) on delete cascade;
alter table public.appointment_blocks add column if not exists kind text not null default 'BLOCK';
alter table public.appointment_blocks add column if not exists updated_at timestamptz not null default now();
alter table public.appointment_blocks add column if not exists version integer not null default 1;

-- A NO_SHOW appointment produces one recall, even if a client retries.
do $$ begin
  alter table public.patient_recalls
    add constraint patient_recalls_source_appointment_kind_unique unique (source_appointment_id, kind);
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 2. Database-level anti-double-booking. [start,end) permits back-to-back visits.
-- ---------------------------------------------------------------------------
do $$ begin
  alter table public.appointments
    add constraint appointments_staff_no_overlap
    exclude using gist (
      staff_id with =,
      tstzrange(starts_at, ends_at, '[)') with &&
    ) where (status in ('PLANNED','CONFIRMED','ARRIVED','WAITING','IN_CHAIR','RUNNING_LATE'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.appointments
    add constraint appointments_cabinet_no_overlap
    exclude using gist (
      cabinet_id with =,
      tstzrange(starts_at, ends_at, '[)') with &&
    ) where (cabinet_id is not null and status in ('PLANNED','CONFIRMED','ARRIVED','WAITING','IN_CHAIR','RUNNING_LATE'));
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 3. RLS, grants, updated_at and audit.
-- ---------------------------------------------------------------------------

alter table public.clinic_settings enable row level security;
alter table public.staff_settings enable row level security;
alter table public.staff_schedules enable row level security;
alter table public.staff_absences enable row level security;
alter table public.patient_waitlist_requests enable row level security;
alter table public.appointment_requests enable row level security;

grant select, insert, update, delete on table public.clinic_settings to authenticated;
grant select, insert, update, delete on table public.staff_settings to authenticated;
grant select, insert, update, delete on table public.staff_schedules to authenticated;
grant select, insert, update, delete on table public.staff_absences to authenticated;
grant select, insert, update, delete on table public.patient_waitlist_requests to authenticated;
grant select, insert, update, delete on table public.appointment_requests to authenticated;

create policy clinic_settings_staff_select on public.clinic_settings for select to authenticated
using ((select private.is_clinic_staff(clinic_id)));
create policy clinic_settings_admin_manage on public.clinic_settings for all to authenticated
using ((select private.is_clinic_admin(clinic_id))) with check ((select private.is_clinic_admin(clinic_id)));

create policy staff_settings_staff_select on public.staff_settings for select to authenticated
using ((select private.is_clinic_staff(clinic_id)));
create policy staff_settings_admin_manage on public.staff_settings for all to authenticated
using ((select private.is_clinic_admin(clinic_id))) with check ((select private.is_clinic_admin(clinic_id)));

create policy staff_schedules_staff_select on public.staff_schedules for select to authenticated
using ((select private.is_clinic_staff(clinic_id)));
create policy staff_schedules_admin_manage on public.staff_schedules for all to authenticated
using ((select private.is_clinic_admin(clinic_id))) with check ((select private.is_clinic_admin(clinic_id)));

create policy staff_absences_staff_select on public.staff_absences for select to authenticated
using ((select private.is_clinic_staff(clinic_id)));
create policy staff_absences_admin_manage on public.staff_absences for all to authenticated
using ((select private.is_clinic_admin(clinic_id))) with check ((select private.is_clinic_admin(clinic_id)));

create policy patient_waitlist_access on public.patient_waitlist_requests for select to authenticated
using ((select private.can_access_patient(clinic_id, patient_id)));
create policy patient_waitlist_staff_manage on public.patient_waitlist_requests for all to authenticated
using ((select private.is_clinic_staff(clinic_id))) with check ((select private.is_clinic_staff(clinic_id)));
create policy patient_waitlist_patient_insert on public.patient_waitlist_requests for insert to authenticated
with check (
  (select private.is_patient_owner(patient_id))
  and priority = 0
  and status = 'ACTIVE'
  and fulfilled_at is null
  and appointment_id is null
);

create policy appointment_requests_access on public.appointment_requests for select to authenticated
using ((select private.can_access_patient(clinic_id, patient_id)));
create policy appointment_requests_staff_manage on public.appointment_requests for all to authenticated
using ((select private.is_clinic_staff(clinic_id))) with check ((select private.is_clinic_staff(clinic_id)));
create policy appointment_requests_patient_insert on public.appointment_requests for insert to authenticated
with check ((select private.is_patient_owner(patient_id)));
create policy appointment_requests_patient_update on public.appointment_requests for update to authenticated
using ((select private.is_patient_owner(patient_id))) with check ((select private.is_patient_owner(patient_id)));

-- Realtime private topic authorization for clinic:<uuid>.
create or replace function private.can_receive_clinic_topic(p_topic text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare v_id uuid;
begin
  if p_topic !~ '^clinic:[0-9a-fA-F-]{36}$' then return false; end if;
  begin v_id := split_part(p_topic, ':', 2)::uuid; exception when others then return false; end;
  return private.can_access_clinic(v_id);
end; $$;
revoke all on function private.can_receive_clinic_topic(text) from public, anon;
grant execute on function private.can_receive_clinic_topic(text) to authenticated;

do $$ begin
  create policy denty_clinic_broadcast_read on realtime.messages
  for select to authenticated using (private.can_receive_clinic_topic(topic));
exception when duplicate_object then null; end $$;

-- Stage 2 helpers remain the single audit/update mechanism.
drop trigger if exists clinic_settings_set_updated_at on public.clinic_settings;
create trigger clinic_settings_set_updated_at before update on public.clinic_settings for each row execute function private.set_updated_at();
drop trigger if exists staff_settings_set_updated_at on public.staff_settings;
create trigger staff_settings_set_updated_at before update on public.staff_settings for each row execute function private.set_updated_at();
drop trigger if exists staff_schedules_set_updated_at on public.staff_schedules;
create trigger staff_schedules_set_updated_at before update on public.staff_schedules for each row execute function private.set_updated_at();
drop trigger if exists staff_absences_set_updated_at on public.staff_absences;
create trigger staff_absences_set_updated_at before update on public.staff_absences for each row execute function private.set_updated_at();
drop trigger if exists patient_waitlist_requests_set_updated_at on public.patient_waitlist_requests;
create trigger patient_waitlist_requests_set_updated_at before update on public.patient_waitlist_requests for each row execute function private.set_updated_at();
drop trigger if exists appointment_requests_set_updated_at on public.appointment_requests;
create trigger appointment_requests_set_updated_at before update on public.appointment_requests for each row execute function private.set_updated_at();
drop trigger if exists appointment_blocks_set_updated_at on public.appointment_blocks;
create trigger appointment_blocks_set_updated_at before update on public.appointment_blocks for each row execute function private.set_updated_at();

drop trigger if exists clinic_settings_audit_mutation on public.clinic_settings;
create trigger clinic_settings_audit_mutation after insert or update or delete on public.clinic_settings for each row execute function private.audit_sensitive_mutation();
drop trigger if exists staff_settings_audit_mutation on public.staff_settings;
create trigger staff_settings_audit_mutation after insert or update or delete on public.staff_settings for each row execute function private.audit_sensitive_mutation();
drop trigger if exists staff_schedules_audit_mutation on public.staff_schedules;
create trigger staff_schedules_audit_mutation after insert or update or delete on public.staff_schedules for each row execute function private.audit_sensitive_mutation();
drop trigger if exists staff_absences_audit_mutation on public.staff_absences;
create trigger staff_absences_audit_mutation after insert or update or delete on public.staff_absences for each row execute function private.audit_sensitive_mutation();
drop trigger if exists patient_waitlist_requests_audit_mutation on public.patient_waitlist_requests;
create trigger patient_waitlist_requests_audit_mutation after insert or update or delete on public.patient_waitlist_requests for each row execute function private.audit_sensitive_mutation();
drop trigger if exists appointment_requests_audit_mutation on public.appointment_requests;
create trigger appointment_requests_audit_mutation after insert or update or delete on public.appointment_requests for each row execute function private.audit_sensitive_mutation();

-- ---------------------------------------------------------------------------
-- 4. Resource locks and availability checks shared by booking and absence RPCs.
-- ---------------------------------------------------------------------------
create or replace function private.stage7_resource_lock(p_kind text, p_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if p_id is not null then
    perform pg_advisory_xact_lock(hashtextextended(p_kind || ':' || p_id::text, 0));
  end if;
end; $$;
revoke all on function private.stage7_resource_lock(text, uuid) from public, anon;
grant execute on function private.stage7_resource_lock(text, uuid) to authenticated;

create or replace function private.assert_staff_not_absent(
  p_clinic_id uuid, p_staff_id uuid, p_site_id uuid, p_starts_at timestamptz, p_ends_at timestamptz
) returns void language plpgsql security invoker set search_path = '' as $$
begin
  if exists (
    select 1 from public.staff_absences sa
    where sa.clinic_id = p_clinic_id and sa.staff_member_id = p_staff_id and sa.status = 'APPROVED'
      and (sa.site_id is null or p_site_id is null or sa.site_id = p_site_id)
      and tstzrange(sa.starts_at, sa.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
  ) then
    raise exception 'STAFF_ABSENT' using errcode = 'P0001';
  end if;
end; $$;
revoke all on function private.assert_staff_not_absent(uuid, uuid, uuid, timestamptz, timestamptz) from public, anon;
grant execute on function private.assert_staff_not_absent(uuid, uuid, uuid, timestamptz, timestamptz) to authenticated;

create or replace function private.assert_not_blocked(
  p_clinic_id uuid, p_staff_id uuid, p_site_id uuid, p_cabinet_id uuid, p_starts_at timestamptz, p_ends_at timestamptz
) returns void language plpgsql security invoker set search_path = '' as $$
begin
  if exists (
    select 1 from public.appointment_blocks b
    where b.clinic_id = p_clinic_id
      and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
      and (b.site_id is null or b.site_id = p_site_id)
      and (b.staff_id is null or b.staff_id = p_staff_id)
      and (b.cabinet_id is null or b.cabinet_id = p_cabinet_id)
  ) then
    raise exception 'AGENDA_BLOCK_CONFLICT' using errcode = 'P0001';
  end if;
end; $$;
revoke all on function private.assert_not_blocked(uuid, uuid, uuid, uuid, timestamptz, timestamptz) from public, anon;
grant execute on function private.assert_not_blocked(uuid, uuid, uuid, uuid, timestamptz, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Transaction-safe appointment create/update.
-- ---------------------------------------------------------------------------
create or replace function public.book_appointment(
  p_clinic_id uuid,
  p_patient_id uuid,
  p_staff_id uuid,
  p_site_id uuid,
  p_cabinet_id uuid,
  p_clinical_plan_item_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_title text,
  p_reason text default null,
  p_rescheduled_from_id uuid default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_row public.appointments%rowtype;
begin
  if not private.is_clinic_staff(p_clinic_id) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if p_ends_at <= p_starts_at then raise exception 'INVALID_APPOINTMENT_RANGE' using errcode = '22023'; end if;
  if not exists (select 1 from public.patients p where p.id=p_patient_id and p.clinic_id=p_clinic_id and p.archived_at is null) then raise exception 'PATIENT_NOT_FOUND' using errcode='P0002'; end if;
  if not exists (select 1 from public.staff_members s where s.id=p_staff_id and s.clinic_id=p_clinic_id and s.active) then raise exception 'STAFF_NOT_FOUND' using errcode='P0002'; end if;
  if not exists (select 1 from public.sites s where s.id=p_site_id and s.clinic_id=p_clinic_id) then raise exception 'SITE_NOT_FOUND' using errcode='P0002'; end if;
  if p_cabinet_id is not null and not exists (select 1 from public.cabinets c where c.id=p_cabinet_id and c.clinic_id=p_clinic_id and c.site_id=p_site_id) then raise exception 'CABINET_NOT_FOUND' using errcode='P0002'; end if;
  if p_clinical_plan_item_id is not null and not exists (
    select 1 from public.clinical_plan_items cpi
    join public.clinical_plans cp on cp.id=cpi.plan_id
    where cpi.id=p_clinical_plan_item_id and cpi.clinic_id=p_clinic_id and cp.clinic_id=p_clinic_id and cp.patient_id=p_patient_id
  ) then raise exception 'CLINICAL_PLAN_ITEM_NOT_FOUND' using errcode='P0002'; end if;
  if p_rescheduled_from_id is not null and not exists (
    select 1 from public.appointments source
    where source.id=p_rescheduled_from_id and source.clinic_id=p_clinic_id
      and source.patient_id=p_patient_id and source.status='NO_SHOW'
  ) then raise exception 'INVALID_RESCHEDULE_SOURCE' using errcode='22023'; end if;

  perform private.stage7_resource_lock('clinic', p_clinic_id);
  perform private.stage7_resource_lock('site', p_site_id);
  perform private.stage7_resource_lock('staff', p_staff_id);
  perform private.stage7_resource_lock('cabinet', p_cabinet_id);
  perform private.assert_staff_not_absent(p_clinic_id, p_staff_id, p_site_id, p_starts_at, p_ends_at);
  perform private.assert_not_blocked(p_clinic_id, p_staff_id, p_site_id, p_cabinet_id, p_starts_at, p_ends_at);
  perform set_config('denty.correlation_id', gen_random_uuid()::text, true);

  insert into public.appointments(clinic_id,patient_id,staff_id,site_id,cabinet_id,clinical_plan_item_id,starts_at,ends_at,status,title,reason,rescheduled_from_id)
  values (p_clinic_id,p_patient_id,p_staff_id,p_site_id,p_cabinet_id,p_clinical_plan_item_id,p_starts_at,p_ends_at,'PLANNED',btrim(p_title),nullif(btrim(coalesce(p_reason,'')),''),p_rescheduled_from_id)
  returning * into v_row;

  if p_rescheduled_from_id is not null then
    insert into public.appointment_relationships(clinic_id,original_appointment_id,replacement_appointment_id,reason)
    values(p_clinic_id,p_rescheduled_from_id,v_row.id,'NO_SHOW')
    on conflict (original_appointment_id,replacement_appointment_id) do nothing;
    update public.patient_recalls
      set status='booked'
      where source_appointment_id=p_rescheduled_from_id and kind='NO_SHOW' and status in ('pending','contacted');
  end if;

  return to_jsonb(v_row);
exception when exclusion_violation then
  raise exception 'APPOINTMENT_CONFLICT' using errcode='23P01';
end; $$;

create or replace function public.update_appointment(
  p_appointment_id uuid,
  p_expected_version integer,
  p_patient_id uuid default null,
  p_staff_id uuid default null,
  p_site_id uuid default null,
  p_cabinet_id uuid default null,
  p_clinical_plan_item_id uuid default null,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_title text default null,
  p_reason text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_old public.appointments%rowtype;
  v_patient uuid; v_staff uuid; v_site uuid; v_cabinet uuid; v_plan_item uuid; v_start timestamptz; v_end timestamptz;
begin
  select * into v_old from public.appointments where id=p_appointment_id for update;
  if v_old.id is null then raise exception 'APPOINTMENT_NOT_FOUND' using errcode='P0002'; end if;
  if not private.is_clinic_staff(v_old.clinic_id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if v_old.version <> p_expected_version then return jsonb_build_object('conflict',true,'currentVersion',v_old.version); end if;
  if v_old.status in ('COMPLETED','NO_SHOW','CANCELLED') then raise exception 'TERMINAL_APPOINTMENT' using errcode='22023'; end if;

  v_patient := coalesce(p_patient_id,v_old.patient_id);
  v_staff := coalesce(p_staff_id,v_old.staff_id);
  v_site := coalesce(p_site_id,v_old.site_id);
  v_cabinet := case when p_cabinet_id is not null then p_cabinet_id else v_old.cabinet_id end;
  v_plan_item := coalesce(p_clinical_plan_item_id,v_old.clinical_plan_item_id);
  v_start := coalesce(p_starts_at,v_old.starts_at);
  v_end := coalesce(p_ends_at,v_old.ends_at);
  if v_end <= v_start then raise exception 'INVALID_APPOINTMENT_RANGE' using errcode='22023'; end if;
  if not exists (select 1 from public.patients p where p.id=v_patient and p.clinic_id=v_old.clinic_id and p.archived_at is null) then raise exception 'PATIENT_NOT_FOUND' using errcode='P0002'; end if;
  if not exists (select 1 from public.staff_members sm where sm.id=v_staff and sm.clinic_id=v_old.clinic_id and sm.active) then raise exception 'STAFF_NOT_FOUND' using errcode='P0002'; end if;
  if not exists (select 1 from public.sites s where s.id=v_site and s.clinic_id=v_old.clinic_id) then raise exception 'SITE_NOT_FOUND' using errcode='P0002'; end if;
  if v_cabinet is not null and not exists (select 1 from public.cabinets c where c.id=v_cabinet and c.clinic_id=v_old.clinic_id and c.site_id=v_site) then raise exception 'CABINET_NOT_FOUND' using errcode='P0002'; end if;
  if v_plan_item is not null and not exists (
    select 1 from public.clinical_plan_items cpi
    join public.clinical_plans cp on cp.id=cpi.plan_id
    where cpi.id=v_plan_item and cpi.clinic_id=v_old.clinic_id and cp.clinic_id=v_old.clinic_id and cp.patient_id=v_patient
  ) then raise exception 'CLINICAL_PLAN_ITEM_NOT_FOUND' using errcode='P0002'; end if;

  perform private.stage7_resource_lock('clinic', v_old.clinic_id);
  perform private.stage7_resource_lock('site', v_old.site_id);
  perform private.stage7_resource_lock('site', v_site);
  perform private.stage7_resource_lock('staff', v_old.staff_id);
  perform private.stage7_resource_lock('staff', v_staff);
  perform private.stage7_resource_lock('cabinet', v_old.cabinet_id);
  perform private.stage7_resource_lock('cabinet', v_cabinet);
  perform private.assert_staff_not_absent(v_old.clinic_id,v_staff,v_site,v_start,v_end);
  perform private.assert_not_blocked(v_old.clinic_id,v_staff,v_site,v_cabinet,v_start,v_end);
  perform set_config('denty.correlation_id', gen_random_uuid()::text, true);

  update public.appointments set
    patient_id=v_patient, staff_id=v_staff, site_id=v_site, cabinet_id=v_cabinet,
    clinical_plan_item_id=v_plan_item, starts_at=v_start, ends_at=v_end,
    title=coalesce(nullif(btrim(p_title),''),title), reason=case when p_reason is null then reason else nullif(btrim(p_reason),'') end,
    version=version+1
  where id=p_appointment_id
  returning * into v_old;
  return to_jsonb(v_old);
exception when exclusion_violation then
  raise exception 'APPOINTMENT_CONFLICT' using errcode='23P01';
end; $$;

create or replace function public.create_agenda_block(
  p_clinic_id uuid,
  p_staff_id uuid,
  p_site_id uuid,
  p_cabinet_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_kind text default 'BLOCK',
  p_reason text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_row public.appointment_blocks%rowtype;
begin
  if not private.is_clinic_staff(p_clinic_id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_ends_at <= p_starts_at then raise exception 'INVALID_BLOCK_RANGE' using errcode='22023'; end if;
  if p_cabinet_id is not null and p_site_id is null then raise exception 'CABINET_REQUIRES_SITE' using errcode='22023'; end if;
  if p_staff_id is not null and not exists (select 1 from public.staff_members s where s.id=p_staff_id and s.clinic_id=p_clinic_id and s.active) then raise exception 'STAFF_NOT_FOUND' using errcode='P0002'; end if;
  if p_site_id is not null and not exists (select 1 from public.sites s where s.id=p_site_id and s.clinic_id=p_clinic_id) then raise exception 'SITE_NOT_FOUND' using errcode='P0002'; end if;
  if p_cabinet_id is not null and not exists (select 1 from public.cabinets c where c.id=p_cabinet_id and c.clinic_id=p_clinic_id and c.site_id=p_site_id) then raise exception 'CABINET_NOT_FOUND' using errcode='P0002'; end if;

  -- Clinic lock deliberately serializes the short scheduling mutation boundary so
  -- a clinic-wide/site-wide block cannot race a booking on a narrower resource.
  perform private.stage7_resource_lock('clinic', p_clinic_id);
  perform private.stage7_resource_lock('site', p_site_id);
  perform private.stage7_resource_lock('staff', p_staff_id);
  perform private.stage7_resource_lock('cabinet', p_cabinet_id);

  if exists (
    select 1 from public.appointments a
    where a.clinic_id=p_clinic_id
      and a.status in ('PLANNED','CONFIRMED','ARRIVED','WAITING','IN_CHAIR','RUNNING_LATE')
      and tstzrange(a.starts_at,a.ends_at,'[)') && tstzrange(p_starts_at,p_ends_at,'[)')
      and (p_site_id is null or a.site_id=p_site_id)
      and (p_staff_id is null or a.staff_id=p_staff_id)
      and (p_cabinet_id is null or a.cabinet_id=p_cabinet_id)
  ) then raise exception 'APPOINTMENT_CONFLICT' using errcode='P0001'; end if;

  if exists (
    select 1 from public.appointment_blocks b
    where b.clinic_id=p_clinic_id
      and tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(p_starts_at,p_ends_at,'[)')
      and (p_site_id is null or b.site_id is null or b.site_id=p_site_id)
      and (p_staff_id is null or b.staff_id is null or b.staff_id=p_staff_id)
      and (p_cabinet_id is null or b.cabinet_id is null or b.cabinet_id=p_cabinet_id)
  ) then raise exception 'AGENDA_BLOCK_CONFLICT' using errcode='P0001'; end if;

  perform set_config('denty.correlation_id', gen_random_uuid()::text, true);
  insert into public.appointment_blocks(clinic_id,staff_id,site_id,cabinet_id,starts_at,ends_at,kind,reason)
  values(p_clinic_id,p_staff_id,p_site_id,p_cabinet_id,p_starts_at,p_ends_at,coalesce(nullif(btrim(p_kind),''),'BLOCK'),nullif(btrim(coalesce(p_reason,'')),''))
  returning * into v_row;
  return to_jsonb(v_row);
end; $$;

-- ---------------------------------------------------------------------------
-- 6. Extend Stage 2 lifecycle: strict state machine + no-show recall + waiting-room notification.
-- ---------------------------------------------------------------------------
create or replace function public.transition_appointment(
  p_appointment_id uuid,
  p_expected_version integer,
  p_new_status text,
  p_reason text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_appointment public.appointments%rowtype;
  v_previous_status text;
  v_recipient uuid;
  v_allowed boolean := false;
begin
  select * into v_appointment from public.appointments where id=p_appointment_id for update;
  if v_appointment.id is null then raise exception 'APPOINTMENT_NOT_FOUND' using errcode='P0002'; end if;
  if not private.is_clinic_staff(v_appointment.clinic_id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if v_appointment.version <> p_expected_version then return jsonb_build_object('conflict',true,'currentVersion',v_appointment.version); end if;
  if p_new_status not in ('PLANNED','CONFIRMED','ARRIVED','WAITING','IN_CHAIR','COMPLETED','NO_SHOW','CANCELLED','RUNNING_LATE') then raise exception 'INVALID_APPOINTMENT_STATUS' using errcode='22023'; end if;

  v_previous_status := v_appointment.status;
  v_allowed := case
    when v_previous_status in ('PLANNED','CONFIRMED') and p_new_status in ('ARRIVED','RUNNING_LATE','NO_SHOW','CANCELLED') then true
    when v_previous_status='RUNNING_LATE' and p_new_status in ('ARRIVED','NO_SHOW','CANCELLED') then true
    when v_previous_status='ARRIVED' and p_new_status in ('WAITING','IN_CHAIR','CANCELLED') then true
    when v_previous_status='WAITING' and p_new_status in ('IN_CHAIR','CANCELLED') then true
    when v_previous_status='IN_CHAIR' and p_new_status='COMPLETED' then true
    else false end;
  if not v_allowed then raise exception 'INVALID_APPOINTMENT_TRANSITION:%->%',v_previous_status,p_new_status using errcode='22023'; end if;

  perform set_config('denty.correlation_id',gen_random_uuid()::text,true);
  update public.appointments set
    status=p_new_status, reason=coalesce(nullif(btrim(coalesce(p_reason,'')),''),reason), version=version+1,
    arrived_at=case when p_new_status='ARRIVED' then coalesce(arrived_at,now()) else arrived_at end,
    waiting_room_at=case when p_new_status in ('ARRIVED','WAITING') then coalesce(waiting_room_at,now()) else waiting_room_at end,
    chair_started_at=case when p_new_status='IN_CHAIR' then coalesce(chair_started_at,now()) else chair_started_at end,
    completed_at=case when p_new_status='COMPLETED' then coalesce(completed_at,now()) else completed_at end,
    cancelled_at=case when p_new_status='CANCELLED' then coalesce(cancelled_at,now()) else cancelled_at end,
    no_show_at=case when p_new_status='NO_SHOW' then coalesce(no_show_at,now()) else no_show_at end
  where id=p_appointment_id returning * into v_appointment;

  insert into public.appointment_status_events(clinic_id,appointment_id,previous_status,new_status,changed_by)
  values(v_appointment.clinic_id,v_appointment.id,v_previous_status,p_new_status,(select auth.uid()));

  if p_new_status='NO_SHOW' then
    insert into public.patient_recalls(clinic_id,patient_id,due_at,kind,status,source_appointment_id)
    values(v_appointment.clinic_id,v_appointment.patient_id,now()+interval '1 day','NO_SHOW','pending',v_appointment.id)
    on conflict (source_appointment_id,kind) do nothing;

    select profile_id into v_recipient from public.staff_members where id=v_appointment.staff_id and active;
    if v_recipient is not null and not exists (
      select 1 from public.notifications n
      where n.clinic_id=v_appointment.clinic_id and n.patient_id=v_appointment.patient_id
        and n.type='NO_SHOW_RECALL' and n.action_url='/app/agenda?appointmentId='||v_appointment.id::text
    ) then
      insert into public.notifications(clinic_id,recipient_profile_id,patient_id,type,title,body,action_url)
      values(v_appointment.clinic_id,v_recipient,v_appointment.patient_id,'NO_SHOW_RECALL','Paciente no presentado',v_appointment.title,'/app/agenda?appointmentId='||v_appointment.id::text);
    end if;

    insert into public.integration_events(clinic_id,scope,external_event_id,idempotency_key,payload,status)
    values(
      v_appointment.clinic_id,'agenda.no_show',v_appointment.id::text,'no-show:'||v_appointment.id::text,
      jsonb_build_object('appointmentId',v_appointment.id,'patientId',v_appointment.patient_id,'occurredAt',now()),'pending'
    )
    on conflict (clinic_id,idempotency_key) do nothing;
  end if;

  if p_new_status in ('ARRIVED','WAITING') and v_previous_status not in ('ARRIVED','WAITING') then
    select profile_id into v_recipient from public.staff_members where id=v_appointment.staff_id and active;
    if v_recipient is not null then
      insert into public.notifications(clinic_id,recipient_profile_id,patient_id,type,title,body,action_url)
      values(v_appointment.clinic_id,v_recipient,v_appointment.patient_id,'WAITING_ROOM','Paciente en sala de espera',v_appointment.title,'/app/agenda');
    end if;
  end if;

  return to_jsonb(v_appointment);
end; $$;

create or replace function public.mark_no_show(p_appointment_id uuid,p_expected_version integer,p_reason text default null)
returns jsonb language sql security definer set search_path='' as $$
  select public.transition_appointment(p_appointment_id,p_expected_version,'NO_SHOW',p_reason);
$$;

create or replace function public.withdraw_waitlist_request(p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_row public.patient_waitlist_requests%rowtype;
begin
  select * into v_row from public.patient_waitlist_requests where id=p_request_id for update;
  if v_row.id is null then raise exception 'WAITLIST_NOT_FOUND' using errcode='P0002'; end if;
  if not private.is_clinic_staff(v_row.clinic_id) and not private.is_patient_owner(v_row.patient_id) then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if v_row.status='WITHDRAWN' then return to_jsonb(v_row); end if;
  if v_row.status<>'ACTIVE' then raise exception 'WAITLIST_NOT_ACTIVE' using errcode='22023'; end if;
  perform set_config('denty.correlation_id', gen_random_uuid()::text, true);
  update public.patient_waitlist_requests
    set status='WITHDRAWN', fulfilled_at=null
    where id=p_request_id
    returning * into v_row;
  return to_jsonb(v_row);
end; $$;

create or replace function public.fulfill_waitlist_request(p_request_id uuid,p_appointment_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_row public.patient_waitlist_requests%rowtype;
begin
  select * into v_row from public.patient_waitlist_requests where id=p_request_id for update;
  if v_row.id is null then raise exception 'WAITLIST_NOT_FOUND' using errcode='P0002'; end if;
  if not private.is_clinic_staff(v_row.clinic_id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if v_row.status='FULFILLED' and v_row.appointment_id is not distinct from p_appointment_id then return to_jsonb(v_row); end if;
  if v_row.status<>'ACTIVE' then raise exception 'WAITLIST_NOT_ACTIVE' using errcode='22023'; end if;
  if p_appointment_id is not null and not exists (
    select 1 from public.appointments a
    where a.id=p_appointment_id and a.clinic_id=v_row.clinic_id and a.patient_id=v_row.patient_id
      and a.status not in ('CANCELLED','NO_SHOW')
  ) then raise exception 'INVALID_WAITLIST_APPOINTMENT' using errcode='22023'; end if;
  perform set_config('denty.correlation_id', gen_random_uuid()::text, true);
  update public.patient_waitlist_requests
    set status='FULFILLED', fulfilled_at=now(), appointment_id=p_appointment_id
    where id=p_request_id
    returning * into v_row;
  return to_jsonb(v_row);
end; $$;

-- ---------------------------------------------------------------------------
-- 7. Absence creation uses the same staff advisory lock as appointment booking.
-- ---------------------------------------------------------------------------
-- Appointment-request lifecycle is RPC-only so a portal user cannot self-promote
-- a request to SCHEDULED or attach an arbitrary appointment.
create or replace function public.create_appointment_request(
  p_clinic_id uuid,p_patient_id uuid,p_note text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_row public.appointment_requests%rowtype;
begin
  if not private.is_clinic_staff(p_clinic_id) and not private.is_patient_owner(p_patient_id) then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if not exists (
    select 1 from public.patients p
    where p.id=p_patient_id and p.clinic_id=p_clinic_id and p.archived_at is null
  ) then raise exception 'PATIENT_NOT_FOUND' using errcode='P0002'; end if;
  if not private.is_clinic_staff(p_clinic_id) and not exists (
    select 1 from public.patient_accounts pa
    where pa.clinic_id=p_clinic_id and pa.patient_id=p_patient_id and pa.profile_id=(select auth.uid()) and pa.active
  ) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  perform set_config('denty.correlation_id',gen_random_uuid()::text,true);
  insert into public.appointment_requests(clinic_id,patient_id,note,status)
  values(p_clinic_id,p_patient_id,nullif(btrim(coalesce(p_note,'')),''),'PENDING')
  returning * into v_row;
  return to_jsonb(v_row);
end; $$;

create or replace function public.cancel_appointment_request(p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_row public.appointment_requests%rowtype;
begin
  select * into v_row from public.appointment_requests where id=p_request_id for update;
  if v_row.id is null then raise exception 'APPOINTMENT_REQUEST_NOT_FOUND' using errcode='P0002'; end if;
  if not private.is_clinic_staff(v_row.clinic_id) and not private.is_patient_owner(v_row.patient_id) then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if v_row.status='CANCELLED' then return to_jsonb(v_row); end if;
  if v_row.status<>'PENDING' then raise exception 'APPOINTMENT_REQUEST_NOT_PENDING' using errcode='22023'; end if;
  perform set_config('denty.correlation_id',gen_random_uuid()::text,true);
  update public.appointment_requests set status='CANCELLED' where id=p_request_id returning * into v_row;
  return to_jsonb(v_row);
end; $$;

create or replace function public.schedule_appointment_request(
  p_request_id uuid,p_staff_id uuid,p_site_id uuid,p_cabinet_id uuid,
  p_starts_at timestamptz,p_ends_at timestamptz,p_title text,p_reason text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_request public.appointment_requests%rowtype;
  v_appointment jsonb;
  v_appointment_id uuid;
begin
  select * into v_request from public.appointment_requests where id=p_request_id for update;
  if v_request.id is null then raise exception 'APPOINTMENT_REQUEST_NOT_FOUND' using errcode='P0002'; end if;
  if not private.is_clinic_staff(v_request.clinic_id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if v_request.status='SCHEDULED' and v_request.scheduled_appointment_id is not null then
    select to_jsonb(a.*) into v_appointment from public.appointments a where a.id=v_request.scheduled_appointment_id;
    if v_appointment is not null then return v_appointment; end if;
  end if;
  if v_request.status<>'PENDING' then raise exception 'APPOINTMENT_REQUEST_NOT_PENDING' using errcode='22023'; end if;

  v_appointment := public.book_appointment(
    v_request.clinic_id,v_request.patient_id,p_staff_id,p_site_id,p_cabinet_id,null,
    p_starts_at,p_ends_at,p_title,p_reason,null
  );
  v_appointment_id := nullif(v_appointment->>'id','')::uuid;
  if v_appointment_id is null then raise exception 'APPOINTMENT_BOOKING_FAILED' using errcode='P0001'; end if;
  update public.appointment_requests
    set status='SCHEDULED',scheduled_appointment_id=v_appointment_id
    where id=p_request_id;
  return v_appointment;
end; $$;

create or replace function public.create_staff_absence(
  p_clinic_id uuid,p_staff_id uuid,p_site_id uuid,p_starts_at timestamptz,p_ends_at timestamptz,p_type text,p_reason text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_row public.staff_absences%rowtype;
begin
  if not private.is_clinic_admin(p_clinic_id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_ends_at <= p_starts_at then raise exception 'INVALID_ABSENCE_RANGE' using errcode='22023'; end if;
  if not exists (select 1 from public.staff_members sm where sm.id=p_staff_id and sm.clinic_id=p_clinic_id and sm.active) then raise exception 'STAFF_NOT_FOUND' using errcode='P0002'; end if;
  if p_site_id is not null and not exists (select 1 from public.sites s where s.id=p_site_id and s.clinic_id=p_clinic_id) then raise exception 'SITE_NOT_FOUND' using errcode='P0002'; end if;
  perform private.stage7_resource_lock('staff',p_staff_id);
  if exists (
    select 1 from public.appointments a where a.clinic_id=p_clinic_id and a.staff_id=p_staff_id
      and a.status in ('PLANNED','CONFIRMED','ARRIVED','WAITING','IN_CHAIR','RUNNING_LATE')
      and tstzrange(a.starts_at,a.ends_at,'[)') && tstzrange(p_starts_at,p_ends_at,'[)')
  ) then raise exception 'ABSENCE_APPOINTMENT_CONFLICT' using errcode='23P01'; end if;
  perform set_config('denty.correlation_id',gen_random_uuid()::text,true);
  insert into public.staff_absences(clinic_id,staff_member_id,site_id,type,starts_at,ends_at,status,reason,approved_by)
  values(p_clinic_id,p_staff_id,p_site_id,p_type,p_starts_at,p_ends_at,'APPROVED',nullif(btrim(coalesce(p_reason,'')),''),(select auth.uid()))
  returning * into v_row;
  return to_jsonb(v_row);
exception when exclusion_violation then raise exception 'ABSENCE_CONFLICT' using errcode='23P01';
end; $$;

create or replace function public.cancel_staff_absence(p_absence_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_row public.staff_absences%rowtype;
begin
  select * into v_row from public.staff_absences where id=p_absence_id for update;
  if v_row.id is null then raise exception 'ABSENCE_NOT_FOUND' using errcode='P0002'; end if;
  if not private.is_clinic_admin(v_row.clinic_id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  update public.staff_absences set status='CANCELLED',version=version+1 where id=p_absence_id returning * into v_row;
  return to_jsonb(v_row);
end; $$;

-- ---------------------------------------------------------------------------
-- 8. Scheduling settings.
-- ---------------------------------------------------------------------------
create or replace function public.set_agenda_settings(p_clinic_id uuid,p_default_gap_days integer,p_staff_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_json jsonb;
begin
  if not private.is_clinic_admin(p_clinic_id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_default_gap_days < 0 or p_default_gap_days > 180 then raise exception 'INVALID_GAP' using errcode='22023'; end if;
  if p_staff_id is null then
    insert into public.clinic_settings(clinic_id,default_plan_visit_gap_days) values(p_clinic_id,p_default_gap_days)
    on conflict(clinic_id) do update set default_plan_visit_gap_days=excluded.default_plan_visit_gap_days
    returning to_jsonb(clinic_settings.*) into v_json;
  else
    if not exists(select 1 from public.staff_members sm where sm.id=p_staff_id and sm.clinic_id=p_clinic_id) then raise exception 'STAFF_NOT_FOUND' using errcode='P0002'; end if;
    insert into public.staff_settings(staff_member_id,clinic_id,default_plan_visit_gap_days) values(p_staff_id,p_clinic_id,p_default_gap_days)
    on conflict(staff_member_id) do update set default_plan_visit_gap_days=excluded.default_plan_visit_gap_days
    returning to_jsonb(staff_settings.*) into v_json;
  end if;
  return v_json;
end; $$;

-- ---------------------------------------------------------------------------
-- 9. Availability considers appointments, blocks, staff absence and schedules.
-- ---------------------------------------------------------------------------
create or replace function public.agenda_availability(
  p_clinic_id uuid,p_date date,p_staff_id uuid default null,p_site_id uuid default null,p_duration_min integer default 30
) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare v_staff uuid; v_result jsonb;
begin
  if not private.can_access_clinic(p_clinic_id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  v_staff := p_staff_id;
  if v_staff is null then
    select sm.id into v_staff from public.staff_members sm where sm.clinic_id=p_clinic_id and sm.profile_id=(select auth.uid()) and sm.active limit 1;
  end if;
  if v_staff is null then return jsonb_build_object('date',p_date,'durationMin',p_duration_min,'slots','[]'::jsonb); end if;

  with explicit_windows as (
    select ((p_date + ss.starts_at) at time zone 'Europe/Madrid') as window_start,
           ((p_date + ss.ends_at) at time zone 'Europe/Madrid') as window_end
    from public.staff_schedules ss
    where ss.clinic_id=p_clinic_id and ss.staff_member_id=v_staff and ss.active
      and ss.weekday=extract(dow from p_date)::int
      and (ss.site_id is null or p_site_id is null or ss.site_id=p_site_id)
      and (ss.effective_from is null or ss.effective_from<=p_date)
      and (ss.effective_until is null or ss.effective_until>=p_date)
  ), windows as (
    select * from explicit_windows
    union all
    select ((p_date + time '08:00') at time zone 'Europe/Madrid'),((p_date + time '21:00') at time zone 'Europe/Madrid')
    where not exists(select 1 from explicit_windows)
  ), candidates as (
    select gs as starts_at, gs + make_interval(mins=>p_duration_min) as ends_at
    from windows w
    cross join lateral generate_series(w.window_start,w.window_end-make_interval(mins=>p_duration_min),interval '15 minutes') gs
  ), free_slots as (
    select c.* from candidates c
    where not exists(select 1 from public.appointments a where a.clinic_id=p_clinic_id and a.staff_id=v_staff
      and a.status in ('PLANNED','CONFIRMED','ARRIVED','WAITING','IN_CHAIR','RUNNING_LATE')
      and tstzrange(a.starts_at,a.ends_at,'[)') && tstzrange(c.starts_at,c.ends_at,'[)'))
    and not exists(select 1 from public.staff_absences sa where sa.clinic_id=p_clinic_id and sa.staff_member_id=v_staff and sa.status='APPROVED'
      and (sa.site_id is null or p_site_id is null or sa.site_id=p_site_id)
      and tstzrange(sa.starts_at,sa.ends_at,'[)') && tstzrange(c.starts_at,c.ends_at,'[)'))
    and not exists(select 1 from public.appointment_blocks b where b.clinic_id=p_clinic_id
      and (b.staff_id is null or b.staff_id=v_staff) and (b.site_id is null or p_site_id is null or b.site_id=p_site_id)
      and tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(c.starts_at,c.ends_at,'[)'))
  )
  select jsonb_build_object('date',p_date,'staffId',v_staff,'durationMin',p_duration_min,
    'slots',coalesce(jsonb_agg(jsonb_build_object('startsAt',starts_at,'endsAt',ends_at) order by starts_at),'[]'::jsonb))
  into v_result from free_slots;
  return v_result;
end; $$;

-- ---------------------------------------------------------------------------
-- 10. Canonical wait/chair/punctuality analytics from lifecycle timestamps.
-- ---------------------------------------------------------------------------
create or replace function public.analytics_wait_times(
  p_clinic_id uuid,p_from timestamptz,p_to timestamptz,p_site_id uuid default null,p_staff_id uuid default null
) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare v_result jsonb;
begin
  if not private.is_clinic_staff(p_clinic_id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  with scoped as (
    select a.*,
      case when a.chair_started_at is not null and coalesce(a.waiting_room_at,a.arrived_at) is not null
        then greatest(0,extract(epoch from (a.chair_started_at-coalesce(a.waiting_room_at,a.arrived_at)))/60.0) end as wait_min,
      case when a.completed_at is not null and a.chair_started_at is not null
        then greatest(0,extract(epoch from (a.completed_at-a.chair_started_at))/60.0) end as chair_min,
      case when a.arrived_at is not null then extract(epoch from (a.arrived_at-a.starts_at))/60.0 end as arrival_delay_min
    from public.appointments a where a.clinic_id=p_clinic_id and a.starts_at>=p_from and a.starts_at<p_to
      and (p_site_id is null or a.site_id=p_site_id) and (p_staff_id is null or a.staff_id=p_staff_id)
  )
  select jsonb_build_object(
    'appointmentCount',count(*),
    'avgWaitMinutes',round(coalesce(avg(wait_min),0)::numeric,1),
    'avgChairMinutes',round(coalesce(avg(chair_min),0)::numeric,1),
    'avgArrivalDelayMinutes',round(coalesce(avg(arrival_delay_min),0)::numeric,1),
    'onTimeRate',round((case when count(*) filter(where arrival_delay_min is not null)>0 then
      100.0*count(*) filter(where arrival_delay_min<=5)/count(*) filter(where arrival_delay_min is not null) else 0 end)::numeric,1)
  ) into v_result from scoped;
  return v_result;
end; $$;

-- ---------------------------------------------------------------------------
-- 11. Database broadcast: canonical changes invalidate all connected clinic clients.
-- Supabase recommends Broadcast for scalable DB-driven updates.
-- ---------------------------------------------------------------------------
create or replace function private.broadcast_appointment_change()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_row jsonb; v_clinic uuid;
begin
  if tg_op = 'DELETE' then
    v_row := to_jsonb(old);
  else
    v_row := to_jsonb(new);
  end if;
  v_clinic := nullif(v_row->>'clinic_id','')::uuid;
  begin
    perform realtime.send(
      jsonb_build_object('table','appointments','operation',tg_op,'id',v_row->>'id','status',v_row->>'status'),
      'appointment_changed','clinic:'||v_clinic::text,true
    );
  exception when others then
    -- Realtime must never make a clinical transaction fail when no broadcast partition/client exists.
    null;
  end;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;
revoke all on function private.broadcast_appointment_change() from public,anon,authenticated;

drop trigger if exists appointments_stage7_broadcast on public.appointments;
create trigger appointments_stage7_broadcast after insert or update or delete on public.appointments
for each row execute function private.broadcast_appointment_change();

create or replace function private.broadcast_stage7_table_change()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_row jsonb; v_clinic uuid;
begin
  if tg_op = 'DELETE' then
    v_row := to_jsonb(old);
  else
    v_row := to_jsonb(new);
  end if;
  v_clinic:=nullif(v_row->>'clinic_id','')::uuid;
  begin perform realtime.send(jsonb_build_object('table',tg_table_name,'operation',tg_op,'id',v_row->>'id'),'stage7_changed','clinic:'||v_clinic::text,true);
  exception when others then null; end;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;
revoke all on function private.broadcast_stage7_table_change() from public,anon,authenticated;


drop trigger if exists staff_absences_stage7_broadcast on public.staff_absences;
create trigger staff_absences_stage7_broadcast after insert or update or delete on public.staff_absences for each row execute function private.broadcast_stage7_table_change();
drop trigger if exists patient_waitlist_stage7_broadcast on public.patient_waitlist_requests;
create trigger patient_waitlist_stage7_broadcast after insert or update or delete on public.patient_waitlist_requests for each row execute function private.broadcast_stage7_table_change();
drop trigger if exists appointment_requests_stage7_broadcast on public.appointment_requests;
create trigger appointment_requests_stage7_broadcast after insert or update or delete on public.appointment_requests for each row execute function private.broadcast_stage7_table_change();
drop trigger if exists clinic_settings_stage7_broadcast on public.clinic_settings;
create trigger clinic_settings_stage7_broadcast after insert or update or delete on public.clinic_settings for each row execute function private.broadcast_stage7_table_change();
drop trigger if exists staff_settings_stage7_broadcast on public.staff_settings;
create trigger staff_settings_stage7_broadcast after insert or update or delete on public.staff_settings for each row execute function private.broadcast_stage7_table_change();
drop trigger if exists appointment_status_events_stage7_broadcast on public.appointment_status_events;
create trigger appointment_status_events_stage7_broadcast after insert on public.appointment_status_events for each row execute function private.broadcast_stage7_table_change();

-- RPC execution surface. Direct appointment mutations are revoked so all writes cross transactional boundaries.
revoke insert,update,delete on table public.appointments from authenticated;
revoke insert,update,delete on table public.staff_absences from authenticated;
revoke insert,update,delete on table public.appointment_blocks from authenticated;
revoke update,delete on table public.patient_waitlist_requests from authenticated;
revoke insert,update,delete on table public.appointment_requests from authenticated;
grant select on table public.appointment_requests to authenticated;
grant select on table public.appointments to authenticated;
grant select on table public.staff_absences to authenticated;
grant select on table public.appointment_blocks to authenticated;

revoke execute on function public.book_appointment(uuid,uuid,uuid,uuid,uuid,uuid,timestamptz,timestamptz,text,text,uuid) from public,anon;
grant execute on function public.book_appointment(uuid,uuid,uuid,uuid,uuid,uuid,timestamptz,timestamptz,text,text,uuid) to authenticated;
revoke execute on function public.update_appointment(uuid,integer,uuid,uuid,uuid,uuid,uuid,timestamptz,timestamptz,text,text) from public,anon;
grant execute on function public.update_appointment(uuid,integer,uuid,uuid,uuid,uuid,uuid,timestamptz,timestamptz,text,text) to authenticated;
revoke execute on function public.create_agenda_block(uuid,uuid,uuid,uuid,timestamptz,timestamptz,text,text) from public,anon;
grant execute on function public.create_agenda_block(uuid,uuid,uuid,uuid,timestamptz,timestamptz,text,text) to authenticated;
revoke execute on function public.transition_appointment(uuid,integer,text,text) from public,anon;
grant execute on function public.transition_appointment(uuid,integer,text,text) to authenticated;
revoke execute on function public.mark_no_show(uuid,integer,text) from public,anon;
grant execute on function public.mark_no_show(uuid,integer,text) to authenticated;
revoke execute on function public.withdraw_waitlist_request(uuid) from public,anon;
grant execute on function public.withdraw_waitlist_request(uuid) to authenticated;
revoke execute on function public.fulfill_waitlist_request(uuid,uuid) from public,anon;
grant execute on function public.fulfill_waitlist_request(uuid,uuid) to authenticated;
revoke execute on function public.create_appointment_request(uuid,uuid,text) from public,anon;
grant execute on function public.create_appointment_request(uuid,uuid,text) to authenticated;
revoke execute on function public.cancel_appointment_request(uuid) from public,anon;
grant execute on function public.cancel_appointment_request(uuid) to authenticated;
revoke execute on function public.schedule_appointment_request(uuid,uuid,uuid,uuid,timestamptz,timestamptz,text,text) from public,anon;
grant execute on function public.schedule_appointment_request(uuid,uuid,uuid,uuid,timestamptz,timestamptz,text,text) to authenticated;
revoke execute on function public.create_staff_absence(uuid,uuid,uuid,timestamptz,timestamptz,text,text) from public,anon;
grant execute on function public.create_staff_absence(uuid,uuid,uuid,timestamptz,timestamptz,text,text) to authenticated;
revoke execute on function public.cancel_staff_absence(uuid) from public,anon;
grant execute on function public.cancel_staff_absence(uuid) to authenticated;
revoke execute on function public.set_agenda_settings(uuid,integer,uuid) from public,anon;
grant execute on function public.set_agenda_settings(uuid,integer,uuid) to authenticated;
revoke execute on function public.agenda_availability(uuid,date,uuid,uuid,integer) from public,anon;
grant execute on function public.agenda_availability(uuid,date,uuid,uuid,integer) to authenticated;
revoke execute on function public.analytics_wait_times(uuid,timestamptz,timestamptz,uuid,uuid) from public,anon;
grant execute on function public.analytics_wait_times(uuid,timestamptz,timestamptz,uuid,uuid) to authenticated;

commit;
