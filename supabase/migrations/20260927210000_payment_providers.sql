-- Denty: provider-agnostic in-person payment configuration.
-- Secrets/API keys MUST stay in a server-side secret manager or environment variables.
create table if not exists public.clinic_payment_settings (
  clinic_id uuid primary key references public.clinics(id) on delete cascade,
  default_provider text not null default 'manual' check (default_provider in ('manual','sumup','stripe')),
  manual_enabled boolean not null default true,
  sumup_enabled boolean not null default false,
  stripe_enabled boolean not null default false,
  sumup_merchant_code text,
  sumup_reader_id text,
  stripe_connected_account_id text,
  updated_at timestamptz not null default now()
);

alter table public.clinic_payment_settings enable row level security;

do $$ begin
  if exists(select 1 from pg_proc where proname='is_clinic_member') then
    execute 'create policy clinic_payment_settings_clinic on public.clinic_payment_settings for all using (public.is_clinic_member(clinic_id)) with check (public.is_clinic_member(clinic_id))';
  end if;
exception when duplicate_object then null;
end $$;

create index if not exists clinic_payment_settings_default_provider_idx
  on public.clinic_payment_settings(default_provider);

alter table public.payments add column if not exists idempotency_key text;
alter table public.payments add column if not exists provider_metadata jsonb not null default '{}'::jsonb;
create unique index if not exists payments_clinic_idempotency_idx
  on public.payments(clinic_id, idempotency_key)
  where idempotency_key is not null;

create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete restrict,
  provider text not null check (provider in ('manual','sumup','stripe')),
  provider_status text not null default 'created' check (provider_status in ('created','processing','requires_action','succeeded','failed','cancelled','expired')),
  idempotency_key text not null,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  budget_id uuid references public.budgets(id) on delete set null,
  provider_transaction_id text,
  provider_checkout_id text,
  reader_id text,
  error_code text,
  error_message text,
  ledger_payment_id uuid references public.payments(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create unique index if not exists payment_attempts_clinic_provider_idempotency_idx
  on public.payment_attempts(clinic_id, provider, idempotency_key);
create index if not exists payment_attempts_patient_created_idx on public.payment_attempts(patient_id, created_at desc);
alter table public.payment_attempts enable row level security;
do $$ begin
  if exists(select 1 from pg_proc where proname='is_clinic_member') then
    execute 'create policy payment_attempts_clinic on public.payment_attempts for all using (public.is_clinic_member(clinic_id)) with check (public.is_clinic_member(clinic_id))';
  end if;
exception when duplicate_object then null;
end $$;
