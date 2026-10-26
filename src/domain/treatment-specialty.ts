import { isPrimaryTooth } from "./odontogram/clinical-rules/anatomy.ts";
import { mentions, normalized } from "./plan/treatment-phase.ts";

/**
 * Specialty a completed treatment counts towards in doctor analytics. Finer than the plan's
 * clinical phases: endodontics, implants and paediatrics are reported on their own.
 */
export type TreatmentSpecialty =
  | "conservative"
  | "endodontics"
  | "periodontics"
  | "surgery"
  | "implants"
  | "prosthesis"
  | "orthodontics"
  | "pediatrics"
  | "aesthetics"
  | "prevention"
  | "other";

export const TREATMENT_SPECIALTIES: ReadonlyArray<{ key: TreatmentSpecialty; label: string }> = [
  { key: "conservative", label: "General / conservadora" },
  { key: "endodontics", label: "Endodoncia" },
  { key: "periodontics", label: "Periodoncia" },
  { key: "surgery", label: "Cirugía" },
  { key: "implants", label: "Implantes" },
  { key: "prosthesis", label: "Prótesis" },
  { key: "orthodontics", label: "Ortodoncia" },
  { key: "pediatrics", label: "Odontopediatría" },
  { key: "aesthetics", label: "Estética" },
  { key: "prevention", label: "Higiene y prevención" },
  { key: "other", label: "Otros" },
];

export interface SpecialtyClassifiable {
  treatmentCode?: string | null | undefined;
  label?: string | null | undefined;
  /** Catalogue category frozen on the plan item (e.g. RESTORATION, IMPLANTOLOGY). */
  category?: string | null | undefined;
  /** Catalogue specialty frozen on the plan item (e.g. SURGERY, PERIODONTICS). */
  specialty?: string | null | undefined;
  tooth?: string | null | undefined;
}

const CATALOG_CODES: Readonly<Record<string, TreatmentSpecialty>> = {
  RESTORATION: "conservative",
  CONSERVATIVE: "conservative",
  GENERAL: "conservative",
  ENDODONTICS: "endodontics",
  PERIODONTICS: "periodontics",
  SURGERY: "surgery",
  IMPLANT: "implants",
  IMPLANTS: "implants",
  IMPLANTOLOGY: "implants",
  PROSTHESIS: "prosthesis",
  PROSTHODONTICS: "prosthesis",
  SPLINT: "prosthesis",
  ORTHODONTICS: "orthodontics",
  PEDIATRICS: "pediatrics",
  PEDODONTICS: "pediatrics",
  AESTHETICS: "aesthetics",
  PREVENTION: "prevention",
  HYGIENE: "prevention",
};

const PEDIATRIC_WORDS = ["pediatr", "pedodon", "infantil", "pulpotom"];

// Only used when the catalogue gives no usable category (ad-hoc or legacy items).
// Order matters: "corona sobre implante" is prosthetic work, "cirugía periodontal" is perio.
const KEYWORD_RULES: ReadonlyArray<{ key: TreatmentSpecialty; words: readonly string[] }> = [
  { key: "periodontics", words: ["periodon", "perio", "raspado", "curetaje", "alisado", "gingiv"] },
  {
    key: "prosthesis",
    words: [
      "corona",
      "crown",
      "puente",
      "bridge",
      "protesis",
      "prosthe",
      "dentadura",
      "removible",
      "carilla",
      "veneer",
      "incrustacion",
      "onlay",
      "inlay",
      "perno",
      "pilar",
      "abutment",
      "ferula",
      "splint",
    ],
  },
  { key: "implants", words: ["implant"] },
  { key: "endodontics", words: ["endodon", "conducto", "pulpect", "apicoform"] },
  {
    key: "orthodontics",
    words: ["ortodon", "orthodon", "alineador", "aligner", "bracket", "retenedor"],
  },
  {
    key: "surgery",
    words: [
      "extrac",
      "exodon",
      "injerto",
      "graft",
      "seno",
      "sinus",
      "cirugia",
      "surgery",
      "quirurg",
      "frenectom",
      "apicect",
    ],
  },
  {
    key: "conservative",
    words: ["obtura", "filling", "empaste", "restaura", "reconstru", "caries"],
  },
  { key: "aesthetics", words: ["blanque", "whiten", "estetic", "aesthet"] },
  {
    key: "prevention",
    words: [
      "higiene",
      "hygiene",
      "limpieza",
      "tartrect",
      "sellad",
      "sealant",
      "fluor",
      "revision",
      "checkup",
    ],
  },
];

function fromCatalog(value: string | null | undefined): TreatmentSpecialty | null {
  return CATALOG_CODES[(value ?? "").trim().toUpperCase()] ?? null;
}

export function treatmentSpecialty(item: SpecialtyClassifiable): TreatmentSpecialty {
  const text = normalized(
    [item.treatmentCode, item.label, item.category, item.specialty].filter(Boolean).join(" "),
  );
  // Work on a primary tooth is paediatric dentistry whatever the procedure is.
  if (isPrimaryTooth(item.tooth ?? undefined) || PEDIATRIC_WORDS.some((w) => mentions(text, w))) {
    return "pediatrics";
  }
  return (
    fromCatalog(item.category) ??
    fromCatalog(item.specialty) ??
    KEYWORD_RULES.find((rule) => rule.words.some((word) => mentions(text, word)))?.key ??
    "other"
  );
}

export function specialtyLabel(key: string): string {
  return TREATMENT_SPECIALTIES.find((item) => item.key === key)?.label ?? key;
}
