-- Match Supabase direct access to Denty's server-side clinical permissions.
-- No receptionist or patient should bypass the API by using a direct table write.
CREATE OR REPLACE FUNCTION private.denty_quality_has_permission(
  target_clinic_id uuid, target_permission text
) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $body$
DECLARE
  v_member uuid;
  v_role text;
  v_override boolean;
BEGIN
  SELECT id, role INTO v_member, v_role
    FROM public.clinic_members
   WHERE clinic_id = target_clinic_id
     AND profile_id = (SELECT auth.uid())
     AND active
   LIMIT 1;
  IF v_member IS NULL THEN RETURN false; END IF;
  SELECT allowed INTO v_override FROM public.user_permissions
   WHERE clinic_member_id = v_member AND permission = target_permission LIMIT 1;
  IF FOUND THEN RETURN coalesce(v_override, false); END IF;
  IF v_role = 'ADMIN' THEN RETURN true; END IF;
  IF target_permission = 'clinical.read' THEN
    RETURN v_role IN ('DENTIST','ASSISTANT');
  ELSIF target_permission = 'clinical.write' THEN
    RETURN v_role = 'DENTIST';
  ELSIF target_permission = 'finance.read' THEN
    RETURN v_role IN ('DENTIST','RECEPTION');
  END IF;
  RETURN false;
