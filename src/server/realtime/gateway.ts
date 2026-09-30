/**
 * Vercel AI Gateway Realtime session manager
 * Handles secure token generation and session lifecycle for voice interactions
 */

const VERCEL_GATEWAY_BASE = "https://ai.vercel.sh";
const MODELS = {
  realtime2: "gpt-realtime-2",
  live: "gpt-live-1",
  miniRealtime: "gpt-realtime-mini",
} as const;

export type RealtimeModel = (typeof MODELS)[keyof typeof MODELS];

interface RealtimeSessionConfig {
  model: RealtimeModel;
  instructions: string;
  voice?: "alloy" | "echo" | "shimmer" | "fable" | "onyx" | "nova" | "sage";
  maxTokens?: number;
  modalities?: ("text" | "audio")[];
  temperature?: number;
}

interface RealtimeSessionToken {
  client_secret: {
    value: string;
    expires_at: number;
  };
}

/**
 * Generates a temporary session token for Vercel AI Gateway Realtime API
 * The token is valid for ~1 hour and scoped to this session only
 */
export async function createRealtimeSession(
  config: RealtimeSessionConfig,
): Promise<RealtimeSessionToken> {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    throw new Error("AI_GATEWAY_API_KEY not configured");
  }

  const response = await fetch(`${VERCEL_GATEWAY_BASE}/openai/realtime/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      instructions: config.instructions,
      voice: config.voice ?? "nova",
      max_response_output_tokens: config.maxTokens ?? 2048,
      modalities: config.modalities ?? ["text", "audio"],
      temperature: config.temperature ?? 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Realtime session: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * System prompt for Denty Realtime voice assistant
 * Guides the model to understand dental commands and delegate to tools
 */
export function getDentySystemPrompt(): string {
  return `Eres Oye Denty, un asistente de voz para la clínica dental.
Tu rol es entender comandos de voz del dentista e interpretarlos como acciones en Denty.

Las acciones que puedes realizar:
- Abrir fichas de pacientes ("Abre a María García")
- Marcar hallazgos en el odontograma ("Caries distal en el 36")
- Registrar tratamientos ("Obturación en el 14")
- Crear presupuestos ("Presupuesto para obturación de dos piezas")
- Anotar notas clínicas
- Crear citas

Cuando el dentista da una orden:
1. Entiende el contexto (¿qué paciente?, ¿qué diente?, ¿qué acción?)
2. Si necesitas clarificación, pregunta de forma concisa
3. Confirma la acción antes de ejecutarla
4. Proporciona retroalimentación clara

Siempre en español, tono profesional pero cercano. Mantén respuestas breves (máximo 2 líneas).`;
}

export const RealtimeModels = {
  GPT_REALTIME_2: MODELS.realtime2,
  GPT_LIVE_1: MODELS.live,
  GPT_REALTIME_MINI: MODELS.miniRealtime,
} as const;
