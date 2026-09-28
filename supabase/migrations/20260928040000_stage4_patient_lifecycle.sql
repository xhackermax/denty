-- Denty Stage 4: patient master record, import preservation, archive/restore and retention safety.
-- Canonical patient records are retained; operational deletion is replaced by archive/restore.

set lock_timeout = '5s';
set statement_timeout = '60s';

-- Birth dates are calendar dates, not instants. Existing values were written as Madrid-local midnights.
alter table public.patients
  alter column birth_date type date
  using case
    when birth_date is null then null
    else (birth_date at time zone 'Europe/Madrid')::date
  end;

-- Normalize optional identifiers and guarantee every patient keeps a stable clinic-local file number.
update public.patients set dni = null where dni is not null and btrim(dni) = '';
update public.patients
set record_number = 'DNT-' || upper(substr(replace(id::text, '-', ''), 1, 12))
where record_number is null or btrim(record_number) = '';

alter table public.patients
  alter column record_number set not null;

alter table public.patients drop constraint if exists patients_dni_non_blank_chk;
alter table public.patients add constraint patients_dni_non_blank_chk
  check (dni is null or btrim(dni) <> '');

alter table public.patients drop constraint if exists patients_record_number_non_blank_chk;
alter table public.patients add constraint patients_record_number_non_blank_chk
  check (btrim(record_number) <> '');

drop index if exists public.patients_clinic_record_number_uq;
create unique index patients_clinic_record_number_uq
  on public.patients(clinic_id, record_number);

alter table public.patients add column if not exists archived_reason text;
alter table public.patients add column if not exists archived_by uuid references public.profiles(id) on delete set null;

-- Immutable history of clinically relevant medical-profile snapshots.
create table if not exists public.patient_medical_profile_versions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  profile_version integer not null check (profile_version > 0),
  medical_profile jsonb not null,
  changed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (patient_id, profile_version)
);

alter table public.patient_medical_profile_versions enable row level security;
revoke all on table public.patient_medical_profile_versions from anon;
revoke insert, update, delete on table public.patient_medical_profile_versions from authenticated;
grant select on table public.patient_medical_profile_versions to authenticated;

drop policy if exists patient_medical_profile_versions_access on public.patient_medical_profile_versions;
create policy patient_medical_profile_versions_access
on public.patient_medical_profile_versions
for select to authenticated
using ((select private.can_access_patient(clinic_id, patient_id)));

create index if not exists patient_medical_profile_versions_patient_idx
  on public.patient_medical_profile_versions(patient_id, profile_version desc);

insert into public.patient_medical_profile_versions(
  clinic_id, patient_id, profile_version, medical_profile, changed_by, created_at
)
select p.clinic_id, p.id, 1, coalesce(p.medical_profile, '{}'::jsonb), null, p.created_at
from public.patients p
where not exists (
  select 1 from public.patient_medical_profile_versions v where v.patient_id = p.id
);

create or replace function private.version_patient_medical_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_next_version integer;
begin
  if tg_op = 'UPDATE' and old.medical_profile is not distinct from new.medical_profile then
    return new;
  end if;

  select coalesce(max(v.profile_version), 0) + 1
    into v_next_version
  from public.patient_medical_profile_versions v
  where v.patient_id = new.id;

  insert into public.patient_medical_profile_versions(
    clinic_id, patient_id, profile_version, medical_profile, changed_by
  ) values (
    new.clinic_id,
    new.id,
    v_next_version,
    coalesce(new.medical_profile, '{}'::jsonb),
    (select auth.uid())
  );
  return new;
end;
$$;

revoke all on function private.version_patient_medical_profile() from public, anon, authenticated;

drop trigger if exists patients_version_medical_profile on public.patients;
create trigger patients_version_medical_profile
after insert or update on public.patients
for each row execute function private.version_patient_medical_profile();

-- Hard deletion of a clinical patient master record is forbidden, even to privileged application code.
create or replace function private.prevent_patient_hard_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception using
    errcode = '23503',
    message = 'PATIENT_HARD_DELETE_FORBIDDEN',
    detail = 'Archive the patient instead of deleting the clinical master record.';
end;
$$;

