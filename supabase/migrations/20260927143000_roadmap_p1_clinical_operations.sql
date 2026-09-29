-- Denty roadmap P1: treatment gates, availability safety, payment allocation and recalls.
create table if not exists public.appointment_blocks (
  id uuid primary key default gen_random_uuid(), clinic_id uuid not null references public.clinics(id) on delete cascade,
  professional_profile_id uuid references public.profiles(id) on delete cascade,
  starts_at timestamptz not null, ends_at timestamptz not null, reason text, created_at timestamptz not null default now(),
  constraint appointment_blocks_valid_range check (ends_at > starts_at)
);
create table if not exists public.payment_allocations (
  id uuid primary key default gen_random_uuid(), payment_id uuid not null references public.payments(id) on delete cascade,
  budget_id uuid, amount_cents bigint not null check (amount_cents > 0), created_at timestamptz not null default now()
);
create table if not exists public.patient_recalls (
  id uuid primary key default gen_random_uuid(), clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade, due_at timestamptz not null,
  kind text not null, status text not null default 'pending' check (status in ('pending','contacted','booked','dismissed')),
  source_appointment_id uuid references public.appointments(id) on delete set null, created_at timestamptz not null default now()
);
create index if not exists appointment_blocks_clinic_time_idx on public.appointment_blocks(clinic_id, starts_at, ends_at);
create index if not exists patient_recalls_due_idx on public.patient_recalls(clinic_id, status, due_at);
alter table public.appointment_blocks enable row level security;
alter table public.payment_allocations enable row level security;
alter table public.patient_recalls enable row level security;
create policy "clinic members read appointment blocks" on public.appointment_blocks for select using (public.is_clinic_member(clinic_id));
create policy "staff manage appointment blocks" on public.appointment_blocks for all using (public.is_clinic_staff(clinic_id)) with check (public.is_clinic_staff(clinic_id));
create policy "staff manage payment allocations" on public.payment_allocations for all using (exists(select 1 from public.payments p where p.id=payment_id and public.is_clinic_staff(p.clinic_id))) with check (exists(select 1 from public.payments p where p.id=payment_id and public.is_clinic_staff(p.clinic_id)));
create policy "clinic members read recalls" on public.patient_recalls for select using (public.is_clinic_member(clinic_id) or public.is_patient_owner(patient_id));
create policy "staff manage recalls" on public.patient_recalls for all using (public.is_clinic_staff(clinic_id)) with check (public.is_clinic_staff(clinic_id));
