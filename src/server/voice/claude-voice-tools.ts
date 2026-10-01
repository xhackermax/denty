import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import type { ToothSurface } from "@/domain";
import dentalLexicon from "@/features/voice/dental-lexicon.generated.json";
import type { LocalVoiceAction } from "@/features/voice/local-nlu";

/**
 * The Denty tools Claude can use to turn a spoken order into actions.
 * Claude only *proposes* the calls: the app shows them for confirmation and
 * runs them through the same executor as the rule-based interpreter.
 */

const SURFACES = ["V", "M", "O", "I", "D", "P", "L"] as const;
const TREATMENTS = [
  "obturacion",
  "reconstruccion",
  "incrustacion",
  "endodoncia",
  "reendodoncia",
  "corona",
  "perno",
  "implante",
  "extraccion",
] as const;
const PERIO_SITES = ["MV", "V", "DV", "MP", "P/L", "DP"] as const;
const DESTINATIONS = [
  "home",
  "patients",
  "agenda",
  "laboratory",
  "finance",
  "tasks",
  "settings",
  "admin",
] as const;

const toothProperty = {
  type: "string",
  description:
    "Diente en notación FDI de dos cifras (11-48 permanentes, 51-85 temporales). «Treinta y seis» es 36.",
} as const;
const surfacesProperty = {
  type: "array",
  items: { type: "string", enum: [...SURFACES] },
  description:
    "Caras afectadas: V vestibular/bucal, M mesial, O oclusal, I incisal, D distal, P palatino, L lingual. Vacío si no se dicen.",
} as const;

export const CLAUDE_VOICE_TOOLS: Anthropic.Tool[] = [
  {
    name: "marcar_hallazgo",
    description:
      "Apunta en el odontograma un hallazgo del diente: caries (con sus caras), diente sano o diente ausente.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        diente: toothProperty,
        hallazgo: { type: "string", enum: ["caries", "sano", "ausente"] },
        caras: surfacesProperty,
      },
      required: ["diente", "hallazgo", "caras"],
      additionalProperties: false,
    },
  },
  {
    name: "marcar_tratamiento",
    description:
      "Apunta un tratamiento en un diente. estado «pendiente» = hay que hacerlo (pasa al plan y al presupuesto); «realizado» = ya está hecho; «defectuoso» = está hecho pero mal (filtrado, fracturado, hay que repetirlo).",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        diente: toothProperty,
        tratamiento: { type: "string", enum: [...TREATMENTS] },
        estado: { type: "string", enum: ["pendiente", "realizado", "defectuoso"] },
        caras: surfacesProperty,
      },
      required: ["diente", "tratamiento", "estado", "caras"],
      additionalProperties: false,
    },
  },
  {
    name: "anotar_nota",
    description:
      "Guarda una nota clínica en la historia del paciente (síntomas, observaciones, lo que refiere el paciente). Redáctala limpia y en tercera persona.",
    strict: true,
    input_schema: {
      type: "object",
      properties: { texto: { type: "string" } },
      required: ["texto"],
      additionalProperties: false,
    },
  },
  {
    name: "registrar_periodoncia",
    description: "Registra una medición periodontal de un diente y una zona.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        diente: toothProperty,
        sitio: { type: "string", enum: [...PERIO_SITES] },
        profundidad_mm: { type: ["integer", "null"] },
        recesion_mm: { type: ["integer", "null"] },
        movilidad: { type: ["integer", "null"], description: "Grado 0-3." },
        sangrado: { type: "boolean" },
        supuracion: { type: "boolean" },
        placa: { type: "boolean" },
      },
      required: [
        "diente",
        "sitio",
        "profundidad_mm",
        "recesion_mm",
        "movilidad",
        "sangrado",
        "supuracion",
        "placa",
      ],
      additionalProperties: false,
    },
  },
  {
    name: "abrir_seccion",
    description: "Abre una sección de Denty.",
    strict: true,
    input_schema: {
      type: "object",
      properties: { destino: { type: "string", enum: [...DESTINATIONS] } },
      required: ["destino"],
      additionalProperties: false,
    },
  },
  {
    name: "pedir_aclaracion",
    description:
      "Úsala cuando falte un dato imprescindible (qué diente, qué tratamiento) o la orden no encaje en ninguna herramienta.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        pregunta: {
          type: "string",
          description: "El dato que falta en pocas palabras, p. ej. «el número de diente».",
        },
      },
      required: ["pregunta"],
      additionalProperties: false,
    },
  },
];

