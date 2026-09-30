import type { ToothSurface } from "@/domain";

import { canonicalizeDentalSpeech, hasSelfCorrection } from "./dental-normalizer";

export type PaymentMethod = "CARD" | "CASH" | "TRANSFER" | "FINANCING";
export type ClinicalTreatmentState = "PLANNED" | "COMPLETED" | "UNSATISFACTORY";

type ClinicalTreatmentAction = {
  type: "clinical.add_item" | "clinical.complete_item" | "clinical.mark_unsatisfactory";
  patientRef: string;
  tooth?: string;
  treatmentCode: string;
  label: string;
  surfaces: ToothSurface[];
};

export type LocalVoiceAction =
  | { type: "patient.create"; firstName: string; lastName: string; phone?: string; dni?: string }
  | { type: "patient.resolve"; query: string }
  | { type: "navigation.patient"; patientRef: string }
  | { type: "navigation.open"; destination: string }
  | { type: "appointment.arrive"; patientRef: string }
  | { type: "appointment.no_show"; patientRef: string }
  | {
      type: "appointment.schedule";
      patientRef: string;
      dateText: string;
      timeText?: string;
      durationMin?: number;
      staffRef?: string;
      treatmentCode?: string;
    }
  | {
      type: "appointment.reschedule";
      patientRef: string;
      dateText: string;
      timeText?: string;
      durationMin?: number;
      staffRef?: string;
    }
  | ClinicalTreatmentAction
  | {
      type: "clinical.add_dependency";
      patientRef: string;
      tooth: string;
      beforeCode: string;
      afterCode: string;
    }
  | { type: "clinical.note"; patientRef: string; text: string; literalFallback?: boolean }
  | { type: "clinical.alert"; patientRef: string; text: string; severity: "HIGH" }
  | { type: "clinical.prosthesis_options"; patientRef: string; teeth: string[] }
  | {
      type: "odontogram.set_state";
      patientRef: string;
      tooth: string;
      status: "CARIES" | "HEALTHY" | "MISSING";
      surfaces?: ToothSurface[];
    }
  | {
      type: "odontogram.bridge";
      patientRef: string;
      teeth: string[];
      missingTeeth: string[];
      status: ClinicalTreatmentState;
    }
  | {
      type: "odontogram.removable";
      patientRef: string;
      teeth: string[];
      arch: "UPPER" | "LOWER" | "UNSPECIFIED";
    }
  | {
      type: "periodontal.update";
      patientRef: string;
      tooth: string;
      site: string;
      probingDepth?: number;
      recession?: number;
      mobility?: string;
      bleeding?: boolean;
      suppuration?: boolean;
      plaque?: boolean;
    }
  | { type: "budget.sync"; patientRef: string }
  | { type: "payment.record"; patientRef: string; amountCents?: number; method?: PaymentMethod }
  | { type: "lab.transition"; patientRef: string; status: "RECEIVED" };

export interface LocalVoiceContext {
  patientId?: string;
  patientName?: string;
  selectedTooth?: string;
  pathname?: string;
  wake?: boolean;
}

export interface LocalVoicePlan {
  raw: string;
  actions: LocalVoiceAction[];
  ambiguities: string[];
  requiresConfirmation: boolean;
  readback: string;
  confidence: number;
  contextPatientId?: string;
  source: "rules" | "claude";
}

const TREATMENTS: readonly [RegExp, string, string][] = [
  [/apicectom/, "apicoectomy", "Apicectomía"],
  [/reendodon|retratamiento\s+endod|repetir\s+endodon/, "reendodontics", "Reendodoncia"],
  [/endodon|tratamiento\s+de\s+conductos?/, "endodontics", "Endodoncia"],
  [/reconstru|munon|muñon/, "reconstruction", "Reconstrucción"],
  [/perno|poste/, "post", "Perno / poste"],
  [/corona/, "crown", "Corona"],
  [/revis(?:ar|ion).*implante|control.*implante/, "implant_review", "Revisión de implante"],
  [/implante/, "implant", "Implante"],
  [/extracci|exodon|extraer|extraid/, "extraction", "Extracción"],
  [/incrustacion|incrustación|onlay|overlay|inlay/, "inlay", "Incrustación"],
  [/empaste|obturacion|obturación|restauracion|restauración/, "restoration", "Restauración"],
  [/raspado|alisado|periodontal/, "periodontal", "Tratamiento periodontal"],
  [/limpieza|profilaxis|higiene|tartrect|destartraje/, "prophylaxis", "Profilaxis"],
];

const TREATMENT_CUE = new RegExp(
  [
    "apicectom|reendodon|retratamiento|endodon|conductos?",
    "reconstru|munon|muñon|perno|poste|corona|implante",
    "extracci|exodon|extraer|extraid|incrust|onlay|overlay|inlay",
    "empaste|obtur|restaur|raspado|alisado|periodontal",
    "limpieza|profilaxis|higiene|tartrect|destartraje",
  ].join("|"),
);

const FDI_ORDER = [
  "18",
  "17",
  "16",
  "15",
  "14",
  "13",
  "12",
  "11",
  "21",
  "22",
  "23",
  "24",
  "25",
  "26",
  "27",
  "28",
  "48",
  "47",
  "46",
  "45",
  "44",
  "43",
  "42",
  "41",
  "31",
  "32",
  "33",
  "34",
  "35",
  "36",
  "37",
  "38",
] as const;

