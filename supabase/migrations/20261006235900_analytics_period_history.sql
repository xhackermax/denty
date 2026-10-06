begin;

create or replace function public.analytics_periods(
  p_clinic_id uuid,
  p_start timestamptz default null,
  p_end timestamptz default null,
  p_site_id uuid default null,
  p_staff_id uuid default null,
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

  with prod as (
    select
      case v_granularity
        when 'year' then date_trunc('year', pe.recognized_at at time zone 'Europe/Madrid')
        when 'quarter' then date_trunc('quarter', pe.recognized_at at time zone 'Europe/Madrid')
        else date_trunc('month', pe.recognized_at at time zone 'Europe/Madrid')
      end as bucket,
      sum(pe.produced_cents)::bigint as produced_cents,
      sum(pe.cost_cents)::bigint as cost_cents
    from public.analytics_production_events pe
    where pe.clinic_id = p_clinic_id
      and (p_start is null or pe.recognized_at >= p_start)
      and (p_end is null or pe.recognized_at < p_end)
      and (p_site_id is null or pe.site_id = p_site_id)
      and (p_staff_id is null or pe.staff_id = p_staff_id)
    group by 1
  ),
  inv as (
    select
      case v_granularity
        when 'year' then date_trunc('year', ie.recognized_at at time zone 'Europe/Madrid')
        when 'quarter' then date_trunc('quarter', ie.recognized_at at time zone 'Europe/Madrid')
        else date_trunc('month', ie.recognized_at at time zone 'Europe/Madrid')
      end as bucket,
      sum(ie.invoiced_cents)::bigint as invoiced_cents
    from public.analytics_invoice_events ie
    where ie.clinic_id = p_clinic_id
      and (p_start is null or ie.recognized_at >= p_start)
      and (p_end is null or ie.recognized_at < p_end)
      and (p_site_id is null or ie.site_id = p_site_id)
      and (p_staff_id is null or ie.staff_id = p_staff_id)
    group by 1
  ),
  coll as (
    select
      case v_granularity
        when 'year' then date_trunc('year', x.recognized_at at time zone 'Europe/Madrid')
        when 'quarter' then date_trunc('quarter', x.recognized_at at time zone 'Europe/Madrid')
        else date_trunc('month', x.recognized_at at time zone 'Europe/Madrid')
      end as bucket,
      sum(x.collected_cents)::bigint as collected_cents
    from (
      select p.paid_at as recognized_at, p.amount_cents::bigint as collected_cents
      from public.payments p
      where p.clinic_id = p_clinic_id
        and p.status = 'COMPLETED'
        and p_site_id is null
        and p_staff_id is null
      union all
      select ca.recognized_at, ca.collected_cents::bigint
      from public.analytics_collection_attributions ca
      where ca.clinic_id = p_clinic_id
        and (p_site_id is not null or p_staff_id is not null)
        and (p_site_id is null or ca.site_id = p_site_id)
        and (p_staff_id is null or ca.staff_id = p_staff_id)
    ) x
    where (p_start is null or x.recognized_at >= p_start)
      and (p_end is null or x.recognized_at < p_end)
    group by 1
  ),
  buckets as (
    select bucket from prod
    union
    select bucket from inv
    union
    select bucket from coll
  ),
  scoped as (
    select b.bucket
    from buckets b
    where b.bucket is not null
    order by b.bucket desc
    limit greatest(1, least(coalesce(p_limit, 120), 200))
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'periodStart', to_char(s.bucket, 'YYYY-MM-DD'),
        'producedCents', coalesce(prod.produced_cents, 0),
        'invoicedCents', coalesce(inv.invoiced_cents, 0),
        'collectedCents', coalesce(coll.collected_cents, 0),
        'costCents', coalesce(prod.cost_cents, 0),
        'marginCents', coalesce(prod.produced_cents, 0) - coalesce(prod.cost_cents, 0)
      )
      order by s.bucket desc
    ),
    '[]'::jsonb
  )
  into v_items
  from scoped s
  left join prod using (bucket)
  left join inv using (bucket)
  left join coll using (bucket);

  return jsonb_build_object('kpiVersion', 'DENTY-KPI-1', 'items', v_items);
end $$;

revoke all on function public.analytics_periods(uuid,timestamptz,timestamptz,uuid,uuid,text,integer)
  from public, anon;
grant execute on function public.analytics_periods(uuid,timestamptz,timestamptz,uuid,uuid,text,integer)
  to authenticated;

commit;