export const CLAUDE_VOICE_SYSTEM = [
  "Eres «Denty», el asistente de voz de una clínica dental en España.",
  "Recibes la transcripción de lo que dice el dentista o su auxiliar y la conviertes en llamadas a las herramientas de Denty.",
  "Llama a una herramienta por cada hecho distinto (varias llamadas si se dicen varias cosas). No respondas con texto.",
  "Numeración FDI: cuadrante 1 superior derecho, 2 superior izquierdo, 3 inferior izquierdo, 4 inferior derecho (5-8 temporales).",
  "Las cordales son 18, 28, 38 y 48. Si no se dice el diente y no se deduce con seguridad, usa pedir_aclaracion.",
  "Caries es un hallazgo (marcar_hallazgo). Empaste = obturación. «Hay que hacer / a realizar / programar» = pendiente.",
  "«Tiene / lleva / ya hecho» = realizado. «Filtrada, fracturada, mal ajustada, a repetir» = defectuoso.",
  "No puedes gestionar citas, agenda, cobros, pagos, ausencias, llegadas, laboratorio ni presupuestos: si la orden va de eso, usa pedir_aclaracion con «eso todavía no se puede dictar con la IA» y no inventes otra acción.",
  "Si se menciona una caries y además qué hacer con ella, apunta ambas cosas.",
  "Se habla español de España y de Latinoamérica. Glosario (del diccionario dental de Denty):",
  dentalGlossary(),
  "Te llega la orden original y una versión normalizada; si discrepan, manda la original.",
  "No inventes datos que no se han dicho.",
].join("\n");

/** Regional synonyms grouped by the canonical term, e.g. "obturación: calza, tapadura, …". */
function dentalGlossary(): string {
  const groups = new Map<string, string[]>();
  const add = (canonical: string, form: string) => {
    if (form === canonical) return;
    groups.set(canonical, [...(groups.get(canonical) ?? []), form]);
  };
  for (const [form, canonical] of Object.entries(dentalLexicon.treatments)) add(canonical, form);
  for (const form of dentalLexicon.caries) add("caries", form);
  for (const [form, code] of Object.entries(dentalLexicon.surfaces)) {
    if (form.includes(" ") || form.length > 3) add(`cara ${code}`, form);
  }
  return [...groups.entries()]
    .map(([canonical, forms]) => `- ${canonical}: ${[...new Set(forms)].join(", ")}`)
    .join("\n");
}

const tooth = z.string().regex(/^[1-8][1-8]$/);
const surfaces = z.array(z.enum(SURFACES));

const TREATMENT_CODES: Record<(typeof TREATMENTS)[number], [string, string]> = {
  obturacion: ["restoration", "Obturación"],
  reconstruccion: ["reconstruction", "Reconstrucción"],
  incrustacion: ["inlay", "Incrustación"],
  endodoncia: ["endodontics", "Endodoncia"],
  reendodoncia: ["reendodontics", "Reendodoncia"],
  corona: ["crown", "Corona"],
  perno: ["post", "Perno"],
  implante: ["implant", "Implante"],
  extraccion: ["extraction", "Extracción"],
};

