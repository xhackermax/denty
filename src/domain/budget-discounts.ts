/**
 * Budget totals with an optional discount and the early-payment ("pronto pago") discount.
 * Mirrors budgets.final_total_cents in Supabase (migration 20261027150000): the manual
 * discount applies first, the early-payment percentage applies to what remains.
 */
export interface BudgetDiscountInput {
  subtotalCents: number;
  discountPercent?: number | null | undefined;
  discountAmountCents?: number | null | undefined;
  earlyPaymentPercent?: number | null | undefined;
  earlyPaymentApplied?: boolean | null | undefined;
}

export interface BudgetTotals {
  subtotalCents: number;
  discountCents: number;
  earlyPaymentCents: number;
  totalCents: number;
  /** What the patient would pay choosing early payment; null when there is no offer. */
  earlyPaymentTotalCents: number | null;
}

function percentOf(cents: number, percent: number): number {
  return Math.round((cents * percent) / 100);
}

export function computeBudgetTotals(input: BudgetDiscountInput): BudgetTotals {
  const subtotal = Math.max(0, input.subtotalCents);
  const discountPercent = Math.min(100, Math.max(0, input.discountPercent ?? 0));
  const discountAmount = Math.max(0, input.discountAmountCents ?? 0);
  const discountCents = Math.min(subtotal, percentOf(subtotal, discountPercent) + discountAmount);
  const afterDiscount = subtotal - discountCents;
  const earlyPercent = input.earlyPaymentPercent ?? null;
  const earlyOffer =
    earlyPercent !== null && earlyPercent > 0 ? percentOf(afterDiscount, earlyPercent) : null;
  const earlyPaymentCents = input.earlyPaymentApplied && earlyOffer !== null ? earlyOffer : 0;
  return {
    subtotalCents: subtotal,
    discountCents,
    earlyPaymentCents,
    totalCents: afterDiscount - earlyPaymentCents,
    earlyPaymentTotalCents: earlyOffer === null ? null : afterDiscount - earlyOffer,
  };
}

/** "5 %" / "2,5 %" for labels. */
export function formatPercent(percent: number): string {
  return `${percent.toLocaleString("es-ES", { maximumFractionDigits: 2 })} %`;
}
