export interface TreatmentGateInput {
  requiredConsentCodes: readonly string[];
  signedConsentCodes: readonly string[];
  budgetSigned: boolean;
}
export function evaluateTreatmentGate(input: TreatmentGateInput) {
  const signed = new Set(input.signedConsentCodes);
  const missingConsentCodes = input.requiredConsentCodes.filter((code) => !signed.has(code));
  const canSchedule = input.budgetSigned && missingConsentCodes.length === 0;
  return {
    canSchedule,
    missingConsentCodes,
    budgetSigned: input.budgetSigned,
    reasons: [
      ...(input.budgetSigned ? [] : ["BUDGET_NOT_SIGNED"]),
      ...(missingConsentCodes.length ? ["CONSENTS_MISSING"] : []),
    ],
  };
}
