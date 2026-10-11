import { describe, expect, it } from "vitest";

import { calculateFinancing } from "../financing-calculator";

describe("calculadora de financiación de presupuestos", () => {
  it("divide una financiación sin intereses ni comisiones y ajusta el último céntimo", () => {
    const result = calculateFinancing({
      budgetTotalCents: 100_000, downPaymentCents: 0, months: 12,
      tinPercent: 0, openingFeePercent: 0,
    });
    expect(result.regularInstallmentCents).toBe(8_333);
    expect(result.lastInstallmentCents).toBe(8_337);
    expect(result.monthlyInstallmentsCents).toHaveLength(12);
    expect(result.totalInstallmentsCents).toBe(100_000);
    expect(result.interestCents).toBe(0);
    expect(result.approximateTaePercent).toBe(0);
    expect(result.customerTotalCents).toBe(100_000);
  });

  it("descuenta la entrada, calcula intereses y conserva la suma de todas las cuotas", () => {
    const result = calculateFinancing({
      budgetTotalCents: 250_000, downPaymentCents: 50_000, months: 24,
      tinPercent: 7.5, openingFeePercent: 0,
    });
    expect(result.financedCents).toBe(200_000);
    expect(result.totalInstallmentsCents).toBe(
      result.monthlyInstallmentsCents.reduce((sum, payment) => sum + payment, 0),
    );
    expect(result.totalInstallmentsCents).toBeGreaterThan(200_000);
    expect(result.financeCostCents).toBe(result.interestCents);
    expect(result.customerTotalCents).toBe(
      result.downPaymentCents + result.totalInstallmentsCents,
    );
    expect(result.approximateTaePercent).toBeGreaterThan(7.5);
    expect(result.approximateTaePercent).toBeLessThan(8);
  });

  it("separa apertura pagada al inicio y calcula TAE teórica superior", () => {
    const free = calculateFinancing({
      budgetTotalCents: 120_000, downPaymentCents: 20_000, months: 12,
      tinPercent: 6, openingFeePercent: 0,
    });
    const withOpening = calculateFinancing({
      budgetTotalCents: 120_000, downPaymentCents: 20_000, months: 12,
      tinPercent: 6, openingFeePercent: 2,
    });
    expect(withOpening.openingFeeCents).toBe(2_000);
    expect(withOpening.totalInstallmentsCents).toBe(free.totalInstallmentsCents);
    expect(withOpening.customerTotalCents).toBe(free.customerTotalCents + 2_000);
    expect(withOpening.approximateTaePercent).toBeGreaterThan(free.approximateTaePercent);
  });

  it.each([
    { budgetTotalCents: 0, downPaymentCents: 0, months: 12, tinPercent: 3, openingFeePercent: 0 },
    { budgetTotalCents: 100_000, downPaymentCents: 100_000, months: 12, tinPercent: 3, openingFeePercent: 0 },
    { budgetTotalCents: 100_000, downPaymentCents: -1, months: 12, tinPercent: 3, openingFeePercent: 0 },
    { budgetTotalCents: 100_000, downPaymentCents: 0, months: 0, tinPercent: 3, openingFeePercent: 0 },
    { budgetTotalCents: 100_000, downPaymentCents: 0, months: 12, tinPercent: -2, openingFeePercent: 0 },
    { budgetTotalCents: 100_000, downPaymentCents: 0, months: 12, tinPercent: 3, openingFeePercent: 101 },
    { budgetTotalCents: 100_000, downPaymentCents: 0, months: 12, tinPercent: Number.NaN, openingFeePercent: 0 },
  ])("rechaza importes o tipos inválidos %o", (input) => {
    expect(() => calculateFinancing(input)).toThrow(RangeError);
  });
});
