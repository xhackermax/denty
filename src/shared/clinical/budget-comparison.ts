import type { ComparisonBudget } from "@/domain/plan";
import { treatmentPhase, type TreatmentPhase } from "@/domain/plan/treatment-phase";
import { treatmentFamily, type TreatmentFamily } from "@/domain/plan/treatment-plan-document";

import type { BudgetView } from "./budget-options";

interface AppointmentRange {
  minAppointments: number;
  maxAppointments: number;
}

export interface BudgetAppointmentEstimate {
  stages: Array<AppointmentRange & { phase: TreatmentPhase }>;
  total: AppointmentRange;
}

const APPOINTMENT_RANGES: Record<TreatmentFamily, AppointmentRange> = {
  extraction: { minAppointments: 1, maxAppointments: 2 },
  root_canal: { minAppointments: 1, maxAppointments: 2 },
  periodontal: { minAppointments: 2, maxAppointments: 4 },
  filling: { minAppointments: 1, maxAppointments: 1 },
  hygiene: { minAppointments: 1, maxAppointments: 1 },
  splint: { minAppointments: 2, maxAppointments: 2 },
  orthodontics: { minAppointments: 8, maxAppointments: 24 },
  bone_graft: { minAppointments: 2, maxAppointments: 3 },
  implant: { minAppointments: 3, maxAppointments: 5 },
  whitening: { minAppointments: 1, maxAppointments: 3 },
  post: { minAppointments: 1, maxAppointments: 1 },
  crown: { minAppointments: 2, maxAppointments: 3 },
  veneer: { minAppointments: 2, maxAppointments: 3 },
  bridge: { minAppointments: 2, maxAppointments: 3 },
  removable: { minAppointments: 4, maxAppointments: 5 },
  other: { minAppointments: 1, maxAppointments: 1 },
};

/**
 * Orientative clinical visits per budget line. It does not schedule appointments or include
 * maintenance reviews; the clinician confirms the final sequence for the patient.
 */
export function estimateBudgetAppointments(budget: BudgetView): BudgetAppointmentEstimate {
  const totals: Record<TreatmentPhase, AppointmentRange> = {
    primary: { minAppointments: 0, maxAppointments: 0 },
    secondary: { minAppointments: 0, maxAppointments: 0 },
  };

  for (const item of budget.items) {
    const phase = treatmentPhase({ treatmentCode: item.description, label: item.description });
    const range =
      APPOINTMENT_RANGES[
        treatmentFamily({ treatmentCode: item.description, label: item.description })
      ];
    totals[phase].minAppointments += range.minAppointments;
    totals[phase].maxAppointments += range.maxAppointments;
  }

  const stages = (["primary", "secondary"] as const)
    .map((phase) => ({ phase, ...totals[phase] }))
    .filter((stage) => stage.maxAppointments > 0);
  return {
    stages,
    total: stages.reduce(
      (total, stage) => ({
        minAppointments: total.minAppointments + stage.minAppointments,
        maxAppointments: total.maxAppointments + stage.maxAppointments,
      }),
      { minAppointments: 0, maxAppointments: 0 },
    ),
  };
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
