begin;

-- Agenda: intentional overlaps + durable no-show patient history.
-- Overlaps remain blocked by default. They are allowed only when the caller
-- explicitly sends p_allow_overlap=true after a user confirmation.

-- ---------------------------------------------------------------------------
-- 1. Durable patient reference on appointment status history.
-- ---------------------------------------------------------------------------
alter table public.appointment_status_events
  add column if not exists patient_id uuid;

update public.appointment_status_events ase
set patient_id = a.patient_id
from public.appointments a
where ase.appointment_id = a.id
  and ase.patient_id is null;

do $$
begin
  alter table public.appointment_status_events
    add constraint appointment_status_events_patient_id_fkey
    foreign key (patient_id) references public.patients(id) on delete cascade;
exception when duplicate_object then null;
end $$;

alter table public.appointment_status_events
  alter column patient_id set not null;

create index if not exists appointment_status_events_patient_no_show_idx
  on public.appointment_status_events(clinic_id, patient_id, created_at desc)
  where new_status = 'NO_SHOW';

create or replace function private.fill_appointment_status_patient()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.patient_id is null then
    select a.patient_id
      into new.patient_id
    from public.appointments a
    where a.id = new.appointment_id
      and a.clinic_id = new.clinic_id;
  end if;

  if new.patient_id is null then
    raise exception 'APPOINTMENT_PATIENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  return new;
end;
$$;

revoke all on function private.fill_appointment_status_patient() from public, anon, authenticated;

drop trigger if exists appointment_status_events_fill_patient
  on public.appointment_status_events;
create trigger appointment_status_events_fill_patient
before insert on public.appointment_status_events
for each row execute function private.fill_appointment_status_patient();

-- ---------------------------------------------------------------------------
-- 2. Replace unconditional EXCLUDE constraints with transactional validation.
--    Advisory locks in the canonical booking functions keep concurrent writes
--    serialized, so explicit overlaps are safe from race conditions.
-- ---------------------------------------------------------------------------
alter table public.appointments
  drop constraint if exists appointments_staff_no_overlap;
alter table public.appointments
  drop constraint if exists appointments_cabinet_no_overlap;

