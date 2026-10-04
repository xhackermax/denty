-- Pendiente de aplicar en producción (proyecto awdqomgbxygtflkwggqb).
-- Completa la migración 20261001200000_clinical_review_fixes; el resto ya se aplicó el 2026-10-04.
-- Pegar entero en Supabase → SQL Editor → Run. Es una sola transacción: o entra todo o nada.
begin;

-- 1) Terminar el sondaje periodontal: convierte el borrador en examen (idempotente por generación).
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

-- 2) Borradores de periodoncia solo para quien sondea (admin, dentista, asistente), no recepción.
drop policy periodontal_drafts_staff on public.periodontal_drafts;
create policy periodontal_drafts_clinical on public.periodontal_drafts for all to authenticated
 using(private.is_periodontal_recorder(clinic_id))
 with check(private.is_periodontal_recorder(clinic_id) and exists(select 1 from public.patients p where p.id=patient_id and p.clinic_id=periodontal_drafts.clinic_id));
revoke update on public.periodontal_drafts from authenticated;
grant update(version,data,updated_at) on public.periodontal_drafts to authenticated;

-- 3) Sin ejecución anónima de las funciones nuevas.
revoke all on function private.is_periodontal_recorder(uuid),private.guard_perio_generation(),private.implant_is_existing(text,text) from public,anon;
revoke all on function public.save_periodontal_draft(uuid,integer,uuid,jsonb),public.finish_periodontal_draft(uuid,integer,uuid,jsonb) from public,anon;
revoke all on function private.odontogram_procedure_code(text,text,jsonb),private.odontogram_procedure_treatment_code(text,text,jsonb) from public,anon;
revoke all on function private.tooth_is_probeable(uuid,text),private.guard_periodontal_tooth(),private.guard_plan_natural_tooth() from public,anon;
grant execute on function private.is_periodontal_recorder(uuid),private.guard_perio_generation(),private.implant_is_existing(text,text) to authenticated;
grant execute on function public.save_periodontal_draft(uuid,integer,uuid,jsonb),public.finish_periodontal_draft(uuid,integer,uuid,jsonb) to authenticated;
grant execute on function private.odontogram_procedure_code(text,text,jsonb),private.odontogram_procedure_treatment_code(text,text,jsonb) to authenticated;
grant execute on function private.tooth_is_probeable(uuid,text),private.guard_periodontal_tooth(),private.guard_plan_natural_tooth() to authenticated;

-- Deja constancia en el historial de migraciones.
insert into supabase_migrations.schema_migrations(version, name)
values ('20261004160000', 'clinical_review_fixes_5_finish_policy_revokes')
on conflict do nothing;

commit;
