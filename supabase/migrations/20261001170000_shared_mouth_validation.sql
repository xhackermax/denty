begin;
-- Saved clinical entities are authoritative; completed replacements outrank absence.
create or replace function private.tooth_is_probeable(p_patient uuid,p_tooth text)
returns boolean language sql stable security invoker set search_path='' as $$
 select p_tooth ~ '^([1-4][1-8]|[5-8][1-5])$' and exists(select 1 from public.patients where id=p_patient)
 and (
 exists(select 1 from public.dental_entities e where e.patient_id=p_patient and e.active and e.tooth=p_tooth and ((e.entity_type='IMPLANT' and (e.status='implant' or e.status ~ '_completed$' or e.attributes_json->>'lifecycle' in ('REALIZADO','REALIZADO_OTRA_CLINICA'))) or (e.entity_type in ('PEDIATRIC','HEALTHY','TOOTH_STATE') and e.status in ('healthy','retained','erupting'))))
 or exists(select 1 from public.patients p where p.id=p_patient and
 case when p.birth_date is null or extract(year from age(current_date,p.birth_date))>12 then substring(p_tooth,1,1)::int<5
 when extract(year from age(current_date,p.birth_date))<=5 then substring(p_tooth,1,1)::int>=5
 else p_tooth=any(array['16','55','54','53','12','11','21','22','63','64','65','26','46','85','84','83','42','41','31','32','73','74','75','36']) end)
 )
 and not exists(
  select 1 from public.dental_entities e where e.patient_id=p_patient and e.active
  and (e.tooth=p_tooth or (e.entity_type='BRIDGE' and e.attributes_json->'pontics' ? p_tooth))
  and (
    e.entity_type='MISSING' or e.status in ('missing','congenitally_missing','unerupted','impacted','exfoliated')
    or (e.entity_type in ('EXTRACTION','SURGERY') and (e.entity_type='EXTRACTION' or coalesce(e.attributes_json->>'procedure',e.status) like 'extraction%')
        and (e.attributes_json->>'lifecycle' in ('REALIZADO','REALIZADO_OTRA_CLINICA') or e.status ~ '_completed$'))
    or (e.entity_type in ('PONTIC','BRIDGE') and (e.attributes_json->>'lifecycle' in ('REALIZADO','REALIZADO_OTRA_CLINICA') or e.status ~ '_completed$'))
  )
  and not exists(select 1 from public.dental_entities replacement where replacement.patient_id=p_patient and replacement.tooth=p_tooth and replacement.active
    and replacement.entity_type='IMPLANT' and (replacement.status='implant' or replacement.status ~ '_completed$' or replacement.attributes_json->>'lifecycle' in ('REALIZADO','REALIZADO_OTRA_CLINICA')))
 )
$$;
create or replace function private.guard_periodontal_tooth() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if not private.tooth_is_probeable(new.patient_id,new.tooth) then
   raise exception 'TOOTH_UNAVAILABLE: el diente % está ausente o no es sondeable',new.tooth using errcode='23514';
 end if;
 return new;
end $$;
create trigger periodontal_tooth_presence before insert or update of tooth,patient_id
 on public.periodontal_measurements for each row execute function private.guard_periodontal_tooth();
create or replace function private.guard_plan_natural_tooth() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.tooth is not null and new.status='PLANNED' and upper(coalesce(new.treatment_code_snapshot,new.treatment_code)) in ('FILLING','ENDODONTICS','POST','EXTRACTION')
 and (not private.tooth_is_probeable((select patient_id from public.clinical_plans where id=new.plan_id),new.tooth)
 or exists(select 1 from public.dental_entities where patient_id=(select patient_id from public.clinical_plans where id=new.plan_id) and active and tooth=new.tooth and entity_type='IMPLANT' and (status='implant' or attributes_json->>'lifecycle' in ('REALIZADO','REALIZADO_OTRA_CLINICA')))) then
 raise exception 'TOOTH_UNAVAILABLE: tratamiento requiere diente natural' using errcode='23514';
 end if;
 return new;
end $$;
create trigger plan_natural_tooth_presence before insert or update of tooth,status,treatment_code,treatment_code_snapshot
 on public.clinical_plan_items for each row execute function private.guard_plan_natural_tooth();
revoke all on function private.tooth_is_probeable(uuid,text),private.guard_periodontal_tooth(),private.guard_plan_natural_tooth() from public,anon;
grant execute on function private.tooth_is_probeable(uuid,text),private.guard_periodontal_tooth(),private.guard_plan_natural_tooth() to authenticated;
commit;