const HOUR_WORDS: Readonly<Record<string, number>> = {
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciseis: 16,
  diecisiete: 17,
  dieciocho: 18,
  diecinueve: 19,
  veinte: 20,
  veintiuna: 21,
  veintidos: 22,
  veintitres: 23,
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[¿?¡!,;]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripWake(value: string): string {
  return value.replace(/^\s*(?:oye\s+)?denty[,\s:-]*/i, "").trim();
}

function uniq<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts.shift() ?? "", lastName: parts.join(" ") };
}

function extractPhone(raw: string): string | undefined {
  return raw
    .match(/(?:telefono|teléfono|movil|móvil)\s*[:-]?\s*((?:\+?\d[\s-]*){8,15})/i)?.[1]
    ?.replace(/[^\d+]/g, "");
}

function extractDni(raw: string): string | undefined {
  return raw.match(/(?:dni|nie|nif)\s*[:-]?\s*([A-Z0-9-]{6,14})/i)?.[1]?.toUpperCase();
}

// Vowels accept an accent so raw (unnormalized) speech can be matched: "llegó" / "llego".
function accentInsensitive(source: string): string {
  const classes: Record<string, string> = {
    a: "[aá]",
    e: "[eé]",
    i: "[ií]",
    o: "[oó]",
    u: "[uúü]",
  };
  return source.replace(/[aeiou]/g, (vowel) => classes[vowel] ?? vowel);
}

const NAME = "([a-záéíóúüñ]+(?:\\s+[a-záéíóúüñ]+){0,3})";
const ARRIVAL_PHRASES = [
  "ha llegado",
  "ya ha llegado",
  "acaba de llegar",
  "ya esta aqui",
  "esta aqui",
  "ha venido",
  "llego",
  "ha faltado",
  "no vino",
  "no ha venido",
  "no se ha presentado",
  "no se presento",
  "no ha aparecido",
]
  .map(accentInsensitive)
  .join("|");
const NAV_VERBS = [
  "busca",
  "buscar",
  "abre",
  "abrir",
  "encuentra",
  "ver",
  "selecciona",
  "carga",
  "ve",
  "ir",
  "vamos",
  "llevame",
  "muestrame",
  "ensename",
]
  .map(accentInsensitive)
  .join("|");

// A captured name ends where the sentence moves on to a date, a time or a companion.
const NAME_STOP_WORDS = new Set([
  "pasala",
  "pasalo",
  "muevela",
  "muevelo",
  "cambiala",
  "cambialo",
  "ponla",
  "ponlo",
  "no",
  "se",
  "a",
  "al",
  "el",
  "para",
  "con",
  "en",
  "por",
  "que",
  "ya",
  "hoy",
  "manana",
  "pasado",
  "tarde",
  "temprano",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
]);

function trimNameAtStop(candidate: string): string {
  const words = candidate.trim().split(/\s+/);
  const stop = words.findIndex((word) => NAME_STOP_WORDS.has(normalize(word)));
  return (stop < 0 ? words : words.slice(0, stop)).join(" ");
}

function extractFileNumber(raw: string): string | undefined {
  return raw.match(
    new RegExp(
      "\\b(?:ficha|paciente|historia|expediente)\\s+" +
        "(?:(?:n[uú]mero|num\\.?|n[º°o]\\.?|#)\\s*)?(\\d{3,9})\\b",
      "i",
    ),
  )?.[1];
}

function extractPatient(raw: string): string {
  const fileNumber = extractFileNumber(raw);
  if (fileNumber) return fileNumber;
  const patterns = [
    new RegExp(
      `\\b(?:paciente|ficha|de|a)\\s+${NAME}\\s+` +
        "(?:ha llegado|llego|llegó|no vino|no ha venido|ausente|hay que|necesita|" +
        "hacer|realiz|program|pon|mueve|cambia|presupuesto|ha pagado|pago|receta|tiene)",
      "i",
    ),
    new RegExp(`(?:${ARRIVAL_PHRASES})\\s+${NAME}`, "i"),
    new RegExp(
      `^\\s*(?:(?:el|la)\\s+)?(?:paciente\\s+)?${NAME}\\s+(?:ya\\s+)?(?:${ARRIVAL_PHRASES}|ha\\s+pagado|ha\\s+abonado)`,
      "i",
    ),
    new RegExp(`\\bcobr\\w*\\b.*?\\b(?:a|de)\\s+${NAME}\\s*$`, "i"),
    new RegExp(
      `\\b(?:${NAV_VERBS})\\s+(?:(?:a|al|en)\\s+)?(?:(?:el|la)\\s+)?` +
        `(?:(?:ficha|historia|historial|expediente)\\s+(?:clinica\\s+|clínica\\s+)?de\\s+|paciente\\s+|a\\s+)?${NAME}`,
      "i",
    ),
    new RegExp(`\\b(?:odontograma|periodontograma|presupuesto|historial)\\s+de\\s+${NAME}`, "i"),
    new RegExp(
      `(?:cita|agenda).*?(?:de|para)\\s+${NAME}` +
        "(?=\\s+(?:hoy|mañana|manana|pasado|lunes|martes|miercoles|miércoles|" +
        "jueves|viernes|sabado|sábado|domingo|a\\s+las)|$)",
      "i",
    ),
  ];
  for (const pattern of patterns) {
    const match = trimNameAtStop(raw.match(pattern)?.[1] ?? "");
    if (match && looksLikePersonName(match)) return match;
  }
  return "";
}

