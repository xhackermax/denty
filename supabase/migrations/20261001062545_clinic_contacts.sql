-- Special contacts for clinic: plumbers, electricians, delivery companies, etc.
-- Separate from patients, with configurable categories, search, and linkage to tasks.

begin;

-- Create clinic_contacts table
create table if not exists public.clinic_contacts (
  id uuid not null default gen_random_uuid() primary key,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  name text not null,
  category text not null, -- e.g., "Plumber", "Electrician", "Delivery", "Maintenance", "Laboratory", "Accountant"
  phones jsonb default '[]'::jsonb, -- Array of {number, type} objects, e.g., [{"number": "123456789", "type": "mobile"}]
  emails jsonb default '[]'::jsonb, -- Array of email strings
  notes text,
  hours text, -- e.g., "9:00-14:00, 16:00-20:00 (Lun-Vie)", or "24/7"
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1
);

-- Indexes for quick search
create index clinic_contacts_clinic_id_idx on public.clinic_contacts(clinic_id);
create index clinic_contacts_clinic_category_idx on public.clinic_contacts(clinic_id, category);
create index clinic_contacts_clinic_name_idx on public.clinic_contacts(clinic_id, name);
create index clinic_contacts_created_at_idx on public.clinic_contacts(clinic_id, created_at desc);

-- Row-level security: staff can only see contacts from their clinic
alter table public.clinic_contacts enable row level security;

create policy clinic_contacts_clinic_staff on public.clinic_contacts
  for select
  using (exists(
    select 1 from public.staff_members s
    where s.clinic_id = clinic_contacts.clinic_id
      and s.id = auth.uid()
      and s.active
  ));

create policy clinic_contacts_clinic_staff_insert on public.clinic_contacts
  for insert
  with check (exists(
    select 1 from public.staff_members s
    where s.clinic_id = clinic_id
      and s.id = auth.uid()
      and s.active
  ));

create policy clinic_contacts_clinic_staff_update on public.clinic_contacts
  for update
  using (exists(
    select 1 from public.staff_members s
    where s.clinic_id = clinic_contacts.clinic_id
      and s.id = auth.uid()
      and s.active
  ))
  with check (exists(
    select 1 from public.staff_members s
    where s.clinic_id = clinic_id
      and s.id = auth.uid()
      and s.active
  ));

create policy clinic_contacts_clinic_staff_delete on public.clinic_contacts
  for delete
  using (exists(
    select 1 from public.staff_members s
    where s.clinic_id = clinic_contacts.clinic_id
      and s.id = auth.uid()
      and s.active
  ));

-- Audit log entries
create trigger clinic_contacts_audit after insert or update or delete on public.clinic_contacts
  for each row execute function private.audit_log_trigger();

-- RPC: Create a contact
create or replace function public.create_clinic_contact(
  p_clinic_id uuid,
  p_name text,
  p_category text,
  p_phones jsonb default null,
  p_emails jsonb default null,
  p_notes text default null,
  p_hours text default null
) returns public.clinic_contacts language plpgsql security definer set search_path='' as $$
declare r public.clinic_contacts%rowtype;
begin
  if not (select private.is_clinic_staff(p_clinic_id)) then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if coalesce(btrim(p_name),'') = '' then
    raise exception 'INVALID_NAME' using errcode='23514';
  end if;
  if coalesce(btrim(p_category),'') = '' then
    raise exception 'INVALID_CATEGORY' using errcode='23514';
  end if;

  insert into public.clinic_contacts(
    clinic_id, name, category, phones, emails, notes, hours, created_by
  ) values (
    p_clinic_id,
    btrim(p_name),
    btrim(p_category),
    coalesce(p_phones, '[]'::jsonb),
    coalesce(p_emails, '[]'::jsonb),
    nullif(btrim(p_notes),''),
    nullif(btrim(p_hours),''),
    (select auth.uid())
  ) returning * into r;

  return r;
end $$;

