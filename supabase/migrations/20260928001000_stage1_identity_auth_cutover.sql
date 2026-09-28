-- Stage 1: Supabase Auth cutover.
-- Canonical identity: auth.users -> profiles -> clinic_members/patient_accounts.
-- Authorization data stays in Postgres/RLS, never in user-editable metadata.

-- 1) Normalize role vocabulary with the application domain.
alter table public.clinic_members drop constraint if exists clinic_members_role_check;
update public.clinic_members
set role = case
  when role = 'USER' and staff_type = 'DENTIST' then 'DENTIST'
  when role = 'USER' and staff_type = 'SECRETARY' then 'RECEPTION'
  when role = 'USER' then 'ASSISTANT'
  else role
end
where role = 'USER';
alter table public.clinic_members
  add constraint clinic_members_role_check
  check (role in ('ADMIN','RECEPTION','DENTIST','ASSISTANT','PATIENT'));

alter table public.clinic_members add column if not exists is_default boolean not null default false;
alter table public.patient_accounts add column if not exists is_default boolean not null default false;
create unique index if not exists clinic_members_one_default_per_profile
  on public.clinic_members(profile_id) where is_default and active;
create unique index if not exists patient_accounts_one_default_per_profile
  on public.patient_accounts(profile_id) where is_default and active;

-- 2) Keep staff identity linked 1:1 to an Auth profile inside a clinic.
update public.staff_members sm
set role = case
  when upper(sm.role) in ('ADMIN','RECEPTION','DENTIST','ASSISTANT') then upper(sm.role)
  when upper(sm.role) in ('SECRETARY','SECRETARIA','OPERATIONAL') then 'RECEPTION'
  else 'ASSISTANT'
end;
alter table public.staff_members drop constraint if exists staff_members_role_check;
alter table public.staff_members
  add constraint staff_members_role_check
  check (role in ('ADMIN','RECEPTION','DENTIST','ASSISTANT'));
create unique index if not exists staff_members_active_profile_per_clinic
  on public.staff_members(clinic_id, profile_id)
  where profile_id is not null and active;

-- 3) Auto-create a profile when an Auth user is created.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id, first_name, last_name, email, phone, active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'display_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    new.email,
    new.phone,
    true
  )
  on conflict (id) do update
    set email = excluded.email,
        phone = excluded.phone,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- 4) A real application-session registry. The Auth refresh/access tokens remain
-- in HttpOnly cookies; this table is for device visibility and app-level revocation.
create table if not exists public.app_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  auth_session_id uuid,
  device_label text not null default 'Navegador',
  user_agent text,
  ip_hash text,
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists app_sessions_profile_active_idx
  on public.app_sessions(profile_id, revoked_at, expires_at desc);
create unique index if not exists app_sessions_auth_session_unique
  on public.app_sessions(profile_id, auth_session_id)
  where auth_session_id is not null and revoked_at is null;

alter table public.app_sessions enable row level security;
revoke all on table public.app_sessions from anon;
revoke all on table public.app_sessions from authenticated;
grant select, insert, update on table public.app_sessions to authenticated;

-- is_clinic_member is intentionally STAFF-only. A portal patient must never gain
-- clinic-wide visibility just because a PATIENT membership row exists.
create or replace function public.is_clinic_member(target_clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.clinic_members cm
    where cm.clinic_id = target_clinic_id
      and cm.profile_id = (select auth.uid())
      and cm.active
      and cm.role in ('ADMIN','RECEPTION','DENTIST','ASSISTANT')
  );
$$;

create or replace function public.is_clinic_admin(target_clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.clinic_members cm
    where cm.clinic_id = target_clinic_id
      and cm.profile_id = (select auth.uid())
      and cm.active
      and cm.role = 'ADMIN'
  );
$$;

create or replace function public.can_access_patient(target_clinic_id uuid, target_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_clinic_member(target_clinic_id)
    or exists (
      select 1
      from public.patient_accounts pa
      where pa.clinic_id = target_clinic_id
        and pa.patient_id = target_patient_id
        and pa.profile_id = (select auth.uid())
        and pa.active
    );
$$;

-- Authenticated users can only see/manage their own app session rows. Clinic admins
-- can inspect sessions in their clinic to support security administration.
drop policy if exists app_sessions_select on public.app_sessions;
create policy app_sessions_select on public.app_sessions
for select to authenticated
using (profile_id = (select auth.uid()) or public.is_clinic_admin(clinic_id));

drop policy if exists app_sessions_insert on public.app_sessions;
create policy app_sessions_insert on public.app_sessions
for insert to authenticated
with check (
  profile_id = (select auth.uid())
  and (
    public.is_clinic_member(clinic_id)
    or exists (
      select 1 from public.patient_accounts pa
      where pa.profile_id = (select auth.uid())
        and pa.clinic_id = app_sessions.clinic_id
        and pa.active
    )
  )
);

drop policy if exists app_sessions_update on public.app_sessions;
create policy app_sessions_update on public.app_sessions
for update to authenticated
using (profile_id = (select auth.uid()) or public.is_clinic_admin(clinic_id))
with check (profile_id = (select auth.uid()) or public.is_clinic_admin(clinic_id));

-- Tighten identity tables. Admin provisioning is server-only and uses the secret key.
revoke insert, update, delete on public.clinic_members from authenticated;
revoke insert, update, delete on public.user_permissions from authenticated;
revoke insert, update, delete on public.patient_accounts from authenticated;

-- 5) Retire the insecure local password store. Preserve only non-secret migration
-- metadata when the legacy table exists, then remove every password hash.
create table if not exists public.legacy_identity_map (
  legacy_user_id uuid primary key,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  legacy_username text,
  display_name text not null,
  legacy_role text not null,
  patient_id uuid references public.patients(id) on delete set null,
  migrated_profile_id uuid references public.profiles(id) on delete set null,
  migrated_at timestamptz
);

