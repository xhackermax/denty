-- A failed implant procedure automatically creates an open clinical incident.
-- Do not infer negligence, a known cause, or a repeated treatment from a failure.
-- The incident retains the original implant outcome, doctor, patient and visit.
CREATE UNIQUE INDEX IF NOT EXISTS ux_denty_incident_one_per_implant_failure
ON public.clinical_incidents (implant_outcome_id)
WHERE implant_outcome_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.denty_auto_incident_for_implant_failure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $body$
DECLARE
  v_title text;
  v_description text;
BEGIN
  IF NEW.outcome IS DISTINCT FROM 'FAILED' THEN
    RETURN NEW;
  END IF;
  IF NEW.failure_kind = 'PREVIOUSLY_PLACED' THEN
    v_title := 'Fracaso de implante previamente colocado · ' || NEW.tooth_position;
    v_description := 'Se ha registrado un fracaso de un implante previamente colocado. ';
  ELSE
    v_title := 'Fracaso en intento de colocación · ' || NEW.tooth_position;
    v_description := 'No fue posible completar el intento de colocación de implante. ';
  END IF;
  v_description := v_description || 'Motivo documentado: ' ||
    coalesce(nullif(btrim(NEW.reason), ''), 'No determinado');

  INSERT INTO public.clinical_incidents (
    clinic_id, patient_id, appointment_id, implant_outcome_id,
    responsible_doctor_id, reported_by,
    category, cause, severity, status, title, description, repeat_treatment,
    cost_cents
  ) VALUES (
    NEW.clinic_id, NEW.patient_id, NEW.appointment_id, NEW.id,
    NEW.doctor_id, auth.uid(),
    'CLINICAL_COMPLICATION', 'UNDETERMINED', 'MODERATE', 'OPEN',
    v_title, v_description, false, 0
  ) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$body$;

DROP TRIGGER IF EXISTS trg_denty_auto_incident_implant_failure
ON public.implant_placement_outcomes;

CREATE TRIGGER trg_denty_auto_incident_implant_failure
AFTER INSERT ON public.implant_placement_outcomes
FOR EACH ROW EXECUTE FUNCTION public.denty_auto_incident_for_implant_failure();

REVOKE ALL ON FUNCTION public.denty_auto_incident_for_implant_failure()
FROM PUBLIC, anon, authenticated;
