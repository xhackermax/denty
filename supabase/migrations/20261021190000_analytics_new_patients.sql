begin;

-- New patients are counted by their registration instant (patients.created_at) in Madrid time.
-- Patients carry no site, so the count is clinic-wide; archived patients still count because
-- they were new in the period they joined.
create or replace function public.analytics_new_patients(
  p_clinic_id uuid,
  p_start timestamptz default null,
  p_end timestamptz default null,
  p_granularity text default 'month',
  p_limit integer default 120
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_items jsonb;
  v_count bigint;
  v_granularity text := lower(coalesce(p_granularity, 'month'));
begin
  if not private.has_finance_permission(p_clinic_id, 'finance.read') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if v_granularity not in ('month', 'quarter', 'year') then
    raise exception 'INVALID_ANALYTICS_GRANULARITY' using errcode = '22023';
  end if;

  if p_start is not null and p_end is not null and p_end <= p_start then
    raise exception 'INVALID_ANALYTICS_RANGE' using errcode = '22023';
  end if;

  with scoped_patients as (
    select p.created_at
    from public.patients p
    where p.clinic_id = p_clinic_id
      and (p_start is null or p.created_at >= p_start)
      and (p_end is null or p.created_at < p_end)
  ),
  buckets as (
    select date_trunc(v_granularity, sp.created_at at time zone 'Europe/Madrid') as bucket,
           count(*)::bigint as patients
    from scoped_patients sp
    group by 1
    order by 1 desc
    limit greatest(1, least(coalesce(p_limit, 120), 200))
  )
  select
    (select count(*)::bigint from scoped_patients),
    coalesce(
      (select jsonb_agg(
         jsonb_build_object('periodStart', to_char(b.bucket, 'YYYY-MM-DD'), 'count', b.patients)
         order by b.bucket desc
       ) from buckets b),
      '[]'::jsonb
    )
  into v_count, v_items;

  return jsonb_build_object('kpiVersion', 'DENTY-KPI-1', 'count', v_count, 'items', v_items);
end $$;

revoke all on function public.analytics_new_patients(uuid,timestamptz,timestamptz,text,integer)
  from public, anon;
grant execute on function public.analytics_new_patients(uuid,timestamptz,timestamptz,text,integer)
  to authenticated;

commit;
