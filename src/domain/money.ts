export type Cents = number;

const EURO_FORMATTER = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${label} debe ser un número finito`);
  }
}

function roundHalfAwayFromZero(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

export function asCents(value: number): Cents {
  assertFinite(value, "El importe");
  if (!Number.isInteger(value)) {
    throw new TypeError("Los céntimos deben ser enteros");
  }
  return value;
}

export function formatEUR(cents: Cents): string {
  return EURO_FORMATTER.format(asCents(cents) / 100);
}

export function parseEUR(input: string): Cents {
  const normalized = input
    .trim()
    .replace(/\s|€/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");

  if (!/^[+-]?\d+(?:\.\d+)?$/.test(normalized)) {
    throw new TypeError(`Importe EUR no válido: ${input}`);
  }

  const euros = Number(normalized);
  assertFinite(euros, "El importe");
  return asCents(roundHalfAwayFromZero(euros * 100));
}

export function mulQty(unitCents: Cents, quantity: number): Cents {
  asCents(unitCents);
  assertFinite(quantity, "La cantidad");
  return asCents(roundHalfAwayFromZero(unitCents * quantity));
}

export function taxFromBps(baseCents: Cents, taxRateBps: number): Cents {
  asCents(baseCents);
  assertFinite(taxRateBps, "El tipo fiscal");
  if (!Number.isInteger(taxRateBps)) {
    throw new TypeError("El tipo fiscal debe expresarse en puntos básicos enteros");
  }
  return asCents(roundHalfAwayFromZero((baseCents * taxRateBps) / 10_000));
}

export type PaymentProvider = "bank_terminal" | "sumup" | "stripe" | "manual";
export type PaymentIntegrationMode = "connected" | "semi_connected" | "manual";
export type PaymentMethod = "CASH" | "CARD" | "TRANSFER" | "BIZUM" | "FINANCING" | "OTHER";
export type PaymentCapability =
  "send_amount" | "automatic_confirmation" | "refund" | "cancel" | "receipt" | "reader_status";

export interface PaymentMethodOption {
  id: string;
  clinicId: string;
  label: string;
  method: PaymentMethod;
  provider: PaymentProvider;
  integrationMode: PaymentIntegrationMode;
  enabled: boolean;
  priority: number;
  isDefault: boolean;
  terminalId?: string;
  capabilities: readonly PaymentCapability[];
}

export interface PaymentRequest {
  clinicId: string;
  patientId: string;
  amountCents: number;
  currency?: string;
  description?: string;
  budgetId?: string;
  invoiceId?: string;
  paymentMethodOptionId?: string;
  idempotencyKey?: string;
}

export interface PaymentResult {
  provider: PaymentProvider;
  status: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";
  providerTransactionId?: string;
  checkoutId?: string;
  paymentIntentId?: string;
  readerId?: string;
  message?: string;
}

export function assertPaymentAmount(amountCents: number): void {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    throw new RangeError("El importe debe ser un número entero de céntimos mayor que 0");
  }
}

export function normalizeCurrency(currency?: string): string {
  const normalized = (currency ?? "EUR").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) throw new RangeError("Moneda no válida");
  return normalized;
}

export function hasPaymentCapability(
  option: PaymentMethodOption,
  capability: PaymentCapability,
): boolean {
  return option.capabilities.includes(capability);
}

export function supportsOneTapPayment(option: PaymentMethodOption): boolean {
  return (
    option.enabled &&
    option.integrationMode === "connected" &&
    hasPaymentCapability(option, "send_amount") &&
    hasPaymentCapability(option, "automatic_confirmation")
  );
}

export function sortPaymentOptions(options: readonly PaymentMethodOption[]): PaymentMethodOption[] {
  return [...options]
    .filter((option) => option.enabled)
    .sort(
      (a, b) =>
        Number(b.isDefault) - Number(a.isDefault) ||
        a.priority - b.priority ||
        a.label.localeCompare(b.label),
    );
}

export type NormalizedPaymentStatus =
  "created" | "processing" | "requires_action" | "succeeded" | "failed" | "cancelled" | "expired";

const PAYMENT_TRANSITIONS: Readonly<
  Record<NormalizedPaymentStatus, readonly NormalizedPaymentStatus[]>
> = {
  created: ["processing", "succeeded", "cancelled", "expired"],
  processing: ["requires_action", "succeeded", "failed", "cancelled", "expired"],
  requires_action: ["processing", "succeeded", "failed", "cancelled", "expired"],
  succeeded: [],
  failed: [],
  cancelled: [],
  expired: [],
};

export function normalizePaymentStatus(status: PaymentResult["status"]): NormalizedPaymentStatus {
  if (status === "COMPLETED") return "succeeded";
  if (status === "FAILED") return "failed";
  if (status === "CANCELLED") return "cancelled";
  return "processing";
}

export function canTransitionPayment(
  from: NormalizedPaymentStatus,
  to: NormalizedPaymentStatus,
): boolean {
  return PAYMENT_TRANSITIONS[from].includes(to);
}

export function assertPaymentTransition(
  from: NormalizedPaymentStatus,
  to: NormalizedPaymentStatus,
): void {
  if (!canTransitionPayment(from, to))
    throw new Error(`Transición de pago no permitida: ${from} -> ${to}`);
}

export interface PaymentBalance {
  totalCents: number;
  paidCents: number;
}

export function applyPayment(balance: PaymentBalance, amountCents: number) {
  assertPaymentAmount(amountCents);
  const paidCents = balance.paidCents + amountCents;
  if (paidCents > balance.totalCents) throw new RangeError("El pago supera el saldo pendiente");
  const outstandingCents = balance.totalCents - paidCents;
  return {
    totalCents: balance.totalCents,
    paidCents,
    outstandingCents,
    settled: outstandingCents === 0,
  };
}

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
    ) {
      throw new Error("La clave de idempotencia ya pertenece a otro cobro");
    }
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

export interface ReconciliationAttempt {
  id: string;
  providerStatus: NormalizedPaymentStatus;
  ledgerPaymentId?: string;
}

export interface ReconciliationDependencies {
  refresh(attempt: ReconciliationAttempt): Promise<NormalizedPaymentStatus>;
  markSucceeded(attemptId: string): Promise<unknown>;
  post(attemptId: string): Promise<string>;
}

export async function reconcileProviderPayment(
  attempt: ReconciliationAttempt,
  deps: ReconciliationDependencies,
): Promise<string | null> {
  if (attempt.ledgerPaymentId) return attempt.ledgerPaymentId;
  const status = attempt.providerStatus === "succeeded" ? "succeeded" : await deps.refresh(attempt);
  if (status !== "succeeded") return null;
  if (attempt.providerStatus !== "succeeded") await deps.markSucceeded(attempt.id);
  return deps.post(attempt.id);
}

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
  return `Cobrar ${formatEUR(proposal.amountCents)}`;
}

export interface ClinicPaymentConfig {
  methods: PaymentMethodOption[];
}

export function availablePaymentMethods(config: ClinicPaymentConfig): PaymentMethodOption[] {
  return sortPaymentOptions(config.methods);
}

export function preferredPaymentMethod(
  config: ClinicPaymentConfig,
): PaymentMethodOption | undefined {
  return availablePaymentMethods(config)[0];
}

export function fastPaymentMethod(config: ClinicPaymentConfig): PaymentMethodOption | undefined {
  return availablePaymentMethods(config).find(supportsOneTapPayment);
}
