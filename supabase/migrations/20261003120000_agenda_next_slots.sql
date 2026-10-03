-- Nearest free slots across the clinic's doctors, limited to a daily time window so reception
-- can answer "¿por la mañana o por la tarde?" in one search instead of paging day by day.
-- Doctors with a weekly rota are free only inside it; doctors without one fall back to the
-- agenda's 08:00–21:00 default on weekdays (never weekends, unlike agenda_availability's
-- per-day fallback, which would offer a rota doctor's day off).
create or replace function public.agenda_next_slots(
  p_clinic_id uuid,
  p_not_before timestamptz,
  p_from_minute integer default 0,
  p_to_minute integer default 1440,
  p_duration_min integer default 30,
  p_staff_id uuid default null,
  p_site_id uuid default null,
  p_limit integer default 6,
  p_horizon_days integer default 60
) returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  v_duration interval := make_interval(mins => p_duration_min);
  v_first_day date := (p_not_before at time zone 'Europe/Madrid')::date;
  v_result jsonb;
begin
  if not private.is_clinic_staff(p_clinic_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_duration_min not between 5 and 720
    or p_from_minute not between 0 and 1440 or p_to_minute not between 0 and 1440
    or p_from_minute >= p_to_minute
    or p_limit not between 1 and 50 or p_horizon_days not between 1 and 120
  then
    raise exception 'INVALID_ARGUMENT' using errcode = '22023';
  end if;

  with doctors as (
    select sm.id, sm.display_name,
      exists (
        select 1 from public.staff_schedules ss
        where ss.clinic_id = p_clinic_id and ss.staff_member_id = sm.id and ss.active
      ) as has_rota
    from public.staff_members sm
    where sm.clinic_id = p_clinic_id and sm.active
      and (case when p_staff_id is null
        then sm.role = 'DENTIST' or sm.collegiate_number is not null
        else sm.id = p_staff_id end)
  ), days as (
    select (v_first_day + offs)::date as day from generate_series(0, p_horizon_days) as offs
  ), windows as (
    select d.id as staff_id, d.display_name, days.day, ss.starts_at as opens, ss.ends_at as closes
    from doctors d
    cross join days
    join public.staff_schedules ss
      on ss.clinic_id = p_clinic_id and ss.staff_member_id = d.id and ss.active
      and ss.weekday = extract(dow from days.day)::int
      and (ss.site_id is null or p_site_id is null or ss.site_id = p_site_id)
      and (ss.effective_from is null or ss.effective_from <= days.day)
      and (ss.effective_until is null or ss.effective_until >= days.day)
    union all
    select d.id, d.display_name, days.day, time '08:00', time '21:00'
    from doctors d
    cross join days
    where not d.has_rota and extract(isodow from days.day) between 1 and 5
  ), bounded as (
    -- Clip each working window to the requested part of the day (local Madrid time).
    select staff_id, display_name,
      greatest(day + opens, day + make_interval(mins => p_from_minute)) as local_start,
      least(day + closes, day + make_interval(mins => p_to_minute)) as local_end
    from windows
  ), candidates as (
    select b.staff_id, b.display_name,
      (gs at time zone 'Europe/Madrid') as starts_at,
      ((gs + v_duration) at time zone 'Europe/Madrid') as ends_at
    from bounded b
    cross join lateral generate_series(b.local_start, b.local_end - v_duration, interval '15 minutes') gs
    where b.local_end - b.local_start >= v_duration
  ), free_slots as (
    select c.* from candidates c
    where c.starts_at >= p_not_before
      and not exists (
        select 1 from public.appointments a
        where a.clinic_id = p_clinic_id and a.staff_id = c.staff_id
          and a.status in ('PLANNED','CONFIRMED','ARRIVED','WAITING','IN_CHAIR','RUNNING_LATE')
          and tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(c.starts_at, c.ends_at, '[)'))
      and not exists (
        select 1 from public.staff_absences sa
        where sa.clinic_id = p_clinic_id and sa.staff_member_id = c.staff_id and sa.status = 'APPROVED'
          and (sa.site_id is null or p_site_id is null or sa.site_id = p_site_id)
          and tstzrange(sa.starts_at, sa.ends_at, '[)') && tstzrange(c.starts_at, c.ends_at, '[)'))
      and not exists (
        select 1 from public.appointment_blocks bl
        where bl.clinic_id = p_clinic_id
          and (bl.staff_id is null or bl.staff_id = c.staff_id)
          and (bl.site_id is null or p_site_id is null or bl.site_id = p_site_id)
          and tstzrange(bl.starts_at, bl.ends_at, '[)') && tstzrange(c.starts_at, c.ends_at, '[)'))
    order by c.starts_at, c.display_name
    limit p_limit
  )
  select jsonb_build_object(
    'durationMin', p_duration_min,
    'slots', coalesce(jsonb_agg(jsonb_build_object(
      'startsAt', starts_at, 'endsAt', ends_at, 'staffId', staff_id, 'staffName', display_name
    ) order by starts_at, display_name), '[]'::jsonb))
  into v_result from free_slots;
  return v_result;
end; $$;

revoke execute on function public.agenda_next_slots(uuid, timestamptz, integer, integer, integer, uuid, uuid, integer, integer) from public, anon;
grant execute on function public.agenda_next_slots(uuid, timestamptz, integer, integer, integer, uuid, uuid, integer, integer) to authenticated;
