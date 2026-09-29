import type Stripe from "stripe";
import type { PaymentRequest, PaymentResult } from "@/domain/payment-providers";
import { getStripeClient, stripeRequestOptions } from "@/server/payments/stripe-client";

export async function createStripeTerminalPayment(
  request: PaymentRequest,
  readerId: string,
  connectedAccountId?: string,
): Promise<PaymentResult> {
  const stripe = getStripeClient();
  const options = stripeRequestOptions(connectedAccountId, request.idempotencyKey);

  const intent = await stripe.paymentIntents.create(
    {
      amount: request.amountCents,
      currency: (request.currency ?? "EUR").toLowerCase(),
      payment_method_types: ["card_present"],
      description: request.description ?? "Cobro Denty",
      metadata: {
        clinic_id: request.clinicId,
        patient_id: request.patientId,
        ...(request.budgetId ? { budget_id: request.budgetId } : {}),
      },
    },
    options,
  );

  const reader = await stripe.terminal.readers.processPaymentIntent(
    readerId,
    { payment_intent: intent.id },
    options,
  );

  return {
    provider: "stripe",
    status: "PENDING",
    paymentIntentId: intent.id,
    providerTransactionId: intent.id,
    readerId: reader.id,
    message: "Pago enviado al lector Stripe. Esperando resultado.",
  };
}

export async function getStripePaymentIntent(paymentIntentId: string, connectedAccountId?: string) {
  const stripe = getStripeClient();
  return stripe.paymentIntents.retrieve(
    paymentIntentId,
    {},
    stripeRequestOptions(connectedAccountId),
  );
}

export function mapStripePaymentIntentStatus(
  intent: Stripe.PaymentIntent,
): PaymentResult["status"] {
  if (intent.status === "succeeded") return "COMPLETED";
  if (intent.status === "canceled") return "CANCELLED";
  if (intent.status === "requires_payment_method") return "FAILED";
  return "PENDING";
}
