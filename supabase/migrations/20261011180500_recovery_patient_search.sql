-- Phase 1B read-only patient recovery segmentation. No communications are sent.
-- Budget items are quotations, execution records are performed work.
-- An unrecorded visit is UNKNOWN, not "never came".

create index if not exists recovery_attended_visit_search_idx
 on public.appointments(clinic_id, patient_id, starts_at desc)
 where status in ('ARRIVED','COMPLETED') or arrived_at is not null;
create index if not exists recovery_execution_search_idx
 on public.clinical_treatment_executions(clinic_id, patient_id, executed_at desc);
create index if not exists recovery_budget_description_idx
 on public.budget_items(clinic_id, budget_id);
create index if not exists recovery_budgets_patient_idx
 on public.budgets(clinic_id, patient_id, status);

create or replace function public.search_recovery_patients(
 p_clinic_id uuid,
 p_query text default '',
 p_budget_treatment text default '',
 p_performed_treatment text default '',
 p_budget_status text default 'ALL',
 p_inactivity text default 'ALL',
 p_without_future boolean default false,
 p_page integer default 1,
 p_page_size integer default 25
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_total integer;
 v_items jsonb;
begin
 if not (select private.stage11_has_permission(p_clinic_id,'communications.read')) then
   raise exception 'FORBIDDEN' using errcode='42501';
 end if;
 if p_budget_status not in ('ALL','SIGNED','DRAFT')
    or p_inactivity not in ('ALL','THREE_MONTHS','SIX_MONTHS','TWELVE_MONTHS','TWENTY_FOUR_MONTHS','UNKNOWN')
    or p_page is null or p_page < 1 or p_page > 100000
    or p_page_size is null or p_page_size < 1 or p_page_size > 50
    or p_without_future is null
    or length(coalesce(p_query,'')) > 100
    or length(coalesce(p_budget_treatment,'')) > 100
    or length(coalesce(p_performed_treatment,'')) > 100
    or (length(btrim(coalesce(p_query,'')))=1)
    or (length(btrim(coalesce(p_budget_treatment,'')))=1)
    or (length(btrim(coalesce(p_performed_treatment,'')))=1) then
   raise exception 'INVALID_RECOVERY_SEARCH' using errcode='22023';
 end if;

 with candidates as (
  select
    p.id as patient_id,p.first_name,p.last_name,p.record_number,p.phone,
    last_contact.last_visit_at,next_appointment.next_appointment_at
  from public.patients p
  left join lateral (
    select max(visits.attended_at) as last_visit_at from (
      select max(coalesce(a.completed_at,a.arrived_at,a.starts_at)) as attended_at
      from public.appointments a
      where a.clinic_id=p_clinic_id and a.patient_id=p.id
        and a.starts_at<=now()
        and (a.status in ('ARRIVED','COMPLETED') or a.arrived_at is not null)
      union all
      select max(e.executed_at) as attended_at
      from public.clinical_treatment_executions e
      where e.clinic_id=p_clinic_id and e.patient_id=p.id and e.executed_at<=now()
    ) visits
  ) last_contact on true
  left join lateral (
    select min(a.starts_at) as next_appointment_at
    from public.appointments a
    where a.clinic_id=p_clinic_id and a.patient_id=p.id
     and a.starts_at > now() and a.status not in ('CANCELLED','NO_SHOW')
  ) next_appointment on true
  where p.clinic_id=p_clinic_id and p.archived_at is null
    and (btrim(coalesce(p_query,''))='' or
      position(lower(btrim(p_query)) in lower(concat_ws(' ',p.first_name,p.last_name,p.record_number)))>0)
    and (not p_without_future or next_appointment.next_appointment_at is null)
    and (
     p_inactivity='ALL'
     or (p_inactivity='UNKNOWN' and last_contact.last_visit_at is null)
     or (last_contact.last_visit_at is not null and (
       (p_inactivity='THREE_MONTHS' and last_contact.last_visit_at<=now()-interval '3 months')
       or (p_inactivity='SIX_MONTHS' and last_contact.last_visit_at<=now()-interval '6 months')
       or (p_inactivity='TWELVE_MONTHS' and last_contact.last_visit_at<=now()-interval '12 months')
       or (p_inactivity='TWENTY_FOUR_MONTHS' and last_contact.last_visit_at<=now()-interval '24 months')
     ))
    )
    and (
      btrim(coalesce(p_budget_treatment,''))=''
      or exists (
       select 1 from public.budgets b
       join public.budget_items bi on bi.budget_id=b.id and bi.clinic_id=b.clinic_id
       where b.clinic_id=p_clinic_id and b.patient_id=p.id
        and (p_budget_status='ALL' or b.status=p_budget_status)
        and position(lower(btrim(p_budget_treatment)) in lower(bi.description))>0
      )
    )
    and (
      btrim(coalesce(p_performed_treatment,''))=''
      or exists (
       select 1 from public.clinical_treatment_executions e
       left join public.treatment_catalog tc
        on tc.clinic_id=p_clinic_id and tc.code=e.treatment_code
       where e.clinic_id=p_clinic_id and e.patient_id=p.id
        and (
          position(lower(btrim(p_performed_treatment)) in lower(e.treatment_code))>0
          or position(lower(btrim(p_performed_treatment)) in lower(coalesce(e.treatment_category,'')))>0
          or position(lower(btrim(p_performed_treatment)) in lower(coalesce(tc.name,'')))>0
        )
      )
    )
 ),
 page_rows as (
  select * from candidates
  order by last_visit_at asc nulls last,patient_id
  limit p_page_size offset (p_page-1)*p_page_size
 )
 select
  (select count(*)::integer from candidates),
  (select coalesce(jsonb_agg(jsonb_build_object(
    'patientId',patient_id,
    'patientName',btrim(concat_ws(' ',first_name,last_name)),
    'recordNumber',record_number,
    'phone',phone,
    'lastVisitAt',last_visit_at,
    'nextAppointmentAt',next_appointment_at
  ) order by last_visit_at asc nulls last,patient_id),'[]'::jsonb) from page_rows)
 into v_total,v_items;

 return jsonb_build_object(
   'items',v_items,'total',v_total,'page',p_page,'pageSize',p_page_size
 );
end;
$$;

revoke all on function public.search_recovery_patients(
 uuid,text,text,text,text,text,boolean,integer,integer
) from public,anon;
grant execute on function public.search_recovery_patients(
 uuid,text,text,text,text,text,boolean,integer,integer
) to authenticated;
