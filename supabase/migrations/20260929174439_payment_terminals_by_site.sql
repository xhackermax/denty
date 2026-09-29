-- Connected card terminals (SumUp / Stripe Terminal) registered from Denty and
-- assigned to a site, so each reception desk charges on its own terminal.

alter table public.payment_terminals add column if not exists provider text;
alter table public.payment_terminals add column if not exists site_id uuid references public.sites(id) on delete set null;
alter table public.payment_terminals add column if not exists device_model text;
alter table public.payment_terminals alter column payment_method_id drop not null;

do $$ begin
  alter table public.payment_terminals
    add constraint payment_terminals_provider_ck check (provider is null or provider in ('sumup','stripe'));
exception when duplicate_object then null; end $$;

create unique index if not exists payment_terminals_provider_terminal_uidx
  on public.payment_terminals(clinic_id, provider, provider_terminal_id)
  where provider is not null and provider_terminal_id is not null;
create index if not exists payment_terminals_site_idx on public.payment_terminals(clinic_id, site_id);

-- Stripe Terminal needs a "location" per physical site; created once and reused.
alter table public.sites add column if not exists stripe_terminal_location_id text;
