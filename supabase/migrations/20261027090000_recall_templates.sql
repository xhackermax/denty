-- Recall centre: configurable recall types (templates) on top of patient_recalls.
--
-- Additive only. Existing rows, the stored status values and the REVIEW_* /
-- NO_SHOW automation keep working unchanged; the richer states shown to
-- reception are derived (src/domain/recalls.ts, checked by its contract test).
-- Messaging settings are stored but nothing here queues or sends a message.

-- Tenant keys so new tables can reference (clinic_id, id) and never cross clinics.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'patients_clinic_id_id_key') then
    alter table public.patients add constraint patients_clinic_id_id_key unique (clinic_id, id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sites_clinic_id_id_key') then
    alter table public.sites add constraint sites_clinic_id_id_key unique (clinic_id, id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'staff_members_clinic_id_id_key') then
    alter table public.staff_members add constraint staff_members_clinic_id_id_key unique (clinic_id, id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'patient_recalls_clinic_id_id_key') then
    alter table public.patient_recalls add constraint patient_recalls_clinic_id_id_key unique (clinic_id, id);
  end if;
end $$;

-- Permissions for the recall centre. Role defaults mirror ROLE_PERMISSIONS in
-- src/domain/permissions.ts; a row in user_permissions overrides them.
create or replace function private.loyalty_has_permission(target_clinic_id uuid, target_permission text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  v_member uuid;
  v_role text;
  v_override boolean;
begin
  select cm.id, cm.role into v_member, v_role
  from public.clinic_members cm
  where cm.clinic_id = target_clinic_id and cm.profile_id = (select auth.uid()) and cm.active
  limit 1;
  if v_member is null then return false; end if;
  select up.allowed into v_override
  from public.user_permissions up
  where up.clinic_member_id = v_member and up.permission = target_permission
  limit 1;
  if found then return coalesce(v_override, false); end if;
  return case v_role
    when 'ADMIN' then true
    when 'RECEPTION' then target_permission in ('recalls.read', 'recalls.manage')
    when 'DENTIST' then target_permission in ('recalls.read', 'recalls.manage')
    when 'ASSISTANT' then target_permission in ('recalls.read')
    else false
  end;
end $$;

create table if not exists public.recall_templates (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  code text not null check (code ~ '^[A-Z0-9_]{1,48}$'),
  name text not null check (char_length(btrim(name)) between 3 and 100),
  category text not null check (category in (
    'GENERAL','PERIODONTAL','IMPLANTES','ORTODONCIA','PROTESIS','ODONTOPEDIATRIA','PERSONALIZADO'
  )),
  description text check (description is null or char_length(description) <= 1000),
  interval_value integer not null check (interval_value between 1 and 120),
  interval_unit text not null check (interval_unit in ('DIAS','SEMANAS','MESES')),
  anchor_type text not null default 'FECHA_MANUAL' check (anchor_type in (
    'FECHA_MANUAL','CITA_COMPLETADA','ULTIMA_REVISION_COMPLETADA','TRATAMIENTO_FINALIZADO'
  )),
  lead_days integer not null default 14 check (lead_days between 0 and 180),
  max_attempts integer not null default 3 check (max_attempts between 0 and 10),
  auto_recurrence boolean not null default true,
  auto_enroll boolean not null default false,
  messaging_enabled boolean not null default false,
  channels text[] not null default '{}'
    check (channels <@ array['WHATSAPP','SMS','EMAIL']::text[]),
  reminder_offsets integer[] not null default '{}' check (cardinality(reminder_offsets) <= 10),
  message_template_key text check (message_template_key is null or char_length(message_template_key) <= 100),
  default_site_id uuid,
  default_staff_id uuid,
  active boolean not null default true,
  archived_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recall_templates_clinic_code_key unique (clinic_id, code),
  constraint recall_templates_clinic_id_id_key unique (clinic_id, id),
  constraint recall_templates_site_fkey foreign key (clinic_id, default_site_id)
    references public.sites(clinic_id, id),
  constraint recall_templates_staff_fkey foreign key (clinic_id, default_staff_id)
    references public.staff_members(clinic_id, id),
  constraint recall_templates_messaging_channels_check
    check (not messaging_enabled or cardinality(channels) > 0)
);

alter table public.patient_recalls
  add column if not exists recall_template_id uuid,
  add column if not exists site_id uuid,
  add column if not exists assigned_staff_id uuid,
  add column if not exists anchor_date date,
  add column if not exists due_date_overridden boolean not null default false,
  add column if not exists contacted_at timestamptz,
  add column if not exists contact_attempts integer not null default 0,
  add column if not exists closed_at timestamptz,
  add column if not exists close_reason text,
  add column if not exists paused_until timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists version integer not null default 1,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'patient_recalls_close_reason_check') then
    alter table public.patient_recalls add constraint patient_recalls_close_reason_check
      check (close_reason is null or close_reason in ('COMPLETED','CANCELLED'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'patient_recalls_contact_attempts_check') then
    alter table public.patient_recalls add constraint patient_recalls_contact_attempts_check
      check (contact_attempts >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'patient_recalls_template_fkey') then
    alter table public.patient_recalls add constraint patient_recalls_template_fkey
      foreign key (clinic_id, recall_template_id) references public.recall_templates(clinic_id, id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'patient_recalls_site_fkey') then
    alter table public.patient_recalls add constraint patient_recalls_site_fkey
      foreign key (clinic_id, site_id) references public.sites(clinic_id, id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'patient_recalls_staff_fkey') then
    alter table public.patient_recalls add constraint patient_recalls_staff_fkey
      foreign key (clinic_id, assigned_staff_id) references public.staff_members(clinic_id, id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'patient_recalls_patient_clinic_fkey') then
    alter table public.patient_recalls add constraint patient_recalls_patient_clinic_fkey
      foreign key (clinic_id, patient_id) references public.patients(clinic_id, id);
  end if;
end $$;

-- R03: one open recall per template and patient; retries and double clicks are skipped.
create unique index if not exists patient_recalls_template_active_unique
  on public.patient_recalls(clinic_id, recall_template_id, patient_id)
  where recall_template_id is not null and status in ('pending','contacted','booked');
create index if not exists patient_recalls_clinic_status_due_idx
  on public.patient_recalls(clinic_id, status, due_at);
create index if not exists patient_recalls_clinic_patient_due_idx
  on public.patient_recalls(clinic_id, patient_id, due_at);
create index if not exists patient_recalls_template_patient_idx
  on public.patient_recalls(clinic_id, recall_template_id, patient_id);

create table if not exists public.recall_events (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null,
  recall_id uuid not null,
  patient_id uuid not null,
  event_type text not null check (event_type in (
    'CREATED','CONTACTED','RESCHEDULED','POSTPONED','ASSIGNED','APPOINTMENT_LINKED',
    'APPOINTMENT_RELEASED','COMPLETED','CANCELLED','REOPENED','SUPERSEDED','EDITED'
  )),
  before_json jsonb,
  after_json jsonb,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  idempotency_key text,
  created_at timestamptz not null default now(),
  constraint recall_events_recall_fkey foreign key (clinic_id, recall_id)
    references public.patient_recalls(clinic_id, id) on delete restrict,
  constraint recall_events_patient_fkey foreign key (clinic_id, patient_id)
    references public.patients(clinic_id, id) on delete restrict
);
create index if not exists recall_events_recall_idx
  on public.recall_events(clinic_id, recall_id, created_at);
create unique index if not exists recall_events_idempotency_unique
  on public.recall_events(clinic_id, idempotency_key) where idempotency_key is not null;

-- Shared rules ---------------------------------------------------------------

-- Same as deriveRecallState in src/domain/recalls.ts.
create or replace function private.recall_display_state(
  p_status text, p_due_at timestamptz, p_close_reason text,
  p_paused_until timestamptz, p_lead_days integer, p_now timestamptz
) returns text language sql immutable set search_path = '' as $$
  select case
    when p_status = 'booked' then 'CITA_PROGRAMADA'
    when p_status = 'superseded' then 'REEMPLAZADO'
    when p_status = 'dismissed' then
      case when p_close_reason = 'COMPLETED' then 'COMPLETADO' else 'CANCELADO' end
    when p_status = 'pending' and p_paused_until > p_now then 'POSPUESTO'
    when p_due_at < p_now then 'VENCIDO'
    when p_status = 'contacted' then 'CONTACTADO'
    when p_due_at - p_now <= make_interval(days => p_lead_days) then 'PROXIMO'
    else 'PROGRAMADO'
  end
$$;

-- Same as addRecallInterval: months keep the day or fall back to the month's last day.
create or replace function private.recall_add_interval(p_date date, p_value integer, p_unit text)
returns date language sql immutable set search_path = '' as $$
  select case p_unit
    when 'MESES' then (p_date + make_interval(months => p_value))::date
    when 'SEMANAS' then p_date + p_value * 7
    else p_date + p_value
  end
$$;

create or replace function private.recall_due_at(p_date date)
returns timestamptz language sql stable set search_path = '' as $$
  select (p_date + time '09:00') at time zone 'Europe/Madrid'
$$;

create or replace function private.madrid_day_start(p_date date)
returns timestamptz language sql stable set search_path = '' as $$
  select p_date::timestamp at time zone 'Europe/Madrid'
$$;

create or replace function private.madrid_today()
returns date language sql stable set search_path = '' as $$
  select (now() at time zone 'Europe/Madrid')::date
$$;

-- Each change to a recall leaves one history row, whoever made it (RPC, trigger
-- or legacy automation). Only scheduling fields are copied: no clinical notes.
create or replace function private.recall_snapshot(r public.patient_recalls)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'status', r.status, 'dueAt', r.due_at, 'closeReason', r.close_reason,
    'pausedUntil', r.paused_until, 'siteId', r.site_id, 'staffId', r.assigned_staff_id,
    'bookedAppointmentId', r.booked_appointment_id, 'contactAttempts', r.contact_attempts
  )
$$;

create or replace function private.recall_touch()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.version := old.version + 1;
  return new;
end $$;

create or replace function private.recall_record_event()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_type text;
  v_key text := nullif(current_setting('denty.recall_idempotency_key', true), '');
begin
  if tg_op = 'INSERT' then
    v_type := 'CREATED';
  elsif new.status is distinct from old.status then
    v_type := case
      when new.status = 'contacted' then 'CONTACTED'
      when new.status = 'booked' then 'APPOINTMENT_LINKED'
      when new.status = 'superseded' then 'SUPERSEDED'
      when new.status = 'dismissed' and new.close_reason = 'COMPLETED' then 'COMPLETED'
      when new.status = 'dismissed' then 'CANCELLED'
      when old.status = 'booked' then 'APPOINTMENT_RELEASED'
      else 'REOPENED'
    end;
  elsif new.contact_attempts > old.contact_attempts then
    v_type := 'CONTACTED';
  elsif new.paused_until is distinct from old.paused_until then
    v_type := 'POSTPONED';
  elsif new.due_at is distinct from old.due_at then
    v_type := 'RESCHEDULED';
  elsif new.assigned_staff_id is distinct from old.assigned_staff_id
     or new.site_id is distinct from old.site_id then
    v_type := 'ASSIGNED';
  elsif private.recall_snapshot(new) is distinct from private.recall_snapshot(old) then
    v_type := 'EDITED';
  else
    return new;
  end if;
  insert into public.recall_events(
    clinic_id, recall_id, patient_id, event_type, before_json, after_json,
    actor_profile_id, appointment_id, idempotency_key
  ) values (
    new.clinic_id, new.id, new.patient_id, v_type,
    case when tg_op = 'UPDATE' then private.recall_snapshot(old) end,
    private.recall_snapshot(new),
    (select auth.uid()),
    case when v_type in ('APPOINTMENT_LINKED','APPOINTMENT_RELEASED')
      then coalesce(new.booked_appointment_id, old.booked_appointment_id) end,
    case when tg_op = 'INSERT' then v_key end
  )
  on conflict (clinic_id, idempotency_key) where idempotency_key is not null do nothing;
  return new;
end $$;

drop trigger if exists patient_recalls_touch on public.patient_recalls;
create trigger patient_recalls_touch
  before update on public.patient_recalls
  for each row execute function private.recall_touch();
drop trigger if exists patient_recalls_record_event on public.patient_recalls;
create trigger patient_recalls_record_event
  after insert or update on public.patient_recalls
  for each row execute function private.recall_record_event();

-- Codes identify the series in reports: frozen once a patient has been assigned.
create or replace function private.recall_template_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.code is distinct from old.code and exists (
    select 1 from public.patient_recalls r
    where r.clinic_id = old.clinic_id and r.recall_template_id = old.id
  ) then
    raise exception 'RECALL_CODE_LOCKED' using errcode = '22023';
  end if;
  new.updated_at := now();
  new.version := old.version + 1;
  return new;
end $$;

drop trigger if exists recall_templates_guard on public.recall_templates;
create trigger recall_templates_guard
  before update on public.recall_templates
  for each row execute function private.recall_template_guard();

create or replace function private.recall_audit(
  p_clinic_id uuid, p_action text, p_entity_type text, p_entity_id uuid,
  p_patient_id uuid, p_before jsonb, p_after jsonb, p_metadata jsonb default '{}'::jsonb
) returns void language sql security definer set search_path = '' as $$
  insert into public.audit_log(
    clinic_id, actor_profile_id, patient_id, action, entity_type, entity_id,
    metadata, before_json, after_json
  ) values (
    p_clinic_id, (select auth.uid()), p_patient_id, p_action, p_entity_type, p_entity_id,
    coalesce(p_metadata, '{}'::jsonb), p_before, p_after
  )
$$;

create or replace function private.recall_template_json(t public.recall_templates)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', t.id, 'code', t.code, 'name', t.name, 'category', t.category,
    'description', t.description, 'intervalValue', t.interval_value,
    'intervalUnit', t.interval_unit, 'anchorType', t.anchor_type, 'leadDays', t.lead_days,
    'maxAttempts', t.max_attempts, 'autoRecurrence', t.auto_recurrence,
    'autoEnroll', t.auto_enroll, 'messagingEnabled', t.messaging_enabled,
    'channels', to_jsonb(t.channels), 'reminderOffsets', to_jsonb(t.reminder_offsets),
    'messageTemplateKey', t.message_template_key, 'defaultSiteId', t.default_site_id,
    'defaultStaffId', t.default_staff_id, 'active', t.active, 'archivedAt', t.archived_at,
    'version', t.version, 'createdAt', t.created_at, 'updatedAt', t.updated_at,
    'openCount', (
      select count(*) from public.patient_recalls r
      where r.clinic_id = t.clinic_id and r.recall_template_id = t.id
        and r.status in ('pending','contacted','booked') and r.archived_at is null
    ),
    'overdueCount', (
      select count(*) from public.patient_recalls r
      where r.clinic_id = t.clinic_id and r.recall_template_id = t.id
        and r.status in ('pending','contacted') and r.archived_at is null
        and r.due_at < now() and coalesce(r.paused_until, '-infinity') <= now()
    )
  )
