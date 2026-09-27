create table if not exists public.denty_users (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  username text not null,
  display_name text not null,
  role text not null check (role in ('ADMIN', 'RECEPTION', 'DENTIST', 'ASSISTANT', 'PATIENT')),
  password_hash text not null,
  permissions text[] not null default '{}',
  active boolean not null default true,
  patient_id uuid references public.patients(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, username)
);

create index if not exists denty_users_username_idx on public.denty_users(username)
where active;

create index if not exists denty_users_clinic_idx on public.denty_users(clinic_id, role, active);
