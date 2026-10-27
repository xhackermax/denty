import { describe, expect, it } from "vitest";

import { computeBudgetTotals, formatPercent } from "../budget-discounts";

describe("computeBudgetTotals", () => {
  it("keeps the subtotal when there is no discount or offer", () => {
    expect(computeBudgetTotals({ subtotalCents: 120_000 })).toEqual({
      subtotalCents: 120_000,
      discountCents: 0,
      earlyPaymentCents: 0,
      totalCents: 120_000,
      earlyPaymentTotalCents: null,
    });
  });

  it("applies a percentage discount and then the chosen early payment", () => {
    expect(
      computeBudgetTotals({
        subtotalCents: 100_000,
        discountPercent: 10,
        earlyPaymentPercent: 5,
        earlyPaymentApplied: true,
      }),
    ).toEqual({
      subtotalCents: 100_000,
      discountCents: 10_000,
      earlyPaymentCents: 4_500,
      totalCents: 85_500,
      earlyPaymentTotalCents: 85_500,
    });
  });

  it("offers early payment without applying it until the patient chooses it", () => {
    const totals = computeBudgetTotals({ subtotalCents: 50_000, earlyPaymentPercent: 3 });
    expect(totals.totalCents).toBe(50_000);
    expect(totals.earlyPaymentCents).toBe(0);
    expect(totals.earlyPaymentTotalCents).toBe(48_500);
  });

  it("adds a fixed amount to the percentage and never goes below zero", () => {
    expect(
      computeBudgetTotals({
        subtotalCents: 10_000,
        discountPercent: 50,
        discountAmountCents: 2_500,
      }).totalCents,
    ).toBe(2_500);
    expect(
      computeBudgetTotals({ subtotalCents: 10_000, discountAmountCents: 99_999 }).totalCents,
    ).toBe(0);
  });

  it("rounds half cents like Postgres round()", () => {
    // 3 % of 12 345 = 370.35 → 370; 1 % of 50 = 0.5 → 1 (half away from zero)
    expect(computeBudgetTotals({ subtotalCents: 12_345, discountPercent: 3 }).discountCents).toBe(
      370,
    );
    expect(computeBudgetTotals({ subtotalCents: 50, discountPercent: 1 }).discountCents).toBe(1);
  });

  it("clamps out-of-range percentages", () => {
    expect(computeBudgetTotals({ subtotalCents: 1_000, discountPercent: 150 }).totalCents).toBe(0);
    expect(computeBudgetTotals({ subtotalCents: 1_000, discountPercent: -5 }).totalCents).toBe(
      1_000,
    );
  });
});

describe("formatPercent", () => {
  it("uses Spanish decimals", () => {
    expect(formatPercent(5)).toBe("5 %");
    expect(formatPercent(2.5)).toBe("2,5 %");
  });
});