// Words that show a captured "name" is really part of the sentence
// ("el paciente no tiene el 18", "…abajo a la izquierda que es la seis").
const NOT_NAME_WORDS = new Set([
  "que",
  "es",
  "no",
  "si",
  "y",
  "al",
  "del",
  "lo",
  "le",
  "se",
  "ya",
  "hay",
  "tiene",
  "esta",
  "pasalo",
  "ponle",
  "seis",
  "caries",
  "resina",
  "obturacion",
  "empaste",
  "corona",
  "diente",
  "muela",
  "pieza",
  "izquierda",
  "derecha",
  "arriba",
  "abajo",
  "odontograma",
  "agenda",
  "laboratorio",
  "trabajos",
  "finanzas",
  "cobros",
  "tareas",
  "pendientes",
  "pacientes",
  "ajustes",
  "configuracion",
  "administrador",
  "administracion",
  "inicio",
  "hoy",
  "manana",
  "pasado",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
  "radiografia",
  "radiografias",
  "presupuesto",
  "presupuestos",
  "historial",
  "historia",
  "nota",
  "notas",
  "cita",
  "citas",
  "calendario",
  "resumen",
  "documentos",
  "recetas",
  "informe",
  "informes",
  "numero",
  "revision",
  "limpieza",
  "control",
  "consulta",
  "urgencia",
  "endodoncia",
  "extraccion",
  "implante",
  "implantes",
  "periodoncia",
  "sondaje",
  "trabajo",
]);

function looksLikePersonName(candidate: string): boolean {
  const words = normalize(candidate).split(" ");
  if (!words.length || /^(?:el|la|los|las|un|una)$/.test(words[0] ?? "")) return false;
  if (words.length === 1 && /^(?:ficha|paciente)$/.test(words[0] ?? "")) return false;
  return !words.some((word) => NOT_NAME_WORDS.has(word) || /\d/.test(word));
}

function looksLikeNonToothNumber(text: string, start: number, end: number): boolean {
  const before = text.slice(Math.max(0, start - 10), start);
  const after = text.slice(end, end + 10);
  return (
    /a\s+las?\s*$/.test(before) ||
    /^\s*:\s*\d{2}/.test(after) ||
    /^\s*(?:años?|€|euros?)\b/.test(after) ||
    /\d\s*[/-]\s*$/.test(before) ||
    /^\s*[/-]\s*\d/.test(after)
  );
}

function extractTeeth(raw: string): string[] {
  const text = normalize(raw);
  const found: string[] = [];
  for (const match of text.matchAll(/\b([1-4][1-8])\b/g)) {
    const value = match[1];
    if (!value) continue;
    const start = match.index ?? 0;
    if (looksLikeNonToothNumber(text, start, start + value.length)) continue;
    if (
      TREATMENT_CUE.test(text) ||
      /\b(?:diente|pieza|muela|puente|caries|bolsa|sondaje|ausentes?|sano|sana|sanos|sanas|realizado|defectuoso)\b/.test(
        text,
      ) ||
      /\b(?:sangrado|sangra|movilidad|recesion|placa|supuracion|bop)\b/.test(text) ||
      /\b(?:mesial|distal|oclusal|incisal|vestibular|lingual|palatino)\b/.test(text)
    ) {
      found.push(value);
    }
  }
  return uniq(found);
}

function extractTooth(raw: string, context?: LocalVoiceContext): string | undefined {
  return extractTeeth(raw)[0] ?? context?.selectedTooth;
}

function expandFdiRange(from: string, to: string): string[] {
  const start = FDI_ORDER.indexOf(from as (typeof FDI_ORDER)[number]);
  const end = FDI_ORDER.indexOf(to as (typeof FDI_ORDER)[number]);
  if (start < 0 || end < 0) return [from, to];
  return FDI_ORDER.slice(Math.min(start, end), Math.max(start, end) + 1);
}

function extractRange(raw: string): string[] {
  const match = normalize(raw).match(/\b([1-4][1-8])\s*(?:a|al|hasta|-)\s*([1-4][1-8])\b/);
  const from = match?.[1];
  const to = match?.[2];
  return from && to ? expandFdiRange(from, to) : [];
}

function extractSurfaces(raw: string): ToothSurface[] {
  const text = normalize(raw);
  const surfaces: ToothSurface[] = [];
  if (/\bmod\b/.test(text)) surfaces.push("M", "O", "D");
  if (/\bmo\b/.test(text)) surfaces.push("M", "O");
  if (/\bod\b/.test(text)) surfaces.push("O", "D");
  if (/\bdo\b/.test(text)) surfaces.push("D", "O");
  if (/\bmesial\b/.test(text)) surfaces.push("M");
  if (/\bdistal\b/.test(text)) surfaces.push("D");
  if (/\boclusal|ocluzal\b/.test(text)) surfaces.push("O");
  if (/\bincisal\b/.test(text)) surfaces.push("I");
  if (/\bvestibular|bucal\b/.test(text)) surfaces.push("V");
  if (/\blingual\b/.test(text)) surfaces.push("L");
  if (/\bpalatin[oa]\b/.test(text)) surfaces.push("P");
  return uniq(surfaces);
}

function extractPerioSite(raw: string): string | undefined {
  const text = normalize(raw);
  if (/mesiovestibular|\bmv\b/.test(text)) return "MV";
  if (/distovestibular|\bdv\b/.test(text)) return "DV";
  if (/mesiopalatino|mesiolingual|\bmp\b|\bml\b/.test(text)) return "MP";
  if (/distopalatino|distolingual|\bdp\b|\bdl\b/.test(text)) return "DP";
  if (/vestibular|bucal/.test(text)) return "V";
  if (/palatino|lingual/.test(text)) return "P/L";
  return undefined;
}

