import { describe, expect, it } from "vitest";
import {
  budgetOptionSummary,
  comparableBudgets,
  compareBudgetTreatments,
  estimateBudgetAppointments,
} from "./budget-comparison";
import type { BudgetView } from "./budget-options";
const item = (id: string, plan: string | null, description: string) => ({
  id,
  clinicalPlanItemId: plan,
  description,
  totalCents: 1000,
});
const b = (
  id: string,
  items: BudgetView["items"],
  scope = "custom",
  status = "DRAFT",
): BudgetView => ({
  id,
  code: id,
  status,
  scope,
  totalCents: 1000,
  items,
});

describe("several treatment plans with common and exclusive clinical steps", () => {
  const periodontitis = item("p1", "periodontal-plan-id", "Tratamiento periodontal");
  const implant = item("a1", null, "Implante + corona");
  const removable = item("b1", null, "Prótesis removible");
  it("counts shared treatment only once even when branch snapshots use other budget IDs", () => {
    const options = [
      b("implants", [periodontitis, implant]),
      b("removable", [{ ...periodontitis, id: "p2" }, removable]),
    ];
    const result = compareBudgetTreatments(options);
    expect(result.shared).toHaveLength(1);
    expect(result.shared[0]?.description).toBe("Tratamiento periodontal");
    expect(result.uniqueByBudget.implants?.map((x) => x.description)).toEqual([
      "Implante + corona",
    ]);
    expect(result.uniqueByBudget.removable?.map((x) => x.description)).toEqual([
      "Prótesis removible",
    ]);
  });
  it("does not treat complementary phase budgets as alternatives", () => {
    expect(
      comparableBudgets([b("phase", [periodontitis], "primary"), b("a", [implant])]),
    ).toHaveLength(1);
  });
  it("includes signed historical comparisons but excludes empty proposals", () => {
    expect(
      comparableBudgets([b("signed", [implant], "custom", "SIGNED"), b("empty", [])]),
    ).toHaveLength(1);
  });
  it("never calls two different steps shared just because they have the same price", () => {
    const result = compareBudgetTreatments([b("a", [implant]), b("b", [removable])]);
    expect(result.shared).toHaveLength(0);
  });

  it("sums the approximate appointment range for each clinical stage", () => {
    const estimate = estimateBudgetAppointments(b("plan", [periodontitis, implant]));

    expect(estimate.stages).toEqual([
      { phase: "primary", minAppointments: 2, maxAppointments: 4 },
      { phase: "secondary", minAppointments: 3, maxAppointments: 5 },
    ]);
    expect(estimate.total).toEqual({ minAppointments: 5, maxAppointments: 9 });
  });

  it("gives a plain-language summary to a removable alternative", () => {
    expect(budgetOptionSummary(b("removable", [periodontitis, removable]))).toEqual({
      approach: "Opción esencial",
      format: "Removible",
    });
  });

  it("distinguishes a fixed implant alternative without relying on its custom title", () => {
    expect(budgetOptionSummary(b("implants", [periodontitis, implant]))).toEqual({
      approach: "Opción definitiva",
      format: "Fija",
    });
  });
});
