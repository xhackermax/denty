-- Denty Stage 10: repair the canonical alerts ledger that was previously
-- marked as completed but had no Supabase implementation, and connect
-- laboratory risks to that same source of truth.

begin;

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  patient_id uuid references public.patients(id) on delete set null,
  source_type text not null,
  source_id text,
  dedupe_key text not null,
  priority text not null default 'MEDIUM' check (priority in ('LOW','MEDIUM','HIGH','CRITICAL')),
  status text not null default 'OPEN' check (status in ('OPEN','REVIEWED','SNOOZED','RESOLVED')),
  category text not null,
  title text not null,
  message text not null,
  assignee_member_id uuid references public.clinic_members(id) on delete set null,
  due_at timestamptz,
  snoozed_until timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  condition_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id,dedupe_key)
);

create index if not exists alerts_clinic_status_idx on public.alerts(clinic_id,status,priority,created_at desc);
create index if not exists alerts_patient_idx on public.alerts(patient_id,created_at desc) where patient_id is not null;
create index if not exists alerts_source_idx on public.alerts(clinic_id,source_type,source_id);
create index if not exists alerts_due_idx on public.alerts(clinic_id,due_at) where status <> 'RESOLVED';

create or replace function private.has_alert_permission(target_clinic_id uuid,target_permission text)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare v_member uuid; v_role text; v_override boolean;
begin
  select cm.id,cm.role into v_member,v_role
  from public.clinic_members cm
  where cm.clinic_id=target_clinic_id and cm.profile_id=(select auth.uid()) and cm.active
  limit 1;
  if v_member is null then return false; end if;
  select up.allowed into v_override
  from public.user_permissions up
  where up.clinic_member_id=v_member and up.permission=target_permission
  limit 1;
  if found then return coalesce(v_override,false); end if;
  return v_role='ADMIN' and target_permission in ('alerts.read','alerts.manage');
end $$;
revoke all on function private.has_alert_permission(uuid,text) from public,anon;
grant execute on function private.has_alert_permission(uuid,text) to authenticated;

alter table public.alerts enable row level security;
revoke all on public.alerts from anon;
revoke insert,update,delete on public.alerts from authenticated;
grant select on public.alerts to authenticated;
drop policy if exists alerts_read on public.alerts;
create policy alerts_read on public.alerts for select to authenticated
using ((select private.has_alert_permission(clinic_id,'alerts.read')));

