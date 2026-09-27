import type { PaymentMethodOption } from "@/domain/payment-providers";
import { sortPaymentOptions, supportsOneTapPayment } from "@/domain/payment-providers";

export interface ClinicPaymentConfig {
  methods: PaymentMethodOption[];
}

/** UI-safe configuration. Secrets never belong here. */
export function availablePaymentMethods(config: ClinicPaymentConfig): PaymentMethodOption[] {
  return sortPaymentOptions(config.methods);
}

export function preferredPaymentMethod(config: ClinicPaymentConfig): PaymentMethodOption | undefined {
  return availablePaymentMethods(config)[0];
}

export function fastPaymentMethod(config: ClinicPaymentConfig): PaymentMethodOption | undefined {
  return availablePaymentMethods(config).find(supportsOneTapPayment);
}