$$;

-- Clinic calendar day the next recall counts from, by template anchor.
create or replace function private.recall_anchor_date(
  p_template public.recall_templates, p_patient_id uuid, p_fallback date
) returns date language plpgsql stable security definer set search_path = '' as $$
declare
  v_date date;
begin
  if p_template.anchor_type = 'ULTIMA_REVISION_COMPLETADA' then
    select (max(r.closed_at) at time zone 'Europe/Madrid')::date into v_date
    from public.patient_recalls r
    where r.clinic_id = p_template.clinic_id and r.patient_id = p_patient_id
      and r.recall_template_id = p_template.id and r.close_reason = 'COMPLETED';
  end if;
  if v_date is null and p_template.anchor_type in ('CITA_COMPLETADA','ULTIMA_REVISION_COMPLETADA') then
    select (max(a.starts_at) at time zone 'Europe/Madrid')::date into v_date
    from public.appointments a
    where a.clinic_id = p_template.clinic_id and a.patient_id = p_patient_id
      and a.status = 'COMPLETED';
  end if;
  if v_date is null and p_template.anchor_type = 'TRATAMIENTO_FINALIZADO' then
    select (max(e.executed_at) at time zone 'Europe/Madrid')::date into v_date
    from public.clinical_treatment_executions e
    where e.clinic_id = p_template.clinic_id and e.patient_id = p_patient_id;
  end if;
  return coalesce(v_date, p_fallback, private.madrid_today());
