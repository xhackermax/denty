begin;
-- Generations never repeat, even when their optimistic revision starts again at one.
alter table public.periodontal_drafts add column draft_id uuid not null default gen_random_uuid();
create unique index periodontal_draft_generation on public.periodontal_drafts(draft_id);
create table public.periodontal_draft_completions (
 draft_id uuid primary key,
 clinic_id uuid not null references public.clinics(id),
 patient_id uuid not null references public.patients(id),
 exam_id uuid not null references public.periodontal_exams(id),
 completed_at timestamptz not null default now()
);
create or replace function private.is_periodontal_recorder(p_clinic uuid) returns boolean
 language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.clinic_members where clinic_id=p_clinic and profile_id=(select auth.uid()) and active and role in ('ADMIN','DENTIST','ASSISTANT'))
$$;
alter table public.periodontal_draft_completions enable row level security;
create policy periodontal_completions_read on public.periodontal_draft_completions for select to authenticated using(private.is_periodontal_recorder(clinic_id));
grant select on public.periodontal_draft_completions to authenticated;
drop policy periodontal_drafts_staff on public.periodontal_drafts;
create policy periodontal_drafts_clinical on public.periodontal_drafts for all to authenticated
 using(private.is_periodontal_recorder(clinic_id))
 with check(private.is_periodontal_recorder(clinic_id) and exists(select 1 from public.patients p where p.id=patient_id and p.clinic_id=periodontal_drafts.clinic_id));
revoke update on public.periodontal_drafts from authenticated;
grant update(version,data,updated_at) on public.periodontal_drafts to authenticated;
create or replace function private.guard_perio_generation() returns trigger
 language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and (new.draft_id is distinct from old.draft_id or new.patient_id is distinct from old.patient_id or new.clinic_id is distinct from old.clinic_id) then raise exception 'IMMUTABLE_DRAFT_GENERATION' using errcode='23514';end if;
 if tg_op='INSERT' and exists(select 1 from public.periodontal_draft_completions where draft_id=new.draft_id) then raise exception 'COMPLETED_DRAFT_GENERATION' using errcode='23514';end if;
 return new;
end $$;
create trigger immutable_perio_generation before insert or update on public.periodontal_drafts for each row execute function private.guard_perio_generation();
-- Remove signatures that cannot distinguish a stale tab from the next examination.
drop function public.save_periodontal_draft(uuid,integer,jsonb);
drop function public.finish_periodontal_draft(uuid,integer,jsonb);
create function public.save_periodontal_draft(p_patient_id uuid,p_expected_version integer,p_draft_id uuid,p_data jsonb)
 returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_clinic uuid;v_row public.periodontal_drafts%rowtype;
begin
 select clinic_id into v_clinic from public.patients where id=p_patient_id for update;
 if v_clinic is null then raise exception 'PATIENT_NOT_FOUND' using errcode='P0002';end if;
 if not private.is_periodontal_recorder(v_clinic) then raise exception 'FORBIDDEN' using errcode='42501';end if;
 select * into v_row from public.periodontal_drafts where patient_id=p_patient_id for update;
 if v_row.patient_id is null then
  if p_expected_version<>0 or p_draft_id is not null then raise exception 'PERIO_DRAFT_VERSION_CONFLICT' using errcode='PT409';end if;
  insert into public.periodontal_drafts(patient_id,clinic_id,version,data) values(p_patient_id,v_clinic,1,p_data) returning * into v_row;
 else
  if v_row.version<>p_expected_version or v_row.draft_id is distinct from p_draft_id then raise exception 'PERIO_DRAFT_VERSION_CONFLICT' using errcode='PT409';end if;
  update public.periodontal_drafts set version=version+1,data=p_data,updated_at=now() where patient_id=p_patient_id returning * into v_row;
 end if;
 return jsonb_build_object('id',v_row.draft_id,'version',v_row.version,'data',v_row.data,'updatedAt',v_row.updated_at);
end $$;
create function public.finish_periodontal_draft(p_patient_id uuid,p_expected_version integer,p_draft_id uuid,p_exam jsonb)
 returns jsonb language plpgsql security definer set search_path='' as $$