do $$
begin
  if to_regclass('public.denty_users') is not null then
    insert into public.legacy_identity_map(
      legacy_user_id, clinic_id, legacy_username, display_name, legacy_role, patient_id
    )
    select id, clinic_id, username, display_name, role, patient_id
    from public.denty_users
    on conflict (legacy_user_id) do nothing;
  end if;
end $$;

drop table if exists public.denty_users;

alter table public.legacy_identity_map enable row level security;
revoke all on table public.legacy_identity_map from anon, authenticated;

-- No default/autocreated clinic is introduced here. A profile must be linked by an
-- explicit clinic_members or patient_accounts row before it can create a session.

-- 6) Minimal user-scoped policies required immediately after the Auth cutover.
-- The broader policy/constraint sweep continues in Stage 2.
create or replace function public.can_admin_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.clinic_members mine
    join public.clinic_members target on target.clinic_id = mine.clinic_id
    where mine.profile_id = (select auth.uid())
      and mine.active
      and mine.role = 'ADMIN'
      and target.profile_id = target_profile_id
      and target.active
  );
$$;

drop policy if exists profiles_admin_select on public.profiles;
create policy profiles_admin_select on public.profiles
for select to authenticated
using (public.can_admin_profile(id));

alter table public.staff_members enable row level security;
revoke all on table public.staff_members from anon;
revoke insert, update, delete on public.staff_members from authenticated;
grant select on table public.staff_members to authenticated;
drop policy if exists staff_members_clinic_select on public.staff_members;
create policy staff_members_clinic_select on public.staff_members
for select to authenticated
using (public.is_clinic_member(clinic_id));

-- Staff CRUD for patient demographics. Patient portal remains read-only here.
drop policy if exists patients_staff_insert on public.patients;
create policy patients_staff_insert on public.patients
for insert to authenticated
with check (public.is_clinic_member(clinic_id));

drop policy if exists patients_staff_update on public.patients;
create policy patients_staff_update on public.patients
for update to authenticated
using (public.is_clinic_member(clinic_id))
with check (public.is_clinic_member(clinic_id));

-- Odontogram local route currently touches these tables directly.
alter table public.dental_entities enable row level security;
alter table public.clinical_history_events enable row level security;
alter table public.periodontal_measurements enable row level security;
alter table public.odontogram_snapshots enable row level security;

drop policy if exists dental_entities_access on public.dental_entities;
create policy dental_entities_access on public.dental_entities
for select to authenticated
using (public.can_access_patient(clinic_id, patient_id));
drop policy if exists dental_entities_staff_insert on public.dental_entities;
create policy dental_entities_staff_insert on public.dental_entities
for insert to authenticated
with check (public.is_clinic_member(clinic_id));
drop policy if exists dental_entities_staff_update on public.dental_entities;
create policy dental_entities_staff_update on public.dental_entities
for update to authenticated
using (public.is_clinic_member(clinic_id))
with check (public.is_clinic_member(clinic_id));

drop policy if exists clinical_history_access on public.clinical_history_events;
create policy clinical_history_access on public.clinical_history_events
for select to authenticated
using (public.can_access_patient(clinic_id, patient_id));
drop policy if exists clinical_history_staff_insert on public.clinical_history_events;
create policy clinical_history_staff_insert on public.clinical_history_events
for insert to authenticated
with check (public.is_clinic_member(clinic_id));

drop policy if exists periodontal_access on public.periodontal_measurements;
create policy periodontal_access on public.periodontal_measurements
for select to authenticated
using (public.can_access_patient(clinic_id, patient_id));
drop policy if exists periodontal_staff_insert on public.periodontal_measurements;
create policy periodontal_staff_insert on public.periodontal_measurements
for insert to authenticated
with check (public.is_clinic_member(clinic_id));
drop policy if exists periodontal_staff_update on public.periodontal_measurements;
create policy periodontal_staff_update on public.periodontal_measurements
for update to authenticated
using (public.is_clinic_member(clinic_id))
with check (public.is_clinic_member(clinic_id));

drop policy if exists odontogram_snapshots_access on public.odontogram_snapshots;
create policy odontogram_snapshots_access on public.odontogram_snapshots
for select to authenticated
using (public.can_access_patient(clinic_id, patient_id));
drop policy if exists odontogram_snapshots_staff_insert on public.odontogram_snapshots;
create policy odontogram_snapshots_staff_insert on public.odontogram_snapshots
for insert to authenticated
with check (public.is_clinic_member(clinic_id));