end $$;

-- R04: the next occurrence is created once, from the day the review happened.
create or replace function private.recall_schedule_next(p_recall public.patient_recalls, p_done_on date)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_template public.recall_templates;
  v_due date;
begin
  select * into v_template from public.recall_templates t
  where t.clinic_id = p_recall.clinic_id and t.id = p_recall.recall_template_id;
  if not found or not v_template.auto_recurrence or v_template.archived_at is not null
     or not v_template.active then
    return;
  end if;
  v_due := private.recall_add_interval(p_done_on, v_template.interval_value, v_template.interval_unit);
  insert into public.patient_recalls(
    clinic_id, patient_id, due_at, kind, status, recall_template_id, site_id,
    assigned_staff_id, anchor_date, created_by
  ) values (
    p_recall.clinic_id, p_recall.patient_id, private.recall_due_at(v_due), p_recall.kind, 'pending',
    p_recall.recall_template_id, p_recall.site_id, p_recall.assigned_staff_id, p_done_on,
    (select auth.uid())
  )
  on conflict (clinic_id, recall_template_id, patient_id)
    where recall_template_id is not null and status in ('pending','contacted','booked')
  do nothing;
end $$;

-- One action on one recall. Shared by the single and bulk RPCs; permission is
-- checked by the caller.
create or replace function private.recall_apply(
  p_clinic_id uuid, p_recall_id uuid, p_action text, p_payload jsonb, p_expected_version integer
) returns public.patient_recalls language plpgsql security definer set search_path = '' as $$
declare
  r public.patient_recalls;
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_date date;
  v_appointment public.appointments;
  v_done_on date;
