-- Follow-up reviews after implants, orthodontics, endodontics and periodontics:
-- 3, 6 and 12 months after the treatment, then once a year.
-- Same rules as src/domain/treatment-reviews.ts (checked by its contract test).
--
-- Reviews live in patient_recalls, so they reach the recovery worklist with no
-- extra query: kind = REVIEW_<IMPLANT|ORTHO|ENDO|PERIO>_<3M|6M|12M|ANNUAL>.
-- No backfill: treatments recorded before this migration do not create reviews.

alter table public.patient_recalls
  add column if not exists review_anchor_date date,
  add column if not exists review_due_date date,
  add column if not exists booked_appointment_id uuid
    references public.appointments(id) on delete set null;

-- 'superseded': a newer treatment of the same specialty restarted the series.
alter table public.patient_recalls drop constraint if exists patient_recalls_status_check;
alter table public.patient_recalls add constraint patient_recalls_status_check
  check (status in ('pending','contacted','booked','dismissed','superseded'));

create unique index if not exists patient_recalls_review_unique
  on public.patient_recalls(patient_id, kind, review_due_date)
  where review_due_date is not null;
create index if not exists patient_recalls_booked_appointment_idx
  on public.patient_recalls(booked_appointment_id)
  where booked_appointment_id is not null;

create or replace function private.review_specialty_for_execution(p_code text, p_category text)
returns text language sql immutable set search_path = '' as $$
  select case
    when upper(btrim(coalesce(p_category,''))) = 'ENDODONTICS' then 'ENDO'
    when upper(btrim(coalesce(p_category,''))) = 'ORTHODONTICS'
      and starts_with(upper(btrim(coalesce(p_code,''))), 'RETENEDOR') then 'ORTHO'
    when upper(btrim(coalesce(p_category,''))) = 'PERIODONTICS'
      and upper(btrim(coalesce(p_code,''))) not in
        ('PERIO_MAINTENANCE','PERIO_REVIEW','SPLINT_REVIEW','ORAL_HYGIENE','HYGIENE') then 'PERIO'
    else null
  end
$$;

-- Reviews are due at 09:00 clinic time so the worklist orders them by day.
create or replace function private.review_due_at(p_date date)
returns timestamptz language sql stable set search_path = '' as $$
  select (p_date + time '09:00') at time zone 'Europe/Madrid'
$$;

create or replace function private.schedule_treatment_reviews(
  p_clinic_id uuid,
  p_patient_id uuid,
  p_specialty text,
  p_treated_at timestamptz
) returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_anchor date := (p_treated_at at time zone 'Europe/Madrid')::date;
  v_prefix text := 'REVIEW_' || p_specialty || '_';
  v_step record;
  v_due date;
  v_inserted integer;
  v_total integer := 0;
begin
  if p_specialty not in ('IMPLANT','ORTHO','ENDO','PERIO') then
    raise exception 'INVALID_REVIEW_SPECIALTY' using errcode = '22023';
  end if;

  -- A treatment recorded late (older than the current series) does not move it back.
  if exists (
    select 1 from public.patient_recalls r
    where r.clinic_id = p_clinic_id and r.patient_id = p_patient_id
      and starts_with(r.kind, v_prefix) and r.review_anchor_date > v_anchor
      and r.status in ('pending','contacted','booked')
  ) then
    return 0;
  end if;

  -- One series per patient and specialty: the newest treatment restarts it,
  -- so reception does not call twice for overlapping reviews.
  update public.patient_recalls r
     set status = 'superseded'
   where r.clinic_id = p_clinic_id and r.patient_id = p_patient_id
     and starts_with(r.kind, v_prefix) and r.review_anchor_date < v_anchor
     and r.status in ('pending','contacted');

  for v_step in select * from (values ('3M', 3), ('6M', 6), ('12M', 12)) as s(step, months) loop
    v_due := (v_anchor + make_interval(months => v_step.months))::date;
    insert into public.patient_recalls(
      clinic_id, patient_id, due_at, kind, status, review_anchor_date, review_due_date
    ) values (
      p_clinic_id, p_patient_id, private.review_due_at(v_due),
      v_prefix || v_step.step, 'pending', v_anchor, v_due
    )
    on conflict (patient_id, kind, review_due_date) where review_due_date is not null do nothing;
    get diagnostics v_inserted = row_count;
    v_total := v_total + v_inserted;
  end loop;
  return v_total;
