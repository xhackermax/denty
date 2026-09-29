-- Sites (sedes), their cabinets, doctors and the weekly rota that says which
-- doctor works at which site each weekday. The same doctor can work at several
-- sites on different days; the agenda shows each site with its own doctors.

alter table public.sites add column if not exists city text;
alter table public.sites add column if not exists address text;
alter table public.sites add column if not exists phone text;
alter table public.sites add column if not exists active boolean not null default true;
alter table public.staff_members add column if not exists collegiate_number text;

-- ---------------------------------------------------------------------------
-- Create or update a site and keep its number of cabinets ("Gabinete N").
-- Removing cabinets only drops the highest-numbered ones with no appointments.
-- ---------------------------------------------------------------------------
create or replace function public.admin_save_site(
  p_clinic_id uuid,
  p_site_id uuid,
  p_name text,
  p_city text default null,
  p_address text default null,
  p_phone text default null,
  p_active boolean default true,
  p_cabinet_count integer default 1
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_site public.sites%rowtype;
  v_existing integer;
  v_cabinet record;
begin
  if not private.is_clinic_admin(p_clinic_id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if coalesce(btrim(p_name),'') = '' then raise exception 'SITE_NAME_REQUIRED' using errcode='22023'; end if;
  if p_cabinet_count is null or p_cabinet_count < 0 or p_cabinet_count > 30 then
    raise exception 'INVALID_CABINET_COUNT' using errcode='22023';
  end if;

  if p_site_id is null then
    insert into public.sites(clinic_id,name,city,address,phone,active)
    values(p_clinic_id,btrim(p_name),nullif(btrim(p_city),''),nullif(btrim(p_address),''),
      nullif(btrim(p_phone),''),coalesce(p_active,true))
    returning * into v_site;
  else
    update public.sites set name=btrim(p_name),city=nullif(btrim(p_city),''),
      address=nullif(btrim(p_address),''),phone=nullif(btrim(p_phone),''),active=coalesce(p_active,true)
    where id=p_site_id and clinic_id=p_clinic_id
    returning * into v_site;
    if v_site.id is null then raise exception 'SITE_NOT_FOUND' using errcode='P0002'; end if;
  end if;

  select count(*) into v_existing from public.cabinets where site_id=v_site.id;
  if v_existing < p_cabinet_count then
    insert into public.cabinets(clinic_id,site_id,name)
    select p_clinic_id,v_site.id,'Gabinete '||n from generate_series(v_existing+1,p_cabinet_count) n;
  elsif v_existing > p_cabinet_count then
    for v_cabinet in
      select c.id from public.cabinets c where c.site_id=v_site.id
      order by c.created_at desc, c.name desc limit v_existing-p_cabinet_count
    loop
      if exists(select 1 from public.appointments a where a.cabinet_id=v_cabinet.id) then
        raise exception 'CABINET_IN_USE' using errcode='23503';
      end if;
      delete from public.cabinets where id=v_cabinet.id;
    end loop;
  end if;

  return to_jsonb(v_site) || jsonb_build_object(
    'cabinet_count',(select count(*) from public.cabinets where site_id=v_site.id));
end; $$;
revoke all on function public.admin_save_site(uuid,uuid,text,text,text,text,boolean,integer) from public, anon;
grant execute on function public.admin_save_site(uuid,uuid,text,text,text,text,boolean,integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Create or update a professional of the agenda. A doctor can exist before
-- having a login; creating the user later links it by staff id.
-- ---------------------------------------------------------------------------
create or replace function public.admin_save_staff_member(
  p_clinic_id uuid,
  p_staff_id uuid,
  p_display_name text,
  p_role text default 'DENTIST',
  p_active boolean default true,
  p_collegiate_number text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_row public.staff_members%rowtype;
begin
  if not private.is_clinic_admin(p_clinic_id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if coalesce(btrim(p_display_name),'') = '' then raise exception 'STAFF_NAME_REQUIRED' using errcode='22023'; end if;
  if p_staff_id is null then
    insert into public.staff_members(clinic_id,display_name,role,active,collegiate_number)
    values(p_clinic_id,btrim(p_display_name),coalesce(p_role,'DENTIST'),coalesce(p_active,true),
      nullif(btrim(p_collegiate_number),''))
    returning * into v_row;
  else
    update public.staff_members set display_name=btrim(p_display_name),
      role=coalesce(p_role,role),active=coalesce(p_active,active),
      collegiate_number=nullif(btrim(p_collegiate_number),'')
    where id=p_staff_id and clinic_id=p_clinic_id
    returning * into v_row;
    if v_row.id is null then raise exception 'STAFF_NOT_FOUND' using errcode='P0002'; end if;
  end if;
  return to_jsonb(v_row);
end; $$;
revoke all on function public.admin_save_staff_member(uuid,uuid,text,text,boolean,text) from public, anon;
grant execute on function public.admin_save_staff_member(uuid,uuid,text,text,boolean,text) to authenticated;

-- ---------------------------------------------------------------------------
-- Replace a professional's weekly rota. p_entries:
-- [{"siteId":uuid,"weekday":0-6,"startsAt":"09:00","endsAt":"14:00"}, ...]
-- Two shifts of the same doctor cannot overlap, even at different sites.
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_staff_schedule(
  p_clinic_id uuid,
  p_staff_id uuid,
  p_entries jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_result jsonb;
begin
  if not private.is_clinic_admin(p_clinic_id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if not exists(select 1 from public.staff_members where id=p_staff_id and clinic_id=p_clinic_id) then
    raise exception 'STAFF_NOT_FOUND' using errcode='P0002';
  end if;
  if jsonb_typeof(coalesce(p_entries,'[]'::jsonb)) <> 'array' then
    raise exception 'INVALID_SCHEDULE' using errcode='22023';
  end if;

  if exists(
    with e as (
      select n, (x->>'siteId')::uuid site_id, (x->>'weekday')::smallint weekday,
             (x->>'startsAt')::time starts_at, (x->>'endsAt')::time ends_at
      from jsonb_array_elements(coalesce(p_entries,'[]'::jsonb)) with ordinality t(x,n)
    )
    select 1 from e
    where site_id is null or weekday is null or weekday not between 0 and 6
       or starts_at is null or ends_at is null or ends_at <= starts_at
  ) then
    raise exception 'INVALID_SCHEDULE' using errcode='22023';
  end if;
  if exists(
    select 1 from jsonb_array_elements(coalesce(p_entries,'[]'::jsonb)) x
    where not exists(select 1 from public.sites s where s.id=(x->>'siteId')::uuid and s.clinic_id=p_clinic_id)
  ) then
    raise exception 'SITE_NOT_FOUND' using errcode='P0002';
  end if;
  if exists(
    with e as (
      select n, (x->>'weekday')::smallint weekday, (x->>'startsAt')::time starts_at, (x->>'endsAt')::time ends_at
      from jsonb_array_elements(coalesce(p_entries,'[]'::jsonb)) with ordinality t(x,n)
    )
    select 1 from e a join e b
      on a.weekday=b.weekday and a.n < b.n and a.starts_at < b.ends_at and b.starts_at < a.ends_at
  ) then
    raise exception 'SCHEDULE_OVERLAP' using errcode='23P01';
  end if;

  delete from public.staff_schedules
  where clinic_id=p_clinic_id and staff_member_id=p_staff_id and effective_from is null and effective_until is null;
  insert into public.staff_schedules(clinic_id,staff_member_id,site_id,weekday,starts_at,ends_at,active)
  select p_clinic_id,p_staff_id,(x->>'siteId')::uuid,(x->>'weekday')::smallint,(x->>'startsAt')::time,(x->>'endsAt')::time,true
  from jsonb_array_elements(coalesce(p_entries,'[]'::jsonb)) x;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',ss.id,'siteId',ss.site_id,'weekday',ss.weekday,
    'startsAt',to_char(ss.starts_at,'HH24:MI'),'endsAt',to_char(ss.ends_at,'HH24:MI'))
    order by ss.weekday,ss.starts_at),'[]'::jsonb)
  into v_result
  from public.staff_schedules ss
  where ss.clinic_id=p_clinic_id and ss.staff_member_id=p_staff_id and ss.active;
  return jsonb_build_object('staffId',p_staff_id,'schedules',v_result);
end; $$;
revoke all on function public.admin_set_staff_schedule(uuid,uuid,jsonb) from public, anon;
grant execute on function public.admin_set_staff_schedule(uuid,uuid,jsonb) to authenticated;
