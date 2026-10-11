/** Pure simulation of an equal-monthly-payment consumer loan (French amortisation).
 * Amounts remain integer cents. This does not constitute a lender's offer.
 */
export interface FinancingInput {
  budgetTotalCents: number;
  downPaymentCents: number;
  months: number;
  tinPercent: number;
  openingFeePercent: number;
  /** Fixed mandatory monthly servicing fee, in cents. Defaults to zero. */
  monthlyFeeCents?: number;
}
export interface FinancingResult {
  budgetTotalCents: number;
  downPaymentCents: number;
  financedCents: number;
  openingFeeCents: number;
  monthlyFeeCents: number;
  firstInstallmentCents: number;
  regularInstallmentCents: number;
  lastInstallmentCents: number;
  /** Capital and interest only, excluding recurring fees. */
  monthlyInstallmentsCents: number[];
  monthlyPaymentsCents: number[];
  amortizationSchedule: Array<{
    month: number;
    installmentCents: number;
    interestCents: number;
    principalCents: number;
    monthlyFeeCents: number;
    actualPaymentCents: number;
    remainingBalanceCents: number;
  }>;
  totalInstallmentsCents: number;
  totalMonthlyPaymentsCents: number;
  interestCents: number;
  financeCostCents: number;
  customerTotalCents: number;
  approximateTaePercent: number;
}

const validCents = (n: number) => Number.isSafeInteger(n) && n >= 0;

export function calculateFinancing(input: FinancingInput): FinancingResult {
  const { budgetTotalCents, downPaymentCents, months, tinPercent, openingFeePercent } = input;
  const monthlyFeeCents = input.monthlyFeeCents ?? 0;
  if (!validCents(budgetTotalCents) || budgetTotalCents < 100 ||
      !validCents(downPaymentCents) || downPaymentCents >= budgetTotalCents ||
      !Number.isInteger(months) || months < 1 || months > 120 ||
      !Number.isFinite(tinPercent) || tinPercent < 0 || tinPercent > 60 ||
      !Number.isFinite(openingFeePercent) || openingFeePercent < 0 || openingFeePercent > 10 ||
      !validCents(monthlyFeeCents) || monthlyFeeCents > 100_000) {
    throw new RangeError("Indica importe, entrada, plazo, TIN y comisión válidos.");
  }

  const financedCents = budgetTotalCents - downPaymentCents;
  const openingFeeCents = Math.round(financedCents * openingFeePercent / 100);
  if (openingFeeCents >= financedCents) {
    throw new RangeError("La comisión no puede alcanzar el capital financiado.");
  }
  const rate = tinPercent / 1200;
  const idealPayment = rate === 0
    ? financedCents / months
    : financedCents * rate / (1 - Math.pow(1 + rate, -months));
  const regularInstallmentCents = Math.round(idealPayment);
  let balance = financedCents;
  const monthlyInstallmentsCents: number[] = [];
  const amortizationSchedule: FinancingResult["amortizationSchedule"] = [];

  for (let month = 1; month <= months; month += 1) {
    const interest = Math.round(balance * rate);
    const payment = month === months
      ? balance + interest
      : Math.min(balance + interest, regularInstallmentCents);
    const capitalRepaid = payment - interest;
    balance -= capitalRepaid;
    monthlyInstallmentsCents.push(payment);
    amortizationSchedule.push({
      month,
      installmentCents: payment,
      interestCents: interest,
      principalCents: capitalRepaid,
      monthlyFeeCents,
      actualPaymentCents: payment + monthlyFeeCents,
      remainingBalanceCents: balance,
    });
  }
  const totalInstallmentsCents = monthlyInstallmentsCents.reduce((a, b) => a + b, 0);
  const interestCents = totalInstallmentsCents - financedCents;
  const totalMonthlyFeesCents = monthlyFeeCents * months;
  const financeCostCents = interestCents + openingFeeCents + totalMonthlyFeesCents;
  const monthlyPaymentsCents = monthlyInstallmentsCents.map((amount) => amount + monthlyFeeCents);
  const totalMonthlyPaymentsCents = totalInstallmentsCents + totalMonthlyFeesCents;
  if (!Number.isSafeInteger(totalMonthlyPaymentsCents + openingFeeCents + downPaymentCents)) {
    throw new RangeError("El importe total de la simulación es demasiado elevado.");
  }

  // Theoretical APR: cash made available minus upfront opening fee equals
  // present value of the monthly payments. First payment after one month.
  const netProceeds = financedCents - openingFeeCents;
  const presentValue = (monthlyRate: number) =>
    monthlyPaymentsCents.reduce(
      (sum, payment, index) => sum + payment / Math.pow(1 + monthlyRate, index + 1), 0,
    );
  let monthlyApr = 0;
  if (financeCostCents > 0) {
    let low = 0;
    let high = 1;
    for (let i = 0; i < 80; i += 1) {
      const middle = (low + high) / 2;
      if (presentValue(middle) > netProceeds) low = middle;
      else high = middle;
    }
    monthlyApr = (low + high) / 2;
  }

  return {
    budgetTotalCents,
    downPaymentCents,
    financedCents,
    openingFeeCents,
    monthlyFeeCents,
    firstInstallmentCents: monthlyInstallmentsCents[0] ?? 0,
    regularInstallmentCents,
    lastInstallmentCents: monthlyInstallmentsCents[months - 1] ?? 0,
    monthlyInstallmentsCents,
    monthlyPaymentsCents,
    amortizationSchedule,
    totalInstallmentsCents,
    totalMonthlyPaymentsCents,
    interestCents,
    financeCostCents,
    customerTotalCents: downPaymentCents + totalMonthlyPaymentsCents + openingFeeCents,
    approximateTaePercent: (Math.pow(1 + monthlyApr, 12) - 1) * 100,
  };
}
