-- Denty: atomic implant-surgery closure + verified treatment ledger.
-- No historical backfill: existing appointments are not inferred as treatment executions.
CREATE UNIQUE INDEX IF NOT EXISTS ux_denty_execution_one_per_plan_item
  ON public.clinical_treatment_executions (clinical_plan_item_id)
  WHERE clinical_plan_item_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.denty_capture_plan_item_execution(p_item_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $body$
DECLARE
  v_item public.clinical_plan_items%rowtype;
  v_appointment public.appointments%rowtype;
BEGIN
  SELECT * INTO v_item FROM public.clinical_plan_items
   WHERE id = p_item_id AND status = 'COMPLETED';
  IF NOT FOUND THEN RETURN; END IF;

  -- A procedure is counted once, after both the item and its linked appointment
  -- are completed; never count an appointment just because it is marked completed.
  SELECT a.* INTO v_appointment
    FROM public.appointments a
    JOIN public.clinical_plans p
      ON p.id = v_item.plan_id AND p.clinic_id = v_item.clinic_id
     AND p.patient_id = a.patient_id
   WHERE a.clinical_plan_item_id = v_item.id
     AND a.clinic_id = v_item.clinic_id
     AND a.status = 'COMPLETED'
   ORDER BY a.completed_at DESC NULLS LAST, a.starts_at DESC, a.id DESC
   LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;

  INSERT INTO public.clinical_treatment_executions (
    clinic_id, patient_id, appointment_id, doctor_id, clinical_plan_item_id,
    treatment_code, treatment_category, tooth_position, executed_at,
    attributed_revenue_cents, recorded_by
  ) VALUES (
    v_appointment.clinic_id, v_appointment.patient_id, v_appointment.id,
    v_appointment.staff_id, v_item.id,
    coalesce(nullif(v_item.treatment_code_snapshot, ''), v_item.treatment_code),
    coalesce(nullif(v_item.category_snapshot, ''),
             nullif(v_item.specialty_snapshot, ''), 'UNCLASSIFIED'),
    v_item.tooth, now(), NULL, auth.uid()
  )
  ON CONFLICT DO NOTHING;
END;
$body$;

REVOKE ALL ON FUNCTION public.denty_capture_plan_item_execution(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.denty_capture_plan_item_execution(uuid) FROM authenticated;

CREATE OR REPLACE FUNCTION public.denty_on_appointment_complete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $body$
BEGIN
  IF NEW.status = 'COMPLETED'
     AND OLD.status IS DISTINCT FROM NEW.status
     AND NEW.clinical_plan_item_id IS NOT NULL THEN
    PERFORM public.denty_capture_plan_item_execution(NEW.clinical_plan_item_id);
  END IF;
  RETURN NEW;
END;
$body$;
DROP TRIGGER IF EXISTS trg_denty_completed_appointment_execution ON public.appointments;
CREATE TRIGGER trg_denty_completed_appointment_execution
 AFTER UPDATE OF status ON public.appointments FOR EACH ROW
 EXECUTE FUNCTION public.denty_on_appointment_complete();

CREATE OR REPLACE FUNCTION public.denty_on_plan_item_completed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $body$
BEGIN
  IF NEW.status = 'COMPLETED' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.denty_capture_plan_item_execution(NEW.id);
  END IF;
  RETURN NEW;
END;
$body$;
DROP TRIGGER IF EXISTS trg_denty_completed_plan_item_execution ON public.clinical_plan_items;
CREATE TRIGGER trg_denty_completed_plan_item_execution
 AFTER UPDATE OF status ON public.clinical_plan_items FOR EACH ROW
 EXECUTE FUNCTION public.denty_on_plan_item_completed();

-- Direct completion paths (including old clients) cannot bypass the mandatory
-- placement outcome form when this appointment describes implant surgery.
CREATE OR REPLACE FUNCTION public.denty_guard_implant_surgery_closure()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $body$
DECLARE
  v_reason text;
  v_is_implant boolean;
  v_is_surgery boolean;
BEGIN
  IF NEW.status IS DISTINCT FROM 'COMPLETED'
     OR OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
  v_reason := lower(translate(coalesce(nullif(NEW.reason, ''), NEW.title, ''),
    'áéíóúüÁÉÍÓÚÜ', 'aeiouuAEIOUU'));
  v_is_implant := v_reason ~ '(implante|implantologia|all[- ]?on[- ]?[46])';
  v_is_surgery := v_reason ~ '(cirugi|quirurg|colocaci|inserci|fase quir|all[- ]?on[- ]?[46])'
    OR v_reason !~ '(revision|control|mantenimiento|impresion|escanead)';
  IF v_is_implant AND v_is_surgery AND NOT EXISTS (
    SELECT 1 FROM public.implant_placement_outcomes o
     WHERE o.appointment_id = NEW.id AND o.clinic_id = NEW.clinic_id
       AND o.patient_id = NEW.patient_id AND o.doctor_id = NEW.staff_id
  ) THEN
    RAISE EXCEPTION 'IMPLANT_OUTCOME_REQUIRED' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$body$;
DROP TRIGGER IF EXISTS trg_denty_implant_closure_guard ON public.appointments;
CREATE TRIGGER trg_denty_implant_closure_guard
 BEFORE UPDATE OF status ON public.appointments FOR EACH ROW
 EXECUTE FUNCTION public.denty_guard_implant_surgery_closure();

-- Atomic: all implants and the appointment transition commit together or
-- everything rolls back. The appointment row is locked to serialize retries.
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
REVOKE ALL ON FUNCTION public.denty_complete_implant_appointment(uuid,integer,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.denty_complete_implant_appointment(uuid,integer,jsonb) TO authenticated;

-- The ledger can only be maintained by the DB triggers, never through direct
-- authenticated writes which would let clients fabricate doctor production.
REVOKE INSERT, UPDATE, DELETE ON public.clinical_treatment_executions FROM authenticated;
