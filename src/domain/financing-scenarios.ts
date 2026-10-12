import { calculateFinancing, type FinancingInput, type FinancingResult } from "./financing-calculator";
import { formatEUR } from "./money";

export const COMPARISON_TERMS = [6, 12, 18, 24, 36, 48, 60] as const;

export interface FinancingScenario {
  months: number;
  firstMonthlyPaymentCents: number;
  finalMonthlyPaymentCents: number;
  totalPaidCents: number;
  financeCostCents: number;
  approximateTaePercent: number;
}

/** Comparable terms use precisely the same costs and upfront fees as the selected estimate. */
export function compareFinancingTerms(
  input: FinancingInput,
  terms: readonly number[] = COMPARISON_TERMS,
): FinancingScenario[] {
  return [...new Set(terms)].filter(months => Number.isInteger(months) && months >= 1 && months <= 120)
    .map(months => {
      const result = calculateFinancing({ ...input, months });
      return {
        months,
        firstMonthlyPaymentCents: result.monthlyPaymentsCents[0] ?? 0,
        finalMonthlyPaymentCents: result.monthlyPaymentsCents.at(-1) ?? 0,
        totalPaidCents: result.customerTotalCents,
        financeCostCents: result.financeCostCents,
        approximateTaePercent: result.approximateTaePercent,
      };
    });
}

const PERCENT = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

/** Text intended for a patient, not a bank offer or a financing contract. */
export function formatFinancingEstimate({
  budgetCode, budgetTitle, months, tinPercent, openingFeePercent, result,
}: {
  budgetCode: string;
  budgetTitle?: string | null;
  months: number;
  tinPercent: number;
  openingFeePercent: number;
  result: FinancingResult;
}): string {
  const label = [budgetCode, budgetTitle].filter(Boolean).join(" · ").replace(/\s+/g, " ").slice(0, 180);
  return [
    "SIMULACIÓN ORIENTATIVA DE FINANCIACIÓN · DENTY",
    `Presupuesto: ${label}`,
    `Importe presupuestado: ${formatEUR(result.budgetTotalCents)}`,
    `Entrada inicial: ${formatEUR(result.downPaymentCents)}`,
    `Capital a financiar: ${formatEUR(result.financedCents)}`,
    `Plazo: ${months} meses`,
    `TIN nominal anual introducido: ${PERCENT.format(tinPercent)} %`,
    `Apertura: ${PERCENT.format(openingFeePercent)} % (${formatEUR(result.openingFeeCents)}, al inicio)`,
    `Gastos mensuales introducidos: ${formatEUR(result.monthlyFeeCents)}`,
    `Primera cuota estimada, gastos incluidos: ${formatEUR(result.monthlyPaymentsCents[0] ?? 0)}`,
    `Última cuota estimada, gastos incluidos: ${formatEUR(result.monthlyPaymentsCents.at(-1) ?? 0)}`,
    `Total de cuotas con gastos: ${formatEUR(result.totalMonthlyPaymentsCents)}`,
    `Intereses totales: ${formatEUR(result.interestCents)}`,
    `Coste financiero total: ${formatEUR(result.financeCostCents)}`,
    `Total a pagar, entrada y apertura incluidas: ${formatEUR(result.customerTotalCents)}`,
    `TAE teórica aproximada: ${PERCENT.format(result.approximateTaePercent)} %`,
    "",
    "Simulación matemática, no oferta vinculante, ni aprobación, ni solicitud de préstamo.",
    "Se supone amortización mensual francesa, primera cuota al mes, sin carencia y comisión de apertura pagada al inicio.",
    "Solo incorpora los gastos introducidos. La entidad financiera deberá facilitar las condiciones y TAE contractuales.",
    "El presupuesto clínico, su firma y los pagos permanecen sin cambios.",
  ].join("\n");
}