function extractDate(text: string): string | undefined {
  const relative = text.match(
    /\b(hoy|manana|pasado manana|lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/,
  );
  if (relative?.[1]) return relative[1];
  return text.match(/\b(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\b/)?.[1];
}

const MINUTE_WORDS: Readonly<Record<string, number>> = {
  cuarto: 15,
  media: 30,
  veinte: 20,
  veinticinco: 25,
  diez: 10,
  cinco: 5,
};

function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function extractTime(text: string): string | undefined {
  const hourWords = Object.keys(HOUR_WORDS).join("|");
  const match = text.match(
    new RegExp(
      `(?:a|sobre)\\s+las?\\s+(\\d{1,2}|${hourWords})(?::(\\d{2}))?` +
        `(?:\\s+(y|menos)\\s+(cuarto|media|veinticinco|veinte|diez|cinco|\\d{2})\\b)?` +
        "(?:\\s+(?:de\\s+la|por\\s+la)\\s+(manana|tarde|noche|madrugada))?",
    ),
  );
  const hourToken = match?.[1];
  if (!hourToken) return undefined;
  const hour = Math.min(
    23,
    /^\d+$/.test(hourToken) ? Number(hourToken) : (HOUR_WORDS[hourToken] ?? 0),
  );
  const modifier = match?.[4];
  const offset = modifier
    ? /^\d+$/.test(modifier)
      ? Math.min(59, Number(modifier))
      : (MINUTE_WORDS[modifier] ?? 0)
    : Number(match?.[2] ?? 0);
  const minuteOfHour = match?.[3] === "menos" ? -offset : offset;
  const period = match?.[5];
  // Clinics do not open at 5 a.m.: "a las cinco" without a period means the afternoon.
  const afternoon = period === "tarde" || period === "noche" || (!period && hour >= 1 && hour <= 7);
  const base = afternoon && hour < 12 ? hour + 12 : hour;
  const total = base * 60 + minuteOfHour;
  return formatTime(Math.floor(total / 60), total % 60);
}

function extractDuration(text: string): number | undefined {
  const raw = text.match(/(?:durante|de)\s*(\d{1,3})\s*(?:min|minutos?)\b/)?.[1];
  return raw ? Math.max(10, Math.min(240, Number(raw))) : undefined;
}

function extractStaff(raw: string): string | undefined {
  return raw
    .match(
      new RegExp(
        "(?:con\\s+(?:el\\s+)?(?:doctor|dr\\.?|la\\s+doctora|doctora|dra\\.?)\\s+)" +
          "([a-záéíóúüñ]+(?:\\s+[a-záéíóúüñ]+){0,2})",
        "i",
      ),
    )?.[1]
    ?.trim();
}

const NUMBER_WORDS: Readonly<Record<string, number>> = {
  cero: 0,
  un: 1,
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciseis: 16,
  diecisiete: 17,
  dieciocho: 18,
  diecinueve: 19,
  veinte: 20,
  veintiuno: 21,
  veintiun: 21,
  veintidos: 22,
  veintitres: 23,
  veinticuatro: 24,
  veinticinco: 25,
  veintiseis: 26,
  veintisiete: 27,
  veintiocho: 28,
  veintinueve: 29,
  treinta: 30,
  cuarenta: 40,
  cincuenta: 50,
  sesenta: 60,
  setenta: 70,
  ochenta: 80,
  noventa: 90,
  cien: 100,
  ciento: 100,
  doscientos: 200,
  trescientos: 300,
  cuatrocientos: 400,
  quinientos: 500,
  seiscientos: 600,
  setecientos: 700,
  ochocientos: 800,
  novecientos: 900,
};

function parseSpokenNumber(words: readonly string[]): number | undefined {
  let total = 0;
  let current = 0;
  let seen = false;
  for (const word of words) {
    if (word === "y") continue;
    if (word === "mil") {
      total += (current || 1) * 1000;
      current = 0;
      seen = true;
      continue;
    }
    const value = NUMBER_WORDS[word];
    if (value === undefined) return undefined;
    current += value;
    seen = true;
  }
  return seen ? total + current : undefined;
}

function extractMoney(text: string): number | undefined {
  const raw = text.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:€|euros?)\b/)?.[1];
  if (raw) return Math.round(Number(raw.replace(",", ".")) * 100);
  const spoken =
    text
      .match(/((?:[a-z]+\s+){1,6})euros?\b/)?.[1]
      ?.trim()
      .split(" ") ?? [];
  for (let start = 0; start < spoken.length; start += 1) {
    const amount = parseSpokenNumber(spoken.slice(start));
    if (amount !== undefined && amount > 0) return amount * 100;
  }
  return undefined;
}

function extractPaymentMethod(text: string): PaymentMethod | undefined {
  if (/tarjeta|datafono|datáfono/.test(text)) return "CARD";
  if (/efectivo|metalico|metálico/.test(text)) return "CASH";
  if (/transferencia/.test(text)) return "TRANSFER";
  if (/financi/.test(text)) return "FINANCING";
  return undefined;
}

function treatmentState(text: string, code: string): ClinicalTreatmentState {
  if (code === "reendodontics") return "PLANNED";
  if (
    /\b(?:repetir|rehacer|defectuos|insatisfactor|fallad|fracturad|filtrad|desajustad|rot[oa]s?)\w*/.test(
      text,
    ) ||
    /\bmal\s+(?:hech|puest|colocad|sellad|ajustad|adaptad|realizad|obturad|cementad|terminad)\w*/.test(
      text,
    )
  ) {
    return "UNSATISFACTORY";
  }
  if (
    /\b(?:realizad|hech|terminad|completad|finalizad|colocad|puest|cementad|instalad|rematad|acabad|extraid)\w*\b/.test(
      text,
    )
  ) {
    return "COMPLETED";
  }
  return "PLANNED";
}

