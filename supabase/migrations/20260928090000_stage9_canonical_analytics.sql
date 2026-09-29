begin;

-- Stage 9: canonical analytics/KPI dictionary and one operational ledger for Dashboard, Finance and Analysis.
create table if not exists public.analytics_kpi_definitions (
  version text not null,
  code text not null,
  label text not null,
  formula text not null,
  recognition_rule text not null,
  time_field text not null,
  timezone text not null default 'Europe/Madrid',
  source_tables text[] not null default '{}'::text[],
  supported_filters text[] not null default array['start','end']::text[],
  notes text,
  created_at timestamptz not null default now(),
  primary key (version, code)
);

alter table public.analytics_kpi_definitions add column if not exists timezone text not null default 'Europe/Madrid';

insert into public.analytics_kpi_definitions(version,code,label,formula,recognition_rule,time_field,timezone,source_tables,supported_filters,notes)
values
('DENTY-KPI-1','produced','Producción','SUM(price_snapshot_cents) de cada ítem clínico reconocido una sola vez','El ítem se reconoce en la primera cita COMPLETED vinculada a clinical_plan_item_id.','appointments.completed_at','Europe/Madrid',array['appointments','clinical_plan_items','treatment_catalog'],array['start','end','siteId','staffId','specialty','category'],'No reconoce producción sin cita completada vinculada.'),
('DENTY-KPI-1','invoiced','Facturado','SUM(invoices.total_cents) de facturas emitidas/rectificadas','Se reconoce al emitir la factura.','invoices.issued_at','Europe/Madrid',array['invoices','invoice_lines','appointments'],array['start','end','siteId','staffId'],'Con filtros de sede/profesional solo entran facturas atribuibles a una cita o ítem clínico reconocido.'),
('DENTY-KPI-1','collected','Cobrado','SUM(payments.amount_cents) de pagos COMPLETED; con filtros de sede/profesional se usa la parte imputada a facturas atribuibles','Se reconoce en la fecha de cobro del ledger.','payments.paid_at','Europe/Madrid',array['payments','payment_allocations','invoices'],array['start','end','siteId','staffId'],'Pagos no imputados cuentan a nivel clínica, pero no pueden atribuirse a sede/profesional.'),
('DENTY-KPI-1','pending','Pendiente','MAX(0, SUM(invoice.total_cents) - SUM(allocations)) para facturas emitidas del rango','Saldo actual de las facturas reconocidas en el rango.','invoices.issued_at','Europe/Madrid',array['invoices','payment_allocations'],array['start','end','siteId','staffId'],'Es saldo vivo, por lo que puede bajar al cobrarse después del periodo.'),
('DENTY-KPI-1','margin','Margen','Producción - SUM(cost_snapshot_cents) de producción reconocida','Usa el coste congelado en el ítem clínico al planificarse.','appointments.completed_at','Europe/Madrid',array['appointments','clinical_plan_items'],array['start','end','siteId','staffId','specialty','category'],'Margen clínico bruto; costes de laboratorio no vinculados se incorporarán cuando Stage 10 tenga ledger real.'),
('DENTY-KPI-1','average_ticket','Ticket medio','Cobrado / número de pagos COMPLETED','Misma fecha y ámbito que Cobrado.','payments.paid_at','Europe/Madrid',array['payments','payment_allocations','invoices'],array['start','end','siteId','staffId'],'Con filtros de sede/profesional el denominador son pagos con al menos una imputación atribuible al ámbito.'),
('DENTY-KPI-1','conversion','Conversión','100 * presupuestos creados en el rango y firmados dentro del mismo rango / presupuestos creados en el rango','Cohorte de presupuestos creados; firma mediante budget_signed_snapshots.','budgets.created_at + budget_signed_snapshots.signed_at','Europe/Madrid',array['budgets','budget_signed_snapshots','clinical_plan_items','appointments'],array['start','end','siteId','staffId'],'Evita que firmas tardías reescriban la conversión histórica del periodo.'),
('DENTY-KPI-1','no_show','No-show','100 * NO_SHOW / (NO_SHOW + COMPLETED)','Cohorte de citas cuya starts_at cae en el rango; canceladas no entran.','appointments.starts_at','Europe/Madrid',array['appointments'],array['start','end','siteId','staffId'],'Mide ausencia sobre citas terminales atendibles, no sobre cancelaciones.')
on conflict (version,code) do update set
 label=excluded.label, formula=excluded.formula, recognition_rule=excluded.recognition_rule,
 time_field=excluded.time_field, timezone=excluded.timezone, source_tables=excluded.source_tables,
 supported_filters=excluded.supported_filters, notes=excluded.notes;