-- RPC: Update a contact
create or replace function public.update_clinic_contact(
  p_contact_id uuid,
  p_name text default null,
  p_category text default null,
  p_phones jsonb default null,
  p_emails jsonb default null,
  p_notes text default null,
  p_hours text default null,
  p_expected_version integer default null
) returns public.clinic_contacts language plpgsql security definer set search_path='' as $$
declare r public.clinic_contacts%rowtype;
begin
  select * into r from public.clinic_contacts where id = p_contact_id for update;

  if r.id is null then
    raise exception 'CONTACT_NOT_FOUND' using errcode='P0002';
  end if;

  if not (select private.is_clinic_staff(r.clinic_id)) then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;

  if p_expected_version is not null and r.version <> p_expected_version then
    raise exception 'VERSION_CONFLICT' using errcode='40001';
  end if;

  if p_name is not null and btrim(p_name) = '' then
    raise exception 'INVALID_NAME' using errcode='23514';
  end if;

  if p_category is not null and btrim(p_category) = '' then
    raise exception 'INVALID_CATEGORY' using errcode='23514';
  end if;

  update public.clinic_contacts set
    name = coalesce(btrim(p_name), name),
    category = coalesce(btrim(p_category), category),
    phones = coalesce(p_phones, phones),
    emails = coalesce(p_emails, emails),
    notes = case when p_notes is null then notes else nullif(btrim(p_notes),'') end,
    hours = case when p_hours is null then hours else nullif(btrim(p_hours),'') end,
    version = version + 1,
    updated_at = now()
  where id = p_contact_id
  returning * into r;

  return r;
end $$;

-- RPC: Delete a contact
create or replace function public.delete_clinic_contact(p_contact_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare
  v_clinic_id uuid;
begin
  select clinic_id into v_clinic_id from public.clinic_contacts where id = p_contact_id;

  if v_clinic_id is null then
    raise exception 'CONTACT_NOT_FOUND' using errcode='P0002';
  end if;

  if not (select private.is_clinic_staff(v_clinic_id)) then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;

  delete from public.clinic_contacts where id = p_contact_id;
  return true;
end $$;

-- RPC: List contacts with optional search
create or replace function public.list_clinic_contacts(
  p_clinic_id uuid,
  p_search text default null,
  p_category text default null,
  p_limit integer default 100,
  p_offset integer default 0
) returns table(
  id uuid,
  clinic_id uuid,
  name text,
  category text,
  phones jsonb,
  emails jsonb,
  notes text,
  hours text,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  version integer,
  total_count bigint
) language plpgsql security definer set search_path='' as $$
declare
  v_total bigint;
  v_search_pattern text;
begin
  if not (select private.is_clinic_staff(p_clinic_id)) then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;

  v_search_pattern := case when p_search is not null then '%' || btrim(p_search) || '%' else null end;

  select count(*) into v_total
  from public.clinic_contacts
  where clinic_contacts.clinic_id = p_clinic_id
    and (v_search_pattern is null or name ilike v_search_pattern or notes ilike v_search_pattern)
    and (p_category is null or category = p_category);

  return query
  select
    clinic_contacts.id,
    clinic_contacts.clinic_id,
    clinic_contacts.name,
    clinic_contacts.category,
    clinic_contacts.phones,
    clinic_contacts.emails,
    clinic_contacts.notes,
    clinic_contacts.hours,
    clinic_contacts.created_by,
    clinic_contacts.created_at,
    clinic_contacts.updated_at,
    clinic_contacts.version,
    v_total
  from public.clinic_contacts
  where clinic_contacts.clinic_id = p_clinic_id
    and (v_search_pattern is null or name ilike v_search_pattern or notes ilike v_search_pattern)
    and (p_category is null or category = p_category)
  order by created_at desc
  limit p_limit offset p_offset;
end $$;

-- Grant execute permissions
revoke all on function public.create_clinic_contact(uuid,text,text,jsonb,jsonb,text,text),
  public.update_clinic_contact(uuid,text,text,jsonb,jsonb,text,text,integer),
  public.delete_clinic_contact(uuid),
  public.list_clinic_contacts(uuid,text,text,integer,integer)
from public, anon;

grant execute on function public.create_clinic_contact(uuid,text,text,jsonb,jsonb,text,text),
  public.update_clinic_contact(uuid,text,text,jsonb,jsonb,text,text,integer),
  public.delete_clinic_contact(uuid),
  public.list_clinic_contacts(uuid,text,text,integer,integer)
to authenticated;

commit;
