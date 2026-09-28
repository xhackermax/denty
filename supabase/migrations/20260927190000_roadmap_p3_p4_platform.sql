-- Denty P3/P4 platform foundations. Compliance adapters remain opt-in and require provider/legal validation.
create table if not exists public.fiscal_records (
 id uuid primary key default gen_random_uuid(), clinic_id uuid not null, invoice_id uuid, record_type text not null check(record_type in ('alta','anulacion')),
 payload jsonb not null, previous_hash text, record_hash text not null, provider_status text not null default 'pending', provider_reference text,
 created_at timestamptz not null default now(), unique(clinic_id, record_hash)
);
create index if not exists fiscal_records_chain_idx on public.fiscal_records(clinic_id, created_at, id);

create table if not exists public.integration_events (
 id uuid primary key default gen_random_uuid(), clinic_id uuid not null, scope text not null, external_event_id text not null,
 idempotency_key text not null, payload jsonb not null default '{}'::jsonb, status text not null default 'pending', attempts integer not null default 0,
 last_error text, processed_at timestamptz, created_at timestamptz not null default now(), unique(clinic_id,idempotency_key)
);
create index if not exists integration_events_pending_idx on public.integration_events(status,created_at);

create table if not exists public.bank_transactions (
 id uuid primary key default gen_random_uuid(), clinic_id uuid not null, provider text not null, external_id text not null,
 amount_cents bigint not null, currency text not null default 'EUR', occurred_at timestamptz not null, reference text, raw jsonb not null default '{}'::jsonb,
 reconciled_payment_id uuid, created_at timestamptz not null default now(), unique(clinic_id,provider,external_id)
);

create table if not exists public.ai_clinical_reviews (
 id uuid primary key default gen_random_uuid(), clinic_id uuid not null, patient_id uuid not null, document_id uuid,
 modality text not null default 'radiograph', model_provider text not null, model_version text not null, findings jsonb not null,
 status text not null default 'requires_human_review' check(status in ('requires_human_review','accepted','rejected','superseded')),
 reviewed_by uuid, reviewed_at timestamptz, created_at timestamptz not null default now()
);

create table if not exists public.kiosk_checkins (
 id uuid primary key default gen_random_uuid(), clinic_id uuid not null, appointment_id uuid not null, patient_id uuid not null,
 channel text not null default 'kiosk', checked_in_at timestamptz not null default now(), metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.interoperability_exports (
 id uuid primary key default gen_random_uuid(), clinic_id uuid not null, patient_id uuid, standard text not null,
 standard_version text not null, resource_type text not null, resource_id text not null, checksum text,
 created_by uuid, created_at timestamptz not null default now()
);

alter table public.fiscal_records enable row level security;
alter table public.integration_events enable row level security;
alter table public.bank_transactions enable row level security;
alter table public.ai_clinical_reviews enable row level security;
alter table public.kiosk_checkins enable row level security;
alter table public.interoperability_exports enable row level security;

-- Reuse P0 helper when present. Policies are intentionally clinic-scoped.
do $$ begin
 if exists(select 1 from pg_proc where proname='is_clinic_member') then
  execute 'create policy fiscal_records_clinic on public.fiscal_records for all using (public.is_clinic_member(clinic_id)) with check (public.is_clinic_member(clinic_id))';
  execute 'create policy integration_events_clinic on public.integration_events for all using (public.is_clinic_member(clinic_id)) with check (public.is_clinic_member(clinic_id))';
  execute 'create policy bank_transactions_clinic on public.bank_transactions for all using (public.is_clinic_member(clinic_id)) with check (public.is_clinic_member(clinic_id))';
  execute 'create policy ai_reviews_clinic on public.ai_clinical_reviews for all using (public.is_clinic_member(clinic_id)) with check (public.is_clinic_member(clinic_id))';
  execute 'create policy kiosk_checkins_clinic on public.kiosk_checkins for all using (public.is_clinic_member(clinic_id)) with check (public.is_clinic_member(clinic_id))';
  execute 'create policy interoperability_exports_clinic on public.interoperability_exports for all using (public.is_clinic_member(clinic_id)) with check (public.is_clinic_member(clinic_id))';
 end if;
exception when duplicate_object then null;
end $$;
