import { budgetSignatureFingerprint, type BudgetSignatureSource } from "@/domain";

export interface StoredBudgetSignature {
  budgetId: string;
  fingerprint: string;
  documentId: string;
  signedAt: string;
  signerName: string;
  signatureDataUrl: string;
}

const demoSignatures = new Map<string, StoredBudgetSignature>();

export function readDemoBudgetSignature(
  source: BudgetSignatureSource,
): StoredBudgetSignature | null {
  const record = demoSignatures.get(source.budgetId);
  if (!record) return null;
  return record.fingerprint === budgetSignatureFingerprint(source) ? record : null;
}

export function saveDemoBudgetSignature(
  source: BudgetSignatureSource,
  input: Omit<StoredBudgetSignature, "budgetId" | "fingerprint">,
): StoredBudgetSignature {
  const record: StoredBudgetSignature = {
    ...input,
    budgetId: source.budgetId,
    fingerprint: budgetSignatureFingerprint(source),
  };
  demoSignatures.set(source.budgetId, record);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("denty:budget-signature-changed"));
  }
  return record;
}
