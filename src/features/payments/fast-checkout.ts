import type { PaymentMethodOption } from "@/domain/payment-providers";
import { sortPaymentOptions, supportsOneTapPayment } from "@/domain/payment-providers";

export interface FastCheckoutContext {
  outstandingCents: number;
  methods: readonly PaymentMethodOption[];
}

export interface FastCheckoutProposal {
  amountCents: number;
  primary?: PaymentMethodOption;
  alternatives: PaymentMethodOption[];
  oneTap: boolean;
  requiresAmountEntry: boolean;
}

/**
 * Denty already knows the balance, so the default checkout must not ask staff
 * to retype it. A different amount remains available for partial payments.
 */
export function buildFastCheckoutProposal(context: FastCheckoutContext): FastCheckoutProposal {
  const methods = sortPaymentOptions(context.methods);
  const primary = methods.find(supportsOneTapPayment) ?? methods[0];
  const base = {
    amountCents: Math.max(0, Math.trunc(context.outstandingCents)),
    alternatives: primary ? methods.filter((method) => method.id !== primary.id) : methods,
    oneTap: primary ? supportsOneTapPayment(primary) : false,
    requiresAmountEntry: context.outstandingCents <= 0,
  };
  return primary ? { ...base, primary } : base;
}

export function fastCheckoutLabel(proposal: FastCheckoutProposal): string {
  if (!proposal.primary || proposal.requiresAmountEntry) return "Cobrar";
  return `Cobrar ${(proposal.amountCents / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}`;
}
