-- Recovery explorer: verified attendance, quoted treatment lines and executed ledger.
-- Read-only. No patient outreach or clinical interval is inferred from a treatment name.
create index if not exists recovery_attended_appointments_idx
 on public.appointments(clinic_id,patient_id,completed_at desc)
 where status='COMPLETED';
create index if not exists recovery_executions_by_patient_idx
 on public.clinical_treatment_executions(clinic_id,patient_id,executed_at desc);
create index if not exists recovery_budget_items_by_budget_idx
 on public.budget_items(clinic_id,budget_id);

create or replace function public.recovery_patient_search(
  p_clinic_id uuid,
  p_patient_query text default '',
  p_budget_query text default '',
  p_performed_query text default '',
  p_min_days integer default null,
  p_max_days integer default null,
  p_only_no_visit boolean default false,
  p_page integer default 1,
  p_page_size integer default 20
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare v_total integer; v_items jsonb;
  v_can_clinical boolean;
  v_can_finance boolean;
begin
  if not (select private.stage11_has_permission(p_clinic_id,'patients.read'))
    or not (
      (select private.stage11_has_permission(p_clinic_id,'communications.read'))
      or (select private.stage11_has_permission(p_clinic_id,'clinical.read'))
    ) then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  v_can_clinical := (select private.stage11_has_permission(p_clinic_id,'clinical.read'));
  v_can_finance := (select private.stage11_has_permission(p_clinic_id,'finance.read'));
  if nullif(btrim(coalesce(p_budget_query,'')),'') is not null
     and not v_can_finance then
    raise exception 'FINANCE_READ_REQUIRED' using errcode='42501';
  end if;
  if nullif(btrim(coalesce(p_performed_query,'')),'') is not null
     and not v_can_clinical then
    raise exception 'CLINICAL_READ_REQUIRED' using errcode='42501';
  end if;
  if length(coalesce(p_patient_query,'')) > 100
     or length(coalesce(p_budget_query,'')) > 100
     or length(coalesce(p_performed_query,'')) > 100
     or p_min_days < 0 or p_max_days < 0
     or p_min_days > 36500 or p_max_days > 36500
     or (p_min_days is not null and p_max_days is not null and p_min_days > p_max_days)
     or p_page is null or p_page < 1 or p_page > 100000
     or p_page_size is null or p_page_size < 1 or p_page_size > 50
     or p_only_no_visit is null then
    raise exception 'INVALID_RECOVERY_SEARCH' using errcode='22023';
  end if;

  with visits as (
    select a.patient_id, max(
      case
        when a.status='COMPLETED'
          then coalesce(a.completed_at,a.starts_at)
        when a.status in ('ARRIVED','IN_CHAIR')
          then coalesce(a.arrived_at,a.chair_started_at)
        else null
      end
    ) as last_visit_at
    from public.appointments a
    where a.clinic_id=p_clinic_id
      and (
        (a.status='COMPLETED' and coalesce(a.completed_at,a.starts_at)<=now())
        or (a.status in ('ARRIVED','IN_CHAIR')
          and coalesce(a.arrived_at,a.chair_started_at) is not null
          and coalesce(a.arrived_at,a.chair_started_at)<=now())
      )
    group by a.patient_id
  ),
  filtered as (
    select p.id,p.first_name,p.last_name,p.record_number,p.phone,
      v.last_visit_at,
      case when v.last_visit_at is not null
        then ((now() at time zone 'Europe/Madrid')::date
             - (v.last_visit_at at time zone 'Europe/Madrid')::date)
        else null end as days_absent
    from public.patients p
    left join visits v on v.patient_id=p.id
    where p.clinic_id=p_clinic_id and p.archived_at is null
      and (
        nullif(btrim(coalesce(p_patient_query,'')),'') is null
        or position(lower(btrim(p_patient_query)) in
           lower(coalesce(p.first_name,'')||' '||coalesce(p.last_name,''))) > 0
        or position(lower(btrim(p_patient_query)) in lower(coalesce(p.record_number,''))) > 0
      )
      and (not p_only_no_visit or v.last_visit_at is null)
      and (p_min_days is null or v.last_visit_at is null or
         ((now() at time zone 'Europe/Madrid')::date -
          (v.last_visit_at at time zone 'Europe/Madrid')::date)>=p_min_days)
      and (p_max_days is null or (v.last_visit_at is not null and
         ((now() at time zone 'Europe/Madrid')::date -
          (v.last_visit_at at time zone 'Europe/Madrid')::date)<=p_max_days))
      and (nullif(btrim(coalesce(p_budget_query,'')),'') is null or exists (
        select 1 from public.budgets b
        join public.budget_items bi on bi.budget_id=b.id and bi.clinic_id=b.clinic_id
        left join public.clinical_plan_items pi on pi.id=bi.clinical_plan_item_id
             and pi.clinic_id=b.clinic_id
        where b.clinic_id=p_clinic_id and b.patient_id=p.id
          and b.status not in ('CANCELLED','SUPERSEDED')
          and (
             position(lower(btrim(p_budget_query)) in lower(coalesce(bi.description,'')))>0
             or position(lower(btrim(p_budget_query)) in
                lower(coalesce(pi.treatment_code_snapshot,pi.treatment_code,'')))>0
          )
      ))
      and (nullif(btrim(coalesce(p_performed_query,'')),'') is null or exists (
        select 1 from public.clinical_treatment_executions e
        left join public.clinical_plan_items pi on pi.id=e.clinical_plan_item_id
             and pi.clinic_id=e.clinic_id
        left join public.treatment_catalog tc on tc.clinic_id=e.clinic_id
             and tc.code=e.treatment_code
        where e.clinic_id=p_clinic_id and e.patient_id=p.id
          and (
            position(lower(btrim(p_performed_query)) in lower(coalesce(e.treatment_code,'')))>0
            or position(lower(btrim(p_performed_query)) in lower(coalesce(tc.name,'')))>0
            or position(lower(btrim(p_performed_query)) in
               lower(coalesce(pi.label_snapshot,pi.label,'')))>0
          )
      ))
  ),
  page_rows as (
    select f.*
    from filtered f
    order by f.last_visit_at asc nulls first, f.id asc
    limit p_page_size offset (p_page-1)*p_page_size
  ),
  decorated as (
    select pr.*,
      (
        select min(a.starts_at)
        from public.appointments a
        where a.clinic_id=p_clinic_id and a.patient_id=pr.id
          and a.starts_at>=now() and a.status not in ('CANCELLED','NO_SHOW','COMPLETED')
      ) as next_appointment_at,
      (
        select coalesce(jsonb_agg(jsonb_build_object(
          'label',items.description,'status',items.budget_status,
          'budgetId',items.budget_id,'code',items.treatment_code
        ) order by items.recorded_at desc),'[]'::jsonb)
        from (
          select bi.description, b.status as budget_status, b.id as budget_id,
                 coalesce(pi.treatment_code_snapshot,pi.treatment_code) as treatment_code,
                 b.created_at as recorded_at
          from public.budgets b
          join public.budget_items bi on bi.clinic_id=b.clinic_id and bi.budget_id=b.id
          left join public.clinical_plan_items pi
            on pi.id=bi.clinical_plan_item_id and pi.clinic_id=b.clinic_id
          where b.clinic_id=p_clinic_id and b.patient_id=pr.id and v_can_finance
            and b.status not in ('CANCELLED','SUPERSEDED')
            and (nullif(btrim(coalesce(p_budget_query,'')),'') is null or
              position(lower(btrim(p_budget_query)) in lower(coalesce(bi.description,'')))>0 or
              position(lower(btrim(p_budget_query)) in
                lower(coalesce(pi.treatment_code_snapshot,pi.treatment_code,'')))>0)
          order by b.created_at desc,bi.id
          limit 5
        ) items
      ) as budgeted_treatments,
      (
        select coalesce(jsonb_agg(jsonb_build_object(
           'label',executed.label,'code',executed.treatment_code,
           'executedAt',executed.executed_at
        ) order by executed.executed_at desc),'[]'::jsonb)
        from (
          select coalesce(nullif(tc.name,''),nullif(pi.label_snapshot,''),
                          nullif(pi.label,''),e.treatment_code) as label,
                 e.treatment_code,e.executed_at
          from public.clinical_treatment_executions e
          left join public.clinical_plan_items pi
            on pi.id=e.clinical_plan_item_id and pi.clinic_id=e.clinic_id
          left join public.treatment_catalog tc
            on tc.clinic_id=e.clinic_id and tc.code=e.treatment_code
          where e.clinic_id=p_clinic_id and e.patient_id=pr.id and v_can_clinical
            and (nullif(btrim(coalesce(p_performed_query,'')),'') is null or
              position(lower(btrim(p_performed_query)) in lower(coalesce(e.treatment_code,'')))>0 or
              position(lower(btrim(p_performed_query)) in lower(coalesce(tc.name,'')))>0 or
              position(lower(btrim(p_performed_query)) in lower(coalesce(pi.label_snapshot,pi.label,'')))>0)
          order by e.executed_at desc,e.id
          limit 5
        ) executed
      ) as performed_treatments
    from page_rows pr
  )
  select
    (select count(*)::integer from filtered),
    (select coalesce(jsonb_agg(
       jsonb_build_object(
         'patientId',d.id,'patientName',btrim(d.first_name||' '||d.last_name),
         'recordNumber',d.record_number,'phone',d.phone,
         'lastVisitAt',d.last_visit_at,'daysSinceVisit',d.days_absent,
         'nextAppointmentAt',d.next_appointment_at,
         'budgetedTreatments',d.budgeted_treatments,
         'performedTreatments',d.performed_treatments
       ) order by d.last_visit_at asc nulls first,d.id
    ),'[]'::jsonb) from decorated d)
  into v_total,v_items;
  return jsonb_build_object(
    'items',v_items,'total',v_total,'page',p_page,'pageSize',p_page_size
  );
end;
$$;

revoke all on function public.recovery_patient_search(uuid,text,text,text,integer,integer,boolean,integer,integer)
 from public,anon;
grant execute on function public.recovery_patient_search(uuid,text,text,text,integer,integer,boolean,integer,integer)
 to authenticated;

-- Allow clinical users to use the original recovery queue alongside administration.
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
 if not (select private.stage11_has_permission(p_clinic_id,'patients.read'))
    or not (
      (select private.stage11_has_permission(p_clinic_id,'communications.read'))
      or (select private.stage11_has_permission(p_clinic_id,'clinical.read'))
    ) then
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
