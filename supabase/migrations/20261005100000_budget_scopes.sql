-- Several budgets per plan, with native two-phase budgeting.
--
-- A plan used to have exactly one draft budget, rebuilt from every open item. Clinics quote the
-- treatment in two phases (first disease control: extractions, root canals, periodontics, night
-- guards, fillings; then rehabilitation: implants, prostheses, posts, orthodontics, whitening)
-- and sometimes as alternative budgets. Each budget now has a scope:
--   plan       the whole plan, kept in step with the odontogram as before;
--   primary    phase 1 items; secondary  phase 2 items (one draft of each, regenerated);
--   custom     any selection of items, a new budget every time.
-- The phase of each item is decided by the application (one classifier, shared with the UI);
-- the database only checks that the items belong to the patient's current plan.

begin;

alter table public.budgets
  add column if not exists scope text not null default 'plan',
  add column if not exists title text;

alter table public.budgets drop constraint if exists budgets_scope_check;
alter table public.budgets
  add constraint budgets_scope_check check (scope in ('plan', 'primary', 'secondary', 'custom'));
alter table public.budgets drop constraint if exists budgets_title_length;
alter table public.budgets
  add constraint budgets_title_length check (title is null or char_length(title) <= 120);

create or replace function public.create_budget_from_plan_items(
  p_patient_id uuid,
  p_item_ids uuid[],
  p_scope text,
  p_title text default null
)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  v_clinic_id uuid; v_plan public.clinical_plans%rowtype; v_budget public.budgets%rowtype;
  v_total integer; v_revision integer; v_odontogram_version integer;
  v_requested integer; v_found integer;
  v_title text := nullif(btrim(coalesce(p_title, '')), '');
