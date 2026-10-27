-- Configurable social tariffs and dental insurance coverage.
-- Social tariffs choose the best eligible price; insurance coverage is calculated afterwards.

begin;

create table if not exists public.commercial_tariffs (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  code text not null check (code ~ '^[A-Z][A-Z0-9_]{2,79}$'),
  name text not null check (length(btrim(name)) between 3 and 120),
  kind text not null default 'SOCIAL' check (kind in ('SOCIAL')),
  eligibility_label text not null check (length(btrim(eligibility_label)) between 3 and 300),
  priority integer not null default 100 check (priority between 0 and 10000),
  stacking_policy text not null default 'BEST_PRICE' check (stacking_policy in ('BEST_PRICE', 'EXCLUSIVE')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, code),
  unique (id, clinic_id)
);

create table if not exists public.commercial_tariff_rules (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null,
  tariff_id uuid not null,
  treatment_code text,
  treatment_family text,
  adjustment_kind text not null check (adjustment_kind in ('PERCENT_OFF', 'FIXED_OFF', 'FIXED_PRICE')),
  percent_off numeric(5,2),
  amount_cents bigint,
  excluded boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commercial_tariff_rules_tariff_clinic_fk
    foreign key (tariff_id, clinic_id) references public.commercial_tariffs(id, clinic_id) on delete cascade,
  constraint commercial_tariff_rules_selector_check
    check (treatment_code is null or treatment_family is null),
  constraint commercial_tariff_rules_adjustment_check
    check (
      excluded
      or (adjustment_kind = 'PERCENT_OFF' and percent_off between 0 and 100 and amount_cents is null)
      or (adjustment_kind in ('FIXED_OFF', 'FIXED_PRICE') and amount_cents >= 0 and percent_off is null)
    )
);

create unique index if not exists commercial_tariff_rules_unique_selector_idx
  on public.commercial_tariff_rules(
    tariff_id,
    coalesce(treatment_code, ''),
    coalesce(treatment_family, '')
  );
create index if not exists commercial_tariff_rules_lookup_idx
  on public.commercial_tariff_rules(clinic_id, tariff_id, active);

create table if not exists public.insurance_plans (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  code text not null check (code ~ '^[A-Z][A-Z0-9_]{2,79}$'),
  carrier_name text not null check (length(btrim(carrier_name)) between 2 and 120),
  name text not null check (length(btrim(name)) between 2 and 120),
  requires_authorization boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, code),
  unique (id, clinic_id)
);

create table if not exists public.insurance_plan_rules (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null,
  insurance_plan_id uuid not null,
  treatment_code text,
  treatment_family text,
  coverage_kind text not null check (coverage_kind in ('PERCENT_COVERAGE', 'FIXED_COVERAGE', 'CONCERTED_PRICE')),
  percent_covered numeric(5,2),
  amount_cents bigint,
  authorization_required boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint insurance_plan_rules_plan_clinic_fk
    foreign key (insurance_plan_id, clinic_id) references public.insurance_plans(id, clinic_id) on delete cascade,
  constraint insurance_plan_rules_selector_check
    check (treatment_code is null or treatment_family is null),
  constraint insurance_plan_rules_coverage_check
    check (
      (coverage_kind = 'PERCENT_COVERAGE' and percent_covered between 0 and 100 and amount_cents is null)
      or (coverage_kind in ('FIXED_COVERAGE', 'CONCERTED_PRICE') and amount_cents >= 0 and percent_covered is null)
    )
);

create unique index if not exists insurance_plan_rules_unique_selector_idx
  on public.insurance_plan_rules(
    insurance_plan_id,
    coalesce(treatment_code, ''),
    coalesce(treatment_family, '')
  );
create index if not exists insurance_plan_rules_lookup_idx
  on public.insurance_plan_rules(clinic_id, insurance_plan_id, active);

alter table public.patients
  add constraint patients_id_clinic_unique unique (id, clinic_id);