begin
  select * into r from public.patient_recalls x
  where x.clinic_id = p_clinic_id and x.id = p_recall_id and x.archived_at is null
  for update;
  if not found then raise exception 'RECALL_NOT_FOUND' using errcode = 'P0002'; end if;
  if p_expected_version is not null and r.version <> p_expected_version then
    raise exception 'VERSION_CONFLICT' using errcode = '40001';
  end if;

  if p_action = 'CONTACT' then
    if r.status not in ('pending','contacted') then
      raise exception 'RECALL_INVALID_TRANSITION' using errcode = '22023';
    end if;
    update public.patient_recalls set status = 'contacted', contacted_at = now(),
      contact_attempts = contact_attempts + 1, paused_until = null
    where id = r.id returning * into r;
  elsif p_action = 'POSTPONE' then
    v_date := (v_payload->>'until')::date;
    if r.status not in ('pending','contacted') then
      raise exception 'RECALL_INVALID_TRANSITION' using errcode = '22023';
    end if;
    if v_date is null or v_date <= private.madrid_today() then
      raise exception 'INVALID_RECALL_DATE' using errcode = '22023';
    end if;
    update public.patient_recalls set status = 'pending', paused_until = private.recall_due_at(v_date)
    where id = r.id returning * into r;
  elsif p_action = 'RESCHEDULE' then
    v_date := (v_payload->>'dueDate')::date;
    if r.status not in ('pending','contacted') then
      raise exception 'RECALL_INVALID_TRANSITION' using errcode = '22023';
    end if;
    if v_date is null then raise exception 'INVALID_RECALL_DATE' using errcode = '22023'; end if;
    update public.patient_recalls set due_at = private.recall_due_at(v_date),
      due_date_overridden = true, paused_until = null
    where id = r.id returning * into r;
  elsif p_action = 'ASSIGN' then
    if r.status not in ('pending','contacted','booked') then
      raise exception 'RECALL_INVALID_TRANSITION' using errcode = '22023';
    end if;
    update public.patient_recalls set
      assigned_staff_id = case when v_payload ? 'staffId'
        then (v_payload->>'staffId')::uuid else assigned_staff_id end,
      site_id = case when v_payload ? 'siteId'
        then (v_payload->>'siteId')::uuid else site_id end
    where id = r.id returning * into r;
  elsif p_action = 'LINK_APPOINTMENT' then
    if r.status not in ('pending','contacted') then
      raise exception 'RECALL_INVALID_TRANSITION' using errcode = '22023';
    end if;
    select * into v_appointment from public.appointments a
    where a.clinic_id = p_clinic_id and a.id = (v_payload->>'appointmentId')::uuid
      and a.patient_id = r.patient_id and a.status not in ('CANCELLED','NO_SHOW','COMPLETED');
    if not found then raise exception 'APPOINTMENT_NOT_ELIGIBLE' using errcode = '22023'; end if;
    update public.patient_recalls set status = 'booked', booked_appointment_id = v_appointment.id,
      paused_until = null
    where id = r.id returning * into r;
  elsif p_action = 'COMPLETE' then
    if r.status not in ('pending','contacted','booked') then
      raise exception 'RECALL_INVALID_TRANSITION' using errcode = '22023';
    end if;
    select (a.starts_at at time zone 'Europe/Madrid')::date into v_done_on
    from public.appointments a
    where a.id = r.booked_appointment_id and a.status = 'COMPLETED';
    update public.patient_recalls set status = 'dismissed', close_reason = 'COMPLETED',
      closed_at = now(), paused_until = null
    where id = r.id returning * into r;
    perform private.recall_schedule_next(r, coalesce(v_done_on, private.madrid_today()));
  elsif p_action = 'CANCEL' then
    if r.status not in ('pending','contacted','booked') then
      raise exception 'RECALL_INVALID_TRANSITION' using errcode = '22023';
    end if;
    update public.patient_recalls set status = 'dismissed', close_reason = 'CANCELLED',
      closed_at = now(), paused_until = null
    where id = r.id returning * into r;
  elsif p_action = 'REOPEN' then
    if r.status <> 'dismissed' or r.close_reason is distinct from 'CANCELLED' then
      raise exception 'RECALL_INVALID_TRANSITION' using errcode = '22023';
    end if;
    begin
      update public.patient_recalls set status = 'pending', close_reason = null, closed_at = null
      where id = r.id returning * into r;
    exception when unique_violation then
      raise exception 'RECALL_ALREADY_ACTIVE' using errcode = '23505';
    end;
  else
    raise exception 'INVALID_RECALL_ACTION' using errcode = '22023';
  end if;
  return r;
end $$;

create or replace function private.recall_item_json(r public.patient_recalls, p_now timestamptz)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', r.id, 'patientId', r.patient_id,
    'patientName', btrim(p.first_name || ' ' || p.last_name),
    'recordNumber', p.record_number, 'kind', r.kind,
    'templateId', r.recall_template_id, 'templateName', t.name,
    'dueAt', r.due_at, 'status', r.status,
    'state', private.recall_display_state(r.status, r.due_at, r.close_reason, r.paused_until,
      coalesce(t.lead_days, 14), p_now),
    'closeReason', r.close_reason, 'pausedUntil', r.paused_until,
    'siteId', r.site_id, 'siteName', s.name,
    'staffId', r.assigned_staff_id, 'staffName', sm.display_name,
    'contactedAt', r.contacted_at, 'contactAttempts', r.contact_attempts,
    'maxAttempts', t.max_attempts,
    'bookedAppointmentId', r.booked_appointment_id, 'bookedAppointmentAt', a.starts_at,
    'lastVisitAt', (
      select max(v.starts_at) from public.appointments v
      where v.clinic_id = r.clinic_id and v.patient_id = r.patient_id and v.status = 'COMPLETED'
    ),
    'nextAppointment', (
      select jsonb_build_object('id', n.id, 'startsAt', n.starts_at)
      from public.appointments n
      where n.clinic_id = r.clinic_id and n.patient_id = r.patient_id and n.starts_at > p_now
        and n.status not in ('CANCELLED','NO_SHOW','COMPLETED')
      order by n.starts_at limit 1
    ),
    'version', r.version, 'createdAt', r.created_at
  )
  from public.patients p
  left join public.recall_templates t on t.clinic_id = r.clinic_id and t.id = r.recall_template_id
  left join public.sites s on s.clinic_id = r.clinic_id and s.id = r.site_id
  left join public.staff_members sm on sm.clinic_id = r.clinic_id and sm.id = r.assigned_staff_id
  left join public.appointments a on a.id = r.booked_appointment_id
  where p.clinic_id = r.clinic_id and p.id = r.patient_id
$$;

-- RPCs -------------------------------------------------------------------------

