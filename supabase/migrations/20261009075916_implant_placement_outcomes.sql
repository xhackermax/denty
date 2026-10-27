-- Applied to production through the Supabase connector on 2026-10-09 and recovered
-- from supabase_migrations.schema_migrations so a fresh database (Supabase Preview)
-- can build the later implant and treatment-ledger migrations.
begin;

create table if not exists public.implant_placement_outcomes (
 id uuid primary key default gen_random_uuid(),
 clinic_id uuid not null references public.clinics(id),
 appointment_id uuid not null references public.appointments(id),
 patient_id uuid not null references public.patients(id),
 doctor_id uuid not null references public.staff_members(id),
 tooth_position text not null,
 outcome text not null check (outcome in ('PLACED','FAILED','DEFERRED')),
 system text, implant_model text, platform text, diameter_mm numeric(5,2), length_mm numeric(5,2), lot_number text,
 failure_kind text check (failure_kind is null or failure_kind in ('PLACEMENT_ATTEMPT','PREVIOUSLY_PLACED')),
 reason text, reassessment_date date,
 placed_at timestamptz, failure_at timestamptz,
 notes text, recorded_by uuid not null default auth.uid(), recorded_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint implant_outcome_complete check (
 (outcome='PLACED' and nullif(trim(system),'') is not null and nullif(trim(implant_model),'') is not null and nullif(trim(platform),'') is not null and diameter_mm>0 and length_mm>0 and placed_at is not null and failure_kind is null)
 or (outcome='FAILED' and failure_kind is not null and nullif(trim(reason),'') is not null)
 or (outcome='DEFERRED' and nullif(trim(reason),'') is not null and failure_kind is null)
 ),
 unique(appointment_id,tooth_position)
);
create index if not exists implant_outcome_doctor_idx on public.implant_placement_outcomes(clinic_id,doctor_id,outcome);
create index if not exists implant_outcome_patient_idx on public.implant_placement_outcomes(patient_id);
alter table public.implant_placement_outcomes enable row level security;
create policy implant_outcomes_select on public.implant_placement_outcomes for select to authenticated using (exists(select 1 from public.clinic_members m where m.clinic_id=implant_placement_outcomes.clinic_id and m.profile_id=auth.uid() and m.active));
create policy implant_outcomes_insert on public.implant_placement_outcomes for insert to authenticated with check (exists(select 1 from public.clinic_members m where m.clinic_id=implant_placement_outcomes.clinic_id and m.profile_id=auth.uid() and m.active) and exists(select 1 from public.appointments a where a.id=appointment_id and a.clinic_id=implant_placement_outcomes.clinic_id and a.patient_id=implant_placement_outcomes.patient_id and a.staff_id=implant_placement_outcomes.doctor_id));
create policy implant_outcomes_update on public.implant_placement_outcomes for update to authenticated using (exists(select 1 from public.clinic_members m where m.clinic_id=implant_placement_outcomes.clinic_id and m.profile_id=auth.uid() and m.active)) with check (exists(select 1 from public.clinic_members m where m.clinic_id=implant_placement_outcomes.clinic_id and m.profile_id=auth.uid() and m.active) and exists(select 1 from public.appointments a where a.id=appointment_id and a.clinic_id=implant_placement_outcomes.clinic_id and a.patient_id=implant_placement_outcomes.patient_id and a.staff_id=implant_placement_outcomes.doctor_id));
grant select,insert,update on public.implant_placement_outcomes to authenticated;

commit;
