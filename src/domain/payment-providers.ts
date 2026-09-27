export type PaymentProvider = "bank_terminal" | "sumup" | "stripe" | "manual";
export type PaymentIntegrationMode = "connected" | "semi_connected" | "manual";
export type PaymentMethod = "CASH" | "CARD" | "TRANSFER" | "BIZUM" | "FINANCING" | "OTHER";

export type PaymentCapability =
  | "send_amount"
  | "automatic_confirmation"
  | "refund"
  | "cancel"
  | "receipt"
  | "reader_status";

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

export function hasPaymentCapability(option: PaymentMethodOption, capability: PaymentCapability): boolean {
  return option.capabilities.includes(capability);
}

/** One-tap is possible only when Denty can send the amount and verify success itself. */
export function supportsOneTapPayment(option: PaymentMethodOption): boolean {
  return option.enabled && option.integrationMode === "connected" &&
    hasPaymentCapability(option, "send_amount") && hasPaymentCapability(option, "automatic_confirmation");
}

export function sortPaymentOptions(options: readonly PaymentMethodOption[]): PaymentMethodOption[] {
  return [...options].filter((option) => option.enabled).sort((a, b) =>
    Number(b.isDefault) - Number(a.isDefault) || a.priority - b.priority || a.label.localeCompare(b.label),
  );
}

export type NormalizedPaymentStatus =
  | "created" | "processing" | "requires_action" | "succeeded" | "failed" | "cancelled" | "expired";

const PAYMENT_TRANSITIONS: Readonly<Record<NormalizedPaymentStatus, readonly NormalizedPaymentStatus[]>> = {
  created: ["processing", "succeeded", "cancelled", "expired"],
  processing: ["requires_action", "succeeded", "failed", "cancelled", "expired"],
  requires_action: ["processing", "succeeded", "failed", "cancelled", "expired"],
  succeeded: [], failed: [], cancelled: [], expired: [],
};

export function normalizePaymentStatus(status: PaymentResult["status"]): NormalizedPaymentStatus {
  if (status === "COMPLETED") return "succeeded";
  if (status === "FAILED") return "failed";
  if (status === "CANCELLED") return "cancelled";
  return "processing";
}
export function canTransitionPayment(from: NormalizedPaymentStatus, to: NormalizedPaymentStatus): boolean { return PAYMENT_TRANSITIONS[from].includes(to); }
export function assertPaymentTransition(from: NormalizedPaymentStatus, to: NormalizedPaymentStatus): void {
  if (!canTransitionPayment(from, to)) throw new Error(`Transición de pago no permitida: ${from} -> ${to}`);
}
