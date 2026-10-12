import { describe, expect, it } from "vitest";

import { calculateFinancing } from "../financing-calculator";
import { compareFinancingTerms, formatFinancingEstimate } from "../financing-scenarios";

const base = {
  budgetTotalCents: 280_000,
  downPaymentCents: 30_000,
  months: 24,
  tinPercent: 6.25,
  openingFeePercent: 1.5,
  monthlyFeeCents: 125,
};

describe("Comparador de plazos de financiación", () => {
  it("recalcula cuotas y coste total usando las mismas condiciones financieras", () => {
    const terms = compareFinancingTerms(base, [12, 24, 36]);
    expect(terms.map(term => term.months)).toEqual([12, 24, 36]);
    expect(terms[0]!.firstMonthlyPaymentCents).toBeGreaterThan(terms[1]!.firstMonthlyPaymentCents);
    expect(terms[1]!.firstMonthlyPaymentCents).toBeGreaterThan(terms[2]!.firstMonthlyPaymentCents);
    expect(terms[0]!.financeCostCents).toBeLessThan(terms[1]!.financeCostCents);
    expect(terms[1]!.financeCostCents).toBeLessThan(terms[2]!.financeCostCents);
    for (const term of terms) {
      const exact = calculateFinancing({ ...base, months: term.months });
      expect(term.totalPaidCents).toBe(exact.customerTotalCents);
      expect(term.approximateTaePercent).toBe(exact.approximateTaePercent);
    }
  });

  it("evita plazos repetidos y excluye valores inválidos", () => {
    const result = compareFinancingTerms(base, [12, 12, 24, 0, 121, 6.5]);
    expect(result.map(x => x.months)).toEqual([12, 24]);
  });

  it("produce un texto completo sin aprobar ni alterar presupuesto o préstamo", () => {
    const result = calculateFinancing(base);
    const text = formatFinancingEstimate({
      budgetCode: "P-2026-42", budgetTitle: "Rehabilitación oral",
      months: base.months, tinPercent: base.tinPercent,
      openingFeePercent: base.openingFeePercent, result,
    });
    expect(text).toContain("Presupuesto: P-2026-42 · Rehabilitación oral");
    expect(text).toContain("2.800,00");
    expect(text).toContain("6,25 %");
    expect(text).toContain("Coste financiero total:");
    expect(text).toContain("TAE teórica aproximada:");
    expect(text).toContain("no oferta vinculante");
    expect(text).toContain("permanecen sin cambios");
    expect(text).not.toContain("DNI");
  });
});
