import {
  requiredConsentTemplates,
  signedConsentTemplateCodes,
  type ConsentDocumentLike,
  type ConsentRequirement,
  type ConsentTemplateCode,
} from "@/domain/consent-requirements";

export const DEMO_CLINICAL_DOCUMENTS_STORAGE_KEY = "denty:clinical-documents:v3";
export const CONSENT_SIGNATURE_CHANGED_EVENT = "denty:consent-signature-changed";

const DEMO_PLAN_TREATMENTS: Readonly<
  Record<string, readonly { treatmentCode: string; label: string }[]>
> = {
  "juan-perez": [
    { treatmentCode: "PERIO-HYGIENE", label: "Higiene periodontal" },
    { treatmentCode: "ENDO", label: "Endodoncia 46" },
    { treatmentCode: "IMPLANT", label: "Implante 46" },
    { treatmentCode: "CROWN-ZR", label: "Corona zirconio 46" },
  ],
};

const demoSignedConsents = new Map<string, ReadonlySet<ConsentTemplateCode>>();

export function demoRequiredConsentTemplates(patientId: string): ConsentRequirement[] {
  return requiredConsentTemplates(DEMO_PLAN_TREATMENTS[patientId] ?? []);
}

export function readDemoSignedConsentCodes(patientId: string): ReadonlySet<ConsentTemplateCode> {
  return demoSignedConsents.get(patientId) ?? new Set<ConsentTemplateCode>();
}

export function syncDemoConsentStatus(
  documents: readonly (ConsentDocumentLike & { patientId?: string | undefined })[],
): void {
  const patientIds = new Set(
    documents.map((document) => document.patientId).filter((id): id is string => Boolean(id)),
  );
  for (const patientId of patientIds) {
    demoSignedConsents.set(
      patientId,
      signedConsentTemplateCodes(documents.filter((document) => document.patientId === patientId)),
    );
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CONSENT_SIGNATURE_CHANGED_EVENT));
  }
}
