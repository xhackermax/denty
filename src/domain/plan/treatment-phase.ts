/**
 * Native two-phase budgeting. The primary phase controls disease and pain (extractions, root
 * canals, periodontics, night guards, fillings); the secondary phase rebuilds and improves
 * (implants, orthodontics, fixed and removable prostheses, posts, whitening). Patients usually
 * accept and pay the first phase before committing to the second.
 */
export type TreatmentPhase = "primary" | "secondary";

export interface PhaseClassifiable {
  treatmentCode: string;
  label: string;
}

// Matched on the code and the name, without accents; secondary wins when both appear
// ("extracción y colocación de implante" is an implant procedure).
const SECONDARY = [
  "implant",
  "abutment",
  "pilar",
  "corona",
  "crown",
  "puente",
  "bridge",
  "prosthe",
  "protesis",
  "removable",
  "removible",
  "dentadura",
  "perno",
  "post",
  "blanque",
  "whiten",
  "ortodon",
  "orthodon",
  "alineador",
  "aligner",
  "bracket",
  "carilla",
  "veneer",
  "incrustacion",
  "onlay",
  "inlay",
  "seno",
  "sinus",
  "injerto",
  "graft",
  "membrana",
  "membrane",
  "malla",
  "mesh",
  "regeneracion osea",
  "guided_surgery",
  "cirugia guiada",
  "tibase",
  "locator",
];

const PRIMARY = [
  "extrac",
  "exodon",
  "endodon",
  "conducto",
  "pulpo",
  "pulpect",
  "obtura",
  "filling",
  "restaura",
  "empaste",
  "caries",
  "periodon",
  "raspado",
  "curetaje",
  "alisado",
  "gingiv",
  "ferula",
  "splint",
  "higiene",
  "hygiene",
  "limpieza",
  "sellado",
  "fluor",
];

// Short words only count whole: "post" must not catch "postoperatorio".
const WHOLE_WORDS = new Set(["post", "pilar", "seno", "malla", "inlay", "onlay"]);

export function normalized(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/_/g, " ")
    .toLowerCase();
}

export function mentions(text: string, word: string): boolean {
  const token = word.replace(/_/g, " ");
  return WHOLE_WORDS.has(word)
    ? new RegExp(`(^|[^a-z])${token}([^a-z]|$)`).test(text)
    : text.includes(token);
}

export function treatmentPhase(item: PhaseClassifiable): TreatmentPhase {
  const text = `${normalized(item.treatmentCode)} ${normalized(item.label)}`;
  if (SECONDARY.some((word) => mentions(text, word))) return "secondary";
  if (PRIMARY.some((word) => mentions(text, word))) return "primary";
  // Unknown work stays in the first phase: better quoted early than silently postponed.
  return "primary";
}

const CLOSED = new Set(["CANCELLED", "SUPERSEDED", "COMPLETED", "DONE"]);

export function splitPlanByPhase<T extends PhaseClassifiable & { status: string }>(
  items: readonly T[],
): Record<TreatmentPhase, T[]> {
  const phases: Record<TreatmentPhase, T[]> = { primary: [], secondary: [] };
  for (const item of items) {
    if (CLOSED.has(item.status.toUpperCase())) continue;
    phases[treatmentPhase(item)].push(item);
  }
  return phases;
}

export const TREATMENT_PHASE_LABELS: Record<TreatmentPhase, { title: string; summary: string }> = {
  primary: {
    title: "Fase 1 · Salud y urgencias",
    summary:
      "Quitar dolor e infección y frenar la enfermedad: extracciones, endodoncias, encías, férulas y empastes.",
  },
  secondary: {
    title: "Fase 2 · Reponer y mejorar",
    summary:
      "Reponer dientes y mejorar la mordida y la estética: implantes, prótesis, pernos, ortodoncia y blanqueamiento.",
  },
};