alter table public.analytics_kpi_definitions enable row level security;
drop policy if exists analytics_kpi_definitions_read on public.analytics_kpi_definitions;
create policy analytics_kpi_definitions_read on public.analytics_kpi_definitions for select to authenticated using (true);
revoke insert,update,delete on public.analytics_kpi_definitions from public,anon,authenticated;
grant select on public.analytics_kpi_definitions to authenticated;

-- Freeze analytic dimensions on the clinical plan item so later catalog edits never rewrite history.
alter table public.clinical_plan_items
  add column if not exists specialty_snapshot text,
  add column if not exists category_snapshot text;

update public.clinical_plan_items cpi
set specialty_snapshot=coalesce(cpi.specialty_snapshot,tc.specialty,'UNSPECIFIED'),
    category_snapshot=coalesce(cpi.category_snapshot,tc.category,'UNSPECIFIED')
from public.treatment_catalog tc
where tc.id=cpi.treatment_catalog_id
  and (cpi.specialty_snapshot is null or cpi.category_snapshot is null);

update public.clinical_plan_items
set specialty_snapshot=coalesce(specialty_snapshot,'UNSPECIFIED'),
    category_snapshot=coalesce(category_snapshot,'UNSPECIFIED')
where specialty_snapshot is null or category_snapshot is null;

alter table public.clinical_plan_items
  alter column specialty_snapshot set not null,
  alter column category_snapshot set not null;

create or replace function private.freeze_plan_item_analytics_dimensions()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_specialty text; v_category text;
begin
  if new.specialty_snapshot is null or new.category_snapshot is null then
    if new.treatment_catalog_id is not null then
      select tc.specialty,tc.category into v_specialty,v_category
      from public.treatment_catalog tc
      where tc.id=new.treatment_catalog_id and tc.clinic_id=new.clinic_id;
    end if;
    new.specialty_snapshot:=coalesce(new.specialty_snapshot,v_specialty,'UNSPECIFIED');
    new.category_snapshot:=coalesce(new.category_snapshot,v_category,'UNSPECIFIED');
  end if;
  return new;
end $$;

revoke all on function private.freeze_plan_item_analytics_dimensions() from public,anon,authenticated;

drop trigger if exists clinical_plan_items_freeze_analytics_dimensions on public.clinical_plan_items;
create trigger clinical_plan_items_freeze_analytics_dimensions
before insert on public.clinical_plan_items
for each row execute function private.freeze_plan_item_analytics_dimensions();

-- One production event per clinical plan item. Multiple completed appointments for the same
-- treatment never multiply production.
create or replace view public.analytics_production_events as
with ranked as (
  select
    a.id as appointment_id,
    a.clinic_id,
    a.patient_id,
    a.staff_id,
    a.site_id,
    a.clinical_plan_item_id,
    a.completed_at as recognized_at,
    row_number() over (
      partition by a.clinical_plan_item_id
      order by a.completed_at asc, a.id asc
    ) as recognition_rank
  from public.appointments a
  where a.status='COMPLETED'
    and a.completed_at is not null
    and a.clinical_plan_item_id is not null
)
select
  r.clinic_id,
  r.appointment_id,
  r.patient_id,
  r.staff_id,
  r.site_id,
  r.clinical_plan_item_id,
  cpi.plan_id,
  r.recognized_at,
  coalesce(cpi.treatment_code_snapshot,cpi.treatment_code) as treatment_code,
  coalesce(cpi.label_snapshot,cpi.label) as label,
  coalesce(cpi.specialty_snapshot,'UNSPECIFIED') as specialty,
  coalesce(cpi.category_snapshot,'UNSPECIFIED') as category,
  greatest(0,coalesce(cpi.price_snapshot_cents,cpi.price_cents,0))::bigint as produced_cents,
  greatest(0,coalesce(cpi.cost_snapshot_cents,0))::bigint as cost_cents,
  (greatest(0,coalesce(cpi.price_snapshot_cents,cpi.price_cents,0)) - greatest(0,coalesce(cpi.cost_snapshot_cents,0)))::bigint as margin_cents
