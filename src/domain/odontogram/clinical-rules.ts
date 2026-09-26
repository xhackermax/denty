import type { DentalEntity } from "./index";

export type ClinicalRuleOutcome = "ALLOW" | "WARN" | "BLOCK" | "REQUIRE_CONTEXT";
export interface ClinicalRuleEvaluation {
  outcome: ClinicalRuleOutcome;
  ruleIds: readonly string[];
  messages: readonly string[];
  missingContext?: readonly string[];
}

const actualImplantFields = ["system", "diameterMm", "lengthMm", "placementDate", "insertionTorqueNcm", "primaryIsq"] as const;
const naturalTreatmentTypes = new Set<DentalEntity["entityType"]>(["RESTORATION", "ENDO", "CROWN", "PEDIATRIC"]);
const result = (outcome: ClinicalRuleOutcome, ruleId?: string, message?: string, missingContext?: readonly string[]): ClinicalRuleEvaluation => ({ outcome, ruleIds: ruleId ? [ruleId] : [], messages: message ? [message] : [], ...(missingContext?.length ? { missingContext } : {}) });

export function evaluateClinicalAction(proposed: DentalEntity, entities: readonly DentalEntity[]): ClinicalRuleEvaluation {
  const sameTooth = entities.filter((entity) => entity.active && entity.tooth === proposed.tooth && entity.id !== proposed.id);
  const missing = sameTooth.some((entity) => entity.entityType === "MISSING" || entity.status === "missing");
  if (missing && naturalTreatmentTypes.has(proposed.entityType)) return result("BLOCK", "R001", "Un diente ausente no admite tratamiento natural.");

  const naturalExists = sameTooth.some((entity) => entity.entityType === "TOOTH_STATE" && entity.status !== "missing") || sameTooth.some((entity) => entity.entityType === "HEALTHY");
  if (proposed.entityType === "IMPLANT" && naturalExists) return result("BLOCK", "R002", "Implante y diente natural no pueden coexistir.");

  if (proposed.entityType === "SINUS_LIFT" && (!proposed.tooth || !/^[12][45678]$/.test(proposed.tooth))) return result("BLOCK", "R021", "La elevación de seno solo se registra en sector posterosuperior.");

  const attributes = proposed.attributes ?? {};
  if (proposed.entityType === "IMPLANT" && attributes.lifecycle === "REALIZADO") {
    const missingFields = actualImplantFields.filter((field) => attributes[field] === undefined || attributes[field] === "");
    if (missingFields.length) return result("REQUIRE_CONTEXT", "IMPLANT_ACTUAL_DATA", "Completa los datos reales del implante colocado.", missingFields);
  }
  return result("ALLOW");
}
