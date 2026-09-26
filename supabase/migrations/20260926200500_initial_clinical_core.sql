create extension if not exists "pgcrypto";

create table if not exists public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  legacy_id integer,
  record_number text,
  first_name text not null,
  last_name text not null,
  dni text,
  phone text,
  email text,
  birth_date timestamptz,
  declared_source text,
  declared_source_detail text,
  photo_url text,
  medical_profile jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  display_name text not null,
  role text not null default 'STAFF',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.cabinets (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.dental_entities (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  tooth text,
  arch text,
  entity_type text not null,
  status text not null,
  surfaces_json jsonb,
  attributes_json jsonb not null default '{}'::jsonb,
  parent_id uuid references public.dental_entities(id) on delete set null,
  active boolean not null default true,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinical_history_events (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  actor_id uuid,
  event_type text not null,
  entity_id uuid,
  entity_type text,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.periodontal_measurements (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  tooth text not null,
  site text not null,
  probing_depth integer check (probing_depth >= 0),
  recession integer,
  bleeding boolean not null default false,
  plaque boolean not null default false,
  mobility integer check (mobility >= 0),
  furcation integer check (furcation >= 0),
  measured_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.odontogram_snapshots (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  label text,
  payload_json jsonb not null,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.clinical_plans (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  status text not null default 'DRAFT',
  source_odontogram_version integer,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinical_plan_items (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  plan_id uuid not null references public.clinical_plans(id) on delete cascade,
  dental_entity_id uuid references public.dental_entities(id) on delete set null,
  tooth text,
  treatment_code text not null,
  label text not null,
  patient_label text,
  clinical_reason text,
  component_type text,
  billing_mode text not null default 'separate' check (billing_mode in ('separate', 'included', 'no_charge')),
  phase integer not null default 1 check (phase between 1 and 5),
  priority integer not null default 0,
  status text not null default 'PLANNED',
  price_cents integer check (price_cents >= 0),
  attributes_json jsonb not null default '{}'::jsonb,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinical_plan_dependencies (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  item_id uuid not null references public.clinical_plan_items(id) on delete cascade,
  depends_on_id uuid not null references public.clinical_plan_items(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  constraint clinical_plan_dependencies_not_self check (item_id <> depends_on_id)
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  clinical_plan_id uuid references public.clinical_plans(id) on delete set null,
  code text not null,
  status text not null default 'DRAFT',
  total_cents integer not null default 0 check (total_cents >= 0),
  source_plan_version integer,
  revision integer not null default 1 check (revision > 0),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budget_items (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  budget_id uuid not null references public.budgets(id) on delete cascade,
  clinical_plan_item_id uuid references public.clinical_plan_items(id) on delete set null,
  component_type text,
  description text not null,
  tooth text,
  billing_mode text not null default 'separate' check (billing_mode in ('separate', 'included', 'no_charge')),
  quantity integer not null default 1 check (quantity > 0),
  unit_price_cents integer not null default 0,
  total_cents integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.budget_signed_snapshots (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  budget_id uuid not null references public.budgets(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete cascade,
  revision integer not null,
  signer_name text not null,
  signature_data text,
  snapshot_json jsonb not null,
  signed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (budget_id, revision)
);

create or replace function public.prevent_budget_signed_snapshot_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'budget_signed_snapshots are immutable';
end;
$$;

create trigger budget_signed_snapshots_immutable
before update or delete on public.budget_signed_snapshots
for each row execute function public.prevent_budget_signed_snapshot_mutation();

create table if not exists public.document_templates (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  code text not null,
  title text not null,
  body text not null,
  schema_json jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  unique (clinic_id, code, version)
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  template_id uuid references public.document_templates(id) on delete set null,
  type text not null,
  title text not null,
  status text not null default 'DRAFT',
  data_json jsonb not null default '{}'::jsonb,
  signer_name text,
  signature_data text,
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.consent_requirements (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  clinical_plan_item_id uuid references public.clinical_plan_items(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  consent_code text not null,
  status text not null default 'REQUIRED',
  required_before text not null default 'BUDGET_SIGNATURE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  staff_id uuid not null references public.staff_members(id) on delete restrict,
  site_id uuid not null references public.sites(id) on delete restrict,
  cabinet_id uuid references public.cabinets(id) on delete set null,
  clinical_plan_item_id uuid references public.clinical_plan_items(id) on delete set null,
  budget_signed_snapshot_id uuid references public.budget_signed_snapshots(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'PLANNED',
  title text not null,
  reason text,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_valid_time check (ends_at > starts_at)
);

alter table public.patients enable row level security;
alter table public.dental_entities enable row level security;
alter table public.clinical_history_events enable row level security;
alter table public.periodontal_measurements enable row level security;
alter table public.odontogram_snapshots enable row level security;
alter table public.clinical_plans enable row level security;
alter table public.clinical_plan_items enable row level security;
alter table public.budgets enable row level security;
alter table public.budget_items enable row level security;
alter table public.budget_signed_snapshots enable row level security;
alter table public.documents enable row level security;
alter table public.consent_requirements enable row level security;
alter table public.appointments enable row level security;
