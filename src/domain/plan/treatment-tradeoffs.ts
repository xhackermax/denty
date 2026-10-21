import { normalized } from "./treatment-phase.ts";
import { ARGUMENT_BANK } from "./tradeoff-catalog/argument-bank.ts";
import { TREATMENT_MATRIX } from "./tradeoff-catalog/treatment-matrix.ts";
import type { TradeoffEntry } from "./tradeoff-catalog/types.ts";

export interface TradeoffClassifiable {
  treatmentCode: string;
  label: string;
  tooth?: string | null | undefined;
}

export interface TreatmentTradeoffs {
  advantages: string[];
  disadvantages: string[];
}

// Bank entries first: they are full sentences written for the patient, the matrix is terser.
export const TRADEOFF_ENTRIES: readonly TradeoffEntry[] = [...ARGUMENT_BANK, ...TREATMENT_MATRIX];

const ENTRIES_BY_ID = new Map(TRADEOFF_ENTRIES.map((entry) => [entry.id, entry]));

export function tradeoffEntry(id: string): TradeoffEntry | undefined {
  return ENTRIES_BY_ID.get(id);
}

const ENDODONTICS = [
  "b.endodoncia-restauracion",
  "m.endodoncia-unirradicular",
  "m.endodoncia-multirradicular",
];
const PERIODONTAL_THERAPY = [
  "b.tratamiento-periodontal-conservador",
  "m.instrumentacion-subgingival-raspado-y-alisado-radicular",
];
const CROWN = ["b.corona-completa", "m.corona-de-zirconia", "m.corona-completa"];
const FILLING = [
  "b.obturacion-de-composite",
  "m.obturacion-de-composite",
  "m.obturacion-de-ionomero-de-vidrio",
];
const EXTRACTION = [
  "b.extraccion-sin-reposicion",
  "m.exodoncia-simple",
  "m.extraccion-sin-preservacion-alveolar",
  "m.extraccion-con-preservacion-alveolar",
];
const BRIDGE = [
  "b.puente-fijo-convencional",
  "m.puente-fijo-convencional",
  "m.puente-adhesivo-tipo-maryland",
];
const BONE_GRAFT = ["m.regeneracion-osea-guiada", "m.injerto-oseo-en-bloque"];

// The clinic catalog codes are broad ("Endodoncia"); each maps to the catalog rows a dentist
// would explain for it, most usual first. Codes outside this table fall back to the label.
const CODE_ENTRIES: Readonly<Record<string, readonly string[]>> = {
  IMPLANT: ["b.implante-unitario", "m.implante-unitario-corona", "m.implantes-para-varios-dientes"],
  CROWN_ZIRCONIA: CROWN,
  CROWN,
  ENDODONTICS,
  ENDO: ENDODONTICS,
  ENDODONCIA_UNIRRADICULAR: ["b.endodoncia-restauracion", "m.endodoncia-unirradicular"],
  POST: ["b.poste-reconstruccion", "m.reconstruccion-con-poste-y-munon"],
  FILLING,
  CARIES: FILLING,
  EXTRACTION,
  BRIDGE,
  PONTIC: BRIDGE,
  PROSTHESIS: [...BRIDGE, "m.puente-sobre-implantes"],
  REMOVABLE: [
    "b.protesis-parcial-removible",
    "m.protesis-parcial-esqueletica",
    "m.protesis-parcial-acrilica",
    "m.protesis-removible-flexible",
  ],
  DENTURE: [
    "b.protesis-completa-convencional",
    "m.protesis-completa-convencional",
    "m.protesis-completa-inmediata",
  ],
  SPLINT: [
    "b.ferula-de-estabilizacion",
    "m.ferula-de-estabilizacion-personalizada",
    "b.ferula-con-controles",
  ],
  SPLINT_REVIEW: ["b.ferula-con-controles", "m.ferula-controles-periodicos"],
  HYGIENE: ["m.profilaxis-profesional"],
  ORAL_HYGIENE: ["m.programa-de-higiene-individualizado"],
  CHECKUP: ["m.revisiones-preventivas"],
  ROOT_PLANING: PERIODONTAL_THERAPY,
  PERIODONTICS: PERIODONTAL_THERAPY,
  TRATAMIENTO_PERIODONTAL_POR_CUADRANTES: PERIODONTAL_THERAPY,
  PERIO_REVIEW: ["m.mantenimiento-periodontal"],
  PERIO_MAINTENANCE: ["m.mantenimiento-periodontal"],
  PERIO_SURGERY: [
    "b.cirugia-periodontal",
    "m.cirugia-periodontal-de-acceso",
    "m.cirugia-periodontal-resectiva",
    "m.regeneracion-periodontal",
  ],
  GINGIVECTOMY: ["m.gingivectomia-estetica", "m.gingivoplastia"],
  BONE_GRAFT,
  TITANIUM_MESH: BONE_GRAFT,
  WHITENING: [
    "b.blanqueamiento-supervisado",
    "m.blanqueamiento-en-consulta",
    "m.blanqueamiento-domiciliario-supervisado",
  ],
  VENEER: ["b.carillas-de-composite", "b.carillas-ceramicas"],
  RETENEDOR_LINGUAL: ["m.retenedor-fijo"],
  RETENEDOR_ESSIX: ["m.retenedor-removible"],
  ALINEADOR_ORTODONCIA_INVISIBLE: ["b.alineadores", "m.ortodoncia-con-alineadores"],
};

