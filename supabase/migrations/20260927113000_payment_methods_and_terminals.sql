-- Denty Payments: sellable provider-neutral payment methods and terminals.
-- A clinic may mix cash, transfer, Bizum, conventional bank terminals, SumUp and Stripe.
create table if not exists public.clinic_payment_methods (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  label text not null,
  payment_method text not null check (payment_method in ('CASH','CARD','TRANSFER','BIZUM','FINANCING','OTHER')),
  provider text not null check (provider in ('bank_terminal','sumup','stripe','manual')),
  integration_mode text not null default 'manual' check (integration_mode in ('connected','semi_connected','manual')),
  enabled boolean not null default true,
  is_default boolean not null default false,
  priority integer not null default 100,
  capabilities text[] not null default '{}'::text[],
  provider_public_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists clinic_payment_methods_one_default_idx
  on public.clinic_payment_methods(clinic_id) where is_default;
create index if not exists clinic_payment_methods_enabled_idx
  on public.clinic_payment_methods(clinic_id, enabled, priority);
alter table public.clinic_payment_methods enable row level security;
do $$ begin
  if exists(select 1 from pg_proc where proname='is_clinic_member') then
    execute 'create policy clinic_payment_methods_clinic on public.clinic_payment_methods for all using (public.is_clinic_member(clinic_id)) with check (public.is_clinic_member(clinic_id))';
  end if;
exception when duplicate_object then null; end $$;

create table if not exists public.payment_terminals (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  payment_method_id uuid not null references public.clinic_payment_methods(id) on delete cascade,
  label text not null,
  provider_terminal_id text,
  status text not null default 'unknown' check (status in ('unknown','offline','online','busy')),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payment_terminals_method_idx on public.payment_terminals(payment_method_id);
alter table public.payment_terminals enable row level security;
do $$ begin
  if exists(select 1 from pg_proc where proname='is_clinic_member') then
    execute 'create policy payment_terminals_clinic on public.payment_terminals for all using (public.is_clinic_member(clinic_id)) with check (public.is_clinic_member(clinic_id))';
  end if;
exception when duplicate_object then null; end $$;

-- Stage 13: the payment_attempts columns moved to 20260927210000_payment_providers.sql,
-- because payment_attempts is created there (fresh installs failed on this ordering).
