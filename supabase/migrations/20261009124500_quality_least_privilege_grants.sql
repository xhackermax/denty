-- Audit data must never be truncatable by an API identity.
-- RLS protects rows but does not apply to TRUNCATE. Remove the inherited
-- broad default Supabase grants and restore only application operations.
REVOKE ALL PRIVILEGES ON TABLE
  public.clinical_incidents,
  public.clinical_incident_events,
  public.clinical_treatment_executions,
  public.implant_placement_outcomes
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON public.clinical_incidents TO authenticated;
GRANT SELECT ON public.clinical_incident_events TO authenticated;
GRANT SELECT ON public.clinical_treatment_executions TO authenticated;
GRANT SELECT, INSERT ON public.implant_placement_outcomes TO authenticated;

-- The same principle applies to the immutable result ledger and incident timeline:
-- INSERT/UPDATE/DELETE/TRUNCATE remain unavailable to regular users.