-- Keep derived laboratory alerts synchronized when the alerts/dashboard query is read.
-- Automatic clears use resolved_by=NULL; only those may be reopened if the risk recurs.
create or replace function private.refresh_lab_alerts(p_clinic_id uuid)
returns void language plpgsql volatile security definer set search_path='' as $$
declare w record; v_appointment_start timestamptz; v_dedupe text;
begin
  -- Expired snoozes become visible again.
  update public.alerts
  set status='OPEN',snoozed_until=null,version=version+1,updated_at=now()
  where clinic_id=p_clinic_id and status='SNOOZED' and snoozed_until<=now();

  -- Conditions that cleared are auto-resolved. A later recurrence can reopen them because resolved_by is NULL.
  update public.alerts a
  set status=case when a.status='RESOLVED' then a.status else 'RESOLVED' end,
      resolved_at=case when a.status='RESOLVED' then a.resolved_at else now() end,
      resolved_by=case when a.status='RESOLVED' then a.resolved_by else null end,
      condition_active=false,version=version+1,updated_at=now()
  where a.clinic_id=p_clinic_id and a.source_type='LAB_WORK' and a.category='LAB_INCIDENT' and a.condition_active=true
    and not exists(select 1 from public.lab_works lw where lw.id=private.uuid_from_text(a.source_id) and lw.clinic_id=p_clinic_id and lw.status='INCIDENT');

  update public.alerts a
  set status=case when a.status='RESOLVED' then a.status else 'RESOLVED' end,
      resolved_at=case when a.status='RESOLVED' then a.resolved_at else now() end,
      resolved_by=case when a.status='RESOLVED' then a.resolved_by else null end,
      condition_active=false,version=version+1,updated_at=now()
  where a.clinic_id=p_clinic_id and a.source_type='LAB_WORK' and a.category='LAB_OVERDUE' and a.condition_active=true
    and not exists(select 1 from public.lab_works lw where lw.id=private.uuid_from_text(a.source_id) and lw.clinic_id=p_clinic_id and lw.status not in ('RECEIVED','PLACED','CANCELLED') and lw.eta_at is not null and lw.eta_at<now());

  -- Only clear appointment-risk alerts when the linked work no longer has an appointment before its ETA.
  update public.alerts a
  set status=case when a.status='RESOLVED' then a.status else 'RESOLVED' end,
      resolved_at=case when a.status='RESOLVED' then a.resolved_at else now() end,
      resolved_by=case when a.status='RESOLVED' then a.resolved_by else null end,
      condition_active=false,version=version+1,updated_at=now()
  where a.clinic_id=p_clinic_id and a.source_type='LAB_WORK' and a.category='LAB_APPOINTMENT_RISK' and a.condition_active=true
    and not exists (
      select 1
      from public.lab_works lw
      where lw.id=private.uuid_from_text(a.source_id)
        and lw.clinic_id=p_clinic_id
        and lw.status not in ('RECEIVED','PLACED','CANCELLED')
        and lw.eta_at is not null
        and (
          (lw.appointment_id is not null and exists (
            select 1 from public.appointments ap
            where ap.id=lw.appointment_id and ap.clinic_id=lw.clinic_id
              and ap.status in ('PLANNED','CONFIRMED','ARRIVED','WAITING','IN_CHAIR')
              and ap.starts_at>now() and ap.starts_at<lw.eta_at
          ))
          or
          (lw.appointment_id is null and exists (
            select 1 from public.appointments ap
            where ap.clinic_id=lw.clinic_id and ap.patient_id=lw.patient_id
              and ap.status in ('PLANNED','CONFIRMED','ARRIVED','WAITING','IN_CHAIR')
              and ap.starts_at>now() and ap.starts_at<lw.eta_at
          ))
        )
    );

  for w in
    select lw.* from public.lab_works lw
    where lw.clinic_id=p_clinic_id and lw.status not in ('RECEIVED','PLACED','CANCELLED')
  loop
    if w.status='INCIDENT' then
      v_dedupe:='lab-incident:'||w.id::text;
      insert into public.alerts(clinic_id,patient_id,source_type,source_id,dedupe_key,priority,status,category,title,message,due_at)
      values(w.clinic_id,w.patient_id,'LAB_WORK',w.id::text,v_dedupe,'HIGH','OPEN','LAB_INCIDENT','Incidencia de laboratorio',w.title||' requiere revisión',w.eta_at)
      on conflict(clinic_id,dedupe_key) do update set
        patient_id=excluded.patient_id,title=excluded.title,message=excluded.message,due_at=excluded.due_at,
        status=case when public.alerts.condition_active=false then 'OPEN' else public.alerts.status end,
        resolved_at=case when public.alerts.condition_active=false then null else public.alerts.resolved_at end,
        resolved_by=case when public.alerts.condition_active=false then null else public.alerts.resolved_by end,
        condition_active=true,version=public.alerts.version+1,updated_at=now()
      where public.alerts.patient_id is distinct from excluded.patient_id
         or public.alerts.title is distinct from excluded.title
         or public.alerts.message is distinct from excluded.message
         or public.alerts.due_at is distinct from excluded.due_at
         or public.alerts.condition_active=false;
    end if;

    if w.eta_at is not null and w.eta_at<now() then
      v_dedupe:='lab-overdue:'||w.id::text;
      insert into public.alerts(clinic_id,patient_id,source_type,source_id,dedupe_key,priority,status,category,title,message,due_at)
      values(w.clinic_id,w.patient_id,'LAB_WORK',w.id::text,v_dedupe,'HIGH','OPEN','LAB_OVERDUE','Trabajo de laboratorio retrasado',w.title||' ha superado la fecha prevista',w.eta_at)
      on conflict(clinic_id,dedupe_key) do update set
        patient_id=excluded.patient_id,title=excluded.title,message=excluded.message,due_at=excluded.due_at,
        status=case when public.alerts.condition_active=false then 'OPEN' else public.alerts.status end,
        resolved_at=case when public.alerts.condition_active=false then null else public.alerts.resolved_at end,
        resolved_by=case when public.alerts.condition_active=false then null else public.alerts.resolved_by end,
        condition_active=true,version=public.alerts.version+1,updated_at=now()
      where public.alerts.patient_id is distinct from excluded.patient_id
         or public.alerts.title is distinct from excluded.title
         or public.alerts.message is distinct from excluded.message
         or public.alerts.due_at is distinct from excluded.due_at
         or public.alerts.condition_active=false;
    end if;

    v_appointment_start:=null;
    if w.appointment_id is not null then
      select a.starts_at into v_appointment_start
      from public.appointments a
      where a.id=w.appointment_id and a.clinic_id=w.clinic_id and a.status in ('PLANNED','CONFIRMED','ARRIVED','WAITING','IN_CHAIR') and a.starts_at>now();
    elsif w.eta_at is not null then
      select min(a.starts_at) into v_appointment_start
      from public.appointments a
      where a.clinic_id=w.clinic_id and a.patient_id=w.patient_id
        and a.status in ('PLANNED','CONFIRMED','ARRIVED','WAITING','IN_CHAIR')
        and a.starts_at>now() and a.starts_at<w.eta_at;
    end if;

    if w.eta_at is not null and v_appointment_start is not null and v_appointment_start<w.eta_at then
      v_dedupe:='lab-appointment-risk:'||w.id::text;
      insert into public.alerts(clinic_id,patient_id,source_type,source_id,dedupe_key,priority,status,category,title,message,due_at)
      values(w.clinic_id,w.patient_id,'LAB_WORK',w.id::text,v_dedupe,'CRITICAL','OPEN','LAB_APPOINTMENT_RISK','Cita antes de recibir el laboratorio',w.title||' está previsto después de una cita del paciente',v_appointment_start)
      on conflict(clinic_id,dedupe_key) do update set
        patient_id=excluded.patient_id,title=excluded.title,message=excluded.message,due_at=excluded.due_at,
        status=case when public.alerts.condition_active=false then 'OPEN' else public.alerts.status end,
        resolved_at=case when public.alerts.condition_active=false then null else public.alerts.resolved_at end,
        resolved_by=case when public.alerts.condition_active=false then null else public.alerts.resolved_by end,
        condition_active=true,version=public.alerts.version+1,updated_at=now()
      where public.alerts.patient_id is distinct from excluded.patient_id
         or public.alerts.title is distinct from excluded.title
         or public.alerts.message is distinct from excluded.message
         or public.alerts.due_at is distinct from excluded.due_at
         or public.alerts.condition_active=false;
    end if;
  end loop;
