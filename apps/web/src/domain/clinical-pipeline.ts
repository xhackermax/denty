export type ClinicalPipelineNextAction = "SYNC_PLAN" | "SYNC_BUDGET" | "READY";
export type BudgetLifecycleStatus = "DRAFT" | "PRESENTED" | "ACCEPTED" | "REJECTED";

export interface ClinicalPlanVersion {
  version: number;
  sourceOdontogramVersion: number;
}

export interface ClinicalBudgetVersion {
  id: string;
  status: BudgetLifecycleStatus;
  sourcePlanVersion: number;
}

export interface ClinicalPipelineInput {
  odontogramVersion: number;
  plan?: ClinicalPlanVersion | null;
  budget?: ClinicalBudgetVersion | null;
}

export interface ClinicalPipelineState {
  planOutdated: boolean;
  budgetOutdated: boolean;
  budgetRevisionRequired: boolean;
  nextAction: ClinicalPipelineNextAction;
}

export function clinicalPipelineState(input: ClinicalPipelineInput): ClinicalPipelineState {
  const planOutdated =
    !input.plan || input.plan.sourceOdontogramVersion !== input.odontogramVersion;
  const budgetOutdated =
    planOutdated || !input.budget || input.budget.sourcePlanVersion !== input.plan?.version;
  const budgetRevisionRequired =
    Boolean(input.budget) &&
    budgetOutdated &&
    ["PRESENTED", "ACCEPTED"].includes(input.budget?.status ?? "DRAFT");

  return {
    planOutdated,
    budgetOutdated,
    budgetRevisionRequired,
    nextAction: planOutdated ? "SYNC_PLAN" : budgetOutdated ? "SYNC_BUDGET" : "READY",
  };
}
