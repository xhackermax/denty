import { describe, expect, it } from "vitest";

import { evaluateClinicalAction, type DentalEntity } from "../index";

const entity = (overrides: Partial<DentalEntity>): DentalEntity => ({
  id: crypto.randomUUID(), entityType: "TOOTH_STATE", status: "healthy", active: true, ...overrides,
});

describe("clinical rule engine", () => {
  it("blocks a natural treatment on an absent tooth (R001)", () => {
    const result = evaluateClinicalAction(entity({ tooth: "16", entityType: "RESTORATION", status: "filling" }), [entity({ tooth: "16", entityType: "MISSING", status: "missing" })]);
    expect(result.outcome).toBe("BLOCK");
    expect(result.ruleIds).toContain("R001");
  });

  it("blocks an implant alongside a natural tooth state (R002)", () => {
    const result = evaluateClinicalAction(entity({ tooth: "16", entityType: "IMPLANT", status: "implant_pending" }), [entity({ tooth: "16", entityType: "TOOTH_STATE", status: "healthy" })]);
    expect(result.outcome).toBe("BLOCK");
    expect(result.ruleIds).toContain("R002");
  });

  it("requires the actual fixture data only when an implant becomes realized", () => {
    const planned = evaluateClinicalAction(entity({ tooth: "16", entityType: "IMPLANT", status: "implant_pending", attributes: { lifecycle: "PLANIFICADO" } }), []);
    const realized = evaluateClinicalAction(entity({ tooth: "16", entityType: "IMPLANT", status: "implant", attributes: { lifecycle: "REALIZADO" } }), []);
    expect(planned.outcome).toBe("ALLOW");
    expect(realized).toMatchObject({ outcome: "REQUIRE_CONTEXT", ruleIds: ["IMPLANT_ACTUAL_DATA"] });
  });

  it("restricts sinus lift to upper posterior sites (R021)", () => {
    const result = evaluateClinicalAction(entity({ tooth: "36", entityType: "SINUS_LIFT", status: "sinus_lift" }), []);
    expect(result.outcome).toBe("BLOCK");
    expect(result.ruleIds).toContain("R021");
  });
});