create or replace function public.recall_templates_list(
  p_clinic_id uuid, p_include_archived boolean default false
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.loyalty_has_permission(p_clinic_id, 'recalls.read') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return jsonb_build_object('items', coalesce((
    select jsonb_agg(private.recall_template_json(t) order by t.archived_at nulls first, t.name)
    from public.recall_templates t
    where t.clinic_id = p_clinic_id and (p_include_archived or t.archived_at is null)
  ), '[]'::jsonb));
end $$;

create or replace function public.recall_template_save(
  p_clinic_id uuid, p_template_id uuid, p_payload jsonb, p_expected_version integer default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  t public.recall_templates;
  v_before jsonb;
  v_offsets integer[];
  v_recomputed integer := 0;
begin
  if not private.loyalty_has_permission(p_clinic_id, 'recalls.templates.manage') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  v_offsets := coalesce(
    (select array_agg(value::integer) from jsonb_array_elements_text(p_payload->'reminderOffsets')),
    '{}');
  if exists (select 1 from unnest(v_offsets) o where o not between -180 and 180)
     or cardinality(v_offsets) <> cardinality(array(select distinct unnest(v_offsets))) then
    raise exception 'INVALID_REMINDER_OFFSETS' using errcode = '22023';
  end if;

  if p_template_id is null then
    begin
      insert into public.recall_templates(
        clinic_id, code, name, category, description, interval_value, interval_unit,
        anchor_type, lead_days, max_attempts, auto_recurrence, auto_enroll, messaging_enabled,
        channels, reminder_offsets, message_template_key, default_site_id, default_staff_id,
        active, created_by, updated_by
      ) values (
        p_clinic_id, p_payload->>'code', btrim(p_payload->>'name'), p_payload->>'category',
        nullif(btrim(p_payload->>'description'), ''), (p_payload->>'intervalValue')::integer,
        p_payload->>'intervalUnit', coalesce(p_payload->>'anchorType', 'FECHA_MANUAL'),
        coalesce((p_payload->>'leadDays')::integer, 14),
        coalesce((p_payload->>'maxAttempts')::integer, 3),
        coalesce((p_payload->>'autoRecurrence')::boolean, true),
        coalesce((p_payload->>'autoEnroll')::boolean, false),
        coalesce((p_payload->>'messagingEnabled')::boolean, false),
        coalesce(array(select jsonb_array_elements_text(p_payload->'channels')), '{}'),
        v_offsets, nullif(btrim(p_payload->>'messageTemplateKey'), ''),
        (p_payload->>'defaultSiteId')::uuid, (p_payload->>'defaultStaffId')::uuid,
        coalesce((p_payload->>'active')::boolean, true), (select auth.uid()), (select auth.uid())
      ) returning * into t;
    exception when unique_violation then
      raise exception 'RECALL_CODE_TAKEN' using errcode = '23505';
    end;
    perform private.recall_audit(p_clinic_id, 'RECALL_TEMPLATE_CREATED', 'recall_template', t.id,
      null, null, private.recall_template_json(t));
    return private.recall_template_json(t);
  end if;

  select * into t from public.recall_templates x
  where x.clinic_id = p_clinic_id and x.id = p_template_id for update;
  if not found then raise exception 'RECALL_TEMPLATE_NOT_FOUND' using errcode = 'P0002'; end if;
  if p_expected_version is not null and t.version <> p_expected_version then
    raise exception 'VERSION_CONFLICT' using errcode = '40001';
  end if;
  v_before := private.recall_template_json(t);
  begin
    update public.recall_templates set
      code = p_payload->>'code', name = btrim(p_payload->>'name'),
      category = p_payload->>'category',
      description = nullif(btrim(p_payload->>'description'), ''),
      interval_value = (p_payload->>'intervalValue')::integer,
      interval_unit = p_payload->>'intervalUnit',
      anchor_type = coalesce(p_payload->>'anchorType', anchor_type),
      lead_days = coalesce((p_payload->>'leadDays')::integer, lead_days),
      max_attempts = coalesce((p_payload->>'maxAttempts')::integer, max_attempts),
      auto_recurrence = coalesce((p_payload->>'autoRecurrence')::boolean, auto_recurrence),
      auto_enroll = coalesce((p_payload->>'autoEnroll')::boolean, auto_enroll),
      messaging_enabled = coalesce((p_payload->>'messagingEnabled')::boolean, messaging_enabled),
      channels = coalesce(array(select jsonb_array_elements_text(p_payload->'channels')), '{}'),
      reminder_offsets = v_offsets,
      message_template_key = nullif(btrim(p_payload->>'messageTemplateKey'), ''),
      default_site_id = (p_payload->>'defaultSiteId')::uuid,
      default_staff_id = (p_payload->>'defaultStaffId')::uuid,
      active = coalesce((p_payload->>'active')::boolean, active),
      updated_by = (select auth.uid())
    where id = t.id returning * into t;
  exception when unique_violation then
    raise exception 'RECALL_CODE_TAKEN' using errcode = '23505';
  end;

  -- Changing the period only moves pending recalls when asked, and never ones
  -- with their own date, contacted ones or those with a booked appointment.
  if coalesce((p_payload->>'recomputePending')::boolean, false) then
    update public.patient_recalls r set due_at = private.recall_due_at(
      private.recall_add_interval(r.anchor_date, t.interval_value, t.interval_unit))
    where r.clinic_id = p_clinic_id and r.recall_template_id = t.id and r.status = 'pending'
      and r.archived_at is null and not r.due_date_overridden and r.anchor_date is not null;
    get diagnostics v_recomputed = row_count;
  end if;
  perform private.recall_audit(p_clinic_id, 'RECALL_TEMPLATE_UPDATED', 'recall_template', t.id,
    null, v_before, private.recall_template_json(t), jsonb_build_object('recomputed', v_recomputed));
  return private.recall_template_json(t) || jsonb_build_object('recomputed', v_recomputed);
end $$;

-- R06: archiving hides the type from new assignments; history stays untouched.
create or replace function public.recall_template_archive(
  p_clinic_id uuid, p_template_id uuid, p_archive boolean default true, p_reason text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  t public.recall_templates;
  v_before jsonb;
begin
  if not private.loyalty_has_permission(p_clinic_id, 'recalls.templates.manage') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  select * into t from public.recall_templates x
  where x.clinic_id = p_clinic_id and x.id = p_template_id for update;
  if not found then raise exception 'RECALL_TEMPLATE_NOT_FOUND' using errcode = 'P0002'; end if;
  v_before := private.recall_template_json(t);
  update public.recall_templates
     set archived_at = case when p_archive then coalesce(archived_at, now()) end,
         updated_by = (select auth.uid())
   where id = t.id returning * into t;
  perform private.recall_audit(p_clinic_id,
    case when p_archive then 'RECALL_TEMPLATE_ARCHIVED' else 'RECALL_TEMPLATE_RESTORED' end,
    'recall_template', t.id, null, v_before, private.recall_template_json(t),
    jsonb_build_object('reason', left(p_reason, 300)));
  return private.recall_template_json(t);
end $$;

-- Patients matching the wizard filters (step 3). Read-only preview, capped at 500.
create or replace function public.recall_candidates(p_clinic_id uuid, p_filters jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_filters jsonb := coalesce(p_filters, '{}'::jsonb);
  v_today date := private.madrid_today();
  v_result jsonb;
begin
  if not private.loyalty_has_permission(p_clinic_id, 'recalls.manage') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  with last_visit as (
    select distinct on (a.patient_id) a.patient_id, a.starts_at, a.site_id, a.staff_id
    from public.appointments a
    where a.clinic_id = p_clinic_id and a.status = 'COMPLETED'
    order by a.patient_id, a.starts_at desc
  ),
  matches as (
    select p.id, btrim(p.first_name || ' ' || p.last_name) as name, p.record_number,
           lv.starts_at as last_visit_at, s.name as site_name
    from public.patients p
    left join last_visit lv on lv.patient_id = p.id
    left join public.sites s on s.clinic_id = p_clinic_id and s.id = lv.site_id
    where p.clinic_id = p_clinic_id and p.archived_at is null
      and (v_filters->>'siteId' is null or lv.site_id = (v_filters->>'siteId')::uuid)
      and (v_filters->>'staffId' is null or lv.staff_id = (v_filters->>'staffId')::uuid)
      and (v_filters->>'lastVisitFrom' is null
           or lv.starts_at >= private.madrid_day_start((v_filters->>'lastVisitFrom')::date))
      and (v_filters->>'lastVisitTo' is null
           or lv.starts_at < private.madrid_day_start((v_filters->>'lastVisitTo')::date + 1))
      and (v_filters->>'minAge' is null
           or p.birth_date <= v_today - make_interval(years => (v_filters->>'minAge')::integer))
      and (v_filters->>'maxAge' is null
           or p.birth_date > v_today - make_interval(years => (v_filters->>'maxAge')::integer + 1))
      and (v_filters->>'treatmentCategory' is null or exists (
            select 1 from public.clinical_treatment_executions e
            where e.clinic_id = p_clinic_id and e.patient_id = p.id
              and upper(e.treatment_category) = upper(v_filters->>'treatmentCategory')))
      and (v_filters->>'excludeTemplateId' is null or not exists (
            select 1 from public.patient_recalls r
            where r.clinic_id = p_clinic_id and r.patient_id = p.id
              and r.recall_template_id = (v_filters->>'excludeTemplateId')::uuid
              and r.status in ('pending','contacted','booked')))
  )
  select jsonb_build_object(
    'total', (select count(*) from matches),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'patientId', m.id, 'patientName', m.name, 'recordNumber', m.record_number,
        'lastVisitAt', m.last_visit_at, 'siteName', m.site_name) order by m.name)
      from (select * from matches order by name limit 500) m
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end $$;

-- R01/R02/R03/R18: never creates patients; a per-patient date wins over the
-- template; existing open recalls are skipped; dry run previews the outcome.
create or replace function public.recall_assign_patients(
  p_clinic_id uuid,
  p_template_id uuid,
  p_patient_ids uuid[],
  p_anchor_date date default null,
  p_due_overrides jsonb default '{}'::jsonb,
  p_idempotency_key text default null,
  p_dry_run boolean default false
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  t public.recall_templates;
  v_patient uuid;
  v_archived timestamptz;
  v_anchor date;
  v_due date;
  v_added integer := 0;
  v_skipped jsonb := '[]'::jsonb;
  v_rows integer;
begin
  if not private.loyalty_has_permission(p_clinic_id, 'recalls.manage') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if cardinality(p_patient_ids) > 500 then
    raise exception 'TOO_MANY_PATIENTS' using errcode = '22023';
  end if;
  select * into t from public.recall_templates x
  where x.clinic_id = p_clinic_id and x.id = p_template_id;
  if not found then raise exception 'RECALL_TEMPLATE_NOT_FOUND' using errcode = 'P0002'; end if;
  if t.archived_at is not null or not t.active then
    raise exception 'RECALL_TEMPLATE_INACTIVE' using errcode = '22023';
  end if;

  for v_patient in select distinct x from unnest(coalesce(p_patient_ids, '{}')) x loop
    select p.archived_at into v_archived from public.patients p
    where p.clinic_id = p_clinic_id and p.id = v_patient;
    if not found then
      v_skipped := v_skipped || jsonb_build_object('patientId', v_patient, 'reason', 'PATIENT_NOT_FOUND');
      continue;
    end if;
    if v_archived is not null then
      v_skipped := v_skipped || jsonb_build_object('patientId', v_patient, 'reason', 'PATIENT_ARCHIVED');
      continue;
    end if;
    if exists (
      select 1 from public.patient_recalls r
      where r.clinic_id = p_clinic_id and r.recall_template_id = t.id and r.patient_id = v_patient
        and r.status in ('pending','contacted','booked')
    ) then
      v_skipped := v_skipped || jsonb_build_object('patientId', v_patient, 'reason', 'ALREADY_ACTIVE');
      continue;
    end if;
    v_due := nullif(p_due_overrides->>v_patient::text, '')::date;
    v_anchor := private.recall_anchor_date(t, v_patient, p_anchor_date);
    if p_dry_run then
      v_added := v_added + 1;
      continue;
    end if;
    perform set_config('denty.recall_idempotency_key',
      case when p_idempotency_key is null then '' else p_idempotency_key || ':' || v_patient end, true);
    insert into public.patient_recalls(
      clinic_id, patient_id, due_at, kind, status, recall_template_id, site_id,
      assigned_staff_id, anchor_date, due_date_overridden, created_by
    ) values (
      p_clinic_id, v_patient,
      private.recall_due_at(coalesce(v_due,
        private.recall_add_interval(v_anchor, t.interval_value, t.interval_unit))),
      'RECALL_' || t.code, 'pending', t.id, t.default_site_id, t.default_staff_id,
      v_anchor, v_due is not null, (select auth.uid())
    )
    on conflict (clinic_id, recall_template_id, patient_id)
      where recall_template_id is not null and status in ('pending','contacted','booked')
    do nothing;
    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      v_skipped := v_skipped || jsonb_build_object('patientId', v_patient, 'reason', 'ALREADY_ACTIVE');
    else
      v_added := v_added + 1;
    end if;
  end loop;
  perform set_config('denty.recall_idempotency_key', '', true);

  if not p_dry_run and v_added > 0 then
    perform private.recall_audit(p_clinic_id, 'RECALL_ASSIGNED', 'recall_template', t.id, null,
      null, null, jsonb_build_object('added', v_added, 'skipped', jsonb_array_length(v_skipped)));
  end if;
  return jsonb_build_object('added', v_added, 'skipped', v_skipped, 'dryRun', p_dry_run);
end $$;

create or replace function public.recall_list(
  p_clinic_id uuid, p_filters jsonb default '{}'::jsonb,
  p_page integer default 1, p_page_size integer default 25
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_filters jsonb := coalesce(p_filters, '{}'::jsonb);
  v_now timestamptz := now();
  v_search text := nullif(btrim(v_filters->>'search'), '');
  v_result jsonb;
begin
  if not private.loyalty_has_permission(p_clinic_id, 'recalls.read') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_page is null or p_page < 1 or p_page_size is null or p_page_size < 1 or p_page_size > 100 then
    raise exception 'INVALID_RECALL_FILTER' using errcode = '22023';
  end if;
  with scoped as (
    select r, private.recall_display_state(r.status, r.due_at, r.close_reason, r.paused_until,
             coalesce(t.lead_days, 14), v_now) as state
    from public.patient_recalls r
    join public.patients p on p.clinic_id = r.clinic_id and p.id = r.patient_id
    left join public.recall_templates t on t.clinic_id = r.clinic_id and t.id = r.recall_template_id
    where r.clinic_id = p_clinic_id and r.archived_at is null and p.archived_at is null
      and (v_filters->>'patientId' is null or r.patient_id = (v_filters->>'patientId')::uuid)
      and (v_filters->>'templateId' is null or r.recall_template_id = (v_filters->>'templateId')::uuid)
      and (v_filters->>'source' is null
           or (v_filters->>'source' = 'TEMPLATE' and r.recall_template_id is not null)
           or (v_filters->>'source' = 'AUTOMATIC' and r.recall_template_id is null))
      and (v_filters->>'siteId' is null or r.site_id = (v_filters->>'siteId')::uuid)
      and (v_filters->>'staffId' is null or r.assigned_staff_id = (v_filters->>'staffId')::uuid)
      and (v_filters->>'dueFrom' is null
           or r.due_at >= private.madrid_day_start((v_filters->>'dueFrom')::date))
      and (v_filters->>'dueTo' is null
           or r.due_at < private.madrid_day_start((v_filters->>'dueTo')::date + 1))
      and (v_search is null
           or p.record_number = v_search
           or (p.first_name || ' ' || p.last_name) ilike '%' || v_search || '%')
  ),
  filtered as (
    select * from scoped s
    where (v_filters->>'state' is null and (
             coalesce((v_filters->>'includeClosed')::boolean, false)
             or s.state not in ('COMPLETADO','CANCELADO','REEMPLAZADO')))
       or s.state = v_filters->>'state'
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'kpis', jsonb_build_object(
      'pending', (select count(*) from scoped where state in ('PROGRAMADO','PROXIMO','POSPUESTO')),
      'upcoming', (select count(*) from scoped where state = 'PROXIMO'),
      'overdue', (select count(*) from scoped where state = 'VENCIDO'),
      'contacted', (select count(*) from scoped where state = 'CONTACTADO'),
      'booked', (select count(*) from scoped where state = 'CITA_PROGRAMADA'),
      'completed', (select count(*) from scoped where state = 'COMPLETADO')
    ),
    'items', coalesce((
      select jsonb_agg(private.recall_item_json(f.r, v_now) order by (f.r).due_at, (f.r).id)
      from (
        select * from filtered order by (r).due_at, (r).id
        limit p_page_size offset (p_page - 1) * p_page_size
      ) f
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end $$;

create or replace function public.recall_update(
  p_clinic_id uuid, p_recall_id uuid, p_action text, p_payload jsonb default '{}'::jsonb,
  p_expected_version integer default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r public.patient_recalls;
begin
  if not private.loyalty_has_permission(p_clinic_id, 'recalls.manage') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  r := private.recall_apply(p_clinic_id, p_recall_id, p_action, p_payload, p_expected_version);
  if p_action in ('COMPLETE','CANCEL','REOPEN') then
    perform private.recall_audit(p_clinic_id,
      case when p_action = 'REOPEN' then 'RECALL_EDITED' else 'RECALL_CLOSED' end,
      'patient_recall', r.id, r.patient_id, null, private.recall_snapshot(r),
      jsonb_build_object('action', p_action));
  end if;
  return private.recall_item_json(r, now());
end $$;

-- R18: every row is attempted on its own; failures are reported, not hidden.
create or replace function public.recall_bulk_update(
  p_clinic_id uuid, p_recall_ids uuid[], p_action text, p_payload jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_updated integer := 0;
  v_failed jsonb := '[]'::jsonb;
begin
  if not private.loyalty_has_permission(p_clinic_id, 'recalls.manage') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_action not in ('CONTACT','POSTPONE','RESCHEDULE','ASSIGN','CANCEL') then
    raise exception 'INVALID_RECALL_ACTION' using errcode = '22023';
  end if;
  if cardinality(p_recall_ids) > 200 then
    raise exception 'TOO_MANY_RECALLS' using errcode = '22023';
  end if;
  for v_id in select distinct x from unnest(coalesce(p_recall_ids, '{}')) x loop
    begin
      perform private.recall_apply(p_clinic_id, v_id, p_action, p_payload, null);
      v_updated := v_updated + 1;
    exception when others then
      v_failed := v_failed || jsonb_build_object('id', v_id, 'reason', sqlerrm);
    end;
  end loop;
  if v_updated > 0 then
    perform private.recall_audit(p_clinic_id, 'RECALL_EDITED', 'patient_recall', null, null,
      null, null, jsonb_build_object('action', p_action, 'bulk', true,
        'updated', v_updated, 'failed', jsonb_array_length(v_failed)));
  end if;
  return jsonb_build_object('updated', v_updated, 'failed', v_failed);
end $$;

create or replace function public.recall_history(p_clinic_id uuid, p_recall_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.loyalty_has_permission(p_clinic_id, 'recalls.read') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return jsonb_build_object('items', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', e.id, 'eventType', e.event_type, 'before', e.before_json, 'after', e.after_json,
      'actorName', nullif(btrim(coalesce(pr.first_name, '') || ' ' || coalesce(pr.last_name, '')), ''),
      'appointmentId', e.appointment_id, 'createdAt', e.created_at
    ) order by e.created_at desc, e.id)
    from public.recall_events e
    left join public.profiles pr on pr.id = e.actor_profile_id
    where e.clinic_id = p_clinic_id and e.recall_id = p_recall_id
  ), '[]'::jsonb));
end $$;

-- Agenda integration ----------------------------------------------------------

-- Template recalls are linked on purpose to one appointment, so the 30-day
-- window used for automatic reviews must not release them when it moves.
create or replace function private.link_reviews_to_appointment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_active boolean := new.status not in ('CANCELLED','NO_SHOW');
begin
  if tg_op = 'UPDATE' then
    update public.patient_recalls r
       set status = 'pending', booked_appointment_id = null
     where r.booked_appointment_id = new.id and r.status = 'booked'
       and (not v_active
            or (r.recall_template_id is null
                and r.due_at not between new.starts_at - interval '30 days'
                                     and new.starts_at + interval '30 days'));
  end if;
  if not v_active then
    return new;
  end if;
  update public.patient_recalls r
     set status = 'booked', booked_appointment_id = new.id
   where r.clinic_id = new.clinic_id and r.patient_id = new.patient_id
     and starts_with(r.kind, 'REVIEW_') and r.status in ('pending','contacted')
     and r.due_at between new.starts_at - interval '30 days' and new.starts_at + interval '30 days';
  return new;
end;
$$;

-- R04/R05: a completed linked appointment closes the recall and schedules the
-- next one; cancellations are handled above by releasing it back to pending.
create or replace function private.complete_template_recalls_on_appointment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  r public.patient_recalls;
begin
  if new.status <> 'COMPLETED' or old.status = 'COMPLETED' then
    return new;
  end if;
  for r in
    update public.patient_recalls x
       set status = 'dismissed', close_reason = 'COMPLETED', closed_at = now(), paused_until = null
     where x.clinic_id = new.clinic_id and x.booked_appointment_id = new.id
       and x.status = 'booked' and x.recall_template_id is not null
    returning x.*
  loop
    perform private.recall_schedule_next(r, (new.starts_at at time zone 'Europe/Madrid')::date);
  end loop;
  return new;
end $$;

drop trigger if exists appointments_complete_template_recalls on public.appointments;
create trigger appointments_complete_template_recalls
  after update of status on public.appointments
  for each row execute function private.complete_template_recalls_on_appointment();

-- Security -------------------------------------------------------------------

alter table public.recall_templates enable row level security;
alter table public.recall_events enable row level security;

drop policy if exists recall_templates_read on public.recall_templates;
create policy recall_templates_read on public.recall_templates for select to authenticated
  using ((select private.loyalty_has_permission(clinic_id, 'recalls.read')));
drop policy if exists recall_events_read on public.recall_events;
create policy recall_events_read on public.recall_events for select to authenticated
  using ((select private.loyalty_has_permission(clinic_id, 'recalls.read')));

-- Writes go through the RPCs above, which check permissions and audit.
revoke all on public.recall_templates from anon, authenticated;
revoke all on public.recall_events from anon, authenticated;
grant select on public.recall_templates to authenticated;
grant select on public.recall_events to authenticated;

revoke all on function private.loyalty_has_permission(uuid, text) from public;
revoke all on function private.recall_display_state(text, timestamptz, text, timestamptz, integer, timestamptz) from public;
revoke all on function private.recall_add_interval(date, integer, text) from public;
revoke all on function private.recall_due_at(date) from public;
revoke all on function private.madrid_today() from public;
revoke all on function private.madrid_day_start(date) from public;
revoke all on function private.recall_snapshot(public.patient_recalls) from public;
revoke all on function private.recall_touch() from public;
revoke all on function private.recall_record_event() from public;
revoke all on function private.recall_template_guard() from public;
revoke all on function private.recall_audit(uuid, text, text, uuid, uuid, jsonb, jsonb, jsonb) from public;
revoke all on function private.recall_template_json(public.recall_templates) from public;
revoke all on function private.recall_anchor_date(public.recall_templates, uuid, date) from public;
revoke all on function private.recall_schedule_next(public.patient_recalls, date) from public;
revoke all on function private.recall_apply(uuid, uuid, text, jsonb, integer) from public;
revoke all on function private.recall_item_json(public.patient_recalls, timestamptz) from public;
revoke all on function private.complete_template_recalls_on_appointment() from public;
grant execute on function private.loyalty_has_permission(uuid, text) to authenticated;

revoke all on function public.recall_templates_list(uuid, boolean) from public, anon;
revoke all on function public.recall_template_save(uuid, uuid, jsonb, integer) from public, anon;
revoke all on function public.recall_template_archive(uuid, uuid, boolean, text) from public, anon;
revoke all on function public.recall_candidates(uuid, jsonb) from public, anon;
revoke all on function public.recall_assign_patients(uuid, uuid, uuid[], date, jsonb, text, boolean) from public, anon;
revoke all on function public.recall_list(uuid, jsonb, integer, integer) from public, anon;
revoke all on function public.recall_update(uuid, uuid, text, jsonb, integer) from public, anon;
revoke all on function public.recall_bulk_update(uuid, uuid[], text, jsonb) from public, anon;
revoke all on function public.recall_history(uuid, uuid) from public, anon;
grant execute on function public.recall_templates_list(uuid, boolean) to authenticated;
grant execute on function public.recall_template_save(uuid, uuid, jsonb, integer) to authenticated;
grant execute on function public.recall_template_archive(uuid, uuid, boolean, text) to authenticated;
grant execute on function public.recall_candidates(uuid, jsonb) to authenticated;
grant execute on function public.recall_assign_patients(uuid, uuid, uuid[], date, jsonb, text, boolean) to authenticated;
grant execute on function public.recall_list(uuid, jsonb, integer, integer) to authenticated;
grant execute on function public.recall_update(uuid, uuid, text, jsonb, integer) to authenticated;
grant execute on function public.recall_bulk_update(uuid, uuid[], text, jsonb) to authenticated;
grant execute on function public.recall_history(uuid, uuid) to authenticated;
