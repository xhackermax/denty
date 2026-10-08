-- Snapshot of Denty's stricter live signature function (2026-10-08).
-- Canonical validation includes current plan/odontogram, nonempty & valid items,
-- consents for *selected budget items*, and signed evidence.
-- Keeping that body unchanged prevents downgrading the production RPC.
begin;

CREATE OR REPLACE FUNCTION public.finalize_budget_signature(p_budget_id uuid, p_expected_version integer, p_signer_name text, p_signature_data text, p_snapshot_json jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_budget public.budgets%rowtype;
  v_plan public.clinical_plans%rowtype;
  v_snapshot public.budget_signed_snapshots%rowtype;
  v_missing integer;
  v_snapshot_payload jsonb;
  v_odontogram_version integer;
  v_invalid_items integer;
  v_item_count integer;
begin
  select *
    into v_budget
  from public.budgets
  where id = p_budget_id
  for update;

  if v_budget.id is null then
    raise exception 'BUDGET_NOT_FOUND' using errcode = 'P0002';
  end if;

  if not private.is_clinic_staff(v_budget.clinic_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if v_budget.version <> p_expected_version then
    return jsonb_build_object(
      'conflict', true,
      'currentVersion', v_budget.version
    );
  end if;

  if v_budget.status <> 'DRAFT' then
    raise exception 'BUDGET_NOT_DRAFT' using errcode = '23514';
  end if;

  if v_budget.clinical_plan_id is null then
    raise exception 'BUDGET_OUTDATED: missing plan' using errcode = '23514';
  end if;

  select *
    into v_plan
  from public.clinical_plans
  where id = v_budget.clinical_plan_id;

  if v_plan.id is null
     or v_plan.patient_id <> v_budget.patient_id
     or v_plan.clinic_id <> v_budget.clinic_id
     or v_budget.source_plan_version is distinct from v_plan.version then
    raise exception 'BUDGET_OUTDATED' using errcode = '23514';
  end if;

  select coalesce(max(de.version), 1)
    into v_odontogram_version
  from public.dental_entities de
  where de.patient_id = v_budget.patient_id;

  if v_plan.source_odontogram_version is distinct from v_odontogram_version then
    raise exception 'PLAN_OUTDATED' using errcode = '23514';
  end if;

  select count(*)
    into v_item_count
  from public.budget_items bi
  where bi.budget_id = v_budget.id;

  if v_item_count = 0 then
    raise exception 'BUDGET_EMPTY' using errcode = '23514';
  end if;

  select count(*)
    into v_invalid_items
  from public.budget_items bi
  left join public.clinical_plan_items i
    on i.id = bi.clinical_plan_item_id
  where bi.budget_id = v_budget.id
    and (
      bi.clinical_plan_item_id is null
      or i.id is null
      or i.plan_id <> v_plan.id
      or i.status in ('CANCELLED', 'SUPERSEDED', 'COMPLETED')
    );

  if v_invalid_items > 0 then
    raise exception 'BUDGET_OUTDATED' using errcode = '23514';
  end if;

  perform public.refresh_consent_requirements(v_plan.id);

  select count(*)
    into v_missing
  from public.consent_requirements cr
  join public.budget_items bi
    on bi.clinical_plan_item_id = cr.clinical_plan_item_id
   and bi.budget_id = v_budget.id
  where cr.required_before = 'BUDGET_SIGNATURE'
    and cr.status <> 'SATISFIED';

  if v_missing > 0 then
    raise exception 'CONSENTS_INCOMPLETE' using errcode = '23514';
  end if;

  if nullif(btrim(p_signer_name), '') is null
     or nullif(btrim(p_signature_data), '') is null then
    raise exception 'SIGNATURE_REQUIRED' using errcode = '22023';
  end if;

  perform set_config(
    'denty.correlation_id',
    gen_random_uuid()::text,
    true
  );

  v_snapshot_payload := jsonb_build_object(
    'budget', to_jsonb(v_budget),
    'items', coalesce((
      select jsonb_agg(to_jsonb(bi) order by bi.created_at asc, bi.id asc)
      from public.budget_items bi
      where bi.budget_id = v_budget.id
    ), '[]'::jsonb),
    'plan', to_jsonb(v_plan),
    'consentRequirements', coalesce((
      select jsonb_agg(to_jsonb(cr) order by cr.created_at asc, cr.id asc)
      from public.consent_requirements cr
      join public.budget_items bi
        on bi.clinical_plan_item_id = cr.clinical_plan_item_id
       and bi.budget_id = v_budget.id
    ), '[]'::jsonb),
    'clientContext', coalesce(p_snapshot_json, '{}'::jsonb)
  );

  insert into public.budget_signed_snapshots(
    clinic_id,
    budget_id,
    patient_id,
    revision,
    signer_name,
    signature_data,
    snapshot_json
  )
  values (
    v_budget.clinic_id,
    v_budget.id,
    v_budget.patient_id,
    v_budget.revision,
    btrim(p_signer_name),
    p_signature_data,
    v_snapshot_payload
  )
  returning * into v_snapshot;

  update public.budgets
  set status = 'SIGNED',
      version = version + 1,
      updated_at = now()
  where id = v_budget.id
  returning * into v_budget;

  insert into public.clinical_history_events(
    clinic_id,
    patient_id,
    actor_id,
    event_type,
    entity_id,
    entity_type,
    payload_json
  )
  values (
    v_budget.clinic_id,
    v_budget.patient_id,
    (select auth.uid()),
    'BUDGET_SIGNED',
    v_budget.id,
    'BUDGET',
    jsonb_build_object(
      'revision', v_budget.revision,
      'scope', v_budget.scope,
      'snapshotId', v_snapshot.id
    )
  );

  return jsonb_build_object(
    'budget', to_jsonb(v_budget),
    'snapshot', to_jsonb(v_snapshot)
  );
end;
$function$

revoke execute on function public.finalize_budget_signature(uuid, integer, text, text, jsonb) from public, anon;
grant execute on function public.finalize_budget_signature(uuid, integer, text, text, jsonb) to authenticated;

commit;