end $$;
revoke all on function private.refresh_lab_alerts(uuid) from public,anon,authenticated;

create or replace function public.list_open_alerts(p_clinic_id uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare v_items jsonb; v_open bigint; v_critical bigint;
begin
  if not private.has_alert_permission(p_clinic_id,'alerts.read') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  perform private.refresh_lab_alerts(p_clinic_id);
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'id',a.id,'patientId',a.patient_id,'sourceType',a.source_type,'sourceId',a.source_id,
      'priority',a.priority,'status',a.status,'category',a.category,'title',a.title,'message',a.message,
      'dueAt',a.due_at,'snoozedUntil',a.snoozed_until,'assigneeMemberId',a.assignee_member_id,
      'assigneeUserId',(select cm.profile_id from public.clinic_members cm where cm.id=a.assignee_member_id),
      'createdAt',a.created_at,'updatedAt',a.updated_at
    ) order by case a.priority when 'CRITICAL' then 1 when 'HIGH' then 2 when 'MEDIUM' then 3 else 4 end,a.created_at desc),'[]'::jsonb),
    count(*),count(*) filter(where a.priority='CRITICAL')
  into v_items,v_open,v_critical
  from public.alerts a
  where a.clinic_id=p_clinic_id and a.status in ('OPEN','REVIEWED');
  return jsonb_build_object('items',v_items,'openCount',v_open,'criticalCount',v_critical);
