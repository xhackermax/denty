import {
  clinicalPipelineState,
  type ClinicalBudgetVersion,
  type ClinicalPlanVersion,
} from "./clinical-pipeline";

export type ClinicalPipelineStepKey =
  | "odontogram"
  | "diagnosis"
  | "plan"
  | "consents"
  | "budget"
  | "signature"
  | "appointments";

export interface ClinicalPipelineProgressInput {
  patientId?: string;
  odontogramVersion: number;
  diagnosisCount: number;
  activePlanItemCount: number;
  plan?: ClinicalPlanVersion | null;
  requiredConsentCount: number;
  signedRequiredConsentCount: number;
  budget?: ClinicalBudgetVersion | null;
  budgetSigned?: boolean;
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
  "consents",
  "budget",
  "signature",
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

  const consentsComplete =
    completed.has("plan") &&
    input.signedRequiredConsentCount >= input.requiredConsentCount;
  if (consentsComplete) completed.add("consents");

  if (input.budget && !state.budgetOutdated && consentsComplete) completed.add("budget");
  if (input.budgetSigned && completed.has("budget")) completed.add("signature");
  if (input.futureAppointmentCount > 0 && completed.has("signature")) completed.add("appointments");

  const current = STEP_ORDER.find((step) => !completed.has(step)) ?? "appointments";
  return { current, completed };
}

export function canNavigateToClinicalPipelineStep(
  progress: ClinicalPipelineProgress,
  step: ClinicalPipelineStepKey,
): boolean {
  if (progress.completed.has(step) || progress.current === step) return true;
  const currentIndex = STEP_ORDER.indexOf(progress.current);
  const targetIndex = STEP_ORDER.indexOf(step);
  return targetIndex <= currentIndex;
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
    case "consents":
      return `/app/documents?patientId=${encoded}&workflow=consents`;
    case "budget":
      return `/app/finance?patientId=${encoded}&view=budgets`;
    case "signature":
      return `/app/finance?patientId=${encoded}&view=budgets&action=sign`;
    case "appointments":
      return `/app/agenda?patientId=${encoded}`;
  }
}
