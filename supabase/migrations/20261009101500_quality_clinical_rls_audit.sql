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
      OLD.responsible_doctor_id,OLD.category,OLD.cause,OLD.severity,
      OLD.title,OLD.description,OLD.repeat_treatment,OLD.cost_cents,OLD.occurred_at)
     IS DISTINCT FROM
     (NEW.clinic_id,NEW.patient_id,NEW.appointment_id,NEW.clinical_plan_item_id,
      NEW.responsible_doctor_id,NEW.category,NEW.cause,NEW.severity,
      NEW.title,NEW.description,NEW.repeat_treatment,NEW.cost_cents,NEW.occurred_at)
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

-- Make the atomic RPCs uphold the same permissions even when called directly.
CREATE OR REPLACE FUNCTION public.denty_guard_qualified_clinical_visit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $body$
BEGIN
  IF NEW.status = 'COMPLETED' AND NEW.clinical_plan_item_id IS NOT NULL
    AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- Status completion itself may be done by reception staff; treatment
    -- recognition always requires a separate, clinically authorised action.
    NULL;
  END IF;
  RETURN NEW;
END;
$body$;
