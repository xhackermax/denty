-- Denty Stage 10: include attributable external laboratory costs in the
-- canonical DENTY-KPI-1 margin without mutating clinical production history.

begin;

create or replace view public.analytics_lab_costs_by_plan_item as
with actual as (
  select
    sii.lab_work_id,
    sum(sii.total_cents)::bigint as actual_cost_cents
  from public.supplier_invoice_items sii
  join public.supplier_invoices si
    on si.id=sii.supplier_invoice_id
   and si.clinic_id=sii.clinic_id
  where sii.lab_work_id is not null
    and si.status<>'VOID'
  group by sii.lab_work_id
), per_work as (
  select
    lw.clinic_id,
    lw.clinical_plan_item_id,
    lw.id as lab_work_id,
    case
      when actual.lab_work_id is not null then actual.actual_cost_cents
      when lw.status='CANCELLED' then 0::bigint
      else greatest(0,lw.cost_cents)::bigint
    end as lab_cost_cents
  from public.lab_works lw
  left join actual on actual.lab_work_id=lw.id
  where lw.clinical_plan_item_id is not null
)
select
  clinic_id,
  clinical_plan_item_id,
  sum(lab_cost_cents)::bigint as lab_cost_cents
from per_work
group by clinic_id,clinical_plan_item_id;

revoke all on public.analytics_lab_costs_by_plan_item from public,anon,authenticated;

-- Same shape as Stage 9. Only cost_cents/margin_cents change: the immutable
-- planned cost snapshot remains, and attributable external lab cost is added.
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
  (greatest(0,coalesce(cpi.cost_snapshot_cents,0)) + coalesce(lab.lab_cost_cents,0))::bigint as cost_cents,
  (
    greatest(0,coalesce(cpi.price_snapshot_cents,cpi.price_cents,0))
    - greatest(0,coalesce(cpi.cost_snapshot_cents,0))
    - coalesce(lab.lab_cost_cents,0)
  )::bigint as margin_cents
from ranked r
join public.clinical_plan_items cpi
  on cpi.id=r.clinical_plan_item_id
 and cpi.clinic_id=r.clinic_id
left join public.analytics_lab_costs_by_plan_item lab
  on lab.clinic_id=r.clinic_id
 and lab.clinical_plan_item_id=r.clinical_plan_item_id
where r.recognition_rank=1;

revoke all on public.analytics_production_events from public,anon,authenticated;

update public.analytics_kpi_definitions
set formula='Producción - SUM(cost_snapshot_cents + coste externo de laboratorio atribuible) de producción reconocida',
    source_tables=array['appointments','clinical_plan_items','lab_works','supplier_invoice_items','supplier_invoices'],
    notes='Margen clínico bruto. Usa coste planificado congelado y añade coste externo de laboratorio; una línea de factura de proveedor sustituye el coste provisional del trabajo vinculado.'
where version='DENTY-KPI-1' and code='margin';

commit;
