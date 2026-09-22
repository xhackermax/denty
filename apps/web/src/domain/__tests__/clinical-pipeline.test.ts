import { describe, expect, it } from "vitest";
import { clinicalPipelineState } from "../clinical-pipeline";

describe("clinical pipeline recovered from 2.3.6", () => {
  it("marca el plan como obsoleto al cambiar el odontograma", () => {
    expect(
      clinicalPipelineState({
        odontogramVersion: 2,
        plan: { version: 1, sourceOdontogramVersion: 1 },
      }),
    ).toMatchObject({ planOutdated: true, nextAction: "SYNC_PLAN" });
  });

  it("pasa a presupuesto cuando el plan ya está sincronizado", () => {
    expect(
      clinicalPipelineState({
        odontogramVersion: 2,
        plan: { version: 3, sourceOdontogramVersion: 2 },
      }),
    ).toMatchObject({ planOutdated: false, budgetOutdated: true, nextAction: "SYNC_BUDGET" });
  });

  it("queda READY cuando las tres versiones están alineadas", () => {
    expect(
      clinicalPipelineState({
        odontogramVersion: 2,
        plan: { version: 3, sourceOdontogramVersion: 2 },
        budget: { id: "b1", status: "DRAFT", sourcePlanVersion: 3 },
      }),
    ).toEqual({
      planOutdated: false,
      budgetOutdated: false,
      budgetRevisionRequired: false,
      nextAction: "READY",
    });
  });

  it("no pisa un presupuesto presentado: exige revisión", () => {
    expect(
      clinicalPipelineState({
        odontogramVersion: 2,
        plan: { version: 4, sourceOdontogramVersion: 2 },
        budget: { id: "b1", status: "PRESENTED", sourcePlanVersion: 3 },
      }).budgetRevisionRequired,
    ).toBe(true);
  });
});
