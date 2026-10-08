-- True clinical alternatives: share canonical plan items without mutating Plan A,
-- add branch-only procedures from the active clinic catalogue, and snapshot a distinct budget.
-- The clinician's advantages/disadvantages are descriptive, never AI-generated diagnoses.
begin;

create table if not exists public.clinical_plan_branches (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  clinical_plan_id uuid not null references public.clinical_plans(id) on delete cascade,
  budget_id uuid not null unique references public.budgets(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  source_plan_version integer not null check (source_plan_version > 0),
  shared_item_ids uuid[] not null default '{}',
  exclusive_items jsonb not null default '[]'::jsonb
    check (jsonb_typeof(exclusive_items)='array'),
  advantages text check (advantages is null or char_length(advantages)<=2000),
  disadvantages text check (disadvantages is null or char_length(disadvantages)<=2000),
  created_at timestamptz not null default now()
);
create index if not exists clinical_plan_branches_patient_idx
  on public.clinical_plan_branches (clinic_id,patient_id,created_at desc);
alter table public.clinical_plan_branches enable row level security;
drop policy if exists clinical_plan_branches_read on public.clinical_plan_branches;
create policy clinical_plan_branches_read on public.clinical_plan_branches
  for select to authenticated
  using ((select private.is_clinic_staff(clinic_id)));
drop policy if exists clinical_plan_branches_write on public.clinical_plan_branches;
create policy clinical_plan_branches_write on public.clinical_plan_branches
  for insert to authenticated
  with check ((select private.is_clinic_staff(clinic_id)));
grant select,insert on public.clinical_plan_branches to authenticated;
revoke update,delete on public.clinical_plan_branches from authenticated,anon;

create or replace function public.create_clinical_plan_branch(
  p_patient_id uuid,
  p_expected_plan_version integer,
  p_title text,
  p_shared_item_ids uuid[],
  p_exclusive_items jsonb default '[]'::jsonb,
  p_advantages text default null,
  p_disadvantages text default null
) returns jsonb
language plpgsql security invoker set search_path=''
as $$
declare
  v_clinic_id uuid;
  v_plan public.clinical_plans%rowtype;
  v_budget public.budgets%rowtype;
  v_branch public.clinical_plan_branches%rowtype;
  v_shared uuid[] := coalesce(p_shared_item_ids,'{}'::uuid[]);
  v_exclusive jsonb := coalesce(p_exclusive_items,'[]'::jsonb);
  v_selected integer;
  v_found integer;
  v_count integer;
  v_revision integer;
  v_odontogram_version integer;
  v_total bigint;
  v_title text := nullif(btrim(coalesce(p_title,'')),'');
begin
  -- The patient lock serializes revision number allocation for concurrent branches.
  select clinic_id into v_clinic_id
  from public.patients where id=p_patient_id for update;
  if v_clinic_id is null then raise exception 'PATIENT_NOT_FOUND' using errcode='P0002'; end if;
  if not private.is_clinic_staff(v_clinic_id) then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  select * into v_plan from public.clinical_plans
    where patient_id=p_patient_id and clinic_id=v_clinic_id
    order by updated_at desc limit 1 for update;
  if v_plan.id is null then raise exception 'PLAN_NOT_FOUND' using errcode='P0002'; end if;
  if p_expected_plan_version is distinct from v_plan.version then
    raise exception 'PLAN_VERSION_CONFLICT' using errcode='23514';
  end if;
  select coalesce(max(version),1) into v_odontogram_version
    from public.dental_entities where patient_id=p_patient_id;
  if v_plan.source_odontogram_version is distinct from v_odontogram_version then
    raise exception 'PLAN_OUTDATED' using errcode='23514';
  end if;
  if v_title is null or char_length(v_title)>120
      or char_length(coalesce(p_advantages,''))>2000
      or char_length(coalesce(p_disadvantages,''))>2000 then
    raise exception 'BRANCH_DETAILS_INVALID' using errcode='22023';
  end if;
  if jsonb_typeof(v_exclusive)<>'array' then
    raise exception 'BRANCH_ITEMS_INVALID' using errcode='22023';
  end if;
  v_count := jsonb_array_length(v_exclusive);
  if cardinality(v_shared)>200 or v_count>50
      or cardinality(v_shared)+v_count=0 then
    raise exception 'BRANCH_ITEMS_INVALID' using errcode='22023';
  end if;
  select count(distinct id) into v_selected from unnest(v_shared) as id;
  if v_selected<>cardinality(v_shared) then
    raise exception 'BRANCH_SHARED_ITEMS_DUPLICATED' using errcode='22023';
  end if;
  select count(*) into v_found from public.clinical_plan_items i
    where i.plan_id=v_plan.id and i.clinic_id=v_clinic_id and i.id=any(v_shared)
      and i.status not in ('CANCELLED','SUPERSEDED','COMPLETED');
  if v_found<>v_selected then
    raise exception 'BRANCH_SHARED_ITEMS_INVALID' using errcode='22023';
  end if;
  -- Every branch-exclusive treatment must exist in the clinic's active catalogue.
  if exists (
    select 1 from jsonb_to_recordset(v_exclusive) as request(catalog_id uuid,tooth text)
    left join public.treatment_catalog c on c.id=request.catalog_id and c.clinic_id=v_clinic_id and c.active
    where c.id is null or char_length(coalesce(request.tooth,''))>40
  ) then
    raise exception 'BRANCH_CATALOG_ITEMS_INVALID' using errcode='22023';
  end if;

  select coalesce(max(revision),0)+1 into v_revision
    from public.budgets where patient_id=p_patient_id;
  insert into public.budgets (
    clinic_id,patient_id,clinical_plan_id,code,status,total_cents,
    source_plan_version,revision,version,scope,title
  ) values (
    v_clinic_id,p_patient_id,v_plan.id,
    'P-'||substr(p_patient_id::text,1,8)||'-R'||v_revision,
    'DRAFT',0,v_plan.version,v_revision,1,'custom',v_title
  ) returning * into v_budget;

  insert into public.budget_items (
    clinic_id,budget_id,clinical_plan_item_id,component_type,description,tooth,
    billing_mode,quantity,unit_price_cents,total_cents
  )
  select i.clinic_id,v_budget.id,i.id,i.component_type,coalesce(i.label_snapshot,i.label),
    i.tooth,i.billing_mode,1,coalesce(i.price_snapshot_cents,i.price_cents,0),
    case when i.billing_mode='separate' then coalesce(i.price_snapshot_cents,i.price_cents,0) else 0 end
  from public.clinical_plan_items i
    where i.plan_id=v_plan.id and i.id=any(v_shared)
  order by i.phase,i.priority desc,i.created_at;

  insert into public.budget_items (
    clinic_id,budget_id,clinical_plan_item_id,component_type,description,tooth,
    billing_mode,quantity,unit_price_cents,total_cents
  )
  select v_clinic_id,v_budget.id,null,c.category,c.name,
    nullif(btrim(request.payload->>'tooth'),''),
    'separate',1,c.default_price_cents,c.default_price_cents
  from jsonb_array_elements(v_exclusive) with ordinality as request(payload,sequence)
  join public.treatment_catalog c
    on c.id=(request.payload->>'catalog_id')::uuid and c.clinic_id=v_clinic_id and c.active
  order by request.sequence;

  select coalesce(sum(total_cents),0) into v_total
    from public.budget_items where budget_id=v_budget.id;
  if v_total>2147483647 then
    raise exception 'BRANCH_TOTAL_TOO_LARGE' using errcode='22003';
  end if;
  update public.budgets set total_cents=v_total::integer
    where id=v_budget.id returning * into v_budget;

  insert into public.clinical_plan_branches (
    clinic_id,patient_id,clinical_plan_id,budget_id,title,source_plan_version,
    shared_item_ids,exclusive_items,advantages,disadvantages
  ) values (
    v_clinic_id,p_patient_id,v_plan.id,v_budget.id,v_title,v_plan.version,
    v_shared,v_exclusive,nullif(btrim(coalesce(p_advantages,'')),''),
    nullif(btrim(coalesce(p_disadvantages,'')),'')
  ) returning * into v_branch;
  insert into public.clinical_history_events (
    clinic_id,patient_id,actor_id,event_type,entity_id,entity_type,payload_json
  ) values (
    v_clinic_id,p_patient_id,(select auth.uid()),
    'CLINICAL_PLAN_BRANCH_CREATED',v_branch.id,'CLINICAL_PLAN_BRANCH',
    jsonb_build_object('budgetId',v_budget.id,'sharedItemCount',v_selected,
      'exclusiveItemCount',v_count,'sourcePlanVersion',v_plan.version)
  );
  return jsonb_build_object('id',v_branch.id,'budget_id',v_budget.id);
end;
$$;
revoke all on function public.create_clinical_plan_branch(uuid,integer,text,uuid[],jsonb,text,text)
  from public,anon;
grant execute on function public.create_clinical_plan_branch(uuid,integer,text,uuid[],jsonb,text,text)
  to authenticated;
commit;
