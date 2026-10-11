/** Indicative French-amortisation simulation. Does not authorise or originate a loan. */
export interface BudgetFinancingInput {
  budgetTotalCents: number;
  downPaymentCents: number;
  months: number;
  annualNominalRatePercent: number;
  openingFeeCents: number;
  monthlyFeeCents: number;
}

export interface BudgetFinancingResult {
  financedCents: number;
  standardMonthlyCents: number;
  lastMonthlyCents: number;
  interestCents: number;
  feesCents: number;
  creditCostCents: number;
  totalCreditPaymentsCents: number;
  totalWithDownPaymentCents: number;
  approximateAprPercent: number;
  months: number;
}

function validCents(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0 && value <= 100_000_000;
}

/** Compute a rate from the net amount available to the borrower and all mandatory payments. */
function effectiveApr(netDisbursedCents: number, installments: readonly number[]): number {
  if (netDisbursedCents <= 0) throw new Error("La comisión de apertura no puede agotar el crédito.");
  const presentValue = (monthlyRate: number) =>
    installments.reduce(
      (sum, installment, index) =>
        sum + installment / Math.pow(1 + monthlyRate, index + 1),
      0,
    );
  let lower = 0;
  let upper = 1;
  while (presentValue(upper) > netDisbursedCents && upper < 128) upper *= 2;
  for (let i = 0; i < 100; i++) {
    const midpoint = (lower + upper) / 2;
    if (presentValue(midpoint) > netDisbursedCents) lower = midpoint;
    else upper = midpoint;
  }
  return (Math.pow(1 + (lower + upper) / 2, 12) - 1) * 100;
}

/** Schedule is rounded to cents each month and clears the remainder in the final installment. */
export function simulateBudgetFinancing(input: BudgetFinancingInput): BudgetFinancingResult {
  const {
    budgetTotalCents, downPaymentCents, months,
    annualNominalRatePercent, openingFeeCents, monthlyFeeCents,
  } = input;
  if (!validCents(budgetTotalCents) || budgetTotalCents === 0 ||
      !validCents(downPaymentCents) || !validCents(openingFeeCents) ||
      !validCents(monthlyFeeCents) ||
      !Number.isInteger(months) || months < 1 || months > 120 ||
      !Number.isFinite(annualNominalRatePercent) ||
      annualNominalRatePercent < 0 || annualNominalRatePercent > 100) {
    throw new Error("Revisa los importes, el TIN y el número de cuotas.");
  }

  const financedCents = budgetTotalCents - downPaymentCents;
  if (financedCents <= 0) throw new Error("La entrada debe ser inferior al presupuesto.");
  if (openingFeeCents >= financedCents)
    throw new Error("La comisión de apertura debe ser menor que el importe financiado.");
  if (financedCents < months)
    throw new Error("El importe financiado es demasiado pequeño para ese plazo.");

  const monthlyRate = annualNominalRatePercent / 1200;
  const regular = monthlyRate === 0
    ? Math.round(financedCents / months)
    : Math.round(financedCents * monthlyRate /
        (1 - Math.pow(1 + monthlyRate, -months)));

  let remaining = financedCents;
  let interestCents = 0;
  const installments: number[] = [];
  for (let month = 1; month <= months; month++) {
    const interest = Math.round(remaining * monthlyRate);
    const repayment = month === months
      ? remaining + interest
      : Math.min(regular, remaining + interest);
    if (repayment - interest < 0)
      throw new Error("No es posible amortizar la financiación con estos valores.");
    remaining -= repayment - interest;
    interestCents += interest;
    installments.push(repayment + monthlyFeeCents);
  }

  const feesCents = openingFeeCents + monthlyFeeCents * months;
  const totalCreditPaymentsCents = installments.reduce((a, b) => a + b, 0)
    + openingFeeCents;
  const standardMonthlyCents = (installments[0] ?? 0);
  const lastMonthlyCents = installments[installments.length - 1] ?? 0;

  return {
    financedCents,
    standardMonthlyCents,
    lastMonthlyCents,
    interestCents,
    feesCents,
    creditCostCents: interestCents + feesCents,
    totalCreditPaymentsCents,
    totalWithDownPaymentCents: downPaymentCents + totalCreditPaymentsCents,
    approximateAprPercent: effectiveApr(financedCents - openingFeeCents, installments),
    months,
  };
}
