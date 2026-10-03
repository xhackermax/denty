-- Sidebar order: the clinic admin sets the default, each member may keep a personal one.
-- Keys are validated by the app (they change between releases); the database only enforces
-- shape and size so a stale key never blocks a save or a login.
begin;

alter table public.clinic_settings add column if not exists navigation_layout jsonb;

create table if not exists public.member_navigation_layouts (
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  layout jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (clinic_id, profile_id)
);

alter table public.member_navigation_layouts enable row level security;

drop policy if exists member_navigation_layouts_own_select on public.member_navigation_layouts;
create policy member_navigation_layouts_own_select on public.member_navigation_layouts
  for select to authenticated
  using (profile_id = (select auth.uid()) and private.is_clinic_staff(clinic_id));

-- Writes go through the RPCs below, which validate the payload.
revoke all on public.member_navigation_layouts from public, anon, authenticated;
grant select on public.member_navigation_layouts to authenticated;

create or replace function private.assert_navigation_layout(p_layout jsonb)
returns void language plpgsql immutable set search_path = '' as $$
begin
  if jsonb_typeof(p_layout) <> 'object'
    or jsonb_typeof(p_layout -> 'pinned') <> 'array'
    or jsonb_array_length(p_layout -> 'pinned') not between 1 and 8
    or exists (
      select 1 from jsonb_array_elements(p_layout -> 'pinned') as item(value)
      where jsonb_typeof(item.value) <> 'string'
    )
  then
    raise exception 'INVALID_LAYOUT' using errcode = '22023';
  end if;
end; $$;

create or replace function public.set_clinic_navigation_layout(p_clinic_id uuid, p_layout jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_clinic_admin(p_clinic_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_layout is not null then
    perform private.assert_navigation_layout(p_layout);
  end if;
  insert into public.clinic_settings (clinic_id, navigation_layout)
  values (p_clinic_id, p_layout)
  on conflict (clinic_id) do update
    set navigation_layout = excluded.navigation_layout, updated_at = now();
  return p_layout;
end; $$;

create or replace function public.set_my_navigation_layout(p_clinic_id uuid, p_layout jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_profile uuid := (select auth.uid());
begin
  if v_profile is null or not private.is_clinic_staff(p_clinic_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_layout is null then
    delete from public.member_navigation_layouts
    where clinic_id = p_clinic_id and profile_id = v_profile;
    return null;
  end if;
  perform private.assert_navigation_layout(p_layout);
  insert into public.member_navigation_layouts (clinic_id, profile_id, layout)
  values (p_clinic_id, v_profile, p_layout)
  on conflict (clinic_id, profile_id) do update
    set layout = excluded.layout, updated_at = now();
  return p_layout;
end; $$;

revoke execute on function private.assert_navigation_layout(jsonb) from public, anon;
revoke execute on function public.set_clinic_navigation_layout(uuid, jsonb) from public, anon;
grant execute on function public.set_clinic_navigation_layout(uuid, jsonb) to authenticated;
revoke execute on function public.set_my_navigation_layout(uuid, jsonb) from public, anon;
grant execute on function public.set_my_navigation_layout(uuid, jsonb) to authenticated;

commit;