create or replace function private.assert_appointment_overlap_allowed(
  p_clinic_id uuid,
  p_appointment_id uuid,
  p_staff_id uuid,
  p_cabinet_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_allow_overlap boolean
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if coalesce(p_allow_overlap, false) then
    return;
  end if;

  if exists (
    select 1
    from public.appointments a
    where a.clinic_id = p_clinic_id
      and (p_appointment_id is null or a.id <> p_appointment_id)
      and a.status in ('PLANNED','CONFIRMED','ARRIVED','WAITING','IN_CHAIR','RUNNING_LATE')
      and tstzrange(a.starts_at, a.ends_at, '[)') &&
          tstzrange(p_starts_at, p_ends_at, '[)')
      and (
        a.staff_id = p_staff_id
        or (
          p_cabinet_id is not null
          and a.cabinet_id = p_cabinet_id
        )
      )
  ) then
    raise exception 'APPOINTMENT_CONFLICT' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function private.assert_appointment_overlap_allowed(
  uuid, uuid, uuid, uuid, timestamptz, timestamptz, boolean
) from public, anon;
grant execute on function private.assert_appointment_overlap_allowed(
  uuid, uuid, uuid, uuid, timestamptz, timestamptz, boolean
) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Canonical booking RPC with explicit overlap confirmation.
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
  p_allow_overlap boolean,
  p_reason text default null,
  p_rescheduled_from_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.appointments%rowtype;
begin
  if not private.is_clinic_staff(p_clinic_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_ends_at <= p_starts_at then
    raise exception 'INVALID_APPOINTMENT_RANGE' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.patients p
    where p.id = p_patient_id
      and p.clinic_id = p_clinic_id
      and p.archived_at is null
  ) then
    raise exception 'PATIENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if not exists (
    select 1 from public.staff_members s
    where s.id = p_staff_id
      and s.clinic_id = p_clinic_id
      and s.active
  ) then
    raise exception 'STAFF_NOT_FOUND' using errcode = 'P0002';
  end if;
  if not exists (
    select 1 from public.sites s
    where s.id = p_site_id
      and s.clinic_id = p_clinic_id
  ) then
    raise exception 'SITE_NOT_FOUND' using errcode = 'P0002';
  end if;
  if p_cabinet_id is not null and not exists (
    select 1 from public.cabinets c
    where c.id = p_cabinet_id
      and c.clinic_id = p_clinic_id
      and c.site_id = p_site_id
  ) then
    raise exception 'CABINET_NOT_FOUND' using errcode = 'P0002';
  end if;
  if p_clinical_plan_item_id is not null and not exists (
    select 1
    from public.clinical_plan_items cpi
    join public.clinical_plans cp on cp.id = cpi.plan_id
    where cpi.id = p_clinical_plan_item_id
      and cpi.clinic_id = p_clinic_id
      and cp.clinic_id = p_clinic_id
      and cp.patient_id = p_patient_id
  ) then
    raise exception 'CLINICAL_PLAN_ITEM_NOT_FOUND' using errcode = 'P0002';
  end if;
  if p_rescheduled_from_id is not null and not exists (
    select 1 from public.appointments source
    where source.id = p_rescheduled_from_id
      and source.clinic_id = p_clinic_id
      and source.patient_id = p_patient_id
      and source.status = 'NO_SHOW'
  ) then
    raise exception 'INVALID_RESCHEDULE_SOURCE' using errcode = '22023';
  end if;

  perform private.stage7_resource_lock('clinic', p_clinic_id);
  perform private.stage7_resource_lock('site', p_site_id);
  perform private.stage7_resource_lock('staff', p_staff_id);
  perform private.stage7_resource_lock('cabinet', p_cabinet_id);
  perform private.assert_staff_not_absent(
    p_clinic_id, p_staff_id, p_site_id, p_starts_at, p_ends_at
  );
  perform private.assert_not_blocked(
    p_clinic_id, p_staff_id, p_site_id, p_cabinet_id, p_starts_at, p_ends_at
  );
  perform private.assert_appointment_overlap_allowed(
    p_clinic_id,
    null,
    p_staff_id,
    p_cabinet_id,
    p_starts_at,
    p_ends_at,
    p_allow_overlap
  );
  perform set_config('denty.correlation_id', gen_random_uuid()::text, true);

  insert into public.appointments(
    clinic_id,
    patient_id,
    staff_id,
    site_id,
    cabinet_id,
    clinical_plan_item_id,
    starts_at,
    ends_at,
    status,
    title,
    reason,
    rescheduled_from_id
  )
  values (
    p_clinic_id,
    p_patient_id,
    p_staff_id,
    p_site_id,
    p_cabinet_id,
    p_clinical_plan_item_id,
    p_starts_at,
    p_ends_at,
    'PLANNED',
    btrim(p_title),
    nullif(btrim(coalesce(p_reason, '')), ''),
    p_rescheduled_from_id
  )
  returning * into v_row;

  if p_rescheduled_from_id is not null then
    insert into public.appointment_relationships(
      clinic_id,
      original_appointment_id,
      replacement_appointment_id,
      reason
    )
    values (
      p_clinic_id,
      p_rescheduled_from_id,
      v_row.id,
      'NO_SHOW'
    )
    on conflict (original_appointment_id, replacement_appointment_id) do nothing;

    update public.patient_recalls
    set status = 'booked'
    where source_appointment_id = p_rescheduled_from_id
      and kind = 'NO_SHOW'
      and status in ('pending', 'contacted');
  end if;

  return to_jsonb(v_row);
end;
$$;

-- Keep the previous RPC signature for server/database callers that have not opted
-- into intentional overlaps. It always retains the safe default.
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
) returns jsonb
language sql
security definer
set search_path = ''
as $$
  select public.book_appointment(
    p_clinic_id,
    p_patient_id,
    p_staff_id,
    p_site_id,
    p_cabinet_id,
    p_clinical_plan_item_id,
    p_starts_at,
    p_ends_at,
    p_title,
    false,
    p_reason,
    p_rescheduled_from_id
  );
$$;

