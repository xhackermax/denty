import { describe, expect, it } from "vitest";

import { clinicalLifecycleState, type DentalEntity } from "../odontogram";
import type {
  ClinicalAction,
  ClinicalRuleContext,
  ClinicalRuleDecision,
  ClinicalRuleEvaluation,
  ClinicalRuleSeverity,
} from "../odontogram/clinical-rules";

const entity = (status: string, lifecycle?: string): DentalEntity => ({
  id: `entity-${status}`,
  tooth: "16",
  entityType: "IMPLANT",
  status,
  active: true,
  ...(lifecycle ? { attributes: { lifecycle } } : {}),
});

describe("odontogram clinical lifecycle", () => {
  it.each([
    ["implant_pending", "PLANIFICADO"],
    ["crown_pending", "PLANIFICADO"],
    ["implant", "REALIZADO"],
    ["healthy", "HALLAZGO_EXISTENTE"],
  ] as const)("normalizes legacy status %s", (status, expected) => {
    expect(clinicalLifecycleState(entity(status))).toBe(expected);
  });

  it("prefers an explicit normalized lifecycle attribute", () => {
    expect(clinicalLifecycleState(entity("legacy-custom", "REALIZADO_OTRA_CLINICA"))).toBe(
      "REALIZADO_OTRA_CLINICA",
    );
  });

  it("keeps unknown legacy statuses readable without inventing a lifecycle", () => {
    expect(clinicalLifecycleState(entity("legacy-custom"))).toBeNull();
  });

  it("exposes the typed rule contracts without adding mandatory entity fields", () => {
    const action: ClinicalAction = { type: "UPSERT_ENTITY", entity: entity("implant_pending") };
    const context: ClinicalRuleContext = { confirmedWarnings: [] };
    const severity: ClinicalRuleSeverity = "BLOCK";
    const decision: ClinicalRuleDecision = { ruleId: "R001", severity, message: "blocked" };
    const evaluation: ClinicalRuleEvaluation = {
      outcome: "BLOCK",
      ruleIds: [decision.ruleId],
      messages: [decision.message],
      decisions: [decision],
    };

    expect(action.entity.attributes).toBeUndefined();
    expect(context.confirmedWarnings).toEqual([]);
    expect(evaluation.decisions).toEqual([decision]);
  });
});