END;
$body$;
REVOKE ALL ON FUNCTION private.denty_quality_has_permission(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.denty_quality_has_permission(uuid,text) TO authenticated;

DROP POLICY IF EXISTS clinical_incidents_read ON public.clinical_incidents;
CREATE POLICY clinical_incidents_read ON public.clinical_incidents FOR SELECT TO authenticated
USING (private.denty_quality_has_permission(clinic_id,'clinical.read'));

DROP POLICY IF EXISTS clinical_incidents_write ON public.clinical_incidents;
CREATE POLICY clinical_incidents_write ON public.clinical_incidents FOR INSERT TO authenticated
WITH CHECK (
  private.denty_quality_has_permission(clinic_id,'clinical.write')
  AND EXISTS (SELECT 1 FROM public.patients p WHERE p.id=patient_id AND p.clinic_id=clinic_id)
  AND (appointment_id IS NULL OR EXISTS (
    SELECT 1 FROM public.appointments a
     WHERE a.id=appointment_id AND a.clinic_id=clinic_id AND a.patient_id=patient_id))
  AND (responsible_doctor_id IS NULL OR EXISTS (
    SELECT 1 FROM public.staff_members s WHERE s.id=responsible_doctor_id AND s.clinic_id=clinic_id))
);

DROP POLICY IF EXISTS clinical_incidents_edit ON public.clinical_incidents;
CREATE POLICY clinical_incidents_edit ON public.clinical_incidents FOR UPDATE TO authenticated
USING (private.denty_quality_has_permission(clinic_id,'clinical.write'))
WITH CHECK (
  private.denty_quality_has_permission(clinic_id,'clinical.write')
  AND EXISTS (SELECT 1 FROM public.patients p WHERE p.id=patient_id AND p.clinic_id=clinic_id)
);

CREATE OR REPLACE FUNCTION public.denty_guard_incident_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $body$
BEGIN
  -- Never rewrite original facts; follow-up is a separate state/field update.
  IF (OLD.clinic_id,OLD.patient_id,OLD.appointment_id,OLD.clinical_plan_item_id,
      OLD.responsible_doctor_id,OLD.reported_by,OLD.dental_entity_id,OLD.lab_rework_id,
      OLD.implant_outcome_id,OLD.category,OLD.cause,OLD.severity,
      OLD.title,OLD.description,OLD.repeat_treatment,OLD.cost_cents,OLD.occurred_at,OLD.created_at)
     IS DISTINCT FROM
     (NEW.clinic_id,NEW.patient_id,NEW.appointment_id,NEW.clinical_plan_item_id,
      NEW.responsible_doctor_id,NEW.reported_by,NEW.dental_entity_id,NEW.lab_rework_id,
      NEW.implant_outcome_id,NEW.category,NEW.cause,NEW.severity,
      NEW.title,NEW.description,NEW.repeat_treatment,NEW.cost_cents,NEW.occurred_at,NEW.created_at)
  THEN
    RAISE EXCEPTION 'INCIDENT_ORIGINAL_FACTS_IMMUTABLE' USING ERRCODE='23514';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$body$;
DROP TRIGGER IF EXISTS trg_denty_incident_audit_guard ON public.clinical_incidents;
CREATE TRIGGER trg_denty_incident_audit_guard
 BEFORE UPDATE ON public.clinical_incidents FOR EACH ROW
 EXECUTE FUNCTION public.denty_guard_incident_audit();

DROP POLICY IF EXISTS treatment_execution_read ON public.clinical_treatment_executions;
CREATE POLICY treatment_execution_read ON public.clinical_treatment_executions FOR SELECT TO authenticated
USING (private.denty_quality_has_permission(clinic_id,'finance.read'));

DROP POLICY IF EXISTS implant_outcomes_select ON public.implant_placement_outcomes;
CREATE POLICY implant_outcomes_select ON public.implant_placement_outcomes FOR SELECT TO authenticated
USING (private.denty_quality_has_permission(clinic_id,'clinical.read'));

DROP POLICY IF EXISTS implant_outcomes_insert ON public.implant_placement_outcomes;
CREATE POLICY implant_outcomes_insert ON public.implant_placement_outcomes FOR INSERT TO authenticated
WITH CHECK (
  private.denty_quality_has_permission(clinic_id,'clinical.write')
  AND EXISTS (SELECT 1 FROM public.appointments a WHERE a.id=appointment_id
    AND a.clinic_id=clinic_id AND a.patient_id=patient_id AND a.staff_id=doctor_id)
);

-- Surgical outcomes are immutable. Correction requires a clinical incident
-- and a separately audited workflow, not silent overwrite of a surgical record.
DROP POLICY IF EXISTS implant_outcomes_update ON public.implant_placement_outcomes;
REVOKE UPDATE ON public.implant_placement_outcomes FROM authenticated;


-- SECURITY DEFINER RPCs must also enforce clinical.write.
CREATE OR REPLACE FUNCTION public.denty_complete_implant_appointment(
  p_appointment_id uuid, p_expected_version integer, p_outcomes jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $body$
DECLARE
  v_appointment public.appointments%rowtype;
  v_outcome jsonb;
  v_position text;
  v_positions text[] := ARRAY[]::text[];
  v_result jsonb;
  v_type text;
BEGIN
  SELECT * INTO v_appointment FROM public.appointments
    WHERE id = p_appointment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'APPOINTMENT_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  IF NOT private.is_clinic_staff(v_appointment.clinic_id) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501';
  END IF;
  IF NOT private.denty_quality_has_permission(v_appointment.clinic_id, 'clinical.write') THEN
    RAISE EXCEPTION 'CLINICAL_WRITE_REQUIRED' USING ERRCODE='42501';
  END IF;
  IF v_appointment.status = 'COMPLETED' THEN RETURN to_jsonb(v_appointment); END IF;
  IF v_appointment.version <> p_expected_version THEN
    RETURN jsonb_build_object('conflict',true,'currentVersion',v_appointment.version);
  END IF;
  IF v_appointment.status <> 'IN_CHAIR' THEN
    RAISE EXCEPTION 'APPOINTMENT_NOT_IN_CHAIR' USING ERRCODE='22023';
  END IF;
  IF p_outcomes IS NULL OR jsonb_typeof(p_outcomes) <> 'array'
     OR jsonb_array_length(p_outcomes) NOT BETWEEN 1 AND 20 THEN
    RAISE EXCEPTION 'IMPLANT_OUTCOMES_REQUIRED' USING ERRCODE='22023';
  END IF;

  FOR v_outcome IN SELECT value FROM jsonb_array_elements(p_outcomes)
  LOOP
    v_position := btrim(coalesce(v_outcome->>'tooth_position', ''));
    v_type := v_outcome->>'outcome';
    IF length(v_position) < 1 OR length(v_position) > 32
       OR v_position = ANY(v_positions)
       OR v_type NOT IN ('PLACED','FAILED','DEFERRED') THEN
      RAISE EXCEPTION 'INVALID_IMPLANT_OUTCOME' USING ERRCODE='22023';
    END IF;
    v_positions := array_append(v_positions, v_position);
    IF EXISTS (
      SELECT 1 FROM public.implant_placement_outcomes
       WHERE appointment_id = p_appointment_id AND tooth_position = v_position
    ) THEN
      RAISE EXCEPTION 'IMPLANT_OUTCOME_ALREADY_RECORDED' USING ERRCODE='23505';
    END IF;
    INSERT INTO public.implant_placement_outcomes (
      clinic_id, appointment_id, patient_id, doctor_id, tooth_position, outcome,
      system, implant_model, platform, diameter_mm, length_mm, lot_number,
      failure_kind, reason, reassessment_date, placed_at, failure_at, notes, recorded_by
    ) VALUES (
      v_appointment.clinic_id, v_appointment.id, v_appointment.patient_id,
      v_appointment.staff_id, v_position, v_type,
      nullif(btrim(v_outcome->>'system'), ''),
      nullif(btrim(v_outcome->>'implant_model'), ''),
      nullif(btrim(v_outcome->>'platform'), ''),
      nullif(v_outcome->>'diameter_mm', '')::numeric,
      nullif(v_outcome->>'length_mm', '')::numeric,
      nullif(btrim(v_outcome->>'lot_number'), ''),
      nullif(btrim(v_outcome->>'failure_kind'), ''),
      nullif(btrim(v_outcome->>'reason'), ''),
      nullif(v_outcome->>'reassessment_date', '')::date,
      CASE WHEN v_type = 'PLACED' THEN now() END,
      CASE WHEN v_type = 'FAILED' THEN now() END,
      nullif(btrim(v_outcome->>'notes'), ''),
      auth.uid()
    );
  END LOOP;

  v_result := public.transition_appointment(p_appointment_id, p_expected_version, 'COMPLETED', NULL);
  IF coalesce((v_result->>'conflict')::boolean, false) THEN
    RAISE EXCEPTION 'APPOINTMENT_VERSION_CONFLICT' USING ERRCODE='40001';
  END IF;
  RETURN v_result;
END;
$body$;

CREATE OR REPLACE FUNCTION public.denty_complete_clinical_visit(
  p_appointment_id uuid,
  p_expected_version integer,
  p_mark_treatment_completed boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $body$
DECLARE
  v_appointment public.appointments%rowtype;
  v_item public.clinical_plan_items%rowtype;
  v_plan public.clinical_plans%rowtype;
  v_result jsonb;
BEGIN
  SELECT * INTO v_appointment
  FROM public.appointments WHERE id = p_appointment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'APPOINTMENT_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF NOT private.is_clinic_staff(v_appointment.clinic_id) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF v_appointment.version <> p_expected_version THEN
    RETURN jsonb_build_object('conflict', true, 'currentVersion', v_appointment.version);
  END IF;
  IF v_appointment.status <> 'IN_CHAIR' THEN
    RAISE EXCEPTION 'APPOINTMENT_NOT_IN_CHAIR' USING ERRCODE = '22023';
  END IF;
  IF p_mark_treatment_completed AND NOT
    private.denty_quality_has_permission(v_appointment.clinic_id, 'clinical.write') THEN
    RAISE EXCEPTION 'CLINICAL_WRITE_REQUIRED' USING ERRCODE = '42501';
  END IF;
  IF p_mark_treatment_completed THEN
    IF v_appointment.clinical_plan_item_id IS NULL THEN
      RAISE EXCEPTION 'PLAN_ITEM_REQUIRED' USING ERRCODE = '22023';
    END IF;
    SELECT * INTO v_item FROM public.clinical_plan_items
     WHERE id = v_appointment.clinical_plan_item_id
       AND clinic_id = v_appointment.clinic_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'PLAN_ITEM_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;
    SELECT * INTO v_plan FROM public.clinical_plans
     WHERE id = v_item.plan_id
       AND clinic_id = v_appointment.clinic_id
       AND patient_id = v_appointment.patient_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'PLAN_PATIENT_MISMATCH' USING ERRCODE = '22023';
    END IF;
    IF v_item.status IN ('SUPERSEDED', 'CANCELLED') THEN
      RAISE EXCEPTION 'PLAN_ITEM_INACTIVE' USING ERRCODE = '22023';
    END IF;
    IF v_item.status <> 'COMPLETED' THEN
      UPDATE public.clinical_plan_items
         SET status = 'COMPLETED', version = version + 1, updated_at = now()
       WHERE id = v_item.id;
    END IF;
  END IF;
  -- The ledger trigger fires on the completion transition, in the same
  -- transaction. Any failed step rolls back appointment, item and execution.
  v_result := public.transition_appointment(
    p_appointment_id, p_expected_version, 'COMPLETED', NULL
  );
  IF coalesce((v_result->>'conflict')::boolean, false) THEN
    RAISE EXCEPTION 'APPOINTMENT_VERSION_CONFLICT' USING ERRCODE = '40001';
  END IF;
  RETURN v_result;
END;
$body$;
