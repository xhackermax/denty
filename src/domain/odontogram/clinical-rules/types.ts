import type { DentalEntity } from "../index.ts";

export type ClinicalLifecycleState =
  "HALLAZGO_EXISTENTE" | "PLANIFICADO" | "REALIZADO" | "REALIZADO_OTRA_CLINICA";

export type ClinicalRuleSeverity = "ALLOW" | "WARN" | "BLOCK" | "REQUIRE_CONTEXT";

export interface ClinicalAction {
  readonly type: "UPSERT_ENTITY";
  readonly entity: DentalEntity;
}

export interface ClinicalRuleContext {
  readonly confirmedWarnings?: readonly string[];
  readonly manufacturerCatalog?: Readonly<Record<string, readonly string[]>>;
}

export interface ClinicalRuleDecision {
  readonly ruleId: string;
  readonly severity: Exclude<ClinicalRuleSeverity, "ALLOW">;
  readonly message: string;
  readonly missingContext?: readonly string[];
}

export interface ClinicalRuleEvaluation {
  readonly outcome: ClinicalRuleSeverity;
  readonly ruleIds: readonly string[];
  readonly messages: readonly string[];
  readonly missingContext?: readonly string[];
  readonly decisions?: readonly ClinicalRuleDecision[];
}
