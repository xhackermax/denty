import { describe, expect, it } from "vitest";
import { clinicalPipelineHref, clinicalPipelineProgress } from "../clinical-pipeline-progress";

describe("clinical pipeline progress", () => {
  it("marks odontogram complete and diagnosis current", () => {
    const result = clinicalPipelineProgress({
      patientId: "juan-perez",
      odontogramVersion: 1,
      diagnosisCount: 0,
      activePlanItemCount: 0,
      plan: null,
      budget: null,
      futureAppointmentCount: 0,
    });
    expect([...result.completed]).toEqual(["odontogram"]);
    expect(result.current).toBe("diagnosis");
  });
  it("keeps an outdated budget incomplete", () => {
    const result = clinicalPipelineProgress({
      patientId: "juan-perez",
      odontogramVersion: 4,
      diagnosisCount: 2,
      activePlanItemCount: 2,
      plan: { version: 3, sourceOdontogramVersion: 4 },
      budget: { id: "B1", status: "PRESENTED", sourcePlanVersion: 2 },
      futureAppointmentCount: 1,
    });
    expect(result.completed.has("budget")).toBe(false);
    expect(result.current).toBe("budget");
  });
  it("preserves the patient in routes", () => {
    expect(clinicalPipelineHref("diagnosis", "juan-perez")).toBe(
      "/app/patients/juan-perez/odontogram?section=diagnosis",
    );
    expect(clinicalPipelineHref("appointments", "juan-perez")).toBe(
      "/app/agenda?patientId=juan-perez",
    );
  });
});
