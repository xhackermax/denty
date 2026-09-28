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
      requiredConsentCount: 0,
      signedRequiredConsentCount: 0,
      budget: null,
      budgetSigned: false,
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
      requiredConsentCount: 0,
      signedRequiredConsentCount: 0,
      budget: { id: "B1", status: "PRESENTED", sourcePlanVersion: 2 },
      budgetSigned: false,
      futureAppointmentCount: 1,
    });
    expect(result.completed.has("budget")).toBe(false);
    expect(result.current).toBe("budget");
  });
  it("requires a signed budget before appointments count as completed", () => {
    const unsigned = clinicalPipelineProgress({
      patientId: "juan-perez",
      odontogramVersion: 2,
      diagnosisCount: 1,
      activePlanItemCount: 1,
      plan: { version: 3, sourceOdontogramVersion: 2 },
      requiredConsentCount: 0,
      signedRequiredConsentCount: 0,
      budget: { id: "B1", status: "PRESENTED", sourcePlanVersion: 3 },
      budgetSigned: false,
      futureAppointmentCount: 1,
    });
    expect(unsigned.current).toBe("signature");
    expect(unsigned.completed.has("appointments")).toBe(false);

    const signed = clinicalPipelineProgress({
      patientId: "juan-perez",
      odontogramVersion: 2,
      diagnosisCount: 1,
      activePlanItemCount: 1,
      plan: { version: 3, sourceOdontogramVersion: 2 },
      requiredConsentCount: 0,
      signedRequiredConsentCount: 0,
      budget: { id: "B1", status: "PRESENTED", sourcePlanVersion: 3 },
      budgetSigned: true,
      futureAppointmentCount: 1,
    });
    expect(signed.completed.has("signature")).toBe(true);
    expect(signed.completed.has("appointments")).toBe(true);
  });
  it("requires treatment consents immediately after the plan", () => {
    const result = clinicalPipelineProgress({
      patientId: "juan-perez",
      odontogramVersion: 2,
      diagnosisCount: 1,
      activePlanItemCount: 2,
      plan: { version: 3, sourceOdontogramVersion: 2 },
      requiredConsentCount: 2,
      signedRequiredConsentCount: 1,
      budget: { id: "B1", status: "PRESENTED", sourcePlanVersion: 3 },
      budgetSigned: true,
      futureAppointmentCount: 1,
    });
    expect(result.current).toBe("consents");
    expect(result.completed.has("budget")).toBe(false);
    expect(result.completed.has("signature")).toBe(false);
  });

  it("preserves the patient in routes", () => {
    expect(clinicalPipelineHref("diagnosis", "juan-perez")).toBe(
      "/app/patients/juan-perez/odontogram?section=diagnosis",
    );
    expect(clinicalPipelineHref("consents", "juan-perez")).toBe(
      "/app/documents?patientId=juan-perez&workflow=consents",
    );
    expect(clinicalPipelineHref("signature", "juan-perez")).toBe(
      "/app/finance?patientId=juan-perez&view=budgets&action=sign",
    );
    expect(clinicalPipelineHref("appointments", "juan-perez")).toBe(
      "/app/agenda?patientId=juan-perez",
    );
  });
});
