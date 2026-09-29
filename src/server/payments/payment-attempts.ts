import {
  assertPaymentAmount,
  assertPaymentTransition,
  normalizeCurrency,
  type NormalizedPaymentStatus,
  type PaymentMethod,
  type PaymentProvider,
} from "../../domain/payment-providers.ts";

export interface PaymentAttempt {
  id: string;
  clinicId: string;
  patientId: string;
  provider: PaymentProvider;
  providerStatus: NormalizedPaymentStatus;
  idempotencyKey: string;
  amountCents: number;
  currency: string;
  budgetId?: string;
  invoiceId?: string;
  paymentMethod?: PaymentMethod;
  providerTransactionId?: string;
  providerCheckoutId?: string;
  readerId?: string;
  ledgerPaymentId?: string;
  errorCode?: string;
  errorMessage?: string;
}
export interface PaymentAttemptStore {
  find(
    clinicId: string,
    provider: PaymentProvider,
    idempotencyKey: string,
  ): Promise<PaymentAttempt | null>;
  create(value: Omit<PaymentAttempt, "id">): Promise<PaymentAttempt>;
  update(id: string, patch: Partial<PaymentAttempt>): Promise<PaymentAttempt>;
}
export interface CreatePaymentAttemptInput {
  clinicId: string;
  patientId: string;
  provider: PaymentProvider;
  amountCents: number;
  currency?: string;
  idempotencyKey: string;
  budgetId?: string;
  invoiceId?: string;
  paymentMethod?: PaymentMethod;
}
export async function createOrGetPaymentAttempt(
  store: PaymentAttemptStore,
  input: CreatePaymentAttemptInput,
): Promise<PaymentAttempt> {
  assertPaymentAmount(input.amountCents);
  if (!input.clinicId || !input.patientId || !input.idempotencyKey.trim())
    throw new Error("clinicId, patientId e idempotencyKey son obligatorios");
  const existing = await store.find(input.clinicId, input.provider, input.idempotencyKey);
  if (existing) {
    if (
      existing.patientId !== input.patientId ||
      existing.amountCents !== input.amountCents ||
      existing.currency !== normalizeCurrency(input.currency) ||
      (existing.budgetId ?? null) !== (input.budgetId ?? null) ||
      (existing.invoiceId ?? null) !== (input.invoiceId ?? null) ||
      (existing.paymentMethod ?? null) !== (input.paymentMethod ?? null)
    )
      throw new Error("La clave de idempotencia ya pertenece a otro cobro");
    return existing;
  }
  return store.create({
    clinicId: input.clinicId,
    patientId: input.patientId,
    provider: input.provider,
    providerStatus: "created",
    idempotencyKey: input.idempotencyKey,
    amountCents: input.amountCents,
    currency: normalizeCurrency(input.currency),
    ...(input.budgetId ? { budgetId: input.budgetId } : {}),
    ...(input.invoiceId ? { invoiceId: input.invoiceId } : {}),
    ...(input.paymentMethod ? { paymentMethod: input.paymentMethod } : {}),
  });
}
export async function markPaymentAttempt(
  store: PaymentAttemptStore,
  attempt: PaymentAttempt,
  status: NormalizedPaymentStatus,
  patch: Partial<PaymentAttempt> = {},
): Promise<PaymentAttempt> {
  assertPaymentTransition(attempt.providerStatus, status);
  const updated = await store.update(attempt.id, { ...patch, providerStatus: status });
  Object.assign(attempt, updated);
  return updated;
}
