import {
  appointmentRange,
  sumAppointmentRanges,
  type AppointmentRange,
  type ComparisonBudget,
} from "@/domain/plan";
import { treatmentPhase, type TreatmentPhase } from "@/domain/plan/treatment-phase";
import { treatmentFamily, type TreatmentFamily } from "@/domain/plan/treatment-plan-document";

import type { BudgetView } from "./budget-options";

export interface BudgetAppointmentEstimate {
  stages: Array<AppointmentRange & { phase: TreatmentPhase }>;
  total: AppointmentRange;
}

export interface BudgetOptionSummary {
  approach:
    "Opción esencial" | "Opción definitiva" | "Conservación dental" | "Tratamiento por etapas";
  format: "Removible" | "Fija" | "Conservadora" | "Mixta";
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

/**
 * A patient-facing shorthand for a complete alternative. It is deliberately
 * derived from the procedures, so a custom budget title cannot make a
 * removable or implant-led plan look like something it is not.
 */
export function budgetOptionSummary(budget: BudgetView): BudgetOptionSummary {
  const families = new Set(
    budget.items.map((item) =>
      treatmentFamily({ treatmentCode: item.description, label: item.description }),
    ),
  );
  const hasRemovable = families.has("removable");
  const hasFixed = ["implant", "crown", "bridge", "veneer"].some((family) =>
    families.has(family as TreatmentFamily),
  );
  const hasPrimary = budget.items.some(
    (item) =>
      treatmentPhase({ treatmentCode: item.description, label: item.description }) === "primary",
  );
  const hasSecondary = budget.items.some(
    (item) =>
      treatmentPhase({ treatmentCode: item.description, label: item.description }) === "secondary",
  );

  const format =
    hasRemovable && hasFixed
      ? "Mixta"
      : hasRemovable
        ? "Removible"
        : hasFixed
          ? "Fija"
          : "Conservadora";
  const approach = hasRemovable
    ? "Opción esencial"
    : hasFixed
      ? "Opción definitiva"
      : hasPrimary && hasSecondary
        ? "Tratamiento por etapas"
        : "Conservación dental";
  return { approach, format };
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
