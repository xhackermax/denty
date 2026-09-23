import {
  clinicalPipelineState,
  type ClinicalBudgetVersion,
  type ClinicalPlanVersion,
} from "./clinical-pipeline";

export type ClinicalPipelineStepKey =
  "odontogram" | "diagnosis" | "plan" | "budget" | "appointments";

export interface ClinicalPipelineProgressInput {
  patientId?: string;
  odontogramVersion: number;
  diagnosisCount: number;
  activePlanItemCount: number;
  plan?: ClinicalPlanVersion | null;
  budget?: ClinicalBudgetVersion | null;
  futureAppointmentCount: number;
}

export interface ClinicalPipelineProgress {
  current: ClinicalPipelineStepKey;
  completed: ReadonlySet<ClinicalPipelineStepKey>;
}

const STEP_ORDER: readonly ClinicalPipelineStepKey[] = [
  "odontogram",
  "diagnosis",
  "plan",
  "budget",
  "appointments",
];

export function clinicalPipelineProgress(
  input: ClinicalPipelineProgressInput,
): ClinicalPipelineProgress {
  const state = clinicalPipelineState({
    odontogramVersion: input.odontogramVersion,
    ...(input.plan === undefined ? {} : { plan: input.plan }),
    ...(input.budget === undefined ? {} : { budget: input.budget }),
  });
  const completed = new Set<ClinicalPipelineStepKey>();
  if (input.odontogramVersion > 0) completed.add("odontogram");
  if (input.diagnosisCount > 0) completed.add("diagnosis");
  if (input.activePlanItemCount > 0 && !state.planOutdated) completed.add("plan");
  if (input.budget && !state.budgetOutdated) completed.add("budget");
  if (input.futureAppointmentCount > 0 && completed.has("budget")) completed.add("appointments");

  const current = STEP_ORDER.find((step) => !completed.has(step)) ?? "appointments";
  return { current, completed };
}

export function clinicalPipelineHref(step: ClinicalPipelineStepKey, patientId?: string): string {
  if (!patientId) return "/app/patients";
  const encoded = encodeURIComponent(patientId);
  switch (step) {
    case "odontogram":
      return `/app/patients/${encoded}/odontogram?section=odontogram`;
    case "diagnosis":
      return `/app/patients/${encoded}/odontogram?section=diagnosis`;
    case "plan":
      return `/app/patients/${encoded}/odontogram?section=plan`;
    case "budget":
      return `/app/finance?patientId=${encoded}&view=budgets`;
    case "appointments":
      return `/app/agenda?patientId=${encoded}`;
  }
}
