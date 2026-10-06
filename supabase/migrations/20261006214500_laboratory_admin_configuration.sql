begin;

create or replace function private.is_clinic_admin(target_clinic_id uuid)
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

revoke all on function private.is_clinic_admin(uuid) from public, anon;

create or replace function public.create_laboratory(
  p_clinic_id uuid,
  p_name text,
  p_tax_id text default null,
  p_phone text default null,
  p_email text default null,
  p_address text default null,
  p_default_turnaround_days integer default 7
) returns public.laboratories
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  r public.laboratories%rowtype;
begin
  if not private.is_clinic_admin(p_clinic_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if nullif(btrim(p_name), '') is null then
    raise exception 'LAB_NAME_REQUIRED' using errcode = '22023';
  end if;
  insert into public.laboratories(
    clinic_id, name, tax_id, phone, email, address, default_turnaround_days
  )
  values(
    p_clinic_id,
    btrim(p_name),
    nullif(btrim(p_tax_id), ''),
    nullif(btrim(p_phone), ''),
    nullif(btrim(p_email), ''),
    nullif(btrim(p_address), ''),
    coalesce(p_default_turnaround_days, 7)
  )
  returning * into r;
  return r;
end $$;

create or replace function public.update_laboratory(
  p_laboratory_id uuid,
  p_expected_version integer,
  p_name text default null,
  p_tax_id text default null,
  p_phone text default null,
  p_email text default null,
  p_address text default null,
  p_default_turnaround_days integer default null,
  p_active boolean default null
) returns public.laboratories
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  r public.laboratories%rowtype;
begin
  select * into r
  from public.laboratories
  where id = p_laboratory_id
  for update;

  if r.id is null then
    raise exception 'LABORATORY_NOT_FOUND' using errcode = 'P0002';
  end if;
  if not private.is_clinic_admin(r.clinic_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if r.version <> p_expected_version then
    raise exception 'LABORATORY_VERSION_CONFLICT' using errcode = '40001';
  end if;

  update public.laboratories
  set
    name = coalesce(nullif(btrim(p_name), ''), name),
    tax_id = case when p_tax_id is null then tax_id else nullif(btrim(p_tax_id), '') end,
    phone = case when p_phone is null then phone else nullif(btrim(p_phone), '') end,
    email = case when p_email is null then email else nullif(btrim(p_email), '') end,
    address = case when p_address is null then address else nullif(btrim(p_address), '') end,
    default_turnaround_days = coalesce(p_default_turnaround_days, default_turnaround_days),
    active = coalesce(p_active, active),
    version = version + 1,
    updated_at = now()
  where id = p_laboratory_id
  returning * into r;

  return r;
end $$;

create table if not exists public.laboratory_price_history (
  id bigserial primary key,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  laboratory_id uuid not null references public.laboratories(id) on delete cascade,
  work_type_id uuid not null references public.laboratory_work_types(id) on delete restrict,
  work_type_name text not null,
  price_cents bigint not null check (price_cents >= 0),
  turnaround_days integer not null check (turnaround_days between 0 and 365),
  active boolean not null,
  version integer not null,
  changed_at timestamptz not null default now(),
  changed_by uuid references auth.users(id) on delete set null
);

create index if not exists laboratory_price_history_lookup_idx
  on public.laboratory_price_history(clinic_id, laboratory_id, work_type_id, changed_at desc);

alter table public.laboratory_price_history enable row level security;
revoke all on public.laboratory_price_history from anon;
revoke insert, update, delete on public.laboratory_price_history from authenticated;
grant select on public.laboratory_price_history to authenticated;

drop policy if exists laboratory_price_history_admin_read on public.laboratory_price_history;
create policy laboratory_price_history_admin_read
  on public.laboratory_price_history
  for select
  to authenticated
  using ((select private.is_clinic_admin(clinic_id)));

create or replace function private.capture_laboratory_price_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  select wt.name into v_name
  from public.laboratory_work_types wt
  where wt.id = new.work_type_id;

  insert into public.laboratory_price_history(
    clinic_id,
    laboratory_id,
    work_type_id,
    work_type_name,
    price_cents,
    turnaround_days,
    active,
    version,
    changed_at,
    changed_by
  )
  values(
    new.clinic_id,
    new.laboratory_id,
    new.work_type_id,
    coalesce(v_name, 'Procedimiento'),
    new.price_cents,
    new.turnaround_days,
    new.active,
    new.version,
    now(),
    (select auth.uid())
  );
  return new;
end $$;

drop trigger if exists laboratory_price_list_capture_history on public.laboratory_price_list_items;
create trigger laboratory_price_list_capture_history
  after insert or update on public.laboratory_price_list_items
  for each row execute function private.capture_laboratory_price_history();

insert into public.laboratory_price_history(
  clinic_id,
  laboratory_id,
  work_type_id,
  work_type_name,
  price_cents,
  turnaround_days,
  active,
  version,
  changed_at,
  changed_by
)
select
  pli.clinic_id,
  pli.laboratory_id,
  pli.work_type_id,
  wt.name,
  pli.price_cents,
  pli.turnaround_days,
  pli.active,
  pli.version,
  pli.updated_at,
  null
from public.laboratory_price_list_items pli
join public.laboratory_work_types wt on wt.id = pli.work_type_id
where not exists (
  select 1
  from public.laboratory_price_history h
  where h.clinic_id = pli.clinic_id
    and h.laboratory_id = pli.laboratory_id
    and h.work_type_id = pli.work_type_id
    and h.version = pli.version
);

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
  if not private.is_clinic_admin(p_clinic_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if nullif(btrim(p_work_type_name), '') is null then
    raise exception 'LAB_WORK_TYPE_REQUIRED' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.laboratories l
    where l.id = p_laboratory_id
      and l.clinic_id = p_clinic_id
      and l.active
  ) then
    raise exception 'LABORATORY_CLINIC_MISMATCH' using errcode = '23514';
  end if;

  insert into public.laboratory_work_types(clinic_id, code, name, active)
  values (
    p_clinic_id,
    nullif(btrim(coalesce(p_work_type_code, '')), ''),
    btrim(p_work_type_name),
    true
  )
  on conflict (clinic_id, name) do update
    set
      code = coalesce(
        nullif(btrim(coalesce(excluded.code, '')), ''),
        public.laboratory_work_types.code
      ),
      active = true,
      updated_at = now()
  returning * into wt;

  select * into item
  from public.laboratory_price_list_items
  where clinic_id = p_clinic_id
    and laboratory_id = p_laboratory_id
    and work_type_id = wt.id
  for update;

  if found then
    if p_expected_version is not null and item.version <> p_expected_version then
      raise exception 'VERSION_CONFLICT' using errcode = '40001';
    end if;

    update public.laboratory_price_list_items
    set
      price_cents = greatest(coalesce(p_price_cents, 0), 0),
      turnaround_days = greatest(0, least(coalesce(p_turnaround_days, 7), 365)),
      active = coalesce(p_active, true),
      version = version + 1,
      updated_at = now()
    where id = item.id
    returning * into item;
  else
    insert into public.laboratory_price_list_items(
      clinic_id,
      laboratory_id,
      work_type_id,
      price_cents,
      turnaround_days,
      active
    )
    values(
      p_clinic_id,
      p_laboratory_id,
      wt.id,
      greatest(coalesce(p_price_cents, 0), 0),
      greatest(0, least(coalesce(p_turnaround_days, 7), 365)),
      coalesce(p_active, true)
    )
    returning * into item;
  end if;

  select * into result
  from public.laboratory_price_list_view
  where id = item.id;

  return result;
end $$;

commit;
