import { mentions, normalized } from "./treatment-phase";

/**
 * Clinical phases used to fold a long treatment plan into collapsible groups. Unlike the
 * two-phase budgeting split, these follow the order a dentist reasons about the mouth.
 */
export type ClinicalPhaseGroupKey =
  | "periodontal"
  | "surgical"
  | "conservative"
  | "prosthetic"
  | "orthodontic"
  | "maintenance"
  | "other";

export interface ClinicalPhaseClassifiable {
  treatmentCode: string;
  label: string;
  specialty?: string | null | undefined;
}

// Order matters: the first match wins, so "cirugía periodontal" stays periodontal and
// "corona sobre implante" is prosthetic work, not surgery.
const RULES: ReadonlyArray<{ key: ClinicalPhaseGroupKey; words: readonly string[] }> = [
  {
    key: "periodontal",
    words: ["periodon", "perio", "raspado", "curetaje", "alisado", "gingiv"],
  },
  {
    key: "prosthetic",
    words: [
      "corona",
      "crown",
      "puente",
      "bridge",
      "protesis",
      "prosthe",
      "dentadura",
      "denture",
      "removible",
      "removable",
      "carilla",
      "veneer",
      "incrustacion",
      "onlay",
      "inlay",
      "perno",
      "post",
      "pilar",
      "abutment",
      "tibase",
      "locator",
    ],
  },
  {
    key: "surgical",
    words: [
      "extrac",
      "exodon",
      "implant",
      "injerto",
      "graft",
      "seno",
      "sinus",
      "membrana",
      "membrane",
      "regeneracion",
      "cirugia",
      "surgery",
      "quirurg",
      "frenectom",
      "apicect",
    ],
  },
  {
    key: "conservative",
    words: [
      "obtura",
      "filling",
      "empaste",
      "restaura",
      "reconstru",
      "caries",
      "endodon",
      "conducto",
      "pulpo",
      "pulpect",
    ],
  },
  {
    key: "orthodontic",
    words: ["ortodon", "orthodon", "alineador", "aligner", "bracket", "retenedor"],
  },
  {
    key: "maintenance",
    words: ["higiene", "hygiene", "limpieza", "sellad", "sealant", "fluor", "revision"],
  },
];

export const CLINICAL_PHASE_GROUPS: ReadonlyArray<{ key: ClinicalPhaseGroupKey; label: string }> = [
  { key: "periodontal", label: "Fase periodontal" },
  { key: "surgical", label: "Fase quirúrgica" },
  { key: "conservative", label: "Fase conservadora" },
  { key: "prosthetic", label: "Fase prostodóncica" },
  { key: "orthodontic", label: "Fase ortodóncica" },
  { key: "maintenance", label: "Mantenimiento" },
  { key: "other", label: "Otros" },
];

function matchRules(text: string): ClinicalPhaseGroupKey | null {
  return RULES.find((rule) => rule.words.some((word) => mentions(text, word)))?.key ?? null;
}

export function clinicalPhaseGroup(item: ClinicalPhaseClassifiable): ClinicalPhaseGroupKey {
  // The name is more specific than the catalogue specialty, which only breaks ties.
  return (
    matchRules(`${normalized(item.treatmentCode)} ${normalized(item.label)}`) ??
    (item.specialty ? matchRules(normalized(item.specialty)) : null) ??
    "other"
  );
}

export function groupByClinicalPhase<T extends ClinicalPhaseClassifiable>(
  items: readonly T[],
): Array<{ key: ClinicalPhaseGroupKey; label: string; items: T[] }> {
  const buckets = new Map<ClinicalPhaseGroupKey, T[]>();
  for (const item of items) {
    const key = clinicalPhaseGroup(item);
    buckets.set(key, [...(buckets.get(key) ?? []), item]);
  }
  return CLINICAL_PHASE_GROUPS.flatMap((group) => {
    const groupItems = buckets.get(group.key);
    return groupItems ? [{ ...group, items: groupItems }] : [];
  });
}
