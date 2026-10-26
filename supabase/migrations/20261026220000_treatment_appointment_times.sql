begin;

-- How many visits a treatment usually needs. Null means "use the default for its family"
-- (src/domain/plan/appointment-estimate.ts), so existing rows keep working unchanged.
alter table public.treatment_catalog
  add column if not exists appointments_min integer,
  add column if not exists appointments_max integer;

alter table public.treatment_catalog
  add constraint treatment_catalog_appointments_range check (
    (appointments_min is null or appointments_min > 0)
    and (appointments_max is null or appointments_max > 0)
    and (appointments_min is null or appointments_max is null or appointments_max >= appointments_min)
  );

-- Each doctor can take longer (or fewer visits) than the clinic default. A null column falls
-- back to the catalog value for that treatment.
create table if not exists public.treatment_catalog_staff_times (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  treatment_catalog_id uuid not null references public.treatment_catalog(id) on delete cascade,
  staff_member_id uuid not null references public.staff_members(id) on delete cascade,
  duration_min integer check (duration_min is null or duration_min > 0),
  appointments_min integer check (appointments_min is null or appointments_min > 0),
  appointments_max integer check (appointments_max is null or appointments_max > 0),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (treatment_catalog_id, staff_member_id),
  check (appointments_min is null or appointments_max is null or appointments_max >= appointments_min)
);

create index if not exists treatment_catalog_staff_times_clinic_idx
  on public.treatment_catalog_staff_times (clinic_id);
create index if not exists treatment_catalog_staff_times_staff_idx
  on public.treatment_catalog_staff_times (staff_member_id);

alter table public.treatment_catalog_staff_times enable row level security;
revoke all on table public.treatment_catalog_staff_times from anon;
grant select, insert, update, delete on table public.treatment_catalog_staff_times to authenticated;

create policy treatment_catalog_staff_times_read on public.treatment_catalog_staff_times
for select to authenticated using ((select private.is_clinic_staff(clinic_id)));
-- The treatment and the doctor must belong to the same clinic as the row.
create policy treatment_catalog_staff_times_admin_insert on public.treatment_catalog_staff_times
for insert to authenticated with check (
  (select private.can_manage_catalog(clinic_id))
  and exists (select 1 from public.treatment_catalog t where t.id = treatment_catalog_id and t.clinic_id = treatment_catalog_staff_times.clinic_id)
  and exists (select 1 from public.staff_members s where s.id = staff_member_id and s.clinic_id = treatment_catalog_staff_times.clinic_id)
);
create policy treatment_catalog_staff_times_admin_update on public.treatment_catalog_staff_times
for update to authenticated
using ((select private.can_manage_catalog(clinic_id)))
with check (
  (select private.can_manage_catalog(clinic_id))
  and exists (select 1 from public.treatment_catalog t where t.id = treatment_catalog_id and t.clinic_id = treatment_catalog_staff_times.clinic_id)
  and exists (select 1 from public.staff_members s where s.id = staff_member_id and s.clinic_id = treatment_catalog_staff_times.clinic_id)
);
create policy treatment_catalog_staff_times_admin_delete on public.treatment_catalog_staff_times
for delete to authenticated using ((select private.can_manage_catalog(clinic_id)));

create trigger treatment_catalog_staff_times_set_updated_at
before update on public.treatment_catalog_staff_times
for each row execute function private.set_updated_at();
create trigger treatment_catalog_staff_times_audit_mutation
after insert or update or delete on public.treatment_catalog_staff_times
for each row execute function private.audit_sensitive_mutation();

commit;
