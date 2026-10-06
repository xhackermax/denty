begin;

create table if not exists public.laboratory_work_types (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  code text,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint laboratory_work_types_name_present check (length(btrim(name)) > 0),
  constraint laboratory_work_types_unique_name unique (clinic_id, name)
);

create table if not exists public.laboratory_price_list_items (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  laboratory_id uuid not null references public.laboratories(id) on delete cascade,
  work_type_id uuid not null references public.laboratory_work_types(id) on delete restrict,
  price_cents bigint not null default 0 check (price_cents >= 0),
  turnaround_days integer not null default 7 check (turnaround_days between 0 and 365),
  active boolean not null default true,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint laboratory_price_list_unique_item unique (clinic_id, laboratory_id, work_type_id)
);

create index if not exists laboratory_work_types_clinic_idx on public.laboratory_work_types(clinic_id, active, name);
create index if not exists laboratory_price_list_lab_idx on public.laboratory_price_list_items(clinic_id, laboratory_id, active);

alter table public.laboratory_work_types enable row level security;
alter table public.laboratory_price_list_items enable row level security;

drop policy if exists laboratory_work_types_read on public.laboratory_work_types;
create policy laboratory_work_types_read on public.laboratory_work_types
  for select to authenticated
  using ((select private.has_lab_permission(clinic_id, 'lab.read')));

drop policy if exists laboratory_price_list_items_read on public.laboratory_price_list_items;
create policy laboratory_price_list_items_read on public.laboratory_price_list_items
  for select to authenticated
  using ((select private.has_lab_permission(clinic_id, 'lab.read')));

create or replace view public.laboratory_price_list_view as
select
  pli.id,
  pli.clinic_id,
  pli.laboratory_id,
  pli.work_type_id,
  wt.name as work_type_name,
  wt.code as work_type_code,
  pli.price_cents,
  pli.turnaround_days,
  pli.active and wt.active as active,
  pli.version,
  pli.created_at,
  pli.updated_at
from public.laboratory_price_list_items pli
join public.laboratory_work_types wt on wt.id = pli.work_type_id and wt.clinic_id = pli.clinic_id;

create or replace function public.upsert_laboratory_price_list_item(
  p_clinic_id uuid,
  p_laboratory_id uuid,
  p_work_type_name text,
  p_work_type_code text default null,
  p_price_cents bigint default 0,
  p_turnaround_days integer default 7,
  p_active boolean default true,
  p_expected_version integer default null
) returns public.laboratory_price_list_view
language plpgsql
security definer
set search_path = public, private
as $$
declare
  wt public.laboratory_work_types%rowtype;
  item public.laboratory_price_list_items%rowtype;
  result public.laboratory_price_list_view%rowtype;
begin
  if not private.has_lab_permission(p_clinic_id, 'lab.write') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.laboratories l
    where l.id = p_laboratory_id and l.clinic_id = p_clinic_id and l.active
  ) then
    raise exception 'LABORATORY_CLINIC_MISMATCH' using errcode = '23514';
  end if;

  insert into public.laboratory_work_types(clinic_id, code, name, active)
  values (p_clinic_id, nullif(btrim(coalesce(p_work_type_code, '')), ''), btrim(p_work_type_name), true)
  on conflict (clinic_id, name) do update
    set code = coalesce(nullif(btrim(coalesce(excluded.code, '')), ''), public.laboratory_work_types.code),
        active = true,
        updated_at = now()
  returning * into wt;

  select * into item
  from public.laboratory_price_list_items
  where clinic_id = p_clinic_id and laboratory_id = p_laboratory_id and work_type_id = wt.id
  for update;

  if found then
    if p_expected_version is not null and item.version <> p_expected_version then
      raise exception 'VERSION_CONFLICT' using errcode = '40001';
    end if;
    update public.laboratory_price_list_items
      set price_cents = greatest(coalesce(p_price_cents, 0), 0),
          turnaround_days = greatest(0, least(coalesce(p_turnaround_days, 7), 365)),
          active = coalesce(p_active, true),
          version = version + 1,
          updated_at = now()
      where id = item.id
      returning * into item;
  else
    insert into public.laboratory_price_list_items(
      clinic_id, laboratory_id, work_type_id, price_cents, turnaround_days, active
    )
    values (
      p_clinic_id,
      p_laboratory_id,
      wt.id,
      greatest(coalesce(p_price_cents, 0), 0),
      greatest(0, least(coalesce(p_turnaround_days, 7), 365)),
      coalesce(p_active, true)
    )
    returning * into item;
  end if;

  select * into result from public.laboratory_price_list_view where id = item.id;
  return result;
end $$;

drop trigger if exists laboratory_work_types_set_updated_at on public.laboratory_work_types;
create trigger laboratory_work_types_set_updated_at
  before update on public.laboratory_work_types
  for each row execute function private.set_updated_at();

drop trigger if exists laboratory_price_list_items_set_updated_at on public.laboratory_price_list_items;
create trigger laboratory_price_list_items_set_updated_at
  before update on public.laboratory_price_list_items
  for each row execute function private.set_updated_at();

revoke all on function public.upsert_laboratory_price_list_item(uuid, uuid, text, text, bigint, integer, boolean, integer) from public, anon;
grant execute on function public.upsert_laboratory_price_list_item(uuid, uuid, text, text, bigint, integer, boolean, integer) to authenticated;
grant select on public.laboratory_price_list_view to authenticated;

commit;