function treatmentActions(
  patientRef: string,
  raw: string,
  context: LocalVoiceContext,
  toothOverride?: string,
): LocalVoiceAction[] {
  const text = normalize(raw);
  const tooth = toothOverride ?? extractTooth(raw, context);
  const surfaces = extractSurfaces(raw);
  const actions: LocalVoiceAction[] = [];

  for (const [pattern, code, label] of TREATMENTS) {
    if (!pattern.test(text)) continue;
    if (code === "endodontics" && /reendodon|retratamiento\s+endod/.test(text)) continue;
    if (code === "implant" && /revis(?:ar|ion).*implante|control.*implante/.test(text)) continue;
    const state = treatmentState(text, code);
    const actionType =
      state === "COMPLETED"
        ? "clinical.complete_item"
        : state === "UNSATISFACTORY"
          ? "clinical.mark_unsatisfactory"
          : "clinical.add_item";
    actions.push({
      type: actionType,
      patientRef,
      ...(tooth !== undefined ? { tooth } : {}),
      treatmentCode: code,
      label: `${label}${tooth ? ` ${tooth}` : ""}`,
      surfaces: ["restoration", "inlay"].includes(code) ? surfaces : [],
    });
  }

  return actions;
}

const TREATMENT_ORDER = [
  "endodontics",
  "reendodontics",
  "reconstruction",
  "post",
  "crown",
] as const;

// Dependencies are derived after all clauses so "endodoncia en 26 y corona en 26" keeps its order.
function dependencyActions(
  patientRef: string,
  actions: readonly LocalVoiceAction[],
): LocalVoiceAction[] {
  const planned = actions.filter(
    (action): action is ClinicalTreatmentAction =>
      action.type === "clinical.add_item" && action.tooth !== undefined,
  );
  const dependencies: LocalVoiceAction[] = [];
  for (const tooth of uniq(planned.map((action) => action.tooth as string))) {
    const codes = planned.filter((action) => action.tooth === tooth).map((a) => a.treatmentCode);
    for (let index = 1; index < TREATMENT_ORDER.length; index += 1) {
      const beforeCode = TREATMENT_ORDER[index - 1];
      const afterCode = TREATMENT_ORDER[index];
      if (!beforeCode || !afterCode) continue;
      if (codes.includes(beforeCode) && codes.includes(afterCode)) {
        dependencies.push({
          type: "clinical.add_dependency",
          patientRef,
          tooth,
          beforeCode,
          afterCode,
        });
      }
    }
  }
  return dependencies;
}

function odontogramActions(
  patientRef: string,
  raw: string,
  context: LocalVoiceContext,
  toothOverride?: string,
): LocalVoiceAction[] {
  const text = normalize(raw);
  const range = toothOverride ? [] : extractRange(raw);
  if (/puente|protesis\s+fija/.test(text) && range.length >= 2) {
    const missing = raw.match(/(?:con|y)\s+(.+?)\s+ausente/i)?.[1] ?? "";
    return [
      {
        type: "odontogram.bridge",
        patientRef,
        teeth: range,
        missingTeeth: extractTeeth(`${missing} ausente`),
        status: /realizad|colocad|hech/.test(text) ? "COMPLETED" : "PLANNED",
      },
    ];
  }
  if (/\bprotesis\b/.test(text) && range.length >= 2 && !/fija|puente|removible/.test(text)) {
    return [{ type: "clinical.prosthesis_options", patientRef, teeth: range }];
  }
  if (/removible/.test(text)) {
    return [
      {
        type: "odontogram.removable",
        patientRef,
        teeth: range.length ? range : extractTeeth(raw),
        arch: /inferior|mandib/.test(text)
          ? "LOWER"
          : /superior|maxilar/.test(text)
            ? "UPPER"
            : "UNSPECIFIED",
      },
    ];
  }

  const tooth = toothOverride ?? extractTooth(raw, context);
  if (!tooth) return [];
  const surfaces = extractSurfaces(raw);
  // "Quita la caries del 26" asks to remove it: never add one.
  if (/caries/.test(text) && !/\b(?:quita|quitale|elimina|borra|retira|desmarca)\b/.test(text)) {
    return [{ type: "odontogram.set_state", patientRef, tooth, status: "CARIES", surfaces }];
  }
  if (/\b(?:sanos?|sanas?|saludables?)\b/.test(text)) {
    return [{ type: "odontogram.set_state", patientRef, tooth, status: "HEALTHY" }];
  }
  if (/\b(?:ausentes?|faltan?|perdid[oa]s?)\b/.test(text)) {
    return [{ type: "odontogram.set_state", patientRef, tooth, status: "MISSING" }];
  }
  return [];
}

function periodontalActions(
  patientRef: string,
  raw: string,
  context: LocalVoiceContext,
  toothOverride?: string,
): LocalVoiceAction[] {
  const text = normalize(raw);
  const tooth = toothOverride ?? extractTooth(raw, context);
  if (!tooth) return [];
  const mobility = text.match(/movilidad\s*(?:grado\s*)?(0|1|2|3|i{1,3})/)?.[1];
  const depth = text.match(/(?:bolsa|sondaje|profundidad)\s*(?:de\s*)?(\d{1,2})/)?.[1];
  const recession = text.match(/recesion\s*(?:de\s*)?(\d{1,2})/)?.[1];
  if (
    !mobility &&
    !depth &&
    !recession &&
    !/sangrado|sangra\b|bop|supuracion|placa(?!\s+de\s+descarga)/.test(text)
  ) {
    return [];
  }
  return [
    {
      type: "periodontal.update",
      patientRef,
      tooth,
      site: extractPerioSite(raw) ?? "DV",
      ...(depth ? { probingDepth: Number(depth) } : {}),
      ...(recession ? { recession: Number(recession) } : {}),
      ...(mobility ? { mobility: mobility.toUpperCase() } : {}),
      ...(/sangrado|sangra\b|bop/.test(text) ? { bleeding: true } : {}),
      ...(/supuracion/.test(text) ? { suppuration: true } : {}),
      ...(/placa(?!\s+de\s+descarga)/.test(text) ? { plaque: true } : {}),
    },
  ];
}

