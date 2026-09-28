export interface ImplantBudgetRevisionInput {
  readonly signedFingerprint: string | null | undefined;
  readonly currentPlanFingerprint: string;
}

export function shouldCreateBudgetRevision({
  signedFingerprint,
  currentPlanFingerprint,
}: ImplantBudgetRevisionInput): boolean {
  if (!signedFingerprint) return false;
  return signedFingerprint !== currentPlanFingerprint;
}
