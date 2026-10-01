export interface TreatmentSuggestion {
  id: string;
  code: string;
  label: string;
  scope: "patient" | "quadrant";
  consentCode?: string;
  optional?: boolean;
}
const suggestions: Readonly<Record<string, readonly TreatmentSuggestion[]>> = {
  healthy: [
    { id: "checkup", code: "CHECKUP", label: "Control periodontal / revisión", scope: "patient" },
    {
      id: "hygiene",
      code: "HYGIENE",
      label: "Profilaxis",
      scope: "patient",
      consentCode: "CONSENT_CLEANING",
      optional: true,
    },
  ],
  gingivitis: [
    {
      id: "hygiene",
      code: "HYGIENE",
      label: "Profilaxis / tartrectomía",
      scope: "patient",
      consentCode: "CONSENT_CLEANING",
    },
    {
      id: "instructions",
      code: "ORAL_HYGIENE",
      label: "Instrucciones de higiene",
      scope: "patient",
    },
    {
      id: "gingivitis-review",
      code: "PERIO_REVIEW",
      label: "Control en 4–6 semanas",
      scope: "patient",
    },
  ],
  periodontitis: [
    {
      id: "root-planing",
      code: "ROOT_PLANING",
      label: "Raspado y alisado radicular",
      scope: "quadrant",
      consentCode: "CONSENT_PERIO",
    },
    {
      id: "reevaluation",
      code: "PERIO_REVIEW",
      label: "Reevaluación a las 6–8 semanas",
      scope: "patient",
    },
    {
      id: "maintenance",
      code: "PERIO_MAINTENANCE",
      label: "Mantenimiento periodontal cada 3–4 meses",
      scope: "patient",
      consentCode: "CONSENT_PERIO",
    },
  ],
  bruxism: [
    { id: "splint", code: "SPLINT", label: "Férula de descarga", scope: "patient" },
    {
      id: "splint-review",
      code: "SPLINT_REVIEW",
      label: "Ajuste / control de férula",
      scope: "patient",
    },
  ],
  no_bruxism: [],
};
export function treatmentSuggestions(
  value: string,
  options: { residualPocketDepth?: number } = {},
): readonly TreatmentSuggestion[] {
  const list = suggestions[value] ?? [];
  return value === "periodontitis" && (options.residualPocketDepth ?? 0) >= 6
    ? [
        ...list,
        {
          id: "perio-surgery",
          code: "PERIO_SURGERY",
          label: "Cirugía periodontal tras reevaluación",
          scope: "patient",
          consentCode: "CONSENT_PERIO",
          optional: true,
        },
      ]
    : list;
}
export function suggestedQuadrants(
  readings: readonly { tooth: string; probingDepth: number }[],
): number[] {
  return [
    ...new Set(
      readings
        .filter((r) => r.probingDepth >= 4 && /^[1-4][1-8]$/.test(r.tooth))
        .map((r) => Number(r.tooth[0])),
    ),
  ].sort();
}
