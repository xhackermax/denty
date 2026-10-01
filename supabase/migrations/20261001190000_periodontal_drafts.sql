-- Drafts are separate from immutable clinical exams. No historical recession values are rewritten.
create table public.periodontal_drafts (
 patient_id uuid primary key references public.patients(id) on delete cascade,
 clinic_id uuid not null references public.clinics(id),
 version integer not null check(version>0),
 data jsonb not null check(jsonb_typeof(data)='object'),
 updated_at timestamptz not null default now()
);
alter table public.periodontal_drafts enable row level security;
create policy periodontal_drafts_staff on public.periodontal_drafts for all to authenticated
 using(private.is_clinic_staff(clinic_id))
 with check(private.is_clinic_staff(clinic_id) and exists(select 1 from public.patients p where p.id=patient_id and p.clinic_id=periodontal_drafts.clinic_id));
grant select,insert,update,delete on public.periodontal_drafts to authenticated;
create or replace function public.save_periodontal_draft(p_patient_id uuid,p_expected_version integer,p_data jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_clinic uuid; v_row public.periodontal_drafts%rowtype;
begin
 select clinic_id into v_clinic from public.patients where id=p_patient_id for update;
 if v_clinic is null then raise exception 'PATIENT_NOT_FOUND' using errcode='P0002'; end if;
 if not private.is_clinic_staff(v_clinic) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 select * into v_row from public.periodontal_drafts where patient_id=p_patient_id for update;
 if coalesce(v_row.version,0)<>p_expected_version then raise exception 'PERIO_DRAFT_VERSION_CONFLICT' using errcode='PT409'; end if;
 insert into public.periodontal_drafts(patient_id,clinic_id,version,data,updated_at)
 values(p_patient_id,v_clinic,p_expected_version+1,p_data,now())
 on conflict(patient_id) do update set version=excluded.version,data=excluded.data,updated_at=excluded.updated_at returning * into v_row;
 return jsonb_build_object('version',v_row.version,'data',v_row.data,'updatedAt',v_row.updated_at);
end; $$;
create or replace function public.finish_periodontal_draft(p_patient_id uuid,p_expected_version integer,p_exam jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_row public.periodontal_drafts%rowtype; v_clinic uuid; v_result jsonb;
begin
 select clinic_id into v_clinic from public.patients where id=p_patient_id for update;
 if v_clinic is null then raise exception 'PATIENT_NOT_FOUND' using errcode='P0002'; end if;
 if not private.is_clinical_diagnostician(v_clinic) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 select * into v_row from public.periodontal_drafts where patient_id=p_patient_id for update;
 if v_row.version is null or v_row.version<>p_expected_version then raise exception 'PERIO_DRAFT_VERSION_CONFLICT' using errcode='PT409'; end if;
 if jsonb_array_length(coalesce(p_exam->'sites','[]'::jsonb))=0 then raise exception 'EMPTY_EXAM' using errcode='22023'; end if;
 v_result:=public.save_periodontal_exam(p_patient_id,p_exam);
 delete from public.periodontal_drafts where patient_id=p_patient_id;
 return jsonb_build_object('examId',v_result->'exam'->>'id');
end; $$;
revoke execute on function public.save_periodontal_draft(uuid,integer,jsonb),public.finish_periodontal_draft(uuid,integer,jsonb) from public,anon;
grant execute on function public.save_periodontal_draft(uuid,integer,jsonb),public.finish_periodontal_draft(uuid,integer,jsonb) to authenticated;
