-- Explicit treatment completion: appointment != treatment.
-- A completed visit can be a session of a longer procedure. Only the doctor's
-- explicit decision to finish the linked plan item writes the execution ledger.
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
REVOKE ALL ON FUNCTION public.denty_complete_clinical_visit(uuid,integer,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.denty_complete_clinical_visit(uuid,integer,boolean) TO authenticated;
