begin;
create or replace function private.odontogram_procedure_treatment_code(p_entity_type text, p_status text, p_attributes jsonb)
returns text language sql immutable set search_path = '' as $$
  select case coalesce(p_attributes ->> 'procedure', p_status)
    when 'gingivectomy' then 'GINGIVECTOMY'
    when 'bone_regularization' then 'BONE_REGULARIZATION'
    when 'guided_surgery_splint' then 'GUIDED_SURGERY_SPLINT'
    when 'titanium_mesh' then 'TITANIUM_MESH'
    else private.odontogram_treatment_code(p_entity_type)
  end
$$;
-- Defaults retain the existing unconfigured-price convention; clinic prices are never overwritten.
insert into public.treatment_catalog(clinic_id, code, name, specialty, category, default_price_cents, base_cost_cents, active)
select c.id, seed.code, seed.name, 'SURGERY', 'SURGERY', 0, 0, true
from public.clinics c cross join (values
 ('GINGIVECTOMY', 'Gingivectomía'), ('BONE_REGULARIZATION', 'Regularización ósea'),
 ('GUIDED_SURGERY_SPLINT', 'Férula quirúrgica guiada'), ('TITANIUM_MESH', 'Malla de titanio')
) as seed(code,name) on conflict (clinic_id,code) do nothing;

create or replace function private.odontogram_procedure_code(p_entity_type text, p_status text, p_attributes jsonb)
returns text language sql immutable set search_path = '' as $$
  select case when p_attributes ->> 'procedure' in ('gingivectomy','bone_regularization','guided_surgery_splint','titanium_mesh')
    then case when private.odontogram_entity_is_planned(p_status,p_attributes)
      then private.odontogram_procedure_treatment_code(p_entity_type,p_status,p_attributes) end
    else private.odontogram_plan_code(p_entity_type,p_status,p_attributes) end
