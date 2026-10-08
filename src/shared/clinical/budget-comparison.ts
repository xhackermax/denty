import type { BudgetView } from "./budget-options";

/** Only complete proposals, not complementary phase-1/phase-2 invoices, compete. */
export function comparableBudgets(budgets: readonly BudgetView[]): BudgetView[] {
  return budgets.filter((budget) =>
    ["DRAFT", "SIGNED"].includes(budget.status) &&
    budget.scope !== "primary" && budget.scope !== "secondary" &&
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
    uniqueByBudget: Object.fromEntries(budgets.map((budget) => [
      budget.id,
      budget.items.filter((item) => !sharedKeys.has(comparisonItemKey(item))),
    ])),
  };
}