create table if not exists public.patient_commercial_benefits (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null,
  patient_id uuid not null,
  kind text not null check (kind in ('SOCIAL_TARIFF', 'INSURANCE')),
  tariff_id uuid,
  insurance_plan_id uuid,
  member_reference text,
  status text not null default 'PENDING' check (status in ('PENDING', 'VERIFIED', 'EXPIRED', 'REJECTED')),
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  expires_at date,
  notes text check (notes is null or length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patient_commercial_benefits_patient_clinic_fk
    foreign key (patient_id, clinic_id) references public.patients(id, clinic_id) on delete cascade,
  constraint patient_commercial_benefits_tariff_clinic_fk
    foreign key (tariff_id, clinic_id) references public.commercial_tariffs(id, clinic_id) on delete restrict,
  constraint patient_commercial_benefits_insurance_clinic_fk
    foreign key (insurance_plan_id, clinic_id) references public.insurance_plans(id, clinic_id) on delete restrict,
  constraint patient_commercial_benefits_kind_source_check
    check (
      (kind = 'SOCIAL_TARIFF' and tariff_id is not null and insurance_plan_id is null)
      or (kind = 'INSURANCE' and insurance_plan_id is not null and tariff_id is null)
    ),
  constraint patient_commercial_benefits_verification_check
    check (
      (status = 'VERIFIED' and verified_at is not null)
      or (status <> 'VERIFIED')
    )
);

create unique index if not exists patient_commercial_benefits_active_tariff_idx
  on public.patient_commercial_benefits(patient_id, tariff_id)
  where tariff_id is not null and status in ('PENDING', 'VERIFIED');
create unique index if not exists patient_commercial_benefits_active_insurance_idx
  on public.patient_commercial_benefits(patient_id, insurance_plan_id)
  where insurance_plan_id is not null and status in ('PENDING', 'VERIFIED');
create index if not exists patient_commercial_benefits_lookup_idx
  on public.patient_commercial_benefits(clinic_id, patient_id, status, expires_at);

alter table public.commercial_tariffs enable row level security;
alter table public.commercial_tariff_rules enable row level security;
alter table public.insurance_plans enable row level security;
alter table public.insurance_plan_rules enable row level security;
alter table public.patient_commercial_benefits enable row level security;

revoke all on public.commercial_tariffs, public.commercial_tariff_rules,
  public.insurance_plans, public.insurance_plan_rules, public.patient_commercial_benefits from anon;

create policy commercial_tariffs_staff_read on public.commercial_tariffs
  for select to authenticated using (private.is_clinic_staff(clinic_id));
create policy commercial_tariffs_admin_write on public.commercial_tariffs
  for all to authenticated using (private.is_clinic_admin(clinic_id)) with check (private.is_clinic_admin(clinic_id));
create policy commercial_tariff_rules_staff_read on public.commercial_tariff_rules
  for select to authenticated using (private.is_clinic_staff(clinic_id));
create policy commercial_tariff_rules_admin_write on public.commercial_tariff_rules
  for all to authenticated using (private.is_clinic_admin(clinic_id)) with check (private.is_clinic_admin(clinic_id));
create policy insurance_plans_staff_read on public.insurance_plans
  for select to authenticated using (private.is_clinic_staff(clinic_id));
create policy insurance_plans_admin_write on public.insurance_plans
  for all to authenticated using (private.is_clinic_admin(clinic_id)) with check (private.is_clinic_admin(clinic_id));
create policy insurance_plan_rules_staff_read on public.insurance_plan_rules
  for select to authenticated using (private.is_clinic_staff(clinic_id));
create policy insurance_plan_rules_admin_write on public.insurance_plan_rules
  for all to authenticated using (private.is_clinic_admin(clinic_id)) with check (private.is_clinic_admin(clinic_id));
create policy patient_commercial_benefits_staff_read on public.patient_commercial_benefits
  for select to authenticated using (private.is_clinic_staff(clinic_id));
create policy patient_commercial_benefits_staff_write on public.patient_commercial_benefits
  for all to authenticated using (private.is_clinic_staff(clinic_id)) with check (private.is_clinic_staff(clinic_id));

grant select, insert, update, delete on public.commercial_tariffs, public.commercial_tariff_rules,
  public.insurance_plans, public.insurance_plan_rules, public.patient_commercial_benefits to authenticated;

drop trigger if exists commercial_tariffs_set_updated_at on public.commercial_tariffs;
create trigger commercial_tariffs_set_updated_at before update on public.commercial_tariffs
  for each row execute function private.set_updated_at();
drop trigger if exists commercial_tariff_rules_set_updated_at on public.commercial_tariff_rules;
create trigger commercial_tariff_rules_set_updated_at before update on public.commercial_tariff_rules
  for each row execute function private.set_updated_at();
drop trigger if exists insurance_plans_set_updated_at on public.insurance_plans;
create trigger insurance_plans_set_updated_at before update on public.insurance_plans
  for each row execute function private.set_updated_at();
drop trigger if exists insurance_plan_rules_set_updated_at on public.insurance_plan_rules;
create trigger insurance_plan_rules_set_updated_at before update on public.insurance_plan_rules
  for each row execute function private.set_updated_at();
drop trigger if exists patient_commercial_benefits_set_updated_at on public.patient_commercial_benefits;
create trigger patient_commercial_benefits_set_updated_at before update on public.patient_commercial_benefits
  for each row execute function private.set_updated_at();

drop trigger if exists commercial_tariffs_audit_mutation on public.commercial_tariffs;
create trigger commercial_tariffs_audit_mutation after insert or update or delete on public.commercial_tariffs
  for each row execute function private.audit_sensitive_mutation();
drop trigger if exists commercial_tariff_rules_audit_mutation on public.commercial_tariff_rules;
create trigger commercial_tariff_rules_audit_mutation after insert or update or delete on public.commercial_tariff_rules
  for each row execute function private.audit_sensitive_mutation();
drop trigger if exists insurance_plans_audit_mutation on public.insurance_plans;
create trigger insurance_plans_audit_mutation after insert or update or delete on public.insurance_plans
  for each row execute function private.audit_sensitive_mutation();
drop trigger if exists insurance_plan_rules_audit_mutation on public.insurance_plan_rules;
create trigger insurance_plan_rules_audit_mutation after insert or update or delete on public.insurance_plan_rules
  for each row execute function private.audit_sensitive_mutation();
drop trigger if exists patient_commercial_benefits_audit_mutation on public.patient_commercial_benefits;
create trigger patient_commercial_benefits_audit_mutation after insert or update or delete on public.patient_commercial_benefits
  for each row execute function private.audit_sensitive_mutation();

commit;