function navigationAction(text: string): LocalVoiceAction | undefined {
  if (
    !/\b(?:abre|abrir|ir|ve|vamos|ver|muestra|muestrame|ensena|ensename|llevame|llevanos|ponme)\b/.test(
      text,
    )
  ) {
    return undefined;
  }
  const targets: readonly [RegExp, string][] = [
    [/\bodontograma\b/, "odontogram"],
    [/\bagenda\b/, "agenda"],
    [/\blaboratorio|trabajos\b/, "laboratory"],
    [/\bfinanzas|cobros\b/, "finance"],
    [/\btareas|pendientes\b/, "tasks"],
    [/\bpacientes\b/, "patients"],
    [/\bajustes|configuracion\b/, "settings"],
    [/\badministrador|administracion\b/, "admin"],
    [/\binicio|hoy\b/, "home"],
  ];
  const match = targets.find(([pattern]) => pattern.test(text));
  return match ? { type: "navigation.open", destination: match[1] } : undefined;
}

const CLAUSE_CUE = new RegExp(
  `caries|sano|sana|sanos|sanas|ausentes?|${TREATMENT_CUE.source}|` +
    "sondaje|bolsa|sangrado|sangra\\b|movilidad|recesion|supuracion|bop",
);
const TOOTHLESS_TREATMENT = /limpieza|profilaxis|higiene|tartrect|destartraje|raspado|alisado/;

// "caries en 14 y 15, endodoncia en 26" -> ["caries en 14 15", "endodoncia en 26"]:
// pieces without a finding of their own ("15", "mesial") join the clause before them.
function clinicalClauses(raw: string): string[] {
  if (hasSelfCorrection(raw) || /puente|protesis/i.test(raw))
    return [canonicalizeDentalSpeech(raw)];
  const pieces = raw
    .split(
      /\s*[,;]\s*|(?<!treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa)\s+y\s+|\s+(?:luego|ademas|además|tambien|también|despues|después)\s+/i,
    )
    .map(canonicalizeDentalSpeech)
    .filter(Boolean);
  const clauses: string[] = [];
  let pending = "";
  for (const piece of pieces) {
    if (!CLAUSE_CUE.test(piece)) {
      if (clauses.length) clauses[clauses.length - 1] += ` ${piece}`;
      else pending = `${pending} ${piece}`.trim();
      continue;
    }
    clauses.push(`${pending} ${piece}`.trim());
    pending = "";
  }
  if (pending) clauses.push(pending);
  // A treatment named before its tooth ("endodoncia y corona en 26") shares the next clause.
  const merged: string[] = [];
  for (let index = 0; index < clauses.length; index += 1) {
    let clause = clauses[index] ?? "";
    while (
      index + 1 < clauses.length &&
      extractTeeth(clause).length === 0 &&
      !TOOTHLESS_TREATMENT.test(clause) &&
      TREATMENT_CUE.test(clause)
    ) {
      index += 1;
      clause = `${clause} ${clauses[index] ?? ""}`;
    }
    const previousTeeth = extractTeeth(merged.at(-1) ?? "");
    const needsTooth =
      extractTeeth(clause).length === 0 &&
      TREATMENT_CUE.test(clause) &&
      !TOOTHLESS_TREATMENT.test(clause);
    // "corona en el 16 y una endodoncia": the second treatment is for the same tooth.
    merged.push(
      needsTooth && previousTeeth.length === 1 ? `${clause} ${previousTeeth[0]}` : clause,
    );
  }
  return merged;
}

function perClauseActions(
  patientRef: string,
  clause: string,
  context: LocalVoiceContext,
): LocalVoiceAction[] {
  const teeth = extractTeeth(clause);
  const isBridgeLike = /puente|protesis|removible/.test(normalize(clause));
  if (teeth.length < 2 || isBridgeLike) {
    return [
      ...odontogramActions(patientRef, clause, context),
      ...periodontalActions(patientRef, clause, context),
      ...treatmentActions(patientRef, clause, context),
    ];
  }
  const measured = /(?:bolsa|sondaje|profundidad|recesion|movilidad)/.test(normalize(clause));
  return teeth.flatMap((tooth) => [
    ...odontogramActions(patientRef, clause, context, tooth),
    ...(measured && tooth !== teeth[0]
      ? []
      : periodontalActions(patientRef, clause, context, tooth)),
    ...treatmentActions(patientRef, clause, context, tooth),
  ]);
}

