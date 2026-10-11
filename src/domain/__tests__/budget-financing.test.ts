import { describe, expect, it } from "vitest";

import { simulateBudgetFinancing } from "../budget-financing";

const base = {
  budgetTotalCents: 120_000,
  downPaymentCents: 0,
  months: 12,
  annualNominalRatePercent: 0,
  openingFeeCents: 0,
  monthlyFeeCents: 0,
} as const;

describe("indicative financing of a dental budget", () => {
  it("calculates 12 equal interest-free installments without inventing fees", () => {
    const result = simulateBudgetFinancing(base);
    expect(result.financedCents).toBe(120_000);
    expect(result.standardMonthlyCents).toBe(10_000);
    expect(result.lastMonthlyCents).toBe(10_000);
    expect(result.interestCents).toBe(0);
    expect(result.approximateAprPercent).toBeCloseTo(0, 5);
    expect(result.totalCreditPaymentsCents).toBe(120_000);
  });

  it("deducts the initial payment and never counts it as credit interest", () => {
    const result = simulateBudgetFinancing({
      ...base, downPaymentCents: 20_000,
    });
    expect(result.financedCents).toBe(100_000);
    expect(result.creditCostCents).toBe(0);
    expect(result.totalWithDownPaymentCents).toBe(120_000);
    expect(result.standardMonthlyCents).toBe(8_333);
    expect(result.lastMonthlyCents).toBe(8_337);
  });

  it("balances rounding exactly in the last installment", () => {
    const result = simulateBudgetFinancing({
      ...base, budgetTotalCents: 100_001, months: 6,
    });
    expect(result.standardMonthlyCents).toBe(16_667);
    expect(result.lastMonthlyCents).toBe(16_666);
    expect(result.totalCreditPaymentsCents).toBe(100_001);
  });

  it("accounts for interest, upfront fees and recurring fees in the estimated APR", () => {
    const plain = simulateBudgetFinancing({ ...base, annualNominalRatePercent: 12 });
    const withFees = simulateBudgetFinancing({
      ...base,
      annualNominalRatePercent: 12,
      openingFeeCents: 2_400,
      monthlyFeeCents: 300,
    });
    expect(plain.interestCents).toBeGreaterThan(0);
    expect(plain.approximateAprPercent).toBeGreaterThan(12);
    expect(withFees.feesCents).toBe(6_000);
    expect(withFees.creditCostCents).toBe(withFees.interestCents + 6_000);
    expect(withFees.approximateAprPercent).toBeGreaterThan(plain.approximateAprPercent);
    expect(withFees.totalWithDownPaymentCents).toBe(
      base.budgetTotalCents + withFees.creditCostCents,
    );
  });

  it("rejects negative charges, impossible entries, unsupported rates and terms", () => {
    expect(() => simulateBudgetFinancing({ ...base, downPaymentCents: 120_000 })).toThrow();
    expect(() => simulateBudgetFinancing({ ...base, downPaymentCents: -1 })).toThrow();
    expect(() => simulateBudgetFinancing({ ...base, months: 0 })).toThrow();
    expect(() => simulateBudgetFinancing({ ...base, months: 121 })).toThrow();
    expect(() => simulateBudgetFinancing({
      ...base, annualNominalRatePercent: Number.NaN,
    })).toThrow();
    expect(() => simulateBudgetFinancing({ ...base, openingFeeCents: 120_000 })).toThrow();
    expect(() => simulateBudgetFinancing({ ...base, monthlyFeeCents: -10 })).toThrow();
  });
});
