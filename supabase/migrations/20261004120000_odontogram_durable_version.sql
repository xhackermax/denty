-- Odontogram batches: an emptied chart keeps advancing and implant stacks keep their links.
--
-- The chart version is read as the highest dental_entities.version for the patient. Deactivated
-- rows used to keep the version that created them, so replacing the chart with an empty list
-- returned version N+1 while every reader still saw N, and the next save conflicted with itself.
-- Retired rows are now stamped with the version that retired them. A save that changes nothing
-- keeps the current version instead of announcing one no row carries.
--
-- Two saves for the same patient used to read the version concurrently and both pass the check;
-- a transaction-scoped advisory lock per patient serialises them before the comparison.
--
-- parent_id was always written as null, which detached abutments and crowns from their implant.
-- Rows get new UUIDs, so client ids are mapped to the new ones and the links rebuilt afterwards.
--
-- The API validates entities, but the RPC is callable directly; it now rejects the whole batch,
-- before writing anything, when a row names a tooth outside FDI notation, an unknown family, a
-- surface outside V/M/O/I/D/P/L or a malformed status. Statuses stay an open vocabulary.

begin;

create or replace function public.save_odontogram_batch(
  p_patient_id uuid,
  p_expected_version integer,
  p_entities jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_clinic_id uuid;
  v_current_version integer;
  v_next_version integer;
  v_entity jsonb;
  v_entity_count integer := 0;
  v_retiring integer;
  v_new_id uuid;
  v_ids jsonb := '{}'::jsonb;
  v_rows jsonb;
  v_entities jsonb := coalesce(p_entities, '[]'::jsonb);
begin
  select p.clinic_id into v_clinic_id
  from public.patients p
  where p.id = p_patient_id;

  if v_clinic_id is null then
    raise exception 'PATIENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if not private.is_clinic_staff(v_clinic_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('odontogram:' || p_patient_id::text, 0));

  select coalesce(max(de.version), 1) into v_current_version
  from public.dental_entities de
  where de.patient_id = p_patient_id;

  if v_current_version <> p_expected_version then
    return jsonb_build_object('conflict', true, 'currentVersion', v_current_version);
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_entities) e
    where coalesce((e.value ->> 'active')::boolean, true)
      and (
        (e.value ? 'tooth' and nullif(e.value ->> 'tooth', '') is not null
          and (e.value ->> 'tooth') !~ '^([1-4][1-8]|[5-8][1-5])$')
        or (e.value ? 'arch' and nullif(e.value ->> 'arch', '') is not null
          and (e.value ->> 'arch') not in ('upper', 'lower'))
        or coalesce(e.value ->> 'entityType', '') not in (
          'TOOTH_STATE', 'HEALTHY', 'CARIES', 'MISSING', 'EXTRACTION', 'RESTORATION', 'ENDO',
          'POST', 'CROWN', 'IMPLANT', 'ABUTMENT', 'BRIDGE', 'PONTIC', 'REMOVABLE', 'ORTHODONTIC',
          'PEDIATRIC', 'PROSTHESIS', 'SURGERY', 'BONE_GRAFT', 'MEMBRANE', 'SINUS_LIFT',
          'SURGICAL_LESION', 'IMPLANT_COMPONENT', 'PROSTHETIC_STRUCTURE', 'PERIODONTAL_FINDING',
          'SUPERNUMERARY_TOOTH')
        or coalesce(e.value ->> 'status', '') !~ '^[a-z][a-z0-9_]{0,79}$'
        or (jsonb_typeof(e.value -> 'surfaces') = 'array' and exists (
          select 1 from jsonb_array_elements_text(e.value -> 'surfaces') f(face)
          where f.face not in ('V', 'M', 'O', 'I', 'D', 'P', 'L')))
      )
  ) then
    raise exception 'INVALID_DENTAL_ENTITY' using errcode = '22023';
  end if;

  select count(*) into v_retiring
  from public.dental_entities de
  where de.patient_id = p_patient_id and de.active;

  if v_retiring = 0 and not exists (
    select 1 from jsonb_array_elements(v_entities) e
    where coalesce((e.value ->> 'active')::boolean, true)
  ) then
    return jsonb_build_object('version', v_current_version, 'entities', '[]'::jsonb);
  end if;

  v_next_version := p_expected_version + 1;
  perform set_config('denty.correlation_id', gen_random_uuid()::text, true);

  update public.dental_entities
  set active = false, version = v_next_version
  where patient_id = p_patient_id and active;

  for v_entity in select value from jsonb_array_elements(v_entities)
  loop
    if coalesce((v_entity ->> 'active')::boolean, true) then
      insert into public.dental_entities(
        clinic_id, patient_id, tooth, arch, entity_type, status,
        surfaces_json, attributes_json, parent_id, active, version
      ) values (
        v_clinic_id,
        p_patient_id,
        nullif(v_entity ->> 'tooth', ''),
        nullif(v_entity ->> 'arch', ''),
        v_entity ->> 'entityType',
        v_entity ->> 'status',
        coalesce(v_entity -> 'surfaces', 'null'::jsonb),
        coalesce(v_entity -> 'attributes', '{}'::jsonb),
        null,
        true,
        v_next_version
      )
      returning id into v_new_id;
      if nullif(v_entity ->> 'id', '') is not null then
        v_ids := v_ids || jsonb_build_object(v_entity ->> 'id', v_new_id);
      end if;
      v_entity_count := v_entity_count + 1;
    end if;
  end loop;

  -- Children may arrive before their parent, so links are resolved once every row exists.
  update public.dental_entities child
  set parent_id = (v_ids ->> (e.value ->> 'parentId'))::uuid
  from jsonb_array_elements(v_entities) e
  where child.id = (v_ids ->> (e.value ->> 'id'))::uuid
    and v_ids ? (e.value ->> 'parentId');

  insert into public.clinical_history_events(
    clinic_id, patient_id, actor_id, event_type, entity_type, payload_json
  ) values (
    v_clinic_id, p_patient_id, (select auth.uid()), 'ODONTOGRAM_BATCH_SAVED', 'ODONTOGRAM',
    jsonb_build_object('version', v_next_version, 'entityCount', v_entity_count)
  );

  select coalesce(jsonb_agg(to_jsonb(de) order by de.created_at asc), '[]'::jsonb)
  into v_rows
  from public.dental_entities de
  where de.patient_id = p_patient_id and de.active and de.version = v_next_version;

  return jsonb_build_object('version', v_next_version, 'entities', v_rows);
end;
$$;

revoke execute on function public.save_odontogram_batch(uuid, integer, jsonb) from public, anon;
grant execute on function public.save_odontogram_batch(uuid, integer, jsonb) to authenticated;

commit;