from ranked r
join public.clinical_plan_items cpi on cpi.id=r.clinical_plan_item_id and cpi.clinic_id=r.clinic_id
where r.recognition_rank=1;

-- Attribute an issued invoice to the explicit appointment when possible, otherwise to the first
-- recognized clinical item referenced by one of its lines.
create or replace view public.analytics_invoice_events as
select
  i.id as invoice_id,
  i.clinic_id,
  i.patient_id,
  coalesce(a.staff_id,derived.staff_id) as staff_id,
  coalesce(a.site_id,derived.site_id) as site_id,
  i.issued_at as recognized_at,
  i.total_cents::bigint as invoiced_cents
from public.invoices i
left join public.appointments a on a.id=i.appointment_id and a.clinic_id=i.clinic_id
left join lateral (
  select pe.staff_id,pe.site_id
  from public.invoice_lines il
  join public.analytics_production_events pe
    on pe.clinical_plan_item_id=il.clinical_plan_item_id
   and pe.clinic_id=i.clinic_id
  where il.invoice_id=i.id
  order by pe.recognized_at asc,pe.appointment_id asc
  limit 1
) derived on true
where i.status in ('ISSUED','RECTIFIED') and i.issued_at is not null;

create or replace view public.analytics_collection_attributions as
select
  p.id as payment_id,
  p.clinic_id,
  p.patient_id,
  pa.invoice_id,
  ie.staff_id,
  ie.site_id,
  p.paid_at as recognized_at,
  pa.amount_cents::bigint as collected_cents
from public.payments p
join public.payment_allocations pa on pa.payment_id=p.id and pa.invoice_id is not null
join public.analytics_invoice_events ie on ie.invoice_id=pa.invoice_id and ie.clinic_id=p.clinic_id
where p.status='COMPLETED';

revoke all on public.analytics_production_events from public,anon,authenticated;
revoke all on public.analytics_invoice_events from public,anon,authenticated;
revoke all on public.analytics_collection_attributions from public,anon,authenticated;