// Baby teeth (FDI quadrants 5-8) have their own pediatric rows.
const PRIMARY_TOOTH_ENTRIES: Readonly<Record<string, readonly string[]>> = {
  ENDODONTICS: ["m.pulpotomia-temporal", "m.pulpectomia-temporal"],
  ENDO: ["m.pulpotomia-temporal", "m.pulpectomia-temporal"],
  FILLING: ["m.obturacion-en-diente-temporal"],
  CARIES: ["m.obturacion-en-diente-temporal", "m.diamino-fluoruro-de-plata"],
  CROWN: ["b.corona-pediatrica", "m.corona-preformada-metalica", "m.tecnica-de-hall"],
  CROWN_ZIRCONIA: ["b.corona-pediatrica", "m.corona-preformada-metalica"],
  EXTRACTION: ["b.extraccion-de-diente-temporal", "m.extraccion-de-temporal-no-conservable"],
};

const MAX_CANDIDATES = 6;

const STOP_WORDS = new Set([
  "con",
  "sin",
  "por",
  "del",
  "las",
  "los",
  "para",
  "tipo",
  "sobre",
  "frente",
]);

// Six-letter stems so "implante", "implantes" and "implantaria" meet, and "zirconio" meets
// "zirconia", without pulling in a stemmer.
function stems(text: string): Set<string> {
  return new Set(
    normalized(text)
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word) && !/^\d+$/.test(word))
      .map((word) => word.slice(0, 6)),
  );
}

const ENTRY_STEMS = new Map(TRADEOFF_ENTRIES.map((entry) => [entry.id, stems(entry.name)]));

function toothKind(tooth: string | null | undefined): "primary" | "molar" | "other" {
  const match = /^([1-8])([1-8])$/.exec(tooth?.trim() ?? "");
  if (!match) return "other";
  if (Number(match[1]) >= 5) return "primary";
  return Number(match[2]) >= 6 ? "molar" : "other";
}

function codeEntryIds(item: TradeoffClassifiable): readonly string[] {
  const code = item.treatmentCode.trim().toUpperCase();
  const kind = toothKind(item.tooth);
  if (kind === "primary" && PRIMARY_TOOTH_ENTRIES[code]) return PRIMARY_TOOTH_ENTRIES[code];
  const ids = CODE_ENTRIES[code] ?? [];
  // A molar root canal is the multi-rooted one; list it before the single-rooted row.
  return kind === "molar" ? [...ids].sort((left, right) => rootRank(left) - rootRank(right)) : ids;
}

function rootRank(id: string): number {
  if (id === "m.endodoncia-multirradicular") return 0;
  if (id === "m.endodoncia-unirradicular") return 1;
  return id.startsWith("b.") ? -1 : 2;
}

/**
 * Rows whose name contains every meaningful word of the label. Exact names, and any hit for a
 * label of two or more words ("corona sobre implante"), are more specific than the code.
 */
function labelEntryIds(label: string): { specific: string[]; loose: string[] } {
  const wanted = stems(label);
  if (!wanted.size) return { specific: [], loose: [] };
  const hits: Array<{ id: string; extra: number }> = [];
  for (const [id, have] of ENTRY_STEMS) {
    if ([...wanted].every((stem) => have.has(stem)))
      hits.push({ id, extra: have.size - wanted.size });
  }
  // Patient sentences first, then the closest name; ties keep the document order.
  hits.sort(
    (left, right) =>
      Number(right.id.startsWith("b.")) - Number(left.id.startsWith("b.")) ||
      left.extra - right.extra,
  );
  const isSpecific = (hit: { extra: number }) => hit.extra === 0 || wanted.size > 1;
  return {
    specific: hits.filter(isSpecific).map((hit) => hit.id),
    loose: hits.filter((hit) => !isSpecific(hit)).map((hit) => hit.id),
  };
}

/**
 * Catalog rows that may describe a planned treatment, best first. The dentist chooses among
 * them; nothing here decides the treatment or claims the row fits this patient.
 */
export function tradeoffEntriesFor(item: TradeoffClassifiable): TradeoffEntry[] {
  const byLabel = labelEntryIds(item.label);
  const byCode = codeEntryIds(item);
  // Adult rows found by a loose label word would be wrong for a baby tooth.
  const loose = toothKind(item.tooth) === "primary" && byCode.length ? [] : byLabel.loose;
  const ids = new Set([...byLabel.specific, ...byCode, ...loose]);
  return [...ids]
    .slice(0, MAX_CANDIDATES)
    .map((id) => ENTRIES_BY_ID.get(id))
    .filter((entry): entry is TradeoffEntry => entry !== undefined);
}

/** Pros and cons of the best catalog row of each treatment, for when the dentist wrote none. */
export function suggestedTradeoffs(items: readonly TradeoffClassifiable[]): TreatmentTradeoffs {
  const advantages = new Set<string>();
  const disadvantages = new Set<string>();
  for (const item of items) {
    const [entry] = tradeoffEntriesFor(item);
    entry?.advantages.forEach((phrase) => advantages.add(phrase.text));
    entry?.disadvantages.forEach((phrase) => disadvantages.add(phrase.text));
  }
  return { advantages: [...advantages], disadvantages: [...disadvantages] };
}
