import type { NormalizedPaymentStatus } from "../../domain/payment-providers.ts";
export interface ReconciliationAttempt { id:string; providerStatus:NormalizedPaymentStatus; ledgerPaymentId?:string }
export interface ReconciliationDependencies {
  refresh(attempt:ReconciliationAttempt):Promise<NormalizedPaymentStatus>;
  markSucceeded(attemptId:string):Promise<unknown>;
  post(attemptId:string):Promise<string>;
}
export async function reconcileProviderPayment(attempt:ReconciliationAttempt,deps:ReconciliationDependencies):Promise<string|null>{
  if(attempt.ledgerPaymentId) return attempt.ledgerPaymentId;
  const status=attempt.providerStatus==="succeeded" ? "succeeded" : await deps.refresh(attempt);
  if(status!=="succeeded") return null;
  if(attempt.providerStatus!=="succeeded") await deps.markSucceeded(attempt.id);
  return deps.post(attempt.id);
}
