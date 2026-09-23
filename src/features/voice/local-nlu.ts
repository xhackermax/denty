import type { ToothSurface } from "@/domain";

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
  source: "rules";
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
  [/extracci|exodon/, "extraction", "Extracción"],
  [/incrustacion|incrustación|onlay|overlay|inlay/, "inlay", "Incrustación"],
  [/empaste|obturacion|obturación|restauracion|restauración/, "restoration", "Restauración"],
  [/raspado|alisado|periodontal/, "periodontal", "Tratamiento periodontal"],
  [/limpieza|profilaxis|higiene/, "prophylaxis", "Profilaxis"],
];

const TREATMENT_CUE = new RegExp(
  [
    "apicectom|reendodon|retratamiento|endodon|conductos?",
    "reconstru|munon|muñon|perno|poste|corona|implante",
    "extracci|exodon|incrust|onlay|overlay|inlay",
    "empaste|obtur|restaur|raspado|alisado|periodontal",
    "limpieza|profilaxis|higiene",
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

function extractPatient(raw: string): string {
  const name = "([a-záéíóúüñ]+(?:\\s+[a-záéíóúüñ]+){0,3})";
  const patterns = [
    new RegExp(
      `(?:paciente|ficha|de|a)\\s+${name}\\s+` +
        "(?:ha llegado|llego|llegó|no vino|no ha venido|ausente|hay que|necesita|" +
        "hacer|realiz|program|pon|mueve|cambia|presupuesto|ha pagado|pago|receta|tiene)",
      "i",
    ),
    new RegExp(
      "(?:busca|buscar|abre|abrir|encuentra|ver|selecciona|carga)\\s+" +
        `(?:(?:el|la)\\s+)?(?:ficha\\s+de\\s+|paciente\\s+|a\\s+)?${name}`,
      "i",
    ),
    new RegExp(
      `(?:cita|agenda).*?(?:de|para)\\s+${name}` +
        "(?=\\s+(?:hoy|mañana|manana|pasado|lunes|martes|miercoles|miércoles|" +
        "jueves|viernes|sabado|sábado|domingo|a\\s+las)|$)",
      "i",
    ),
  ];
  for (const pattern of patterns) {
    const match = raw.match(pattern)?.[1];
    if (match) return match.trim();
  }
  return "";
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
    if (TREATMENT_CUE.test(text) || /\b(?:diente|pieza|puente|caries|bolsa|sondaje)\b/.test(text)) {
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
  if (/\bmesial\b/.test(text)) surfaces.push("M");
  if (/\bdistal\b/.test(text)) surfaces.push("D");
  if (/\boclusal|ocluzal\b/.test(text)) surfaces.push("O");
  if (/\bincisal\b/.test(text)) surfaces.push("I");
  if (/\bvestibular|bucal\b/.test(text)) surfaces.push("V");
  if (/\blingual|palatino|palatina\b/.test(text)) surfaces.push("P");
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

function extractTime(text: string): string | undefined {
  const numeric = text.match(/(?:a\s+las?|sobre\s+las?)\s*(\d{1,2})(?::|\s+y\s+)?(\d{2})?\b/);
  if (numeric?.[1]) {
    const hour = Math.min(23, Number(numeric[1]));
    const minute = numeric[2] ? Math.min(59, Number(numeric[2])) : 0;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }
  const hourWords = Object.keys(HOUR_WORDS).join("|");
  const words = text.match(
    new RegExp(`(?:a\\s+las?|sobre\\s+las?)\\s+(${hourWords})(?:\\s+y\\s+(cuarto|media))?`),
  );
  const hourWord = words?.[1];
  if (!hourWord) return undefined;
  const hour = HOUR_WORDS[hourWord];
  if (hour === undefined) return undefined;
  const minute = words?.[2] === "cuarto" ? 15 : words?.[2] === "media" ? 30 : 0;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
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

function extractMoney(text: string): number | undefined {
  const raw = text.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:€|euros?)\b/)?.[1];
  return raw ? Math.round(Number(raw.replace(",", ".")) * 100) : undefined;
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
  if (/\b(?:repetir|rehacer|defectuos|insatisfactor|fallad|fracturad|filtrad)\b/.test(text)) {
    return "UNSATISFACTORY";
  }
  if (/\b(?:realizad|hech|terminad|completad|finalizad|colocad)\w*\b/.test(text)) {
    return "COMPLETED";
  }
  return "PLANNED";
}

function treatmentActions(
  patientRef: string,
  raw: string,
  context: LocalVoiceContext,
): LocalVoiceAction[] {
  const text = normalize(raw);
  const tooth = extractTooth(raw, context);
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

  const planned = actions.filter(
    (action): action is ClinicalTreatmentAction => action.type === "clinical.add_item",
  );
  const ordered = ["endodontics", "reendodontics", "reconstruction", "post", "crown"] as const;
  if (tooth) {
    for (let index = 1; index < ordered.length; index += 1) {
      const beforeCode = ordered[index - 1];
      const afterCode = ordered[index];
      if (!beforeCode || !afterCode) continue;
      if (
        planned.some((action) => action.treatmentCode === beforeCode) &&
        planned.some((action) => action.treatmentCode === afterCode)
      ) {
        actions.push({
          type: "clinical.add_dependency",
          patientRef,
          tooth,
          beforeCode,
          afterCode,
        });
      }
    }
  }
  return actions;
}

function odontogramActions(
  patientRef: string,
  raw: string,
  context: LocalVoiceContext,
): LocalVoiceAction[] {
  const text = normalize(raw);
  const range = extractRange(raw);
  if (/puente|protesis\s+fija/.test(text) && range.length >= 2) {
    const missing = raw.match(/(?:con|y)\s+(.+?)\s+ausente/i)?.[1] ?? "";
    return [
      {
        type: "odontogram.bridge",
        patientRef,
        teeth: range,
        missingTeeth: extractTeeth(missing),
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

  const tooth = extractTooth(raw, context);
  if (!tooth) return [];
  const surfaces = extractSurfaces(raw);
  if (/caries/.test(text)) {
    return [{ type: "odontogram.set_state", patientRef, tooth, status: "CARIES", surfaces }];
  }
  if (/\b(?:sano|saludable)\b/.test(text)) {
    return [{ type: "odontogram.set_state", patientRef, tooth, status: "HEALTHY" }];
  }
  if (/\b(?:ausente|falta|perdido)\b/.test(text)) {
    return [{ type: "odontogram.set_state", patientRef, tooth, status: "MISSING" }];
  }
  return [];
}

function periodontalActions(
  patientRef: string,
  raw: string,
  context: LocalVoiceContext,
): LocalVoiceAction[] {
  const text = normalize(raw);
  const tooth = extractTooth(raw, context);
  if (!tooth) return [];
  const mobility = text.match(/movilidad\s*(?:grado\s*)?(0|1|2|3|i{1,3})/)?.[1];
  const depth = text.match(/(?:bolsa|sondaje|profundidad)\s*(?:de\s*)?(\d{1,2})/)?.[1];
  const recession = text.match(/recesion\s*(?:de\s*)?(\d{1,2})/)?.[1];
  if (!mobility && !depth && !recession && !/sangrado|bop|supuracion|placa/.test(text)) {
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
      ...(/sangrado|bop/.test(text) ? { bleeding: true } : {}),
      ...(/supuracion/.test(text) ? { suppuration: true } : {}),
      ...(/placa/.test(text) ? { plaque: true } : {}),
    },
  ];
}

function navigationAction(text: string): LocalVoiceAction | undefined {
  if (!/\b(?:abre|ir|ve|muestra|ensena)\b/.test(text)) return undefined;
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

function readback(actions: readonly LocalVoiceAction[], ambiguities: readonly string[]): string {
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
  const asksForPatient = /\b(?:busca|buscar|abre|abrir|ver|selecciona|carga)\b/.test(text);
  if (asksForPatient && /\b(?:paciente|ficha)\b/.test(text)) {
    actions.push({ type: "navigation.patient", patientRef });
  }
  if (/ha llegado|llego|esta aqui|ya esta aqui/.test(text) && !/laboratorio/.test(text)) {
    actions.push({ type: "appointment.arrive", patientRef });
  }
  if (/no vino|no ha venido|npa|no presentado|\bausente\b/.test(text)) {
    actions.push({ type: "appointment.no_show", patientRef });
  }
  if (/(?:anade|añade|agrega|pon|registra).*\b(?:comentario|nota clinica)\b/.test(text)) {
    const note = raw.replace(/^.*?\b(?:comentario|nota clínica|nota clinica)\b\s*/i, "").trim();
    if (note) actions.push({ type: "clinical.note", patientRef, text: note });
  }
  if (/alerg|\balerta\b/.test(text)) {
    const allergy = raw.match(/alerg(?:ia|ico|ica)?\s+(?:a\s+)?(.+)$/i)?.[1];
    actions.push({
      type: "clinical.alert",
      patientRef,
      text: allergy ? `Alergia a ${allergy.trim()}` : raw,
      severity: "HIGH",
    });
  }

  actions.push(...odontogramActions(patientRef, raw, context));
  actions.push(...periodontalActions(patientRef, raw, context));
  actions.push(...treatmentActions(patientRef, raw, context));

  const dateText = extractDate(text);
  const timeText = extractTime(text);
  const durationMin = extractDuration(text);
  const staffRef = extractStaff(raw);
  const moving = /\b(?:mueve|cambia|reprograma|pasa)\b/.test(text) && /\bcita\b/.test(text);
  const schedulesAppointment = /\b(?:pon|agenda|cita|programa|programar|citar|dame\s+cita)\b/.test(
    text,
  );
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
  if (/\b(?:cobrar|cobro|pago|ha pagado|pagado)\b/.test(text)) {
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
  const consequential = actions.some((action) =>
    [
      "payment.record",
      "appointment.no_show",
      "clinical.complete_item",
      "clinical.mark_unsatisfactory",
    ].includes(action.type),
  );

  return {
    raw: input,
    actions,
    ambiguities: uniqueAmbiguities,
    requiresConfirmation: uniqueAmbiguities.length > 0 || consequential,
    readback: readback(actions, uniqueAmbiguities),
    confidence: uniqueAmbiguities.length ? 0.72 : actions.length ? 0.94 : 0.25,
    ...(!explicitPatient && context.patientId !== undefined
      ? { contextPatientId: context.patientId }
      : {}),
    source: "rules",
  };
}
