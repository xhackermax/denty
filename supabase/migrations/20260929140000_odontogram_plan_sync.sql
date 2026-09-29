-- Odontogram → plan synchronisation.
--
-- Until now sync_clinical_plan only bumped the plan version: a treatment marked
-- as "to do" on a tooth (e.g. a filling) never reached the plan, so the budget
-- could not be built from the odontogram. This migration makes the sync create,
-- keep and retire plan items from the planned findings of the odontogram.
--
-- save_odontogram_batch deactivates every entity and re-inserts them with new ids
-- on each save, so items are matched through a stable key stored in
-- attributes_json.odontogram_key = tooth:TREATMENT_CODE:sorted surfaces.

begin;

-- 1) Catalog entries every odontogram treatment maps to (price stays editable).
insert into public.treatment_catalog(clinic_id, code, name, specialty, category, default_price_cents, base_cost_cents, default_duration_min, requires_lab, metadata)
select c.id, seed.code, seed.name, seed.specialty, seed.category, 0, 0, seed.duration, seed.requires_lab, seed.metadata
from public.clinics c
cross join (values
  ('FILLING','Obturación','CONSERVATIVE','RESTORATION',45,false,'{"consent_codes":["CONSENT_FILLINGS"]}'::jsonb),
  ('EXTRACTION','Extracción simple','SURGERY','SURGERY',45,false,'{"consent_codes":["CONSENT_EXTRACTION"]}'::jsonb),
  ('ENDODONTICS','Endodoncia','ENDODONTICS','ENDODONTICS',60,false,'{"consent_codes":["CONSENT_ENDO"]}'::jsonb),
  ('CROWN_ZIRCONIA','Corona zirconio','PROSTHODONTICS','PROSTHESIS',45,true,'{"consent_codes":["CONSENT_PROSTHESIS"]}'::jsonb),
  ('IMPLANT','Implante','SURGERY','IMPLANTOLOGY',60,true,'{"consent_codes":["CONSENT_IMPLANT"]}'::jsonb),
  ('POST','Perno','ENDODONTICS','RESTORATION',30,false,'{"consent_codes":[]}'::jsonb),
  ('PROSTHESIS','Prótesis fija','PROSTHODONTICS','PROSTHESIS',45,true,'{"consent_codes":["CONSENT_PROSTHESIS"]}'::jsonb),
  ('REMOVABLE','Prótesis removible','PROSTHODONTICS','PROSTHESIS',45,true,'{"consent_codes":["CONSENT_PROSTHESIS"]}'::jsonb)
) as seed(code,name,specialty,category,duration,requires_lab,metadata)
on conflict (clinic_id, code) do nothing;

-- 2) Which treatment a planned odontogram entity asks for (null = not a treatment).
create or replace function private.odontogram_treatment_code(p_entity_type text)
returns text language sql immutable set search_path = '' as $$
  select case upper(p_entity_type)
    when 'RESTORATION' then 'FILLING'
    when 'FILLING' then 'FILLING'
    when 'CROWN' then 'CROWN_ZIRCONIA'
    when 'ENDO' then 'ENDODONTICS'
    when 'POST' then 'POST'
    when 'IMPLANT' then 'IMPLANT'
    when 'EXTRACTION' then 'EXTRACTION'
    when 'PROSTHESIS' then 'PROSTHESIS'
    when 'REMOVABLE' then 'REMOVABLE'
    else null
  end
$$;

create or replace function private.odontogram_entity_is_planned(p_status text, p_attributes jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(p_attributes ->> 'lifecycle', '') = 'PLANIFICADO'
      or p_status ~* '(_planned|_pending|_indicated)$'
$$;

create or replace function private.odontogram_entity_is_completed(p_status text, p_attributes jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(p_attributes ->> 'lifecycle', '') in ('REALIZADO', 'REALIZADO_OTRA_CLINICA')
      or p_status ~* '_completed$'
      or p_status in ('filling', 'crown', 'endo', 'post', 'implant', 'prosthesis', 'removable')
$$;

create or replace function private.odontogram_surfaces_key(p_surfaces jsonb)
returns text language sql immutable set search_path = '' as $$
  select coalesce(
    (select string_agg(value, '' order by value)
     from jsonb_array_elements_text(case when jsonb_typeof(p_surfaces) = 'array' then p_surfaces else '[]'::jsonb end)),
    ''
  )
$$;

-- 3) Plan sync that actually derives the plan from the odontogram.
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
    select de.id, de.tooth, de.surfaces_json,
           private.odontogram_treatment_code(de.entity_type) as code,
           de.tooth || ':' || private.odontogram_treatment_code(de.entity_type) || ':' ||
             private.odontogram_surfaces_key(de.surfaces_json) as key
    from public.dental_entities de
    where de.patient_id = p_patient_id
      and de.active
      and de.tooth is not null
      and private.odontogram_treatment_code(de.entity_type) is not null
      and private.odontogram_entity_is_planned(de.status, de.attributes_json)
    order by de.tooth, de.created_at
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
          clinical_reason = coalesce(clinical_reason, case when private.odontogram_surfaces_key(v_entity.surfaces_json) <> ''
            then 'Caras ' || private.odontogram_surfaces_key(v_entity.surfaces_json) end),
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
      case when private.odontogram_surfaces_key(v_entity.surfaces_json) <> ''
        then 'Caras ' || private.odontogram_surfaces_key(v_entity.surfaces_json) end,
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
               and de.tooth = i.tooth
               and private.odontogram_treatment_code(de.entity_type) = upper(coalesce(i.treatment_code_snapshot, i.treatment_code))
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

-- 4) Price of one plan item (the catalog ships at 0 €); bumps the plan so the
--    budget is rebuilt with the new amount.
create or replace function public.set_clinical_plan_item_price(p_item_id uuid, p_price_cents integer)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item public.clinical_plan_items%rowtype;
begin
  if p_price_cents is null or p_price_cents < 0 then
    raise exception 'INVALID_PRICE' using errcode = '23514';
  end if;
  select * into v_item from public.clinical_plan_items where id = p_item_id for update;
  if v_item.id is null then raise exception 'PLAN_ITEM_NOT_FOUND' using errcode = 'P0002'; end if;
  if not private.is_clinic_staff(v_item.clinic_id) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if v_item.status in ('CANCELLED', 'SUPERSEDED', 'COMPLETED') then
    raise exception 'PLAN_ITEM_CLOSED' using errcode = '23514';
  end if;
  if coalesce(v_item.price_snapshot_cents, v_item.price_cents, -1) = p_price_cents then
    return to_jsonb(v_item);
  end if;
  update public.clinical_plan_items
  set price_cents = p_price_cents, price_snapshot_cents = p_price_cents, version = version + 1
  where id = p_item_id returning * into v_item;
  update public.clinical_plans set version = version + 1 where id = v_item.plan_id;
  return to_jsonb(v_item);
end;
$$;

grant execute on function private.odontogram_treatment_code(text) to authenticated;
grant execute on function private.odontogram_entity_is_planned(text, jsonb) to authenticated;
grant execute on function private.odontogram_entity_is_completed(text, jsonb) to authenticated;
grant execute on function private.odontogram_surfaces_key(jsonb) to authenticated;
revoke execute on function public.set_clinical_plan_item_price(uuid, integer) from public, anon;
grant execute on function public.set_clinical_plan_item_price(uuid, integer) to authenticated;
grant execute on function public.sync_clinical_plan(uuid) to authenticated;

commit;