$$;
create or replace function public.sync_clinical_plan(p_patient_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_clinic_id uuid;
  v_odontogram_version integer;
  v_plan public.clinical_plans%rowtype;
  v_version_bumped boolean := false;
  v_entity record;
  v_catalog public.treatment_catalog%rowtype;
  v_item_id uuid;
  v_added integer := 0;
  v_linked integer := 0;
  v_superseded integer := 0;
  v_completed integer := 0;
  v_keys text[] := '{}';
begin
  select clinic_id into v_clinic_id from public.patients where id = p_patient_id;
  if v_clinic_id is null then raise exception 'PATIENT_NOT_FOUND' using errcode = 'P0002'; end if;
  if not private.is_clinic_staff(v_clinic_id) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;

  select coalesce(max(version), 1) into v_odontogram_version
  from public.dental_entities where patient_id = p_patient_id;

  select * into v_plan from public.clinical_plans
  where patient_id = p_patient_id order by updated_at desc limit 1 for update;
  if v_plan.id is null then
    insert into public.clinical_plans(clinic_id, patient_id, status, source_odontogram_version, version)
    values (v_clinic_id, p_patient_id, 'DRAFT', v_odontogram_version, 1) returning * into v_plan;
    v_version_bumped := true;
  elsif v_plan.source_odontogram_version is distinct from v_odontogram_version then
    update public.clinical_plans
    set source_odontogram_version = v_odontogram_version, version = version + 1
    where id = v_plan.id returning * into v_plan;
    v_version_bumped := true;
  end if;

  -- Planned findings on the current odontogram → plan items.
  for v_entity in
    select de.id, de.tooth, de.surfaces_json, t.code, t.reason,
           coalesce(de.tooth, 'arch:' || de.arch) || ':' || t.code || ':' || private.odontogram_surfaces_key(de.surfaces_json) as key
    from public.dental_entities de
    cross join lateral (
      select private.odontogram_procedure_code(de.entity_type, de.status, de.attributes_json) as code,
             private.odontogram_plan_reason(de.entity_type, de.status, de.surfaces_json) as reason
    ) t
    where de.patient_id = p_patient_id
      and de.active
      and (de.tooth is not null or (de.arch in ('upper','lower') and de.attributes_json ->> 'procedure' = 'guided_surgery_splint'))
      and t.code is not null
      and (
        (private.odontogram_procedure_treatment_code(de.entity_type, de.status, de.attributes_json) is not null and private.odontogram_entity_is_planned(de.status,de.attributes_json))
        -- A finding (caries, defective work) implies its usual treatment, unless the
        -- dentist already chose a treatment for that tooth.
        or not exists (
          select 1 from public.dental_entities o
          where o.patient_id = p_patient_id and o.active and o.tooth = de.tooth and o.id <> de.id
            and (private.odontogram_procedure_treatment_code(o.entity_type, o.status, o.attributes_json) is not null and private.odontogram_entity_is_planned(o.status,o.attributes_json))
        )
      )
    -- Explicit treatments first, so they win over a finding with the same key.
    order by de.tooth,
      (private.odontogram_procedure_treatment_code(de.entity_type, de.status, de.attributes_json) is not null and private.odontogram_entity_is_planned(de.status,de.attributes_json)) desc,
      de.created_at
  loop
    if v_entity.key = any(v_keys) then continue; end if;
    v_keys := v_keys || v_entity.key;

    -- Already in the plan from an earlier sync: refresh the link to the new entity row.
    select i.id into v_item_id from public.clinical_plan_items i
    where i.plan_id = v_plan.id
      and i.attributes_json ->> 'odontogram_key' = v_entity.key
      and i.status not in ('CANCELLED', 'SUPERSEDED')
    limit 1;
    if v_item_id is not null then
      update public.clinical_plan_items set dental_entity_id = v_entity.id
      where id = v_item_id and dental_entity_id is distinct from v_entity.id;
      continue;
    end if;

    -- Added by hand for the same tooth and treatment: adopt it instead of duplicating.
    select i.id into v_item_id from public.clinical_plan_items i
    where i.plan_id = v_plan.id
      and i.tooth = v_entity.tooth
      and upper(coalesce(i.treatment_code_snapshot, i.treatment_code)) = v_entity.code
      and i.status = 'PLANNED'
      and not (i.attributes_json ? 'odontogram_key')
    order by i.created_at
    limit 1;
    if v_item_id is not null then
      update public.clinical_plan_items
      set dental_entity_id = v_entity.id,
          clinical_reason = coalesce(clinical_reason, v_entity.reason),
          attributes_json = attributes_json || jsonb_build_object('odontogram_key', v_entity.key, 'surfaces', coalesce(v_entity.surfaces_json, '[]'::jsonb))
      where id = v_item_id;
      v_linked := v_linked + 1;
      continue;
    end if;

    select * into v_catalog from public.treatment_catalog
    where clinic_id = v_clinic_id and upper(code) = v_entity.code and active limit 1;
    insert into public.clinical_plan_items(
      clinic_id, plan_id, dental_entity_id, tooth, treatment_code, label, clinical_reason,
      phase, priority, status, price_cents, attributes_json,
      treatment_catalog_id, treatment_code_snapshot, label_snapshot, price_snapshot_cents,
      cost_snapshot_cents, treatment_metadata_snapshot, is_ad_hoc
    ) values (
      v_clinic_id, v_plan.id, v_entity.id, v_entity.tooth, v_entity.code,
      coalesce(v_catalog.name, initcap(lower(v_entity.code))),
      v_entity.reason,
      1, 0, 'PLANNED', coalesce(v_catalog.default_price_cents, 0),
      jsonb_build_object('odontogram_key', v_entity.key, 'surfaces', coalesce(v_entity.surfaces_json, '[]'::jsonb)),
      v_catalog.id, v_entity.code, coalesce(v_catalog.name, initcap(lower(v_entity.code))),
      coalesce(v_catalog.default_price_cents, 0), coalesce(v_catalog.base_cost_cents, 0),
      coalesce(v_catalog.metadata, '{}'::jsonb), v_catalog.id is null
    );
    v_added := v_added + 1;
  end loop;

  -- Items that came from the odontogram but are no longer planned there.
  with stale as (
    select i.id,
           exists (
             select 1 from public.dental_entities de
             where de.patient_id = p_patient_id and de.active
               and de.tooth is not distinct from i.tooth
               and (de.tooth is not null or i.attributes_json ->> 'odontogram_key' =
                 'arch:' || de.arch || ':' || private.odontogram_procedure_treatment_code(de.entity_type,de.status,de.attributes_json) || ':' || private.odontogram_surfaces_key(de.surfaces_json))
               and private.odontogram_procedure_treatment_code(de.entity_type,de.status,de.attributes_json) = upper(coalesce(i.treatment_code_snapshot, i.treatment_code))
               and private.odontogram_entity_is_completed(de.status, de.attributes_json)
           ) as done
    from public.clinical_plan_items i
    where i.plan_id = v_plan.id
      and i.status = 'PLANNED'
      and i.attributes_json ? 'odontogram_key'
      and not (i.attributes_json ->> 'odontogram_key' = any(v_keys))
  ), updated as (
    update public.clinical_plan_items i
    set status = case when stale.done then 'COMPLETED' else 'SUPERSEDED' end
    from stale where i.id = stale.id
    returning stale.done
  )
  select count(*) filter (where done), count(*) filter (where not done)
  into v_completed, v_superseded from updated;

  if (v_added + v_linked + v_superseded + v_completed) > 0 then
    if not v_version_bumped then
      update public.clinical_plans set version = version + 1 where id = v_plan.id returning * into v_plan;
    end if;
    perform public.refresh_consent_requirements(v_plan.id);
  end if;

  insert into public.clinical_history_events(clinic_id, patient_id, actor_id, event_type, entity_id, entity_type, payload_json)
  values (v_clinic_id, p_patient_id, (select auth.uid()), 'CLINICAL_PLAN_SYNCED', v_plan.id, 'CLINICAL_PLAN',
    jsonb_build_object('version', v_plan.version, 'sourceOdontogramVersion', v_odontogram_version,
      'added', v_added, 'linked', v_linked, 'superseded', v_superseded, 'completed', v_completed));

  return to_jsonb(v_plan) || jsonb_build_object('summary', jsonb_build_object(
    'added', v_added, 'linked', v_linked, 'superseded', v_superseded, 'completed', v_completed));
end;
$$;

grant execute on function public.sync_clinical_plan(uuid) to authenticated;

revoke execute on function private.odontogram_procedure_code(text,text,jsonb), private.odontogram_procedure_treatment_code(text,text,jsonb) from public, anon;
grant execute on function private.odontogram_procedure_code(text,text,jsonb), private.odontogram_procedure_treatment_code(text,text,jsonb) to authenticated;
commit;