end;
$$;

create or replace function private.schedule_reviews_after_execution()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_specialty text := private.review_specialty_for_execution(new.treatment_code, new.treatment_category);
begin
  if v_specialty is not null then
    perform private.schedule_treatment_reviews(new.clinic_id, new.patient_id, v_specialty, new.executed_at);
  end if;
  return new;
end;
$$;

drop trigger if exists clinical_treatment_executions_schedule_reviews on public.clinical_treatment_executions;
create trigger clinical_treatment_executions_schedule_reviews
  after insert on public.clinical_treatment_executions
  for each row execute function private.schedule_reviews_after_execution();

-- Implants count from the recorded placement: failed or deferred attempts never schedule reviews.
create or replace function private.schedule_reviews_after_implant_placement()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.outcome = 'PLACED' and new.placed_at is not null
     and (tg_op = 'INSERT' or old.outcome is distinct from 'PLACED' or old.placed_at is distinct from new.placed_at) then
    perform private.schedule_treatment_reviews(new.clinic_id, new.patient_id, 'IMPLANT', new.placed_at);
  end if;
  return new;
end;
$$;

drop trigger if exists implant_placement_outcomes_schedule_reviews on public.implant_placement_outcomes;
create trigger implant_placement_outcomes_schedule_reviews
  after insert or update of outcome, placed_at on public.implant_placement_outcomes
  for each row execute function private.schedule_reviews_after_implant_placement();

-- An appointment within 30 days of a review's due date covers it: the patient
-- comes once and the doctor checks every pending review in that visit.
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
            or r.due_at not between new.starts_at - interval '30 days'
                                and new.starts_at + interval '30 days');
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

drop trigger if exists appointments_link_reviews on public.appointments;
create trigger appointments_link_reviews
  after insert or update of status, starts_at on public.appointments
  for each row execute function private.link_reviews_to_appointment();

-- After the first year: booking a 12-month or yearly review schedules the next one.
create or replace function private.chain_annual_review()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_parts text[] := regexp_match(new.kind, '^REVIEW_(IMPLANT|ORTHO|ENDO|PERIO)_(12M|ANNUAL)$');
  v_due date;
begin
  if v_parts is null or new.review_due_date is null
     or new.status <> 'booked' or old.status = 'booked' then
    return new;
  end if;
  v_due := (new.review_due_date + interval '12 months')::date;
  insert into public.patient_recalls(
    clinic_id, patient_id, due_at, kind, status, review_anchor_date, review_due_date
  ) values (
    new.clinic_id, new.patient_id, private.review_due_at(v_due),
    'REVIEW_' || v_parts[1] || '_ANNUAL', 'pending', new.review_anchor_date, v_due
  )
  on conflict (patient_id, kind, review_due_date) where review_due_date is not null do nothing;
  return new;
end;
$$;

drop trigger if exists patient_recalls_chain_annual_review on public.patient_recalls;
create trigger patient_recalls_chain_annual_review
  after update of status on public.patient_recalls
  for each row execute function private.chain_annual_review();

revoke all on function private.review_specialty_for_execution(text, text) from public;
revoke all on function private.review_due_at(date) from public;
revoke all on function private.schedule_treatment_reviews(uuid, uuid, text, timestamptz) from public;
revoke all on function private.schedule_reviews_after_execution() from public;
revoke all on function private.schedule_reviews_after_implant_placement() from public;
revoke all on function private.link_reviews_to_appointment() from public;
revoke all on function private.chain_annual_review() from public;
