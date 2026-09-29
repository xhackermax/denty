import Stripe from "stripe";

let client: Stripe | undefined;

export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY no configurado");
  client ??= new Stripe(secretKey, { maxNetworkRetries: 2, timeout: 20_000 });
  return client;
}

export function stripeRequestOptions(
  connectedAccountId?: string,
  idempotencyKey?: string,
): Stripe.RequestOptions {
  return {
    ...(connectedAccountId ? { stripeAccount: connectedAccountId } : {}),
    ...(idempotencyKey ? { idempotencyKey } : {}),
  };
}
