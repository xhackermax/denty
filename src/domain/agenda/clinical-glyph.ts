import type { ToothState, ToothSurface } from "../odontogram";

export interface ClinicalGlyphInput {
  tooth?: string | null | undefined;
  surfaces?: readonly string[] | null | undefined;
  treatmentCode?: string | null | undefined;
  label?: string | null | undefined;
  completed?: boolean | undefined;
  appointmentReason?: string | null | undefined;
  planStatus?: string | null | undefined;
  clinicalStatus?: string | null | undefined;
}

export type ClinicalIconFamily =
  | "restorative_surface"
  | "extraction"
  | "surgery"
  | "endodontics"
  | "implantology"
  | "crown"
  | "fixed_prosthesis"
  | "removable_prosthesis"
  | "complete_denture"
  | "occlusal_splint"
  | "orthodontics"
  | "periodontal_hygiene"
  | "sealant"
  | "indirect_restoration"
  | "whitening"
  | "imaging"
  | "diagnostic"
  | "review"
  | "emergency";

export interface ClinicalGlyphModel {
  tooth: string | null;
  state: ToothState | null;
  surfaces: readonly ToothSurface[];
  urgent: boolean;
  label: string;
  family: ClinicalIconFamily;
  location: string | null;
  clinicalState: "pending" | "redo";
}

export const CLINICAL_FAMILY_LABELS: Readonly<Record<ClinicalIconFamily, string>> = {
  restorative_surface: "Conservadora",
  extraction: "Extracción",
  surgery: "Cirugía",
  endodontics: "Endodoncia",
  implantology: "Implantología",
  crown: "Corona",
  fixed_prosthesis: "Prótesis fija",
  removable_prosthesis: "Prótesis removible",
  complete_denture: "Prótesis total",
  occlusal_splint: "Férula de descarga",
  orthodontics: "Ortodoncia",
  periodontal_hygiene: "Higiene / Periodoncia",
  sealant: "Sellador",
  indirect_restoration: "Restauración indirecta",
  whitening: "Blanqueamiento",
  imaging: "Radiología / Registros",
  diagnostic: "Estudio / Diagnóstico",
  review: "Revisión",
  emergency: "Urgencia",
};