begin
  select clinic_id into v_clinic_id from public.patients where id=p_patient_id;
  if v_clinic_id is null then raise exception 'PATIENT_NOT_FOUND' using errcode='P0002'; end if;
  if not private.is_clinic_staff(v_clinic_id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_scope not in ('primary', 'secondary', 'custom') then
    raise exception 'BUDGET_SCOPE_INVALID' using errcode='22023';
  end if;
  select * into v_plan from public.clinical_plans where patient_id=p_patient_id order by updated_at desc limit 1;
  if v_plan.id is null then raise exception 'PLAN_NOT_FOUND' using errcode='P0002'; end if;
  select coalesce(max(version), 1) into v_odontogram_version
  from public.dental_entities where patient_id=p_patient_id;
  if v_plan.source_odontogram_version is distinct from v_odontogram_version then
    raise exception 'PLAN_OUTDATED' using errcode='23514';
  end if;

  select count(distinct id) into v_requested from unnest(coalesce(p_item_ids, '{}'::uuid[])) as id;
  select count(*) into v_found from public.clinical_plan_items i
  where i.plan_id=v_plan.id and i.id = any(p_item_ids)
    and i.status not in ('CANCELLED','SUPERSEDED','COMPLETED');
  if v_requested = 0 or v_found <> v_requested then
    raise exception 'PLAN_ITEMS_INVALID' using errcode='22023';
  end if;

  perform public.refresh_consent_requirements(v_plan.id);
  select coalesce(sum(case when billing_mode='separate' then coalesce(price_snapshot_cents,price_cents,0) else 0 end),0)
  into v_total from public.clinical_plan_items where plan_id=v_plan.id and id = any(p_item_ids);

  -- Each phase keeps one draft that is regenerated; a signed phase budget is never touched.
  if p_scope <> 'custom' then
    select * into v_budget from public.budgets
    where patient_id=p_patient_id and clinical_plan_id=v_plan.id and scope=p_scope and status='DRAFT'
    order by revision desc limit 1 for update;
  end if;

  if v_budget.id is null then
    select coalesce(max(revision),0)+1 into v_revision from public.budgets where patient_id=p_patient_id;
    insert into public.budgets(clinic_id,patient_id,clinical_plan_id,code,status,total_cents,source_plan_version,revision,version,scope,title)
    values(v_clinic_id,p_patient_id,v_plan.id,'P-'||substr(p_patient_id::text,1,8)||'-R'||v_revision,'DRAFT',v_total,v_plan.version,v_revision,1,p_scope,v_title)
    returning * into v_budget;
  else
    update public.budgets
    set total_cents=v_total, source_plan_version=v_plan.version, version=version+1,
        title=coalesce(v_title, title)
    where id=v_budget.id returning * into v_budget;
    delete from public.budget_items where budget_id=v_budget.id;
  end if;

  insert into public.budget_items(clinic_id,budget_id,clinical_plan_item_id,component_type,description,tooth,billing_mode,quantity,unit_price_cents,total_cents)
  select i.clinic_id,v_budget.id,i.id,i.component_type,coalesce(i.label_snapshot,i.label),i.tooth,i.billing_mode,1,coalesce(i.price_snapshot_cents,i.price_cents,0),case when i.billing_mode='separate' then coalesce(i.price_snapshot_cents,i.price_cents,0) else 0 end
  from public.clinical_plan_items i where i.plan_id=v_plan.id and i.id = any(p_item_ids)
  order by i.phase, i.priority desc, i.created_at;

  insert into public.clinical_history_events(clinic_id,patient_id,actor_id,event_type,entity_id,entity_type,payload_json)
  values(v_clinic_id,p_patient_id,(select auth.uid()),'BUDGET_CREATED_FROM_ITEMS',v_budget.id,'BUDGET',
    jsonb_build_object('scope',p_scope,'revision',v_budget.revision,'totalCents',v_total,'items',v_requested));
  return to_jsonb(v_budget);
end; $$;

-- The whole-plan budget only ever rebuilds its own draft, never a phase or custom one.
create or replace function public.sync_budget_from_plan(p_patient_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  v_clinic_id uuid; v_plan public.clinical_plans%rowtype; v_budget public.budgets%rowtype; v_total integer; v_revision integer;
  v_odontogram_version integer;
begin
  select clinic_id into v_clinic_id from public.patients where id=p_patient_id;
  if v_clinic_id is null then raise exception 'PATIENT_NOT_FOUND' using errcode='P0002'; end if;
  if not private.is_clinic_staff(v_clinic_id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select * into v_plan from public.clinical_plans where patient_id=p_patient_id order by updated_at desc limit 1;
  if v_plan.id is null then raise exception 'PLAN_NOT_FOUND' using errcode='P0002'; end if;
  if v_plan.source_odontogram_version is null then raise exception 'PLAN_NOT_SYNCED' using errcode='23514'; end if;
  select coalesce(max(version), 1) into v_odontogram_version
  from public.dental_entities where patient_id=p_patient_id;
  if v_plan.source_odontogram_version <> v_odontogram_version then
    raise exception 'PLAN_OUTDATED' using errcode='23514';
  end if;
  perform public.refresh_consent_requirements(v_plan.id);
  select * into v_budget from public.budgets
  where patient_id=p_patient_id and clinical_plan_id=v_plan.id and scope='plan'
  order by revision desc limit 1 for update;
  select coalesce(sum(case when billing_mode='separate' and status not in ('CANCELLED','SUPERSEDED') then coalesce(price_snapshot_cents,price_cents,0) else 0 end),0)
  into v_total from public.clinical_plan_items where plan_id=v_plan.id;
  if v_budget.id is null or v_budget.status <> 'DRAFT' then
    select coalesce(max(revision),0)+1 into v_revision from public.budgets where patient_id=p_patient_id;
    insert into public.budgets(clinic_id,patient_id,clinical_plan_id,code,status,total_cents,source_plan_version,revision,version,scope)
    values(v_clinic_id,p_patient_id,v_plan.id,'P-'||substr(p_patient_id::text,1,8)||'-R'||v_revision,'DRAFT',v_total,v_plan.version,v_revision,1,'plan') returning * into v_budget;
  else
    update public.budgets set total_cents=v_total,source_plan_version=v_plan.version,version=version+1,status='DRAFT' where id=v_budget.id returning * into v_budget;
    delete from public.budget_items where budget_id=v_budget.id;
  end if;
  insert into public.budget_items(clinic_id,budget_id,clinical_plan_item_id,component_type,description,tooth,billing_mode,quantity,unit_price_cents,total_cents)
  select i.clinic_id,v_budget.id,i.id,i.component_type,coalesce(i.label_snapshot,i.label),i.tooth,i.billing_mode,1,coalesce(i.price_snapshot_cents,i.price_cents,0),case when i.billing_mode='separate' then coalesce(i.price_snapshot_cents,i.price_cents,0) else 0 end
  from public.clinical_plan_items i where i.plan_id=v_plan.id and i.status not in ('CANCELLED','SUPERSEDED');
  insert into public.clinical_history_events(clinic_id,patient_id,actor_id,event_type,entity_id,entity_type,payload_json)
  values(v_clinic_id,p_patient_id,(select auth.uid()),'BUDGET_SYNCED_FROM_PLAN',v_budget.id,'BUDGET',jsonb_build_object('planVersion',v_plan.version,'revision',v_budget.revision,'totalCents',v_total));
  return to_jsonb(v_budget);
end; $$;

revoke execute on function public.create_budget_from_plan_items(uuid, uuid[], text, text) from public, anon;
grant execute on function public.create_budget_from_plan_items(uuid, uuid[], text, text) to authenticated;
grant execute on function public.sync_budget_from_plan(uuid) to authenticated;

commit;
