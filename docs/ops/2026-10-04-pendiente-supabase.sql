-- Pendiente de aplicar en producción (proyecto awdqomgbxygtflkwggqb).
-- Completa la migración 20261001200000_clinical_review_fixes y añade
-- 20261004122000_budget_requires_current_plan; el resto ya se aplicó el 2026-10-04.
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

-- 2) El presupuesto no se genera desde un plan anterior al odontograma actual
--    (migración 20261004122000_budget_requires_current_plan). El conector no la aplica porque la
--    función contiene "delete from budget_items"; las otras dos del 4 de octubre ya están aplicadas.
create or replace function public.sync_budget_from_plan(p_patient_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  v_clinic_id uuid; v_plan public.clinical_plans%rowtype; v_budget public.budgets%rowtype; v_total integer; v_revision integer;
  v_odontogram_version integer;
begin
  select clinic_id into v_clinic_id from public.patients where id=p_patient_id;
  if v_clinic_id is null then raise exception 'PATIENT_NOT_FOUND' using errcode='P0002'; end if;
  if not private.is_clinic_staff(v_clinic_id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select * into v_plan from public.clinical_plans where patient_id=p_patient_id order by updated_at desc limit 1;
  if v_plan.id is null then raise exception 'PLAN_NOT_FOUND' using errcode='P0002'; end if;
  if v_plan.source_odontogram_version is null then raise exception 'PLAN_NOT_SYNCED' using errcode='23514'; end if;
  select coalesce(max(version), 1) into v_odontogram_version
  from public.dental_entities where patient_id=p_patient_id;
  if v_plan.source_odontogram_version <> v_odontogram_version then
    raise exception 'PLAN_OUTDATED' using errcode='23514';
  end if;
  perform public.refresh_consent_requirements(v_plan.id);
  select * into v_budget from public.budgets where patient_id=p_patient_id and clinical_plan_id=v_plan.id order by revision desc limit 1 for update;
  select coalesce(sum(case when billing_mode='separate' and status not in ('CANCELLED','SUPERSEDED') then coalesce(price_snapshot_cents,price_cents,0) else 0 end),0)
  into v_total from public.clinical_plan_items where plan_id=v_plan.id;
  if v_budget.id is null or v_budget.status <> 'DRAFT' then
    select coalesce(max(revision),0)+1 into v_revision from public.budgets where patient_id=p_patient_id;
    insert into public.budgets(clinic_id,patient_id,clinical_plan_id,code,status,total_cents,source_plan_version,revision,version)
    values(v_clinic_id,p_patient_id,v_plan.id,'P-'||substr(p_patient_id::text,1,8)||'-R'||v_revision,'DRAFT',v_total,v_plan.version,v_revision,1) returning * into v_budget;
  else
    update public.budgets set total_cents=v_total,source_plan_version=v_plan.version,version=version+1,status='DRAFT' where id=v_budget.id returning * into v_budget;
    delete from public.budget_items where budget_id=v_budget.id;
  end if;
  insert into public.budget_items(clinic_id,budget_id,clinical_plan_item_id,component_type,description,tooth,billing_mode,quantity,unit_price_cents,total_cents)
  select i.clinic_id,v_budget.id,i.id,i.component_type,coalesce(i.label_snapshot,i.label),i.tooth,i.billing_mode,1,coalesce(i.price_snapshot_cents,i.price_cents,0),case when i.billing_mode='separate' then coalesce(i.price_snapshot_cents,i.price_cents,0) else 0 end
  from public.clinical_plan_items i where i.plan_id=v_plan.id and i.status not in ('CANCELLED','SUPERSEDED');
  insert into public.clinical_history_events(clinic_id,patient_id,actor_id,event_type,entity_id,entity_type,payload_json)
  values(v_clinic_id,p_patient_id,(select auth.uid()),'BUDGET_SYNCED_FROM_PLAN',v_budget.id,'BUDGET',jsonb_build_object('planVersion',v_plan.version,'revision',v_budget.revision,'totalCents',v_total));
  return to_jsonb(v_budget);
end; $$;

insert into supabase_migrations.schema_migrations(version, name)
values ('20261004122000', 'budget_requires_current_plan')
on conflict do nothing;

commit;
