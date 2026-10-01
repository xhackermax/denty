begin;
create or replace function private.is_clinical_diagnostician(p_clinic uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.clinic_members where clinic_id=p_clinic and profile_id=(select auth.uid()) and active and role in ('ADMIN','DENTIST'))
$$;
create table public.clinical_diagnoses (
 id uuid primary key default gen_random_uuid(),clinic_id uuid not null references public.clinics(id),patient_id uuid not null references public.patients(id),encounter_id uuid,
 category text not null check(category in ('periodontal','bruxism')),value text not null,detail jsonb not null default '{}',justification text not null default '',
 status text not null default 'active' check(status in ('active','resolved')),created_by uuid default auth.uid(),created_at timestamptz not null default now(),version integer not null default 1 check(version>0),
 check(jsonb_typeof(detail)='object'),check(length(justification)<=4000),
 check((category='periodontal' and value in ('healthy','gingivitis','periodontitis')) or (category='bruxism' and value in ('bruxism','no_bruxism'))),
 check(category<>'periodontal' or value='healthy' or length(btrim(justification))>0),
 check(category<>'periodontal' or value='periodontitis' or not(detail ?| array['stage','grade','extent'])),
 check(not(detail?'stage') or coalesce(detail->>'stage' in ('I','II','III','IV'),false)),check(not(detail?'grade') or coalesce(detail->>'grade' in ('A','B','C'),false)),
 check(not(detail?'extent') or coalesce(detail->>'extent' in ('localized','generalized','molar_incisor'),false)),
 check(category<>'bruxism' or (not(detail?'signs') or (jsonb_typeof(detail->'signs')='array' and detail->'signs' <@ '["wear","masseter_hypertrophy","tmj_pain","fractures","linea_alba","tongue_scalloping"]'::jsonb))),
 check(category<>'bruxism'  or value='no_bruxism' or coalesce((detail->>'type' in ('awake','sleep','both') and detail->>'certainty' in ('possible','probable','definite')),false))
);
create index clinical_diagnoses_patient_history on public.clinical_diagnoses(clinic_id,patient_id,category,created_at desc,id desc);
alter table public.clinical_diagnoses enable row level security;
create policy diagnoses_read on public.clinical_diagnoses for select to authenticated using(private.is_clinic_staff(clinic_id));
create policy diagnoses_create on public.clinical_diagnoses for insert to authenticated with check(private.is_clinical_diagnostician(clinic_id) and exists(select 1 from public.patients where id=patient_id and patients.clinic_id=clinical_diagnoses.clinic_id) and created_by=(select auth.uid()));
create policy diagnoses_resolve on public.clinical_diagnoses for update to authenticated using(private.is_clinical_diagnostician(clinic_id)) with check(private.is_clinical_diagnostician(clinic_id));
grant select,insert on public.clinical_diagnoses to authenticated;
grant update(status,version) on public.clinical_diagnoses to authenticated;
create or replace function public.create_clinical_diagnosis(p_patient_id uuid,p_input jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare v_clinic uuid;v_row public.clinical_diagnoses%rowtype;
begin
 select clinic_id into v_clinic from public.patients where id=p_patient_id;
 if v_clinic is null then raise exception 'PATIENT_NOT_FOUND' using errcode='P0002';end if;
 if not private.is_clinical_diagnostician(v_clinic) then raise exception 'FORBIDDEN' using errcode='42501';end if;
 insert into public.clinical_diagnoses(clinic_id,patient_id,encounter_id,category,value,detail,justification)
 values(v_clinic,p_patient_id,nullif(p_input->>'encounterId','')::uuid,p_input->>'category',p_input->>'value',coalesce(p_input->'detail','{}'),coalesce(p_input->>'justification','')) returning * into v_row;
 return to_jsonb(v_row);
end $$;
create or replace function public.resolve_clinical_diagnosis(p_patient_id uuid,p_id uuid,p_expected_version integer) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare v_row public.clinical_diagnoses%rowtype;
begin
 select * into v_row from public.clinical_diagnoses where id=p_id and patient_id=p_patient_id for update;
 if v_row.id is null then raise exception 'DIAGNOSIS_NOT_FOUND' using errcode='P0002';end if;
 if not private.is_clinical_diagnostician(v_row.clinic_id) then raise exception 'FORBIDDEN' using errcode='42501';end if;
 if v_row.version<>p_expected_version then raise exception 'DIAGNOSIS_VERSION_CONFLICT' using errcode='40001';end if;
 update public.clinical_diagnoses set status='resolved',version=version+1 where id=p_id returning * into v_row;
 return to_jsonb(v_row);
end $$;
alter table public.clinical_plan_items add column diagnosis_id uuid references public.clinical_diagnoses(id);
create or replace function private.guard_diagnosis_plan_link() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.diagnosis_id is not null and not exists(select 1 from public.clinical_diagnoses d join public.clinical_plans p on p.patient_id=d.patient_id and p.clinic_id=d.clinic_id where d.id=new.diagnosis_id and p.id=new.plan_id and d.clinic_id=new.clinic_id) then raise exception 'DIAGNOSIS_TENANT_MISMATCH' using errcode='23514';end if;
 return new;
end $$;
create trigger diagnosis_plan_tenant before insert or update of diagnosis_id,plan_id,clinic_id on public.clinical_plan_items for each row execute function private.guard_diagnosis_plan_link();
insert into public.treatment_catalog(clinic_id,code,name,specialty,category,default_price_cents,base_cost_cents,metadata,active)
 select c.id,s.code,s.name,'PERIODONTICS','PERIODONTICS',0,0,jsonb_build_object('consent_codes',s.consents),true from public.clinics c cross join (values
 ('ROOT_PLANING','Raspado y alisado radicular por cuadrante','["CONSENT_PERIO"]'::jsonb),('PERIO_REVIEW','Control / reevaluación periodontal','[]'::jsonb),
 ('PERIO_MAINTENANCE','Mantenimiento periodontal','["CONSENT_PERIO"]'::jsonb),('ORAL_HYGIENE','Instrucciones de higiene','[]'::jsonb),('SPLINT_REVIEW','Ajuste / control de férula','[]'::jsonb),('PERIO_SURGERY','Cirugía periodontal','["CONSENT_PERIO"]'::jsonb)
 )s(code,name,consents) on conflict(clinic_id,code) do nothing;
create or replace function public.add_diagnosis_plan_items(p_patient_id uuid,p_diagnosis_id uuid,p_items jsonb,p_residual_pd integer default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare d public.clinical_diagnoses%rowtype;entry jsonb;item jsonb;code text;quad text;added integer:=0;allowed text[];
begin
 select * into d from public.clinical_diagnoses where id=p_diagnosis_id and patient_id=p_patient_id and status='active' for update;
 if d.id is null then raise exception 'DIAGNOSIS_NOT_FOUND' using errcode='P0002';end if;
 if not private.is_clinical_diagnostician(d.clinic_id) then raise exception 'FORBIDDEN' using errcode='42501';end if;
 allowed:=case d.value when 'healthy' then array['CHECKUP','HYGIENE'] when 'gingivitis' then array['HYGIENE','ORAL_HYGIENE','PERIO_REVIEW'] when 'periodontitis' then array['ROOT_PLANING','PERIO_REVIEW','PERIO_MAINTENANCE'] when 'bruxism' then array['SPLINT','SPLINT_REVIEW'] else '{}' end;
 if d.value='periodontitis' and p_residual_pd>=6 then allowed:=array_append(allowed,'PERIO_SURGERY');end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 12 then raise exception 'INVALID_SELECTION' using errcode='23514';end if;
 for entry in select value from jsonb_array_elements(p_items) loop
  code:=entry->>'code';quad:=entry->>'quadrant';
  if code is null or not(code=any(allowed)) or (code='ROOT_PLANING' and (quad is null or quad not in ('1','2','3','4'))) or (code<>'ROOT_PLANING' and quad is not null) then raise exception 'INVALID_SELECTION' using errcode='23514';end if;
  if exists(select 1 from public.clinical_plan_items where diagnosis_id=d.id and treatment_code=code and coalesce(attributes_json->>'quadrant','')=coalesce(quad,'') and status not in ('CANCELLED','SUPERSEDED')) then continue;end if;
  item:=public.add_clinical_plan_item(p_patient_id,null,code,code,null,null,'Diagnóstico: '||d.value||case when quad is not null then ' · Cuadrante '||quad else '' end,1,0,null,false);
  update public.clinical_plan_items set diagnosis_id=d.id,attributes_json=attributes_json||jsonb_build_object('diagnosisId',d.id,'quadrant',quad) where id=(item->>'id')::uuid;
  added:=added+1;
 end loop;
 return jsonb_build_object('added',added);
end $$;
revoke all on function private.is_clinical_diagnostician(uuid),public.create_clinical_diagnosis(uuid,jsonb),public.resolve_clinical_diagnosis(uuid,uuid,integer),public.add_diagnosis_plan_items(uuid,uuid,jsonb,integer) from public,anon;
grant execute on function private.is_clinical_diagnostician(uuid),public.create_clinical_diagnosis(uuid,jsonb),public.resolve_clinical_diagnosis(uuid,uuid,integer),public.add_diagnosis_plan_items(uuid,uuid,jsonb,integer) to authenticated;
commit;
