-- Phase 1A: read-only recovery triage with patient-level deduplication.
-- Avoid inferring sent/presented dates from creation time; a draft is NOT a sent budget.
alter table public.budgets
  add column if not exists presented_at timestamptz,
  add column if not exists sent_at timestamptz,
  add column if not exists valid_until date,
  add column if not exists next_follow_up_at timestamptz,
  add column if not exists rejection_reason text;

create index if not exists recovery_recalls_open_due_idx
  on public.patient_recalls(clinic_id, due_at, patient_id)
  where status in ('pending','contacted');
create index if not exists recovery_plan_items_pending_idx
  on public.clinical_plan_items(clinic_id, plan_id, id)
  where status='PLANNED';
create index if not exists recovery_appointments_future_item_idx
  on public.appointments(clinic_id, clinical_plan_item_id, starts_at)
  where status not in ('CANCELLED','NO_SHOW') and clinical_plan_item_id is not null;
create index if not exists recovery_budgets_followup_idx
  on public.budgets(clinic_id, status, next_follow_up_at)
  where status in ('PRESENTED','SENT');

create or replace function public.recovery_worklist(
 p_clinic_id uuid,
 p_kind text default 'ALL',
 p_page integer default 1,
 p_page_size integer default 25
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
 v_total integer;
 v_items jsonb;
 v_counts jsonb;
begin
 if not (select private.stage11_has_permission(p_clinic_id,'communications.read')) then
   raise exception 'FORBIDDEN' using errcode='42501';
 end if;
 if p_kind not in ('ALL','RECALL','PLAN','BUDGET')
    or p_page < 1 or p_page_size < 1 or p_page_size > 50
    or p_page is null or p_page_size is null then
   raise exception 'INVALID_RECOVERY_FILTER' using errcode='22023';
 end if;

 with
 pending as (
   select r.patient_id, r.id as reference_id, 'RECALL'::text as kind,
          r.kind::text as label, r.due_at as due_at,
          (case when r.due_at < now() then 1 else 4 end)::integer as priority,
          null::integer as amount_cents
   from public.patient_recalls r
   where r.clinic_id=p_clinic_id and r.status in ('pending','contacted')
     and r.due_at <= now() + interval '30 days'
     and not exists (
       select 1 from public.appointments a
       where a.clinic_id=r.clinic_id and a.patient_id=r.patient_id
         and a.starts_at>=now() and a.status not in ('CANCELLED','NO_SHOW')
     )
   union all
   select plan.patient_id, item.id, 'PLAN'::text,
          coalesce(nullif(item.label_snapshot,''), nullif(item.label,''),'Tratamiento sin programar'),
          item.created_at, 2,
          coalesce(item.price_snapshot_cents,item.price_cents,0)
   from public.clinical_plan_items item
   join public.clinical_plans plan
     on plan.id=item.plan_id and plan.clinic_id=item.clinic_id
   where item.clinic_id=p_clinic_id and item.status='PLANNED'
     and exists (
       select 1 from public.budgets b
       where b.clinic_id=p_clinic_id and b.patient_id=plan.patient_id
         and b.clinical_plan_id=plan.id and b.status='SIGNED'
     )
     and not exists (
       select 1 from public.appointments a
       where a.clinic_id=p_clinic_id and a.patient_id=plan.patient_id
         and a.clinical_plan_item_id=item.id
         and a.starts_at>=now() and a.status not in ('CANCELLED','NO_SHOW')
     )
   union all
   select b.patient_id, b.id, 'BUDGET'::text,
          coalesce(nullif(b.title,''), b.code, 'Presupuesto sin respuesta'),
          coalesce(b.next_follow_up_at,b.sent_at,b.presented_at), 3,
          b.total_cents
   from public.budgets b
   where b.clinic_id=p_clinic_id and b.status in ('PRESENTED','SENT')
     and (b.sent_at is not null or b.presented_at is not null)
     and coalesce(b.sent_at,b.presented_at)<=now()-interval '3 days'
     and (b.next_follow_up_at is null or b.next_follow_up_at<=now())
     and (b.valid_until is null or b.valid_until >= (now() at time zone 'Europe/Madrid')::date)
 ),
 scoped as (
   select q.* from pending q
   join public.patients p
     on p.id=q.patient_id and p.clinic_id=p_clinic_id and p.archived_at is null
   where p_kind='ALL' or q.kind=p_kind
 ),
 reasons as (
   select patient_id, jsonb_agg(distinct kind) as kinds
   from scoped group by patient_id
 ),
 ranked as (
   select s.*,row_number() over (
     partition by s.patient_id order by s.priority asc,s.due_at asc,s.reference_id
   ) as row_no
   from scoped s
 ),
 primary_rows as (
   select ranked.*,p.first_name,p.last_name,p.record_number,
          p.phone,reasons.kinds
   from ranked
   join public.patients p on p.id=ranked.patient_id and p.clinic_id=p_clinic_id
   join reasons on reasons.patient_id=ranked.patient_id
   where row_no=1
 ),
 page_rows as (
   select * from primary_rows
   order by priority asc,due_at asc,patient_id
   limit p_page_size offset (p_page-1)*p_page_size
 )
 select
   (select count(*)::int from primary_rows),
   (select coalesce(jsonb_agg(
     jsonb_build_object(
       'patientId',page_rows.patient_id,
       'patientName',btrim(page_rows.first_name||' '||page_rows.last_name),
       'recordNumber',page_rows.record_number,
       'phone',page_rows.phone,
       'kind',page_rows.kind,'referenceId',page_rows.reference_id,
       'label',page_rows.label,'dueAt',page_rows.due_at,
       'amountCents',page_rows.amount_cents,'kinds',page_rows.kinds
     ) order by page_rows.priority,page_rows.due_at,page_rows.patient_id
   ),'[]'::jsonb) from page_rows),
   (select coalesce(jsonb_object_agg(t.kind,t.total),'{}'::jsonb)
      from (select kind,count(distinct patient_id)::int as total from scoped group by kind) t)
 into v_total,v_items,v_counts;

 return jsonb_build_object(
   'items',v_items,'counts',v_counts,
   'total',v_total,'page',p_page,'pageSize',p_page_size
 );
end;
$$;

revoke all on function public.recovery_worklist(uuid,text,integer,integer) from public,anon;
grant execute on function public.recovery_worklist(uuid,text,integer,integer) to authenticated;