-- ---------------------------------------------------------------------------
-- 4. Canonical update RPC with explicit overlap confirmation.
-- ---------------------------------------------------------------------------
create or replace function public.update_appointment(
  p_appointment_id uuid,
  p_expected_version integer,
  p_allow_overlap boolean,
  p_patient_id uuid default null,
  p_staff_id uuid default null,
  p_site_id uuid default null,
  p_cabinet_id uuid default null,
  p_clinical_plan_item_id uuid default null,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_title text default null,
  p_reason text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.appointments%rowtype;
  v_patient uuid;
  v_staff uuid;
  v_site uuid;
  v_cabinet uuid;
  v_plan_item uuid;
  v_start timestamptz;
  v_end timestamptz;
begin
  select *
    into v_old
  from public.appointments
  where id = p_appointment_id
  for update;

  if v_old.id is null then
    raise exception 'APPOINTMENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if not private.is_clinic_staff(v_old.clinic_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if v_old.version <> p_expected_version then
    return jsonb_build_object(
      'conflict', true,
      'currentVersion', v_old.version
    );
  end if;
  if v_old.status in ('COMPLETED','NO_SHOW','CANCELLED') then
    raise exception 'TERMINAL_APPOINTMENT' using errcode = '22023';
  end if;

  v_patient := coalesce(p_patient_id, v_old.patient_id);
  v_staff := coalesce(p_staff_id, v_old.staff_id);
  v_site := coalesce(p_site_id, v_old.site_id);
  v_cabinet := case
    when p_cabinet_id is not null then p_cabinet_id
    else v_old.cabinet_id
  end;
  v_plan_item := coalesce(p_clinical_plan_item_id, v_old.clinical_plan_item_id);
  v_start := coalesce(p_starts_at, v_old.starts_at);
  v_end := coalesce(p_ends_at, v_old.ends_at);

  if v_end <= v_start then
    raise exception 'INVALID_APPOINTMENT_RANGE' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.patients p
    where p.id = v_patient
      and p.clinic_id = v_old.clinic_id
      and p.archived_at is null
  ) then
    raise exception 'PATIENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if not exists (
    select 1 from public.staff_members sm
    where sm.id = v_staff
      and sm.clinic_id = v_old.clinic_id
      and sm.active
  ) then
    raise exception 'STAFF_NOT_FOUND' using errcode = 'P0002';
  end if;
  if not exists (
    select 1 from public.sites s
    where s.id = v_site
      and s.clinic_id = v_old.clinic_id
  ) then
    raise exception 'SITE_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_cabinet is not null and not exists (
    select 1 from public.cabinets c
    where c.id = v_cabinet
      and c.clinic_id = v_old.clinic_id
      and c.site_id = v_site
  ) then
    raise exception 'CABINET_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_plan_item is not null and not exists (
    select 1
    from public.clinical_plan_items cpi
    join public.clinical_plans cp on cp.id = cpi.plan_id
    where cpi.id = v_plan_item
      and cpi.clinic_id = v_old.clinic_id
      and cp.clinic_id = v_old.clinic_id
      and cp.patient_id = v_patient
  ) then
    raise exception 'CLINICAL_PLAN_ITEM_NOT_FOUND' using errcode = 'P0002';
  end if;

  perform private.stage7_resource_lock('clinic', v_old.clinic_id);
  perform private.stage7_resource_lock('site', v_old.site_id);
  perform private.stage7_resource_lock('site', v_site);
  perform private.stage7_resource_lock('staff', v_old.staff_id);
  perform private.stage7_resource_lock('staff', v_staff);
  perform private.stage7_resource_lock('cabinet', v_old.cabinet_id);
  perform private.stage7_resource_lock('cabinet', v_cabinet);
  perform private.assert_staff_not_absent(
    v_old.clinic_id, v_staff, v_site, v_start, v_end
  );
  perform private.assert_not_blocked(
    v_old.clinic_id, v_staff, v_site, v_cabinet, v_start, v_end
  );
  perform private.assert_appointment_overlap_allowed(
    v_old.clinic_id,
    v_old.id,
    v_staff,
    v_cabinet,
    v_start,
    v_end,
    p_allow_overlap
  );
  perform set_config('denty.correlation_id', gen_random_uuid()::text, true);

  update public.appointments
  set
    patient_id = v_patient,
    staff_id = v_staff,
    site_id = v_site,
    cabinet_id = v_cabinet,
    clinical_plan_item_id = v_plan_item,
    starts_at = v_start,
    ends_at = v_end,
    title = coalesce(nullif(btrim(p_title), ''), title),
    reason = case
      when p_reason is null then reason
      else nullif(btrim(p_reason), '')
    end,
    version = version + 1
  where id = p_appointment_id
  returning * into v_old;

  return to_jsonb(v_old);
end;
$$;

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
) returns jsonb
language sql
security definer
set search_path = ''
as $$
  select public.update_appointment(
    p_appointment_id,
    p_expected_version,
    false,
    p_patient_id,
    p_staff_id,
    p_site_id,
    p_cabinet_id,
    p_clinical_plan_item_id,
    p_starts_at,
    p_ends_at,
    p_title,
    p_reason
  );
$$;

-- Explicit execution surface. The new functions are SECURITY DEFINER, so deny
-- PUBLIC/anon and only grant the authenticated application role.
revoke execute on function public.book_appointment(
  uuid, uuid, uuid, uuid, uuid, uuid, timestamptz, timestamptz, text, boolean, text, uuid
) from public, anon;
grant execute on function public.book_appointment(
  uuid, uuid, uuid, uuid, uuid, uuid, timestamptz, timestamptz, text, boolean, text, uuid
) to authenticated;

revoke execute on function public.update_appointment(
  uuid, integer, boolean, uuid, uuid, uuid, uuid, uuid, timestamptz, timestamptz, text, text
) from public, anon;
grant execute on function public.update_appointment(
  uuid, integer, boolean, uuid, uuid, uuid, uuid, uuid, timestamptz, timestamptz, text, text
) to authenticated;

commit;
