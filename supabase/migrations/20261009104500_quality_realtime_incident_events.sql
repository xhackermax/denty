-- New clinical tables participate in Denty's existing clinic-scoped broadcast bus.
DO $body$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='denty_realtime_broadcast'
    AND tgrelid='public.clinical_incidents'::regclass) THEN
    CREATE TRIGGER denty_realtime_broadcast AFTER INSERT OR UPDATE
      ON public.clinical_incidents FOR EACH ROW EXECUTE FUNCTION private.broadcast_denty_change();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='denty_realtime_broadcast'
    AND tgrelid='public.clinical_treatment_executions'::regclass) THEN
    CREATE TRIGGER denty_realtime_broadcast AFTER INSERT
      ON public.clinical_treatment_executions FOR EACH ROW
      EXECUTE FUNCTION private.broadcast_denty_change();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='denty_realtime_broadcast'
    AND tgrelid='public.implant_placement_outcomes'::regclass) THEN
    CREATE TRIGGER denty_realtime_broadcast AFTER INSERT
      ON public.implant_placement_outcomes FOR EACH ROW
      EXECUTE FUNCTION private.broadcast_denty_change();
  END IF;
END;
$body$;

CREATE TABLE IF NOT EXISTS public.clinical_incident_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id),
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  incident_id uuid NOT NULL REFERENCES public.clinical_incidents(id),
  event_kind text NOT NULL CHECK (event_kind IN ('CREATED','FOLLOW_UP')),
  previous_status text,
  new_status text NOT NULL,
  corrective_action text,
  actor_profile_id uuid,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS clinical_incident_events_incident_date
  ON public.clinical_incident_events (incident_id,occurred_at DESC);
CREATE INDEX IF NOT EXISTS clinical_incident_events_clinic_date
  ON public.clinical_incident_events (clinic_id,occurred_at DESC);
ALTER TABLE public.clinical_incident_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS incident_events_read ON public.clinical_incident_events;
CREATE POLICY incident_events_read ON public.clinical_incident_events FOR SELECT TO authenticated
USING (private.denty_quality_has_permission(clinic_id,'clinical.read'));
GRANT SELECT ON public.clinical_incident_events TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.clinical_incident_events FROM authenticated;

CREATE OR REPLACE FUNCTION public.denty_log_incident_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $body$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status
    AND OLD.corrective_action IS NOT DISTINCT FROM NEW.corrective_action THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.clinical_incident_events (
    clinic_id,patient_id,incident_id,event_kind,previous_status,
    new_status,corrective_action,actor_profile_id
  ) VALUES (
    NEW.clinic_id,NEW.patient_id,NEW.id,
    CASE WHEN TG_OP='INSERT' THEN 'CREATED' ELSE 'FOLLOW_UP' END,
    CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.status END,
    NEW.status,NEW.corrective_action,auth.uid()
  );
  RETURN NEW;
END;
$body$;
DROP TRIGGER IF EXISTS trg_denty_incident_event_log ON public.clinical_incidents;
CREATE TRIGGER trg_denty_incident_event_log AFTER INSERT OR UPDATE
  ON public.clinical_incidents FOR EACH ROW EXECUTE FUNCTION public.denty_log_incident_event();
