import type { DentalEntity } from "../index.ts";

import { evaluateRulesR001R018 } from "./rules-r001-r018.ts";
import { evaluateRulesR019R035 } from "./rules-r019-r035.ts";
import type {
  ClinicalAction,
  ClinicalRuleContext,
  ClinicalRuleDecision,
  ClinicalRuleEvaluation,
  ClinicalRuleSeverity,
} from "./types.ts";

const actualImplantFields = [
  "system",
  "diameterMm",
  "lengthMm",
  "placementDate",
  "insertionTorqueNcm",
  "primaryIsq",
] as const;

function proposedEntity(action: ClinicalAction | DentalEntity): DentalEntity {
  if ("type" in action) return action.entity;
  return action;
}

function outcomeFor(decisions: readonly ClinicalRuleDecision[]): ClinicalRuleSeverity {
  if (decisions.some((item) => item.severity === "BLOCK")) return "BLOCK";
  if (decisions.some((item) => item.severity === "REQUIRE_CONTEXT")) return "REQUIRE_CONTEXT";
  if (decisions.some((item) => item.severity === "WARN")) return "WARN";
  return "ALLOW";
}

export function evaluationFromDecisions(
  decisions: readonly ClinicalRuleDecision[],
  context: ClinicalRuleContext = {},
): ClinicalRuleEvaluation {
  const confirmed = new Set(context.confirmedWarnings ?? []);
  const active = decisions.filter(
    (item) => item.severity !== "WARN" || !confirmed.has(item.ruleId),
  );
  const missingContext = active.flatMap((item) => item.missingContext ?? []);
  return {
    outcome: outcomeFor(active),
    ruleIds: active.map((item) => item.ruleId),
    messages: active.map((item) => item.message),
    decisions: active,
    ...(missingContext.length ? { missingContext: [...new Set(missingContext)] } : {}),
  };
}

export function evaluateClinicalAction(
  action: ClinicalAction | DentalEntity,
  entities: readonly DentalEntity[],
  context: ClinicalRuleContext = {},
): ClinicalRuleEvaluation {
  const proposed = proposedEntity(action);
  const decisions = [
    ...evaluateRulesR001R018(proposed, entities),
    ...evaluateRulesR019R035(proposed, entities, context),
  ];
  decisions.push(...actualImplantDataDecisions(proposed));
  return evaluationFromDecisions(decisions, context);
}

// A placed implant needs its real data whether it arrives alone or inside a batch.
function actualImplantDataDecisions(proposed: DentalEntity): ClinicalRuleDecision[] {
  if (proposed.entityType !== "IMPLANT" || proposed.attributes?.lifecycle !== "REALIZADO") {
    return [];
  }
  const missingContext = actualImplantFields.filter((field) => {
    const value = proposed.attributes?.[field];
    return value === undefined || value === null || value === "";
  });
  return missingContext.length
    ? [
        {
          ruleId: "IMPLANT_ACTUAL_DATA",
          severity: "REQUIRE_CONTEXT",
          message: "Completa los datos reales del implante colocado.",
          missingContext,
        },
      ]
    : [];
}

export function evaluateClinicalBatch(
  actions: readonly ClinicalAction[],
  entities: readonly DentalEntity[],
  context: ClinicalRuleContext = {},
): ClinicalRuleEvaluation {
  const proposed = actions.map((action) => action.entity);
  const proposedIds = new Set(proposed.map((entity) => entity.id));
  const aggregate = [...entities.filter((entity) => !proposedIds.has(entity.id)), ...proposed];
  const decisions = actions.flatMap((action) => {
    const peers = aggregate.filter((entity) => entity.id !== action.entity.id);
    return [
      ...evaluateRulesR001R018(action.entity, peers),
      ...evaluateRulesR019R035(action.entity, peers, context),
      ...actualImplantDataDecisions(action.entity),
    ];
  });
  const unique = [
    ...new Map(decisions.map((item) => [`${item.ruleId}:${item.message}`, item])).values(),
  ];
  return evaluationFromDecisions(unique, context);
}