const CODE_FAMILIES: Readonly<Record<string, ClinicalIconFamily>> = {
  FILLING: "restorative_surface",
  RESTORATION: "restorative_surface",
  CARIES: "restorative_surface",
  CROWN: "crown",
  CROWN_ZIRCONIA: "crown",
  PEDIATRIC_CROWN: "crown",
  ENDODONTICS: "endodontics",
  ENDO: "endodontics",
  PULPOTOMY: "endodontics",
  PULPECTOMY: "endodontics",
  IMPLANT: "implantology",
  EXTRACTION: "extraction",
  SURGERY: "surgery",
  SURGICAL_EXTRACTION: "surgery",
  BRIDGE: "fixed_prosthesis",
  FIXED_PROSTHESIS: "fixed_prosthesis",
  REMOVABLE: "removable_prosthesis",
  COMPLETE_DENTURE: "complete_denture",
  SPLINT: "occlusal_splint",
  ORTHODONTICS: "orthodontics",
  ORTHO: "orthodontics",
  HYGIENE: "periodontal_hygiene",
  PROPHYLAXIS: "periodontal_hygiene",
  SCALING: "periodontal_hygiene",
  SEALANT: "sealant",
  INLAY: "indirect_restoration",
  ONLAY: "indirect_restoration",
  VENEER: "indirect_restoration",
  WHITENING: "whitening",
  CBCT: "imaging",
  XRAY: "imaging",
  DIAGNOSIS: "diagnostic",
  REVIEW: "review",
  CHECKUP: "review",
  PROSTHESIS: "fixed_prosthesis",
  POST: "endodontics",
  EMERGENCY: "emergency",
};
// Specific families precede general ones: a surgical extraction is not a simple extraction.
const KEYWORD_FAMILIES: ReadonlyArray<readonly [RegExp, ClinicalIconFamily]> = [
  [/cirug|quirurg|incluido|apicect|injerto|regeneraci|elevacion de seno|colgajo/, "surgery"],
  [/implant/, "implantology"],
  [/endodon|pulpot|pulpect|intraconducto|perno/, "endodontics"],
  [/puente|protesis fija|provisional fijo|prueba de estructura/, "fixed_prosthesis"],
  [/protesis (?:total|completa)|dentadura|(?:prueba|ajuste) de total/, "complete_denture"],
  [/removible|esqueletico|rebase/, "removable_prosthesis"],
  [/ferula/, "occlusal_splint"],
  [/ortodon|bracket|alineador|retenedor|mantenedor de espacio/, "orthodontics"],
  [/profilaxis|tartrect|raspado|higiene|limpieza|periodont|desbrid/, "periodontal_hygiene"],
  [/inlay|onlay|overlay|carilla/, "indirect_restoration"],
  [/corona/, "crown"],
  [/sellad/, "sealant"],
  [/caries|obtur|empaste|restaura|reconstru/, "restorative_surface"],
  [/extrac|exodon|resto radicular/, "extraction"],
  [/blanque/, "whitening"],
  [/radiograf|periapical|bitewing|panoramic|cbct|escan|registros/, "imaging"],
  [/primera visita|estudio|diagnost|plan de tratamiento/, "diagnostic"],
  [/urgenc|dolor|fractura|inflamacion aguda/, "emergency"],
  [/revision|control/, "review"],
];
const FDI = "(?:[1-4][1-8]|[5-8][1-5])";
const VALID_SURFACES = new Set<ToothSurface>(["V", "M", "O", "I", "D", "P", "L"]);
const TOOTH_FAMILIES = new Set<ClinicalIconFamily>([
  "restorative_surface",
  "extraction",
  "surgery",
  "endodontics",
  "implantology",
  "crown",
  "fixed_prosthesis",
  "sealant",
  "indirect_restoration",
  "imaging",
  "diagnostic",
  "review",
  "emergency",
]);

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function locationFor(input: ClinicalGlyphInput, family: ClinicalIconFamily, label: string) {
  const explicit = input.tooth?.trim();
  const tooth = explicit && new RegExp(`^${FDI}$`).test(explicit) ? explicit : null;
  if (
    family === "removable_prosthesis" ||
    family === "complete_denture" ||
    family === "orthodontics"
  ) {
    return {
      tooth: null,
      location: /\bsup\b|superior/.test(label)
        ? "SUP"
        : /\binf\b|inferior/.test(label)
          ? "INF"
          : null,
    };
  }
  if (family === "periodontal_hygiene" || family === "surgery") {
    const quadrant = /\bQ[1-4](?:\s*[-–]\s*Q[1-4])?\b/i.exec(label)?.[0];
    if (quadrant && !tooth)
      return { tooth: null, location: quadrant.toUpperCase().replace(/\s*[-–]\s*/, "–") };
  }
  if (!TOOTH_FAMILIES.has(family)) return { tooth: null, location: null };
  // Explicit plan data wins over free-text notes. Never mistake a time, age or duration for a tooth.
  if (tooth) return { tooth, location: tooth };
  const explicitRange = explicit && new RegExp(`^(${FDI})\\s*[-–]\\s*(${FDI})$`).exec(explicit);
  if (
    explicitRange &&
    ["implantology", "fixed_prosthesis", "indirect_restoration"].includes(family)
  ) {
    return { tooth: explicitRange[1] ?? null, location: `${explicitRange[1]}–${explicitRange[2]}` };
  }
  const clinicalText = label
    .replace(/\b\d{1,2}:\d{2}\b/g, "")
    .replace(/\b\d+\s*(?:meses|anos|minutos|min|h|horas)\b/g, "");
  const range = new RegExp(`\\b(${FDI})\\s*[-–]\\s*(${FDI})\\b`).exec(clinicalText);
  if (range && ["implantology", "fixed_prosthesis", "indirect_restoration"].includes(family)) {
    return { tooth: range[1] ?? null, location: `${range[1]}–${range[2]}` };
  }
  const inferred = new RegExp(`\\b(${FDI})\\b`).exec(clinicalText)?.[1] ?? null;
  return { tooth: inferred, location: inferred };
}

