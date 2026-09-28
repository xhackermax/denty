export interface BudgetSignatureSource {
  budgetId: string;
  totalCents: number;
  sourcePlanVersion: number | null | undefined;
}

export function budgetSignatureFingerprint(source: BudgetSignatureSource): string {
  const planVersion = source.sourcePlanVersion ?? "none";
  return `${source.budgetId}:${source.totalCents}:${planVersion}`;
}

export function isBudgetSignatureCurrent(
  source: BudgetSignatureSource,
  signedFingerprint: string | null | undefined,
): boolean {
  return Boolean(signedFingerprint) && budgetSignatureFingerprint(source) === signedFingerprint;
}
