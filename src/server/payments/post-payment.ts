import type { PaymentAttempt } from "./payment-attempts.ts";
export interface LedgerPosting {
  id: string;
}
export interface PostPaymentDependencies {
  loadAttempt(id: string): Promise<PaymentAttempt>;
  postLedger(attempt: PaymentAttempt): Promise<LedgerPosting>;
  linkLedger(attemptId: string, paymentId: string): Promise<unknown>;
}
export async function postSucceededPayment(
  attemptId: string,
  deps: PostPaymentDependencies,
): Promise<string> {
  const attempt = await deps.loadAttempt(attemptId);
  if (attempt.providerStatus !== "succeeded")
    throw new Error("Solo un cobro verificado puede registrarse en el ledger");
  if (attempt.ledgerPaymentId) return attempt.ledgerPaymentId;
  const payment = await deps.postLedger(attempt);
  await deps.linkLedger(attempt.id, payment.id);
  return payment.id;
}
