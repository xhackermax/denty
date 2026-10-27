import {
  appointmentRange,
  sumAppointmentRanges,
  type AppointmentRange,
  type ComparisonBudget,
} from "@/domain/plan";
import { treatmentPhase, type TreatmentPhase } from "@/domain/plan/treatment-phase";

import type { BudgetView } from "./budget-options";

export interface BudgetAppointmentEstimate {
  stages: Array<AppointmentRange & { phase: TreatmentPhase }>;
  total: AppointmentRange;
}

/**
 * Orientative clinical visits per budget line. It does not schedule appointments or include
 * maintenance reviews; the clinician confirms the final sequence for the patient.
 */
export function estimateBudgetAppointments(budget: BudgetView): BudgetAppointmentEstimate {
  const byPhase: Record<TreatmentPhase, AppointmentRange[]> = { primary: [], secondary: [] };
  for (const item of budget.items) {
    const line = { treatmentCode: item.description, label: item.description };
    byPhase[treatmentPhase(line)].push(appointmentRange(line));
  }

  const stages = (["primary", "secondary"] as const)
    .map((phase) => ({ phase, ...sumAppointmentRanges(byPhase[phase]) }))
    .filter((stage) => stage.maxAppointments > 0);
  return { stages, total: sumAppointmentRanges(stages) };
}

/** Only complete proposals, not complementary phase-1/phase-2 invoices, compete. */
export function comparableBudgets(budgets: readonly BudgetView[]): BudgetView[] {
  return budgets.filter(
    (budget) =>
      ["DRAFT", "SIGNED"].includes(budget.status) &&
      budget.scope !== "primary" &&
      budget.scope !== "secondary" &&
      budget.items.length > 0,
  );
}

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase("es-ES").replace(/\s+/g, " ");
}

export function comparisonItemKey(item: BudgetView["items"][number]): string {
  if (item.clinicalPlanItemId) return `plan:${item.clinicalPlanItemId}`;
  return `procedure:${normalized(item.tooth ?? "")}:${normalized(item.description)}`;
}

export function compareBudgetTreatments(budgets: readonly BudgetView[]) {
  const frequency = new Map<string, number>();
  for (const budget of budgets) {
    for (const key of new Set(budget.items.map(comparisonItemKey)))
      frequency.set(key, (frequency.get(key) ?? 0) + 1);
  }
  const sharedKeys = new Set(
    [...frequency.entries()]
      .filter(([, count]) => budgets.length > 1 && count === budgets.length)
      .map(([key]) => key),
  );
  return {
    sharedKeys,
    shared: budgets[0]?.items.filter((item) => sharedKeys.has(comparisonItemKey(item))) ?? [],
    uniqueByBudget: Object.fromEntries(
      budgets.map((budget) => [
        budget.id,
        budget.items.filter((item) => !sharedKeys.has(comparisonItemKey(item))),
      ]),
    ),
  };
}

/** The budget as the clinical comparison sees it: its lines and the branch pros and cons. */
export function comparisonBudget(budget: BudgetView): ComparisonBudget {
  return {
    id: budget.id,
    code: budget.code,
    title: budget.title ?? null,
    totalCents: budget.totalCents,
    advantages: budget.branch?.advantages ?? null,
    disadvantages: budget.branch?.disadvantages ?? null,
    items: budget.items.map((item) => ({
      key: comparisonItemKey(item),
      description: item.description,
      tooth: item.tooth ?? null,
      totalCents: item.totalCents,
    })),
  };
}
