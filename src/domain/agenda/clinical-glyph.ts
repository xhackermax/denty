import type { ToothState, ToothSurface } from "../odontogram";

/**
 * Maps an appointment's clinical context to the odontogram's own vocabulary so the
 * agenda never invents a separate icon system: the glyph is the same tooth, with the
 * same surfaces and the same state colors as the odontogram.
 */
export interface ClinicalGlyphInput {
  tooth?: string | null | undefined;
  surfaces?: readonly string[] | null | undefined;
  treatmentCode?: string | null | undefined;
  label?: string | null | undefined;
  completed?: boolean | undefined;
}

export interface ClinicalGlyphModel {
  tooth: string | null;
  /** Odontogram state; null when the treatment has no tooth-level drawing. */
  state: ToothState | null;
  /** Empty means the state applies to the whole tooth. */
  surfaces: readonly ToothSurface[];
  urgent: boolean;
  label: string;
}

type TreatmentFamily = "filling" | "crown" | "endo" | "implant" | "extraction" | "caries";

const CODE_FAMILIES: Readonly<Record<string, TreatmentFamily>> = {
  FILLING: "filling",
  RESTORATION: "filling",
  CROWN: "crown",
  CROWN_ZIRCONIA: "crown",
  ENDODONTICS: "endo",
  ENDO: "endo",
  IMPLANT: "implant",
  EXTRACTION: "extraction",
  CARIES: "caries",
};

const KEYWORD_FAMILIES: ReadonlyArray<readonly [RegExp, TreatmentFamily]> = [
  [/implant/i, "implant"],
  [/endodon/i, "endo"],
  [/corona/i, "crown"],
  [/obtura|empaste|restaura/i, "filling"],
  [/extrac|exodon/i, "extraction"],
  [/caries/i, "caries"],
];

const URGENT_PATTERN = /urgenc|dolor/i;
// FDI notation: permanent 11–48, primary 51–85.
const FDI_TOOTH_PATTERN = /\b([1-4][1-8]|[5-8][1-5])\b/;
const VALID_SURFACES = new Set<ToothSurface>(["V", "M", "O", "I", "D", "P", "L"]);

function familyFor(input: ClinicalGlyphInput): TreatmentFamily | null {
  const code = input.treatmentCode?.trim().toUpperCase();
  if (code && CODE_FAMILIES[code]) return CODE_FAMILIES[code];
  const label = input.label ?? "";
  return KEYWORD_FAMILIES.find(([pattern]) => pattern.test(label))?.[1] ?? null;
}

function stateFor(family: TreatmentFamily, completed: boolean): ToothState {
  switch (family) {
    case "filling":
      return completed ? "filling" : "filling_pending";
    case "crown":
      return completed ? "crown" : "crown_pending";
    case "endo":
      return completed ? "endo" : "endo_indicated";
    case "implant":
      return completed ? "implant" : "implant_indicated";
    case "extraction":
      return completed ? "missing" : "extraction";
    case "caries":
      return completed ? "filling" : "caries";
  }
}

function normalizeSurfaces(surfaces: ClinicalGlyphInput["surfaces"]): ToothSurface[] {
  return [...new Set((surfaces ?? []).map((surface) => surface.trim().toUpperCase()))].filter(
    (surface): surface is ToothSurface => VALID_SURFACES.has(surface as ToothSurface),
  );
}

export function clinicalGlyphFor(input: ClinicalGlyphInput): ClinicalGlyphModel | null {
  const label = input.label?.trim() ?? "";
  const urgent = URGENT_PATTERN.test(label);
  const family = familyFor(input);
  const explicitTooth = input.tooth?.trim() || null;
  // A tooth mentioned in free text only counts when the text also names a treatment.
  const inferredTooth = family ? (FDI_TOOTH_PATTERN.exec(label)?.[1] ?? null) : null;
  const tooth = explicitTooth ?? inferredTooth;

  if (!tooth && !urgent) return null;
  return {
    tooth,
    state: tooth && family ? stateFor(family, input.completed ?? false) : null,
    surfaces: family === "filling" || family === "caries" ? normalizeSurfaces(input.surfaces) : [],
    urgent,
    label,
  };
}