revoke all on function private.prevent_patient_hard_delete() from public, anon, authenticated;
drop trigger if exists prevent_patient_hard_delete on public.patients;
create trigger prevent_patient_hard_delete
before delete on public.patients
for each row execute function private.prevent_patient_hard_delete();

revoke delete on table public.patients from anon;
revoke delete on table public.patients from authenticated;

-- A clinic must not be able to erase the patient master record by cascading through patients.clinic_id.
do $$
declare
  r record;
  v_definition text;
begin
  for r in
    select c.oid, c.conname, c.conrelid::regclass as child_table, c.convalidated
    from pg_catalog.pg_constraint c
    where c.contype = 'f'
      and c.conrelid = 'public.patients'::regclass
      and c.confrelid = 'public.clinics'::regclass
      and c.confdeltype = 'c'
  loop
    v_definition := pg_catalog.pg_get_constraintdef(r.oid);
    v_definition := regexp_replace(v_definition, 'ON DELETE CASCADE', 'ON DELETE RESTRICT', 'i');
    execute format('alter table %s drop constraint %I', r.child_table, r.conname);
    execute format(
      'alter table %s add constraint %I %s%s',
      r.child_table,
      r.conname,
      v_definition,
      case when r.convalidated then '' else ' NOT VALID' end
    );
  end loop;
end;
$$;

-- Convert every existing CASCADE foreign key that points at patients to RESTRICT.
-- This is defense in depth in addition to the hard-delete trigger above.
do $$
declare
  r record;
  v_definition text;
begin
  for r in
    select c.oid, c.conname, c.conrelid::regclass as child_table, c.convalidated
    from pg_catalog.pg_constraint c
    where c.contype = 'f'
      and c.confrelid = 'public.patients'::regclass
      and c.confdeltype = 'c'
  loop
    v_definition := pg_catalog.pg_get_constraintdef(r.oid);
    v_definition := regexp_replace(v_definition, 'ON DELETE CASCADE', 'ON DELETE RESTRICT', 'i');
    execute format('alter table %s drop constraint %I', r.child_table, r.conname);
    execute format(
      'alter table %s add constraint %I %s%s',
      r.child_table,
      r.conname,
      v_definition,
      case when r.convalidated then '' else ' NOT VALID' end
    );
  end loop;
end;
$$;

-- Optimistic archive/restore commands. SECURITY INVOKER keeps RLS in force.
create or replace function public.archive_patient(
  p_patient_id uuid,
  p_expected_version integer,
  p_reason text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_patient public.patients%rowtype;
begin
  update public.patients p
     set archived_at = now(),
         archived_reason = nullif(btrim(p_reason), ''),
         archived_by = (select auth.uid()),
         version = p.version + 1
   where p.id = p_patient_id
     and p.version = p_expected_version
     and p.archived_at is null
  returning p.* into v_patient;

  if not found then
    return jsonb_build_object('conflict', true);
  end if;

  return jsonb_build_object(
    'conflict', false,
    'id', v_patient.id,
    'version', v_patient.version,
    'archivedAt', v_patient.archived_at,
    'archivedReason', v_patient.archived_reason
  );
end;
$$;

create or replace function public.restore_patient(
  p_patient_id uuid,
  p_expected_version integer
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_patient public.patients%rowtype;
begin
  update public.patients p
     set archived_at = null,
         archived_reason = null,
         archived_by = null,
         version = p.version + 1
   where p.id = p_patient_id
     and p.version = p_expected_version
     and p.archived_at is not null
  returning p.* into v_patient;

  if not found then
    return jsonb_build_object('conflict', true);
  end if;

  return jsonb_build_object(
    'conflict', false,
    'id', v_patient.id,
    'version', v_patient.version,
    'archivedAt', v_patient.archived_at
  );
end;
$$;

revoke all on function public.archive_patient(uuid, integer, text) from public, anon;
revoke all on function public.restore_patient(uuid, integer) from public, anon;
grant execute on function public.archive_patient(uuid, integer, text) to authenticated;
grant execute on function public.restore_patient(uuid, integer) to authenticated;

-- Realtime consumers should receive lifecycle changes from the existing Stage 3 patients trigger.
