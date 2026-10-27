-- Discharge ("dar de alta") with maintenance reviews.
--
-- Additive only: no column, table or policy is dropped. A discharged patient
-- keeps an open recall of kind REVIEW_MAINTENANCE in patient_recalls, so it
-- shows in the recovery worklist and is linked to an appointment by the
-- existing appointments_link_reviews trigger (any REVIEW_* kind, ±30 days).
-- Same rules as src/domain/patient-discharge.ts.

begin;

-- Review interval each treatment asks for after discharge. Null: no opinion
-- (the clinic default of 6 months applies when no treatment sets one).
alter table public.treatment_catalog
  add column if not exists review_interval_months integer;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'treatment_catalog_review_interval_check') then
    alter table public.treatment_catalog add constraint treatment_catalog_review_interval_check
      check (review_interval_months is null or review_interval_months in (6, 12));
  end if;
end $$;

alter table public.patients
  add column if not exists discharged_at timestamptz,
  add column if not exists discharged_by uuid references public.profiles(id) on delete set null,
  add column if not exists discharge_review_months integer,
  add column if not exists discharge_notes text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'patients_discharge_review_months_check') then
    alter table public.patients add constraint patients_discharge_review_months_check
      check (discharge_review_months is null or discharge_review_months in (6, 12));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'patients_discharge_notes_check') then
    alter table public.patients add constraint patients_discharge_notes_check
      check (discharge_notes is null or char_length(discharge_notes) <= 500);
  end if;
end $$;

create index if not exists patients_clinic_discharged_idx
  on public.patients(clinic_id, discharged_at)
  where discharged_at is not null;

-- SECURITY INVOKER keeps RLS in force: only clinic staff can update the
-- patient and insert recalls (patient_recalls_insert_access).
create or replace function public.discharge_patient(
  p_patient_id uuid,
  p_expected_version integer,
  p_review_months integer,
  p_notes text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_patient public.patients%rowtype;
  v_today date := (now() at time zone 'Europe/Madrid')::date;
  v_due date;
begin
  if p_review_months is null or p_review_months not in (6, 12) then
    raise exception 'INVALID_REVIEW_INTERVAL' using errcode = '22023';
  end if;

  update public.patients p
     set discharged_at = now(),
         discharged_by = (select auth.uid()),
         discharge_review_months = p_review_months,
         discharge_notes = nullif(btrim(p_notes), ''),
         version = p.version + 1
   where p.id = p_patient_id
     and p.version = p_expected_version
     and p.archived_at is null
     and p.discharged_at is null
  returning p.* into v_patient;

  if not found then
    return jsonb_build_object('conflict', true);
  end if;

  -- A previous discharge's open review is replaced by the new one.
  update public.patient_recalls r
     set status = 'superseded'
   where r.clinic_id = v_patient.clinic_id and r.patient_id = v_patient.id
     and r.kind = 'REVIEW_MAINTENANCE' and r.status in ('pending','contacted');

  v_due := (v_today + make_interval(months => p_review_months))::date;
  insert into public.patient_recalls(
    clinic_id, patient_id, due_at, kind, status, review_anchor_date, review_due_date
  ) values (
    v_patient.clinic_id, v_patient.id, (v_due + time '09:00') at time zone 'Europe/Madrid',
    'REVIEW_MAINTENANCE', 'pending', v_today, v_due
  )
  on conflict (patient_id, kind, review_due_date) where review_due_date is not null
  do update set status = 'pending', booked_appointment_id = null;

  return jsonb_build_object(
    'conflict', false,
    'id', v_patient.id,
    'version', v_patient.version,
    'dischargedAt', v_patient.discharged_at,
    'reviewMonths', p_review_months,
    'reviewDueDate', v_due
  );
end;
$$;

-- Undo a discharge (the patient starts a new treatment, or it was a mistake).
-- Open maintenance reviews are dismissed; booked appointments stay as they are.
create or replace function public.readmit_patient(
  p_patient_id uuid,
  p_expected_version integer
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_patient public.patients%rowtype;
begin
  update public.patients p
     set discharged_at = null,
         discharged_by = null,
         discharge_review_months = null,
         discharge_notes = null,
         version = p.version + 1
   where p.id = p_patient_id
     and p.version = p_expected_version
     and p.discharged_at is not null
  returning p.* into v_patient;

  if not found then
    return jsonb_build_object('conflict', true);
  end if;

  update public.patient_recalls r
     set status = 'dismissed'
   where r.clinic_id = v_patient.clinic_id and r.patient_id = v_patient.id
     and r.kind = 'REVIEW_MAINTENANCE' and r.status in ('pending','contacted');

  return jsonb_build_object('conflict', false, 'id', v_patient.id, 'version', v_patient.version);
end;
$$;

-- Maintenance repeats while the patient stays discharged: once a review is
-- booked, the next one is scheduled one interval after its due date.
create or replace function private.chain_maintenance_review()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_months integer;
  v_due date;
begin
  if new.kind <> 'REVIEW_MAINTENANCE' or new.review_due_date is null
     or new.status <> 'booked' or old.status = 'booked' then
    return new;
  end if;
  select p.discharge_review_months into v_months
  from public.patients p
  where p.id = new.patient_id and p.clinic_id = new.clinic_id
    and p.discharged_at is not null and p.archived_at is null;
  if v_months is null then
    return new;
  end if;
  v_due := (new.review_due_date + make_interval(months => v_months))::date;
  insert into public.patient_recalls(
    clinic_id, patient_id, due_at, kind, status, review_anchor_date, review_due_date
  ) values (
    new.clinic_id, new.patient_id, (v_due + time '09:00') at time zone 'Europe/Madrid',
    'REVIEW_MAINTENANCE', 'pending', new.review_anchor_date, v_due
  )
  on conflict (patient_id, kind, review_due_date) where review_due_date is not null do nothing;
  return new;
end;
$$;

create or replace trigger patient_recalls_chain_maintenance_review
  after update of status on public.patient_recalls
  for each row execute function private.chain_maintenance_review();

revoke all on function public.discharge_patient(uuid, integer, integer, text) from public, anon;
revoke all on function public.readmit_patient(uuid, integer) from public, anon;
revoke all on function private.chain_maintenance_review() from public;
grant execute on function public.discharge_patient(uuid, integer, integer, text) to authenticated;
grant execute on function public.readmit_patient(uuid, integer) to authenticated;

commit;
