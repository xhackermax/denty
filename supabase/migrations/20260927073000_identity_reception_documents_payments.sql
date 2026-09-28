-- Denty P0 identity, reception, patient portal, documents and payments foundation.
-- Designed for Supabase Auth + RLS. Browser clients must use the publishable key;
-- privileged secret/service-role credentials remain server-only.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  email text,
  phone text,
  avatar_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinic_members (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('ADMIN', 'USER', 'PATIENT')),
  staff_type text check (staff_type in ('DENTIST', 'SECRETARY') or staff_type is null),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, profile_id)
);

create table if not exists public.user_permissions (
  id uuid primary key default gen_random_uuid(),
  clinic_member_id uuid not null references public.clinic_members(id) on delete cascade,
  permission text not null,
  allowed boolean not null default true,
  created_at timestamptz not null default now(),
  unique (clinic_member_id, permission)
);

create table if not exists public.patient_accounts (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (clinic_id, patient_id, profile_id)
);

alter table public.staff_members add column if not exists profile_id uuid references public.profiles(id) on delete set null;

alter table public.appointments add column if not exists arrived_at timestamptz;
alter table public.appointments add column if not exists waiting_room_at timestamptz;
alter table public.appointments add column if not exists chair_started_at timestamptz;
alter table public.appointments add column if not exists completed_at timestamptz;
alter table public.appointments add column if not exists cancelled_at timestamptz;
alter table public.appointments add column if not exists no_show_at timestamptz;
alter table public.appointments add column if not exists appointment_type text;
alter table public.appointments add column if not exists rescheduled_from_id uuid references public.appointments(id) on delete set null;

create table if not exists public.appointment_status_events (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  previous_status text,
  new_status text not null check (new_status in ('PLANNED','ARRIVED','WAITING','IN_CHAIR','COMPLETED','NO_SHOW','CANCELLED','RUNNING_LATE')),
  changed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.appointment_relationships (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  original_appointment_id uuid not null references public.appointments(id) on delete cascade,
  replacement_appointment_id uuid not null references public.appointments(id) on delete cascade,
  reason text not null check (reason in ('NO_SHOW','PATIENT_CANCELLED','CLINIC_RESCHEDULE')),
  created_at timestamptz not null default now(),
  unique (original_appointment_id, replacement_appointment_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  patient_id uuid references public.patients(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  action_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.documents add column if not exists file_name text;
alter table public.documents add column if not exists mime_type text;
alter table public.documents add column if not exists storage_path text;
alter table public.documents add column if not exists checksum text;
alter table public.documents add column if not exists version integer not null default 1 check (version > 0);
alter table public.documents add column if not exists previous_version_id uuid references public.documents(id) on delete set null;
alter table public.documents add column if not exists created_by uuid references public.profiles(id) on delete set null;

create table if not exists public.document_exports (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  selected_document_ids uuid[] not null,
  document_count integer not null check (document_count > 0),
  format text not null default 'PDF' check (format = 'PDF'),
  checksum text,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete restrict,
  budget_id uuid references public.budgets(id) on delete set null,
  amount_cents integer not null check (amount_cents > 0),
  method text not null check (method in ('CASH','CARD','TRANSFER','FINANCING','OTHER')),
  status text not null default 'COMPLETED' check (status in ('PENDING','COMPLETED','REFUNDED','PARTIALLY_REFUNDED','FAILED')),
  provider text,
  provider_transaction_id text,
  received_by uuid references public.profiles(id) on delete set null,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  patient_id uuid references public.patients(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_clinic_member(target_clinic_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.clinic_members cm
    where cm.clinic_id = target_clinic_id and cm.profile_id = auth.uid() and cm.active
  );
$$;

create or replace function public.is_clinic_admin(target_clinic_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.clinic_members cm
    where cm.clinic_id = target_clinic_id and cm.profile_id = auth.uid() and cm.active and cm.role = 'ADMIN'
  );
$$;

create or replace function public.can_access_patient(target_clinic_id uuid, target_patient_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select public.is_clinic_member(target_clinic_id)
    or exists (
      select 1 from public.patient_accounts pa
      where pa.clinic_id = target_clinic_id and pa.patient_id = target_patient_id
        and pa.profile_id = auth.uid() and pa.active
    );
$$;

alter table public.profiles enable row level security;
alter table public.clinic_members enable row level security;
alter table public.user_permissions enable row level security;
alter table public.patient_accounts enable row level security;
alter table public.appointment_status_events enable row level security;
alter table public.appointment_relationships enable row level security;
alter table public.notifications enable row level security;
alter table public.document_exports enable row level security;
alter table public.payments enable row level security;
alter table public.audit_log enable row level security;

create policy profiles_self_select on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_self_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy clinic_members_select on public.clinic_members for select to authenticated using (profile_id = auth.uid() or public.is_clinic_admin(clinic_id));
create policy user_permissions_select on public.user_permissions for select to authenticated using (
  exists (select 1 from public.clinic_members cm where cm.id = clinic_member_id and (cm.profile_id = auth.uid() or public.is_clinic_admin(cm.clinic_id)))
);
create policy patient_accounts_select on public.patient_accounts for select to authenticated using (profile_id = auth.uid() or public.is_clinic_member(clinic_id));

-- Replace permissive clinical reads with authenticated clinic/patient isolation.
create policy patients_access on public.patients for select to authenticated using (public.can_access_patient(clinic_id, id));
create policy appointments_access on public.appointments for select to authenticated using (public.can_access_patient(clinic_id, patient_id));
create policy documents_access on public.documents for select to authenticated using (public.can_access_patient(clinic_id, patient_id));
create policy payments_access on public.payments for select to authenticated using (public.can_access_patient(clinic_id, patient_id));
create policy notifications_recipient_access on public.notifications for select to authenticated using (recipient_profile_id = auth.uid());
create policy document_exports_staff_access on public.document_exports for select to authenticated using (public.is_clinic_member(clinic_id));
create policy appointment_status_staff_access on public.appointment_status_events for select to authenticated using (public.is_clinic_member(clinic_id));
create policy appointment_relationships_access on public.appointment_relationships for select to authenticated using (public.is_clinic_member(clinic_id));
create policy audit_admin_access on public.audit_log for select to authenticated using (public.is_clinic_admin(clinic_id));

create index if not exists clinic_members_profile_idx on public.clinic_members(profile_id, clinic_id);
create index if not exists patient_accounts_profile_idx on public.patient_accounts(profile_id, patient_id);
create index if not exists appointment_status_events_appointment_idx on public.appointment_status_events(appointment_id, created_at desc);
create index if not exists notifications_recipient_idx on public.notifications(recipient_profile_id, read_at, created_at desc);
create index if not exists documents_patient_idx on public.documents(patient_id, created_at desc);
create index if not exists payments_patient_paid_idx on public.payments(patient_id, paid_at desc);
create index if not exists audit_log_clinic_created_idx on public.audit_log(clinic_id, created_at desc);
