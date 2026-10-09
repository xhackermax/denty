-- Prosthetic appointments must never be mistaken for surgical implant placement.
-- Keep the SQL guard aligned with domain/implant-surgery-reminder.ts.
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
  v_is_surgery :=
    v_reason ~ '(cirugi|quirurg|inserci|fase quir|all[- ]?on[- ]?[46]|colocacion (de |del )?implante|colocar (un )?implante)'
    OR v_reason !~ '(revision|control|mantenimiento|impresion|escanead|corona|pilar|protes|cementac|atornillad)';
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
