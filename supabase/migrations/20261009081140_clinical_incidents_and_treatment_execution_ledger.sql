-- Applied to production through the Supabase connector on 2026-10-09 and recovered
-- from supabase_migrations.schema_migrations so a fresh database (Supabase Preview)
-- can build the later quality_* migrations that extend these tables.
begin;

create table if not exists public.clinical_incidents(
 id uuid primary key default gen_random_uuid(),
 clinic_id uuid not null references public.clinics(id),
 patient_id uuid not null references public.patients(id),
 appointment_id uuid references public.appointments(id),
 clinical_plan_item_id uuid references public.clinical_plan_items(id),
 dental_entity_id uuid references public.dental_entities(id),
 lab_rework_id uuid references public.lab_reworks(id),
 implant_outcome_id uuid references public.implant_placement_outcomes(id),
 responsible_doctor_id uuid references public.staff_members(id),
 reported_by uuid default auth.uid(),
 category text not null check(category in ('CLINICAL_COMPLICATION','REPEATED_TREATMENT','TECHNICAL','LABORATORY','PATIENT_COMPLAINT','OTHER')),
 cause text not null default 'UNDETERMINED' check(cause in ('UNDETERMINED','CLINICAL','MATERIAL','LABORATORY','PATIENT_RELATED','OTHER')),
 severity text not null default 'LOW' check(severity in ('LOW','MODERATE','HIGH','CRITICAL')),
 status text not null default 'OPEN' check(status in ('OPEN','INVESTIGATING','RESOLVED','CLOSED')),
 title text not null check(length(trim(title))>0),
 description text not null check(length(trim(description))>0),
 corrective_action text,
 repeat_treatment boolean not null default false,
 cost_cents bigint not null default 0 check(cost_cents>=0),
 occurred_at timestamptz not null default now(),
 resolved_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists clinical_incidents_doctor_date on public.clinical_incidents(clinic_id,responsible_doctor_id,occurred_at);
create index if not exists clinical_incidents_patient on public.clinical_incidents(patient_id);
alter table public.clinical_incidents enable row level security;
create policy clinical_incidents_read on public.clinical_incidents for select to authenticated using(exists(select 1 from public.clinic_members m where m.clinic_id=clinical_incidents.clinic_id and m.profile_id=auth.uid() and m.active));
create policy clinical_incidents_write on public.clinical_incidents for insert to authenticated with check(exists(select 1 from public.clinic_members m where m.clinic_id=clinical_incidents.clinic_id and m.profile_id=auth.uid() and m.active) and exists(select 1 from public.patients p where p.id=patient_id and p.clinic_id=clinical_incidents.clinic_id));
create policy clinical_incidents_edit on public.clinical_incidents for update to authenticated using(exists(select 1 from public.clinic_members m where m.clinic_id=clinical_incidents.clinic_id and m.profile_id=auth.uid() and m.active)) with check(exists(select 1 from public.clinic_members m where m.clinic_id=clinical_incidents.clinic_id and m.profile_id=auth.uid() and m.active) and exists(select 1 from public.patients p where p.id=patient_id and p.clinic_id=clinical_incidents.clinic_id));
grant select,insert,update on public.clinical_incidents to authenticated;
create table if not exists public.clinical_treatment_executions(
 id uuid primary key default gen_random_uuid(),
 clinic_id uuid not null references public.clinics(id),
 patient_id uuid not null references public.patients(id),
 appointment_id uuid not null references public.appointments(id),
 doctor_id uuid not null references public.staff_members(id),
 clinical_plan_item_id uuid references public.clinical_plan_items(id),
 treatment_code text not null,
 treatment_category text not null,
 tooth_position text,
 executed_at timestamptz not null default now(),
 attributed_revenue_cents bigint check(attributed_revenue_cents>=0),
 recorded_by uuid default auth.uid(),
 created_at timestamptz not null default now(),
 unique(appointment_id,clinical_plan_item_id)
);
create index if not exists treatment_execution_doctor_date on public.clinical_treatment_executions(clinic_id,doctor_id,executed_at);
alter table public.clinical_treatment_executions enable row level security;
create policy treatment_execution_read on public.clinical_treatment_executions for select to authenticated using(exists(select 1 from public.clinic_members m where m.clinic_id=clinical_treatment_executions.clinic_id and m.profile_id=auth.uid() and m.active));
create policy treatment_execution_write on public.clinical_treatment_executions for insert to authenticated with check(exists(select 1 from public.clinic_members m where m.clinic_id=clinical_treatment_executions.clinic_id and m.profile_id=auth.uid() and m.active) and exists(select 1 from public.appointments a where a.id=appointment_id and a.clinic_id=clinical_treatment_executions.clinic_id and a.patient_id=clinical_treatment_executions.patient_id and a.staff_id=clinical_treatment_executions.doctor_id));
grant select,insert on public.clinical_treatment_executions to authenticated;

commit;
