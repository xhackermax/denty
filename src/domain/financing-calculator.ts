/** Pure simulation of an equal-monthly-payment consumer loan (French amortisation).
 * Amounts remain integer cents. This does not constitute a lender's offer.
 */
export interface FinancingInput {
  budgetTotalCents: number;
  downPaymentCents: number;
  months: number;
  tinPercent: number;
  openingFeePercent: number;
}
export interface FinancingResult {
  budgetTotalCents: number;
  downPaymentCents: number;
  financedCents: number;
  openingFeeCents: number;
  firstInstallmentCents: number;
  regularInstallmentCents: number;
  lastInstallmentCents: number;
  monthlyInstallmentsCents: number[];
  totalInstallmentsCents: number;
  interestCents: number;
  financeCostCents: number;
  customerTotalCents: number;
  approximateTaePercent: number;
}

const validCents = (n: number) => Number.isSafeInteger(n) && n >= 0;

export function calculateFinancing(input: FinancingInput): FinancingResult {
  const { budgetTotalCents, downPaymentCents, months, tinPercent, openingFeePercent } = input;
  if (!validCents(budgetTotalCents) || budgetTotalCents < 100 ||
      !validCents(downPaymentCents) || downPaymentCents >= budgetTotalCents ||
      !Number.isInteger(months) || months < 1 || months > 120 ||
      !Number.isFinite(tinPercent) || tinPercent < 0 || tinPercent > 60 ||
      !Number.isFinite(openingFeePercent) || openingFeePercent < 0 || openingFeePercent > 10) {
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

  for (let month = 1; month <= months; month += 1) {
    const interest = Math.round(balance * rate);
    const payment = month === months
      ? balance + interest
      : Math.min(balance + interest, regularInstallmentCents);
    const capitalRepaid = payment - interest;
    balance -= capitalRepaid;
    monthlyInstallmentsCents.push(payment);
  }
  const totalInstallmentsCents = monthlyInstallmentsCents.reduce((a, b) => a + b, 0);
  const interestCents = totalInstallmentsCents - financedCents;
  const financeCostCents = interestCents + openingFeeCents;

  // Theoretical APR: cash made available minus upfront opening fee equals
  // present value of the monthly payments. First payment after one month.
  const netProceeds = financedCents - openingFeeCents;
  const presentValue = (monthlyRate: number) =>
    monthlyInstallmentsCents.reduce(
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
    firstInstallmentCents: monthlyInstallmentsCents[0] ?? 0,
    regularInstallmentCents,
    lastInstallmentCents: monthlyInstallmentsCents[months - 1] ?? 0,
    monthlyInstallmentsCents,
    totalInstallmentsCents,
    interestCents,
    financeCostCents,
    customerTotalCents: downPaymentCents + totalInstallmentsCents + openingFeeCents,
    approximateTaePercent: (Math.pow(1 + monthlyApr, 12) - 1) * 100,
  };
}