export function voiceReadback(
  actions: readonly LocalVoiceAction[],
  ambiguities: readonly string[],
): string {
  if (ambiguities.length) return `Necesito ${ambiguities.join(" y ")}.`;
  const parts: string[] = [];
  for (const action of actions) {
    if (action.type === "patient.create") {
      parts.push(`crear a ${action.firstName} ${action.lastName}`.trim());
    }
    if (action.type === "appointment.arrive") parts.push("marcar llegada");
    if (action.type === "appointment.no_show") parts.push("marcar ausencia");
    if (action.type === "clinical.add_item") parts.push(`añadir ${action.label}`);
    if (action.type === "clinical.complete_item") {
      parts.push(`registrar ${action.label} como realizado`);
    }
    if (action.type === "clinical.mark_unsatisfactory") {
      parts.push(`marcar ${action.label} para repetir`);
    }
    if (action.type === "odontogram.bridge") {
      parts.push(`registrar puente ${action.teeth.join("-")}`);
    }
    if (action.type === "odontogram.removable") parts.push("registrar prótesis removible");
    if (action.type === "periodontal.update") parts.push(`actualizar periodoncia ${action.tooth}`);
    if (action.type === "odontogram.set_state") {
      const surfaces = action.surfaces?.length ? ` (${action.surfaces.join("")})` : "";
      parts.push(
        action.status === "CARIES"
          ? `apuntar caries en el ${action.tooth}${surfaces}`
          : action.status === "MISSING"
            ? `marcar el ${action.tooth} como ausente`
            : `marcar el ${action.tooth} como sano`,
      );
    }
    if (action.type === "clinical.note") parts.push(`anotar «${action.text}»`);
    if (action.type === "budget.sync") parts.push("preparar presupuesto");
    if (action.type === "payment.record") {
      const amount = action.amountCents ? ` de ${action.amountCents / 100} €` : "";
      parts.push(`registrar cobro${amount}`);
    }
    if (action.type === "lab.transition") parts.push("marcar laboratorio recibido");
    if (action.type === "navigation.open") parts.push(`abrir ${action.destination}`);
    if (action.type === "navigation.patient") {
      parts.push(action.patientRef ? `abrir la ficha de ${action.patientRef}` : "abrir pacientes");
    }
  }
  return parts.length ? `Voy a ${uniq(parts).join("; ")}.` : "No he detectado una acción concreta.";
}

function requiresPatient(action: LocalVoiceAction): boolean {
  return !["patient.create", "patient.resolve", "navigation.open"].includes(action.type);
}

