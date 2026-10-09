-- Keep pre-existing ClinicCloud/Gesden patient numbers unchanged.
-- Convert only Denty-generated DNT-* numbers into clinic-local, five-digit minimum
-- identifiers. Keep an audit map of old identifiers for traceability.
set lock_timeout = '5s';
set statement_timeout = '120s';

-- Prevent concurrent numbering writes while calculating replacements.
lock table public.patients in share row exclusive mode;

create table if not exists private.patient_record_number_renumber_audit (
  patient_id uuid primary key references public.patients(id) on delete restrict,
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  old_record_number text not null,
  new_record_number text not null,
  changed_at timestamptz not null default now(),
  unique (clinic_id, old_record_number),
  unique (clinic_id, new_record_number)
);
revoke all on private.patient_record_number_renumber_audit from public, anon, authenticated;

create temporary table denty_patient_renumber on commit drop as
with numeric_max as (
  select clinic_id, max(record_number::bigint) as maximum
  from public.patients
  where record_number ~ '^[0-9]{1,12}$'
  group by clinic_id
),
new_numbers as (
  select p.id as patient_id, p.clinic_id, p.record_number as old_record_number,
    coalesce(m.maximum, 0) + row_number() over (
      partition by p.clinic_id order by p.created_at, p.id
    ) as numeric_number
  from public.patients p
  left join numeric_max m on m.clinic_id = p.clinic_id
  where p.record_number ~* '^DNT-'
)
select patient_id, clinic_id, old_record_number,
  lpad(numeric_number::text, greatest(5, length(numeric_number::text)), '0') as new_record_number
from new_numbers;

-- Ensure the target codes have no conflict even with unusual legacy imports.
do $$
begin
  if exists (
    select 1 from denty_patient_renumber n
    join public.patients p
      on p.clinic_id = n.clinic_id and p.record_number = n.new_record_number
  ) then
    raise exception 'Numeric patient record numbering would conflict with an existing patient';
  end if;
end;
$$;

insert into private.patient_record_number_renumber_audit (
  patient_id, clinic_id, old_record_number, new_record_number
)
select patient_id, clinic_id, old_record_number, new_record_number
from denty_patient_renumber;

-- The old identifiers are temporarily replaced first to avoid a unique-index
-- collision in databases containing both DNT-000001 and older patient "1".
update public.patients p
set record_number = '__denty_renumber__' || p.id::text
from denty_patient_renumber n
where p.id = n.patient_id;

update public.patients p
set record_number = n.new_record_number
from denty_patient_renumber n
where p.id = n.patient_id;