create or replace function public.analytics_summary(
  p_clinic_id uuid,
  p_start timestamptz default null,
  p_end timestamptz default null,
  p_site_id uuid default null,
  p_staff_id uuid default null
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  v_produced bigint:=0; v_cost bigint:=0; v_invoiced bigint:=0; v_collected bigint:=0;
  v_pending bigint:=0; v_payment_count bigint:=0; v_production_count bigint:=0;
  v_budget_count bigint:=0; v_signed_count bigint:=0; v_terminal_count bigint:=0; v_no_show_count bigint:=0;
  v_conversion numeric:=0; v_no_show numeric:=0; v_ticket bigint:=0;
begin
  if not private.has_finance_permission(p_clinic_id,'finance.read') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_start is not null and p_end is not null and p_end<=p_start then raise exception 'INVALID_ANALYTICS_RANGE' using errcode='22023'; end if;

  select coalesce(sum(pe.produced_cents),0),coalesce(sum(pe.cost_cents),0),count(*)
  into v_produced,v_cost,v_production_count
  from public.analytics_production_events pe
  where pe.clinic_id=p_clinic_id
    and (p_start is null or pe.recognized_at>=p_start) and (p_end is null or pe.recognized_at<p_end)
    and (p_site_id is null or pe.site_id=p_site_id) and (p_staff_id is null or pe.staff_id=p_staff_id);

  select coalesce(sum(ie.invoiced_cents),0)
  into v_invoiced
  from public.analytics_invoice_events ie
  where ie.clinic_id=p_clinic_id
    and (p_start is null or ie.recognized_at>=p_start) and (p_end is null or ie.recognized_at<p_end)
    and (p_site_id is null or ie.site_id=p_site_id) and (p_staff_id is null or ie.staff_id=p_staff_id);

  select greatest(0,coalesce(sum(scoped.invoiced_cents),0)-coalesce(sum(scoped.allocated_cents),0))
  into v_pending
  from (
    select ie.invoice_id,ie.invoiced_cents,(
      select coalesce(sum(pa.amount_cents),0) from public.payment_allocations pa join public.payments pp on pp.id=pa.payment_id and pp.status='COMPLETED' where pa.invoice_id=ie.invoice_id
    ) as allocated_cents
    from public.analytics_invoice_events ie
    where ie.clinic_id=p_clinic_id
      and (p_start is null or ie.recognized_at>=p_start) and (p_end is null or ie.recognized_at<p_end)
      and (p_site_id is null or ie.site_id=p_site_id) and (p_staff_id is null or ie.staff_id=p_staff_id)
  ) scoped;

  if p_site_id is null and p_staff_id is null then
    select coalesce(sum(p.amount_cents),0),count(*) into v_collected,v_payment_count
    from public.payments p
    where p.clinic_id=p_clinic_id and p.status='COMPLETED'
      and (p_start is null or p.paid_at>=p_start) and (p_end is null or p.paid_at<p_end);
  else
    select coalesce(sum(ca.collected_cents),0),count(distinct ca.payment_id) into v_collected,v_payment_count
    from public.analytics_collection_attributions ca
    where ca.clinic_id=p_clinic_id
      and (p_start is null or ca.recognized_at>=p_start) and (p_end is null or ca.recognized_at<p_end)
      and (p_site_id is null or ca.site_id=p_site_id) and (p_staff_id is null or ca.staff_id=p_staff_id);
  end if;
  if v_payment_count>0 then v_ticket:=round(v_collected::numeric/v_payment_count)::bigint; end if;

  select count(*) filter (where true),
         count(*) filter (where b.status='SIGNED' and exists(
           select 1 from public.budget_signed_snapshots bs where bs.budget_id=b.id
             and (p_start is null or bs.signed_at>=p_start) and (p_end is null or bs.signed_at<p_end)
         ))
  into v_budget_count,v_signed_count
  from public.budgets b
  where b.clinic_id=p_clinic_id and b.total_cents>0
    and (p_start is null or b.created_at>=p_start) and (p_end is null or b.created_at<p_end)
    and (p_site_id is null and p_staff_id is null or exists(
      select 1 from public.clinical_plan_items cpi
      join public.appointments a on a.clinical_plan_item_id=cpi.id and a.clinic_id=b.clinic_id
      where cpi.plan_id=b.clinical_plan_id
        and (p_site_id is null or a.site_id=p_site_id)
        and (p_staff_id is null or a.staff_id=p_staff_id)
    ));
  if v_budget_count>0 then v_conversion:=round(100.0*v_signed_count/v_budget_count,1); end if;

  select count(*),count(*) filter (where a.status='NO_SHOW') into v_terminal_count,v_no_show_count
  from public.appointments a
  where a.clinic_id=p_clinic_id and a.status in ('COMPLETED','NO_SHOW')
    and (p_start is null or a.starts_at>=p_start) and (p_end is null or a.starts_at<p_end)
    and (p_site_id is null or a.site_id=p_site_id) and (p_staff_id is null or a.staff_id=p_staff_id);
  if v_terminal_count>0 then v_no_show:=round(100.0*v_no_show_count/v_terminal_count,1); end if;

  return jsonb_build_object(
    'kpiVersion','DENTY-KPI-1',
    'period',jsonb_strip_nulls(jsonb_build_object('start',p_start,'end',p_end)),
    'producedCents',v_produced,'invoicedCents',v_invoiced,'collectedCents',v_collected,
    'pendingCents',greatest(0,v_pending),'costCents',v_cost,'marginCents',v_produced-v_cost,
    'averageTicketCents',v_ticket,'conversionPercent',v_conversion,'noShowPercent',v_no_show,
    'count',v_production_count
  );
end $$;

create or replace function public.analytics_treatments(
  p_clinic_id uuid,
  p_start timestamptz default null,
  p_end timestamptz default null,
  p_site_id uuid default null,
  p_staff_id uuid default null,
  p_specialty text default null,
  p_category text default null,
  p_limit integer default 100
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_items jsonb;
begin
  if not private.has_finance_permission(p_clinic_id,'finance.read') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  with produced as (
    select pe.treatment_code,max(pe.label) label,max(pe.specialty) specialty,max(pe.category) category,
      count(*) completed_count,sum(pe.produced_cents)::bigint produced_cents,sum(pe.cost_cents)::bigint cost_cents
    from public.analytics_production_events pe
    where pe.clinic_id=p_clinic_id
      and (p_start is null or pe.recognized_at>=p_start) and (p_end is null or pe.recognized_at<p_end)
      and (p_site_id is null or pe.site_id=p_site_id) and (p_staff_id is null or pe.staff_id=p_staff_id)
      and (p_specialty is null or pe.specialty=p_specialty) and (p_category is null or pe.category=p_category)
    group by pe.treatment_code
  ), planned as (
    select coalesce(cpi.treatment_code_snapshot,cpi.treatment_code) treatment_code,
      max(coalesce(cpi.specialty_snapshot,'UNSPECIFIED')) specialty,
      max(coalesce(cpi.category_snapshot,'UNSPECIFIED')) category,
      count(*) planned_count,
      count(*) filter (where exists(
        select 1 from public.analytics_production_events cpe
        where cpe.clinical_plan_item_id=cpi.id and cpe.clinic_id=p_clinic_id
          and (p_start is null or cpe.recognized_at>=p_start) and (p_end is null or cpe.recognized_at<p_end)
          and (p_site_id is null or cpe.site_id=p_site_id) and (p_staff_id is null or cpe.staff_id=p_staff_id)
      )) cohort_completed_count
    from public.clinical_plan_items cpi
    where cpi.clinic_id=p_clinic_id and cpi.status not in ('CANCELLED','SUPERSEDED')
      and (p_start is null or cpi.created_at>=p_start) and (p_end is null or cpi.created_at<p_end)
      and (p_specialty is null or coalesce(cpi.specialty_snapshot,'UNSPECIFIED')=p_specialty)
      and (p_category is null or coalesce(cpi.category_snapshot,'UNSPECIFIED')=p_category)
      and (p_site_id is null and p_staff_id is null or exists(
        select 1 from public.appointments a where a.clinical_plan_item_id=cpi.id
          and (p_site_id is null or a.site_id=p_site_id) and (p_staff_id is null or a.staff_id=p_staff_id)
      ))
    group by coalesce(cpi.treatment_code_snapshot,cpi.treatment_code)
  ), invoiced as (
    select coalesce(cpi.treatment_code_snapshot,cpi.treatment_code) treatment_code,sum(il.total_cents)::bigint invoiced_cents
    from public.invoice_lines il
    join public.invoices i on i.id=il.invoice_id and i.clinic_id=p_clinic_id and i.status in ('ISSUED','RECTIFIED')
    join public.clinical_plan_items cpi on cpi.id=il.clinical_plan_item_id and cpi.clinic_id=p_clinic_id
    left join public.analytics_invoice_events ie on ie.invoice_id=i.id
    where (p_start is null or i.issued_at>=p_start) and (p_end is null or i.issued_at<p_end)
      and (p_site_id is null or ie.site_id=p_site_id) and (p_staff_id is null or ie.staff_id=p_staff_id)
    group by coalesce(cpi.treatment_code_snapshot,cpi.treatment_code)
  ), combined as (
    select coalesce(pr.treatment_code,pl.treatment_code,inv.treatment_code) treatment_code,
      coalesce(pr.label,tc.name,coalesce(pr.treatment_code,pl.treatment_code,inv.treatment_code)) label,
      coalesce(pr.category,pl.category,tc.category,'UNSPECIFIED') category,
      coalesce(pr.specialty,pl.specialty,tc.specialty,'UNSPECIFIED') specialty,
      coalesce(pr.completed_count,0) completed_count,coalesce(pl.planned_count,0) planned_count,coalesce(pl.cohort_completed_count,0) cohort_completed_count,
      coalesce(pr.produced_cents,0) produced_cents,coalesce(inv.invoiced_cents,0) invoiced_cents,coalesce(pr.cost_cents,0) cost_cents
    from produced pr
    full join planned pl on pl.treatment_code=pr.treatment_code
    full join invoiced inv on inv.treatment_code=coalesce(pr.treatment_code,pl.treatment_code)
    left join public.treatment_catalog tc on tc.clinic_id=p_clinic_id and tc.code=coalesce(pr.treatment_code,pl.treatment_code,inv.treatment_code)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'treatmentCode',treatment_code,'treatment',label,'label',label,'category',category,
    'count',completed_count,'producedCents',produced_cents,'invoicedCents',invoiced_cents,
    'costCents',cost_cents,'marginCents',produced_cents-cost_cents,
    'conversionPercent',case when planned_count>0 then round(100.0*cohort_completed_count/planned_count,1) else 0 end
  ) order by produced_cents desc,treatment_code) filter (where treatment_code is not null),'[]'::jsonb)
  into v_items from (select * from combined order by produced_cents desc,treatment_code limit greatest(1,least(coalesce(p_limit,100),200))) x;
  return jsonb_build_object('kpiVersion','DENTY-KPI-1','items',v_items);