export function planLocalVoiceCommand(
  input: string,
  context: LocalVoiceContext = {},
): LocalVoicePlan {
  const wake = /^\s*(?:oye\s+)?denty\b/i.test(input) || Boolean(context.wake);
  const raw = stripWake(input);
  const text = normalize(raw);
  const creatingPatient =
    /^(?:crea|crear|nuevo|nueva|alta|registra)\b/.test(text) && /\b(?:paciente|ficha)\b/.test(text);
  const explicitPatient = creatingPatient ? "" : extractPatient(raw);
  const patientRef = explicitPatient || context.patientName || "";
  const actions: LocalVoiceAction[] = [];
  const ambiguities: string[] = [];

  if (creatingPatient) {
    const cleaned = raw
      .replace(
        new RegExp(
          "^.*?\\b(?:crea|crear|nuevo|nueva|alta|registra)\\b\\s*(?:un|una)?" +
            "\\s*(?:paciente|ficha)?\\s*(?:que\\s+se\\s+llama|llamad[oa])?\\s*",
          "i",
        ),
        "",
      )
      .replace(/\s+(?:telefono|teléfono|movil|móvil|dni|nie|nif)\b.*$/i, "")
      .trim();
    const name = splitName(cleaned);
    if (name.firstName) {
      const phone = extractPhone(raw);
      const dni = extractDni(raw);
      actions.push({
        type: "patient.create",
        firstName: name.firstName,
        lastName: name.lastName,
        ...(phone !== undefined ? { phone } : {}),
        ...(dni !== undefined ? { dni } : {}),
      });
    }
  }

  if (patientRef) actions.push({ type: "patient.resolve", query: patientRef });
  const navigation = navigationAction(text);
  if (navigation) actions.push(navigation);
  const asksForPatient =
    /\b(?:busca|buscar|abre|abrir|ver|selecciona|carga|ve|vamos|llevame|muestrame|ensename|ponme)\b/.test(
      text,
    );
  if (asksForPatient && (/\b(?:paciente|ficha)\b/.test(text) || explicitPatient)) {
    actions.push({ type: "navigation.patient", patientRef });
  }
  const arrived = /ha llegado|llego|esta aqui|ya esta aqui|acaba de llegar|(?<!no )ha venido/.test(
    text,
  );
  if (arrived && !/laboratorio/.test(text)) {
    actions.push({ type: "appointment.arrive", patientRef });
  }
  // "ausente" describes a tooth when the sentence talks about one.
  const absentTooth =
    extractTeeth(canonicalizeDentalSpeech(raw)).length > 0 ||
    /\b(?:diente|pieza|muela|molar|premolar|incisivo|canino|colmillo)\b/.test(text);
  if (
    /no vino|no ha venido|npa|no presentado|ha faltado|no se ha presentado|no se presento|no ha aparecido/.test(
      text,
    ) ||
    (/\bausente\b/.test(text) && !absentTooth)
  ) {
    actions.push({ type: "appointment.no_show", patientRef });
  }
  if (/(?:anade|añade|agrega|pon|registra).*\b(?:comentario|nota clinica)\b/.test(text)) {
    const note = raw.replace(/^.*?\b(?:comentario|nota clínica|nota clinica)\b\s*/i, "").trim();
    if (note) actions.push({ type: "clinical.note", patientRef, text: note });
  }
  if (/alerg|\balerta\b/.test(text)) {
    const allergy = raw
      .match(/al[eé]rg(?:ia|ic[oa])\s+(?:a\s+(?:la\s+|el\s+|los\s+|las\s+)?|al\s+)?(.+)$/i)?.[1]
      ?.replace(/[.!\s]+$/, "");
    actions.push({
      type: "clinical.alert",
      patientRef,
      text: allergy ? `Alergia a ${allergy.trim()}` : raw,
      severity: "HIGH",
    });
  }

  // Regional and colloquial speech ("calza en el dos seis por fuera") is
  // canonicalized with the dental dictionary before clinical extraction.
  const clauseActions = clinicalClauses(raw).flatMap((clause) =>
    perClauseActions(patientRef, clause, context),
  );
  const extractedClinical = [...clauseActions, ...dependencyActions(patientRef, clauseActions)];
  actions.push(...extractedClinical);
  // "Anota que refiere dolor al frío en el 36": dictated note, original wording kept.
  const dictated = raw.match(
    /^\s*(?:anota|apunta|registra|escribe|pon\s+en\s+(?:la\s+)?(?:ficha|historia))\s+que\s+(.+)$/i,
  )?.[1];
  if (dictated && !extractedClinical.length && !actions.some((a) => a.type === "clinical.note")) {
    const text = dictated.trim();
    actions.push({
      type: "clinical.note",
      patientRef,
      text: text[0]!.toUpperCase() + text.slice(1),
    });
  }

  const dateText = extractDate(text);
  const timeText = extractTime(text);
  const durationMin = extractDuration(text);
  const staffRef = extractStaff(raw);
  const moving =
    /\b(?:mueve|muevela|cambia|cambiala|reprograma|pasa|pasala|pospon|posponla|adelanta|adelantala|retrasa|retrasala|aplaza|aplazala)\b/.test(
      text,
    ) && /\bcita\b/.test(text);
  // "abre la agenda de mañana" opens the agenda; it does not book anything.
  const schedulesAppointment = (
    navigation
      ? /\b(?:pon|cita|programa|programar|citar)\b/
      : /\b(?:pon|agenda|cita|programa|programar|citar|dame\s+cita)\b/
  ).test(text);
  if (!moving && schedulesAppointment && (dateText || timeText)) {
    actions.push({
      type: "appointment.schedule",
      patientRef,
      dateText: dateText ?? "hoy",
      ...(timeText !== undefined ? { timeText } : {}),
      ...(durationMin !== undefined ? { durationMin } : {}),
      ...(staffRef !== undefined ? { staffRef } : {}),
      ...(() => {
        const treatment = actions.find(
          (action): action is ClinicalTreatmentAction => action.type === "clinical.add_item",
        );
        const treatmentCode = treatment?.treatmentCode;
        return treatmentCode !== undefined ? { treatmentCode } : {};
      })(),
    });
  }
  if (moving) {
    actions.push({
      type: "appointment.reschedule",
      patientRef,
      dateText: dateText ?? "hoy",
      ...(timeText !== undefined ? { timeText } : {}),
      ...(durationMin !== undefined ? { durationMin } : {}),
      ...(staffRef !== undefined ? { staffRef } : {}),
    });
  }
  const budgetIntent =
    /(?:prepara|haz|genera|crear|crea).*presupuesto/.test(text) ||
    /presupuesto.*(?:prepara|haz|genera|crear|crea)/.test(text);
  if (budgetIntent) {
    actions.push({ type: "budget.sync", patientRef });
  }
  if (/\b(?:cobrar|cobra|cobrale|cobro|pago|paga|ha pagado|pagado|ha abonado|abono)\b/.test(text)) {
    actions.push({
      type: "payment.record",
      patientRef,
      ...(() => {
        const amountCents = extractMoney(text);
        return amountCents !== undefined ? { amountCents } : {};
      })(),
      ...(() => {
        const method = extractPaymentMethod(text);
        return method !== undefined ? { method } : {};
      })(),
    });
  }
  if (/laboratorio/.test(text) && /(recibid|llego|ha llegado)/.test(text)) {
    actions.push({ type: "lab.transition", patientRef, status: "RECEIVED" });
  }

  if (actions.some((action) => action.type === "clinical.prosthesis_options")) {
    ambiguities.push("tipo de prótesis: fija o removible");
  }
  if (actions.some(requiresPatient) && !patientRef && !context.patientId && !creatingPatient) {
    ambiguities.push("paciente");
  }
  if (
    actions.some(
      (action) =>
        action.type === "appointment.schedule" || action.type === "appointment.reschedule",
    ) &&
    !timeText
  ) {
    ambiguities.push("hora");
  }
  const payment = actions.find((action) => action.type === "payment.record");
  if (payment?.type === "payment.record" && payment.amountCents === undefined) {
    ambiguities.push("importe");
  }
  if (payment?.type === "payment.record" && payment.method === undefined) {
    ambiguities.push("método de pago");
  }
  const clinicalActions = actions.filter((action) =>
    [
      "clinical.add_item",
      "clinical.complete_item",
      "clinical.mark_unsatisfactory",
      "odontogram.set_state",
      "periodontal.update",
    ].includes(action.type),
  );
  if (
    clinicalActions.some((action) => "tooth" in action && !action.tooth) &&
    !context.selectedTooth
  ) {
    ambiguities.push("diente");
  }
  if (!actions.filter((action) => action.type !== "patient.resolve").length && wake) {
    actions.push({ type: "clinical.note", patientRef, text: raw || input, literalFallback: true });
    if (!patientRef && !context.patientId) ambiguities.push("paciente para guardar la nota");
  }

  const uniqueAmbiguities = uniq(ambiguities);
  const consequential = actions.some(
    (action) => action.type !== "patient.resolve" && !action.type.startsWith("navigation."),
  );

  return {
    raw: input,
    actions,
    ambiguities: uniqueAmbiguities,
    requiresConfirmation: uniqueAmbiguities.length > 0 || consequential,
    readback: voiceReadback(actions, uniqueAmbiguities),
    confidence: uniqueAmbiguities.length ? 0.72 : actions.length ? 0.94 : 0.25,
    ...(!explicitPatient && context.patientId !== undefined
      ? { contextPatientId: context.patientId }
      : {}),
    source: "rules",
  };
}