function surfacesFor(input: ClinicalGlyphInput, label: string): ToothSurface[] {
  let values = input.surfaces;
  if (!values?.length) {
    const code = /\b([MODVIPL]{1,5})\b/.exec(input.label ?? "")?.[1];
    values = code
      ? [...code]
      : [
          ...(/mesial/.test(label) ? ["M"] : []),
          ...(/distal/.test(label) ? ["D"] : []),
          ...(/oclusal/.test(label) ? ["O"] : []),
          ...(/incisal/.test(label) ? ["I"] : []),
          ...(/vestibular|bucal/.test(label) ? ["V"] : []),
          ...(/palatin/.test(label) ? ["P"] : []),
          ...(/lingual/.test(label) ? ["L"] : []),
        ];
  }
  return [...new Set(values.map((surface) => surface.trim().toUpperCase()))].filter(
    (surface): surface is ToothSurface => VALID_SURFACES.has(surface as ToothSurface),
  );
}

export function clinicalGlyphFor(input: ClinicalGlyphInput): ClinicalGlyphModel | null {
  // Completion belongs to the plan or appointment; an existing blue tooth alone does
  // not cancel a new control appointment. Historical appointments remain in the agenda.
  if (input.completed || /^(COMPLETED|CANCELLED|SUPERSEDED)$/i.test(input.planStatus ?? ""))
    return null;
  const label = input.label?.trim() ?? "";
  const text = normalize(label);
  const code = input.treatmentCode?.trim().toUpperCase();
  const family =
    (code ? CODE_FAMILIES[code] : null) ??
    KEYWORD_FAMILIES.find(([pattern]) => pattern.test(text))?.[1];
  if (!family) return null;
  const urgent = /urgenc|dolor|inflamacion aguda/.test(
    `${text} ${normalize(input.appointmentReason ?? "")}`,
  );
  const clinicalState =
    /unsatisfactory|_bad\b|implant_review|redo|retrat/.test(input.clinicalStatus ?? "") ||
    /insatisfact|a repetir|rehacer|reendodon/.test(text)
      ? "redo"
      : "pending";
  const { tooth, location } = locationFor(input, family, text);
  const states: Partial<Record<ClinicalIconFamily, ToothState>> = {
    restorative_surface:
      clinicalState === "redo"
        ? "filling_bad"
        : /caries/.test(text) || code === "CARIES"
          ? "caries"
          : "filling_pending",
    crown: clinicalState === "redo" ? "crown_bad" : "crown_pending",
    endodontics:
      code === "POST" || (!(code && CODE_FAMILIES[code]) && /perno/.test(text))
        ? clinicalState === "redo"
          ? "post_bad"
          : "post_pending"
        : clinicalState === "redo"
          ? "endo_bad"
          : "endo_indicated",
    implantology: clinicalState === "redo" ? "implant_review" : "implant_indicated",
    extraction: "extraction",
    fixed_prosthesis: clinicalState === "redo" ? "prosthesis_bad" : "prosthesis_pending",
    removable_prosthesis: clinicalState === "redo" ? "removable_bad" : "removable_pending",
  };
  return {
    tooth,
    location,
    family,
    clinicalState,
    state: states[family] ?? null,
    surfaces:
      family === "restorative_surface" || family === "sealant" ? surfacesFor(input, text) : [],
    urgent,
    label,
  };
}

/** Only explicit separators split free-text treatments; linked plan data stays authoritative. */
export function agendaClinicalGlyphs(input: ClinicalGlyphInput): readonly ClinicalGlyphModel[] {
  const labels =
    input.treatmentCode || input.tooth || input.surfaces?.length
      ? [input.label ?? ""]
      : (input.label ?? "").split(/\s*(?:;|\n|\s\+\s)\s*/);
  return labels.flatMap((label) => {
    const glyph = clinicalGlyphFor({ ...input, label });
    return glyph ? [glyph] : [];
  });
}