end $$;

create or replace function public.analytics_profitability(
  p_clinic_id uuid,p_start timestamptz default null,p_end timestamptz default null,p_site_id uuid default null,p_staff_id uuid default null,p_specialty text default null,p_category text default null,p_limit integer default 100
) returns jsonb language sql stable security definer set search_path='' as $$
  select public.analytics_treatments(p_clinic_id,p_start,p_end,p_site_id,p_staff_id,p_specialty,p_category,p_limit)
$$;

create or replace function public.analytics_doctors(
  p_clinic_id uuid,p_start timestamptz default null,p_end timestamptz default null,p_site_id uuid default null,p_staff_id uuid default null,p_limit integer default 100
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_items jsonb;
begin
  if not private.has_finance_permission(p_clinic_id,'finance.read') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  with p as (
    select pe.staff_id,count(*) count,sum(pe.produced_cents)::bigint produced_cents
    from public.analytics_production_events pe where pe.clinic_id=p_clinic_id
      and (p_start is null or pe.recognized_at>=p_start) and (p_end is null or pe.recognized_at<p_end)
      and (p_site_id is null or pe.site_id=p_site_id) and (p_staff_id is null or pe.staff_id=p_staff_id)
    group by pe.staff_id
  ), i as (
    select ie.staff_id,sum(ie.invoiced_cents)::bigint invoiced_cents from public.analytics_invoice_events ie
    where ie.clinic_id=p_clinic_id and ie.staff_id is not null
      and (p_start is null or ie.recognized_at>=p_start) and (p_end is null or ie.recognized_at<p_end)
      and (p_site_id is null or ie.site_id=p_site_id) and (p_staff_id is null or ie.staff_id=p_staff_id)
    group by ie.staff_id
  ), c as (
    select ca.staff_id,sum(ca.collected_cents)::bigint collected_cents from public.analytics_collection_attributions ca
    where ca.clinic_id=p_clinic_id and ca.staff_id is not null
      and (p_start is null or ca.recognized_at>=p_start) and (p_end is null or ca.recognized_at<p_end)
      and (p_site_id is null or ca.site_id=p_site_id) and (p_staff_id is null or ca.staff_id=p_staff_id)
    group by ca.staff_id
  ), keys as (select staff_id from p union select staff_id from i union select staff_id from c)
  select coalesce(jsonb_agg(jsonb_build_object('doctorId',k.staff_id,'staffId',k.staff_id,'doctorName',coalesce(sm.display_name,'Sin profesional asignado'),'name',coalesce(sm.display_name,'Sin profesional asignado'),'count',coalesce(p.count,0),'producedCents',coalesce(p.produced_cents,0),'invoicedCents',coalesce(i.invoiced_cents,0),'collectedCents',coalesce(c.collected_cents,0)) order by coalesce(p.produced_cents,0) desc) filter(where k.staff_id is not null),'[]'::jsonb)
  into v_items from (select * from keys limit greatest(1,least(coalesce(p_limit,100),200))) k left join p using(staff_id) left join i using(staff_id) left join c using(staff_id) left join public.staff_members sm on sm.id=k.staff_id and sm.clinic_id=p_clinic_id;
  return jsonb_build_object('kpiVersion','DENTY-KPI-1','items',v_items);
end $$;

create or replace function public.analytics_monthly(
  p_clinic_id uuid,p_start timestamptz default null,p_end timestamptz default null,p_site_id uuid default null,p_staff_id uuid default null,p_limit integer default 120
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_items jsonb;
begin
  if not private.has_finance_permission(p_clinic_id,'finance.read') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  with prod as (
    select date_trunc('month',pe.recognized_at at time zone 'Europe/Madrid') as month,sum(pe.produced_cents)::bigint produced_cents from public.analytics_production_events pe
    where pe.clinic_id=p_clinic_id and (p_start is null or pe.recognized_at>=p_start) and (p_end is null or pe.recognized_at<p_end) and (p_site_id is null or pe.site_id=p_site_id) and (p_staff_id is null or pe.staff_id=p_staff_id) group by 1
  ), inv as (
    select date_trunc('month',ie.recognized_at at time zone 'Europe/Madrid') as month,sum(ie.invoiced_cents)::bigint invoiced_cents from public.analytics_invoice_events ie
    where ie.clinic_id=p_clinic_id and (p_start is null or ie.recognized_at>=p_start) and (p_end is null or ie.recognized_at<p_end) and (p_site_id is null or ie.site_id=p_site_id) and (p_staff_id is null or ie.staff_id=p_staff_id) group by 1
  ), coll as (
    select date_trunc('month',x.recognized_at at time zone 'Europe/Madrid') as month,sum(x.collected_cents)::bigint collected_cents from (
      select p.paid_at recognized_at,p.amount_cents::bigint collected_cents from public.payments p
      where p.clinic_id=p_clinic_id and p.status='COMPLETED' and p_site_id is null and p_staff_id is null
      union all
      select ca.recognized_at,ca.collected_cents from public.analytics_collection_attributions ca
      where ca.clinic_id=p_clinic_id and (p_site_id is not null or p_staff_id is not null)
        and (p_site_id is null or ca.site_id=p_site_id) and (p_staff_id is null or ca.staff_id=p_staff_id)
    ) x where (p_start is null or x.recognized_at>=p_start) and (p_end is null or x.recognized_at<p_end) group by 1
  ), months as (select month from prod union select month from inv union select month from coll)
  select coalesce(jsonb_agg(jsonb_build_object('month',to_char(m.month,'YYYY-MM'),'producedCents',coalesce(prod.produced_cents,0),'invoicedCents',coalesce(inv.invoiced_cents,0),'collectedCents',coalesce(coll.collected_cents,0)) order by m.month) filter(where m.month is not null),'[]'::jsonb)
  into v_items from (select * from months order by month desc limit greatest(1,least(coalesce(p_limit,120),200))) m left join prod using(month) left join inv using(month) left join coll using(month);
  return jsonb_build_object('kpiVersion','DENTY-KPI-1','items',v_items);
end $$;

create or replace function public.analytics_specialties(
  p_clinic_id uuid,p_start timestamptz default null,p_end timestamptz default null,p_site_id uuid default null,p_staff_id uuid default null,p_limit integer default 100
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_items jsonb;
begin
  if not private.has_finance_permission(p_clinic_id,'finance.read') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('name',specialty,'label',specialty,'count',count,'producedCents',produced_cents,'costCents',cost_cents,'marginCents',produced_cents-cost_cents) order by produced_cents desc),'[]'::jsonb) into v_items
  from (select pe.specialty,count(*) count,sum(pe.produced_cents)::bigint produced_cents,sum(pe.cost_cents)::bigint cost_cents from public.analytics_production_events pe where pe.clinic_id=p_clinic_id and (p_start is null or pe.recognized_at>=p_start) and (p_end is null or pe.recognized_at<p_end) and (p_site_id is null or pe.site_id=p_site_id) and (p_staff_id is null or pe.staff_id=p_staff_id) group by pe.specialty order by produced_cents desc limit greatest(1,least(coalesce(p_limit,100),200))) x;
  return jsonb_build_object('kpiVersion','DENTY-KPI-1','items',v_items);
end $$;

create or replace function public.analytics_kpi_definitions()
returns jsonb language sql stable security invoker set search_path='' as $$
  select jsonb_build_object('version','DENTY-KPI-1','items',coalesce(jsonb_agg(jsonb_build_object(
    'code',d.code,'label',d.label,'formula',d.formula,'recognitionRule',d.recognition_rule,'timeField',d.time_field,
    'timezone',d.timezone,'sourceTables',d.source_tables,'supportedFilters',d.supported_filters,'notes',d.notes
  ) order by d.code),'[]'::jsonb)) from public.analytics_kpi_definitions d where d.version='DENTY-KPI-1'
$$;




create index if not exists appointments_analytics_completion_idx on public.appointments(clinic_id,completed_at,clinical_plan_item_id) where status='COMPLETED' and clinical_plan_item_id is not null;
create index if not exists clinical_plan_items_analytics_created_idx on public.clinical_plan_items(clinic_id,created_at,treatment_code);
create index if not exists payments_analytics_paid_idx on public.payments(clinic_id,paid_at) where status='COMPLETED';

revoke all on function public.analytics_summary(uuid,timestamptz,timestamptz,uuid,uuid) from public,anon;
revoke all on function public.analytics_treatments(uuid,timestamptz,timestamptz,uuid,uuid,text,text,integer) from public,anon;
revoke all on function public.analytics_profitability(uuid,timestamptz,timestamptz,uuid,uuid,text,text,integer) from public,anon;
revoke all on function public.analytics_doctors(uuid,timestamptz,timestamptz,uuid,uuid,integer) from public,anon;
revoke all on function public.analytics_monthly(uuid,timestamptz,timestamptz,uuid,uuid,integer) from public,anon;
revoke all on function public.analytics_specialties(uuid,timestamptz,timestamptz,uuid,uuid,integer) from public,anon;
revoke all on function public.analytics_kpi_definitions() from public,anon;
grant execute on function public.analytics_summary(uuid,timestamptz,timestamptz,uuid,uuid) to authenticated;
grant execute on function public.analytics_treatments(uuid,timestamptz,timestamptz,uuid,uuid,text,text,integer) to authenticated;
grant execute on function public.analytics_profitability(uuid,timestamptz,timestamptz,uuid,uuid,text,text,integer) to authenticated;
grant execute on function public.analytics_doctors(uuid,timestamptz,timestamptz,uuid,uuid,integer) to authenticated;
grant execute on function public.analytics_monthly(uuid,timestamptz,timestamptz,uuid,uuid,integer) to authenticated;
grant execute on function public.analytics_specialties(uuid,timestamptz,timestamptz,uuid,uuid,integer) to authenticated;
grant execute on function public.analytics_kpi_definitions() to authenticated;

commit;
