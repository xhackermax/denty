import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261009130000_auto_implant_failures_to_incidents.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("implant outcomes and clinical incidents integration", () => {
  it("records failures but never treats a placed or deferred implant as failed", () => {
    expect(migration).toContain("NEW.outcome IS DISTINCT FROM 'FAILED'");
    expect(migration).toContain("IF NEW.failure_kind = 'PREVIOUSLY_PLACED'");
    expect(migration).toContain("'CLINICAL_COMPLICATION', 'UNDETERMINED'");
    expect(migration).toContain("'MODERATE', 'OPEN'");
  });

  it("keeps the patient, original appointment and the surgeon linked", () => {
    expect(migration).toContain("NEW.clinic_id, NEW.patient_id, NEW.appointment_id, NEW.id");
    expect(migration).toContain("NEW.doctor_id, auth.uid()");
    expect(migration).toContain("repeat_treatment");
    expect(migration).toContain("false, 0");
  });

  it("prevents multiple automatically generated cases for the same outcome", () => {
    expect(migration).toContain("ux_denty_incident_one_per_implant_failure");
    expect(migration).toContain("ON CONFLICT DO NOTHING");
    expect(migration).toContain("AFTER INSERT ON public.implant_placement_outcomes");
  });
});