const toolInputs = {
  marcar_hallazgo: z.object({
    diente: tooth,
    hallazgo: z.enum(["caries", "sano", "ausente"]),
    caras: surfaces,
  }),
  marcar_tratamiento: z.object({
    diente: tooth,
    tratamiento: z.enum(TREATMENTS),
    estado: z.enum(["pendiente", "realizado", "defectuoso"]),
    caras: surfaces,
  }),
  anotar_nota: z.object({ texto: z.string().trim().min(1).max(2000) }),
  registrar_periodoncia: z.object({
    diente: tooth,
    sitio: z.enum(PERIO_SITES),
    profundidad_mm: z.number().int().min(0).max(20).nullable(),
    recesion_mm: z.number().int().min(-10).max(20).nullable(),
    movilidad: z.number().int().min(0).max(3).nullable(),
    sangrado: z.boolean(),
    supuracion: z.boolean(),
    placa: z.boolean(),
  }),
  abrir_seccion: z.object({ destino: z.enum(DESTINATIONS) }),
  pedir_aclaracion: z.object({ pregunta: z.string().trim().min(1) }),
};

export interface ClaudeVoiceInterpretation {
  actions: LocalVoiceAction[];
  ambiguities: string[];
}

/**
 * Converts the tool calls Claude proposed into Denty voice actions. Inputs are
 * untrusted model output: each one is validated and anything invalid becomes an
 * ambiguity the user sees instead of an action.
 */
export function actionsFromToolCalls(
  calls: ReadonlyArray<{ name: string; input: unknown }>,
): ClaudeVoiceInterpretation {
  const actions: LocalVoiceAction[] = [];
  const ambiguities: string[] = [];
  const patientRef = "";

  for (const call of calls) {
    const schema = toolInputs[call.name as keyof typeof toolInputs];
    const parsed = schema?.safeParse(call.input);
    if (!schema || !parsed?.success) {
      ambiguities.push("no he entendido bien parte de la orden");
      continue;
    }
    const input = parsed.data;
    if (call.name === "marcar_hallazgo" && "hallazgo" in input) {
      actions.push({
        type: "odontogram.set_state",
        patientRef,
        tooth: input.diente,
        status:
          input.hallazgo === "caries"
            ? "CARIES"
            : input.hallazgo === "sano"
              ? "HEALTHY"
              : "MISSING",
        surfaces: input.caras as ToothSurface[],
      });
    } else if (call.name === "marcar_tratamiento" && "tratamiento" in input) {
      const [treatmentCode, name] = TREATMENT_CODES[input.tratamiento];
      actions.push({
        type:
          input.estado === "pendiente"
            ? "clinical.add_item"
            : input.estado === "realizado"
              ? "clinical.complete_item"
              : "clinical.mark_unsatisfactory",
        patientRef,
        tooth: input.diente,
        treatmentCode,
        label: `${name} ${input.diente}`,
        surfaces: input.caras as ToothSurface[],
      });
    } else if (call.name === "anotar_nota" && "texto" in input) {
      actions.push({ type: "clinical.note", patientRef, text: input.texto });
    } else if (call.name === "registrar_periodoncia" && "sitio" in input) {
      actions.push({
        type: "periodontal.update",
        patientRef,
        tooth: input.diente,
        site: input.sitio,
        ...(input.profundidad_mm !== null ? { probingDepth: input.profundidad_mm } : {}),
        ...(input.recesion_mm !== null ? { recession: input.recesion_mm } : {}),
        ...(input.movilidad !== null ? { mobility: String(input.movilidad) } : {}),
        ...(input.sangrado ? { bleeding: true } : {}),
        ...(input.supuracion ? { suppuration: true } : {}),
        ...(input.placa ? { plaque: true } : {}),
      });
    } else if (call.name === "abrir_seccion" && "destino" in input) {
      actions.push({ type: "navigation.open", destination: input.destino });
    } else if (call.name === "pedir_aclaracion" && "pregunta" in input) {
      ambiguities.push(input.pregunta.replace(/[.?¿]+$/g, "").trim());
    }
  }
  return { actions, ambiguities };
}
