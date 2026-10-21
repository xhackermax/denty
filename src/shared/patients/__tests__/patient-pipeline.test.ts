import { describe, expect, it } from "vitest";

import {
  PATIENT_PIPELINE_STEPS,
  adjacentPipelineSteps,
  patientPipelineHref,
} from "../patient-pipeline";

describe("patient pipeline", () => {
  it("orders the clinical steps from odontogram to appointments", () => {
    expect(PATIENT_PIPELINE_STEPS.map((step) => step.key)).toEqual([
      "odontogram",
      "plan",
      "budget",
      "documents",
      "appointments",
    ]);
  });

  it("builds the route of every step for a patient", () => {
    expect(patientPipelineHref("odontogram", "p1")).toBe("/app/patients/p1/odontogram");
    expect(patientPipelineHref("plan", "p1")).toBe("/app/patients/p1?view=plan");
    expect(patientPipelineHref("budget", "p1")).toBe("/app/patients/p1?view=budgets");
    expect(patientPipelineHref("documents", "p1")).toBe("/app/documents?patientId=p1");
    expect(patientPipelineHref("appointments", "p1")).toBe("/app/agenda?patientId=p1");
  });

  it("encodes patient ids so they cannot break the route", () => {
    expect(patientPipelineHref("documents", "a b&c")).toBe("/app/documents?patientId=a%20b%26c");
  });

  it("returns previous and next steps in the middle of the pipeline", () => {
    const { previous, next } = adjacentPipelineSteps("plan");
    expect(previous?.key).toBe("odontogram");
    expect(next?.key).toBe("budget");
  });

  it("has no previous step at the start nor next step at the end", () => {
    expect(adjacentPipelineSteps("odontogram").previous).toBeUndefined();
    expect(adjacentPipelineSteps("appointments").next).toBeUndefined();
  });
});