declare v_clinic uuid;v_row public.periodontal_drafts%rowtype;v_exam_id uuid;v_result jsonb;
begin
 select clinic_id into v_clinic from public.patients where id=p_patient_id for update;
 if v_clinic is null then raise exception 'PATIENT_NOT_FOUND' using errcode='P0002';end if;
 if not private.is_clinical_diagnostician(v_clinic) then raise exception 'FORBIDDEN' using errcode='42501';end if;
 select exam_id into v_exam_id from public.periodontal_draft_completions where draft_id=p_draft_id and patient_id=p_patient_id and clinic_id=v_clinic;
 if v_exam_id is not null then return jsonb_build_object('examId',v_exam_id);end if;
 select * into v_row from public.periodontal_drafts where patient_id=p_patient_id for update;
 if v_row.version is null or v_row.version<>p_expected_version or v_row.draft_id is distinct from p_draft_id then raise exception 'PERIO_DRAFT_VERSION_CONFLICT' using errcode='PT409';end if;
 if jsonb_array_length(coalesce(p_exam->'sites','[]'::jsonb))=0 then raise exception 'EMPTY_EXAM' using errcode='22023';end if;
 v_result:=public.save_periodontal_exam(p_patient_id,p_exam);
 v_exam_id:=(v_result->'exam'->>'id')::uuid;
 insert into public.periodontal_draft_completions(draft_id,clinic_id,patient_id,exam_id) values(p_draft_id,v_clinic,p_patient_id,v_exam_id);
 delete from public.periodontal_drafts where patient_id=p_patient_id;
 return jsonb_build_object('examId',v_exam_id);
end $$;
create or replace function private.implant_is_existing(p_status text,p_lifecycle text) returns boolean
 language sql immutable set search_path='' as $$
 select case when p_lifecycle='PLANIFICADO' then false
 when p_lifecycle in ('REALIZADO','REALIZADO_OTRA_CLINICA','HALLAZGO_EXISTENTE') then true
 else coalesce(p_status in ('implant','implant_review') or p_status ~ '(_completed|_bad)$',false) end
$$;
revoke all on function private.is_periodontal_recorder(uuid),private.guard_perio_generation(),private.implant_is_existing(text,text) from public,anon;
grant execute on function private.is_periodontal_recorder(uuid),private.guard_perio_generation(),private.implant_is_existing(text,text) to authenticated;
revoke all on function public.save_periodontal_draft(uuid,integer,uuid,jsonb),public.finish_periodontal_draft(uuid,integer,uuid,jsonb) from public,anon;
grant execute on function public.save_periodontal_draft(uuid,integer,uuid,jsonb),public.finish_periodontal_draft(uuid,integer,uuid,jsonb) to authenticated;
create or replace function private.tooth_is_probeable(p_patient uuid,p_tooth text)
returns boolean language sql stable security invoker set search_path='' as $$
 select p_tooth ~ '^([1-4][1-8]|[5-8][1-5])$' and exists(select 1 from public.patients where id=p_patient)
 and (
 exists(select 1 from public.dental_entities e where e.patient_id=p_patient and e.active and e.tooth=p_tooth and ((e.entity_type='IMPLANT' and private.implant_is_existing(e.status,e.attributes_json->>'lifecycle')) or (e.entity_type in ('PEDIATRIC','HEALTHY','TOOTH_STATE') and e.status in ('healthy','retained','erupting'))))
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
    and replacement.entity_type='IMPLANT' and private.implant_is_existing(replacement.status,replacement.attributes_json->>'lifecycle'))
 )
$$;
create or replace function private.guard_plan_natural_tooth() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.tooth is not null and new.status='PLANNED' and upper(coalesce(new.treatment_code_snapshot,new.treatment_code)) in ('FILLING','ENDODONTICS','POST','EXTRACTION')
 and (not private.tooth_is_probeable((select patient_id from public.clinical_plans where id=new.plan_id),new.tooth)
 or exists(select 1 from public.dental_entities where patient_id=(select patient_id from public.clinical_plans where id=new.plan_id) and active and tooth=new.tooth and entity_type='IMPLANT' and private.implant_is_existing(status,attributes_json->>'lifecycle'))) then
 raise exception 'TOOTH_UNAVAILABLE: tratamiento requiere diente natural' using errcode='23514';
 end if;
 return new;
end $$;
commit;