end $$;

create or replace function public.review_alert(p_alert_id uuid)
returns public.alerts language plpgsql volatile security definer set search_path='' as $$
declare r public.alerts%rowtype;
begin
  select * into r from public.alerts where id=p_alert_id for update;
  if r.id is null then raise exception 'ALERT_NOT_FOUND' using errcode='P0002'; end if;
  if not private.has_alert_permission(r.clinic_id,'alerts.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if r.status='RESOLVED' then return r; end if;
  update public.alerts set status='REVIEWED',reviewed_at=now(),reviewed_by=(select auth.uid()),snoozed_until=null,version=version+1,updated_at=now() where id=r.id returning * into r;
  return r;
end $$;

create or replace function public.resolve_alert(p_alert_id uuid)
returns public.alerts language plpgsql volatile security definer set search_path='' as $$
declare r public.alerts%rowtype;
begin
  select * into r from public.alerts where id=p_alert_id for update;
  if r.id is null then raise exception 'ALERT_NOT_FOUND' using errcode='P0002'; end if;
  if not private.has_alert_permission(r.clinic_id,'alerts.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if r.status='RESOLVED' then return r; end if;
  update public.alerts set status='RESOLVED',resolved_at=now(),resolved_by=(select auth.uid()),snoozed_until=null,version=version+1,updated_at=now() where id=r.id returning * into r;
  return r;
end $$;

create or replace function public.snooze_alert(p_alert_id uuid,p_until timestamptz)
returns public.alerts language plpgsql volatile security definer set search_path='' as $$
declare r public.alerts%rowtype;
begin
  select * into r from public.alerts where id=p_alert_id for update;
  if r.id is null then raise exception 'ALERT_NOT_FOUND' using errcode='P0002'; end if;
  if not private.has_alert_permission(r.clinic_id,'alerts.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if r.status='RESOLVED' then return r; end if;
  if p_until is null or p_until<=now() then raise exception 'INVALID_SNOOZE_UNTIL' using errcode='22023'; end if;
  update public.alerts set status='SNOOZED',snoozed_until=p_until,version=version+1,updated_at=now() where id=r.id returning * into r;
  return r;
end $$;

create or replace function public.assign_alert(p_alert_id uuid,p_user_id uuid)
returns public.alerts language plpgsql volatile security definer set search_path='' as $$
declare r public.alerts%rowtype; v_member uuid;
begin
  select * into r from public.alerts where id=p_alert_id for update;
  if r.id is null then raise exception 'ALERT_NOT_FOUND' using errcode='P0002'; end if;
  if not private.has_alert_permission(r.clinic_id,'alerts.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_user_id is not null then
    select cm.id into v_member from public.clinic_members cm where cm.clinic_id=r.clinic_id and cm.profile_id=p_user_id and cm.active limit 1;
    if v_member is null then raise exception 'ALERT_ASSIGNEE_CLINIC_MISMATCH' using errcode='23514'; end if;
  end if;
  update public.alerts set assignee_member_id=v_member,version=version+1,updated_at=now() where id=r.id returning * into r;
  return r;
end $$;

drop trigger if exists alerts_set_updated_at on public.alerts;
create trigger alerts_set_updated_at before update on public.alerts for each row execute function private.set_updated_at();
drop trigger if exists denty_realtime_broadcast on public.alerts;
create trigger denty_realtime_broadcast after insert or update or delete on public.alerts for each row execute function private.broadcast_denty_change();
drop trigger if exists alerts_audit_mutation on public.alerts;
create trigger alerts_audit_mutation after insert or update or delete on public.alerts for each row execute function private.audit_sensitive_mutation();

do $$ declare sig text; begin
  foreach sig in array array[
    'public.list_open_alerts(uuid)',
    'public.review_alert(uuid)',
    'public.resolve_alert(uuid)',
    'public.snooze_alert(uuid,timestamptz)',
    'public.assign_alert(uuid,uuid)'
  ] loop
    execute 'revoke all on function '||sig||' from public,anon';
    execute 'grant execute on function '||sig||' to authenticated';
  end loop;
end $$;

commit;
