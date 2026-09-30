/**
 * Vercel AI Gateway Realtime session manager.
 * It uses the official Gateway provider so production deployments can
 * authenticate with Vercel OIDC without storing a static AI key.
 */

import { createGateway } from "@ai-sdk/gateway";
import type {
  Experimental_RealtimeModelV4SessionConfig,
  Experimental_RealtimeModelV4ToolDefinition,
} from "@ai-sdk/provider";

import { getServerEnv } from "@/shared/config/env";

const MODELS = {
  realtime2: "openai/gpt-realtime-2",
  live: "openai/gpt-live-1",
  miniRealtime: "openai/gpt-realtime-mini",
} as const;

export type RealtimeModel = (typeof MODELS)[keyof typeof MODELS] | (string & {});

interface RealtimeTool {
  type: "function";
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
}

interface RealtimeSessionConfig {
  model?: RealtimeModel;
  instructions: string;
  voice?: "alloy" | "echo" | "shimmer" | "fable" | "onyx" | "nova" | "sage";
  maxTokens?: number;
  modalities?: ("text" | "audio")[];
  temperature?: number;
  tools?: RealtimeTool[];
}

interface RealtimeSessionToken {
  token: string;
  url: string;
  expiresAt?: number;
}

/**
 * Generates a temporary session token for Vercel AI Gateway Realtime API.
 * The browser receives only this short-lived token, never the Gateway credential.
 */
export async function createRealtimeSession(
  config: RealtimeSessionConfig,
): Promise<RealtimeSessionToken> {
  const { AI_GATEWAY_API_KEY, AI_GATEWAY_REALTIME_MODEL, VERCEL_OIDC_TOKEN } = getServerEnv();
  const apiKey = AI_GATEWAY_API_KEY ?? VERCEL_OIDC_TOKEN;
  if (!apiKey) {
    throw new Error("AI Gateway is not configured");
  }

  const gateway = createGateway({ apiKey });
  const sessionConfig: Experimental_RealtimeModelV4SessionConfig = {
    instructions: config.instructions,
    voice: config.voice ?? "nova",
    outputModalities: config.modalities ?? ["text", "audio"],
    inputAudioTranscription: {
      model: "openai/gpt-4o-mini-transcribe",
      language: "es",
    },
    outputAudioTranscription: {
      language: "es",
    },
    turnDetection: {
      type: "server-vad",
      silenceDurationMs: 650,
      prefixPaddingMs: 250,
    },
    ...(config.tools
      ? { tools: config.tools as Experimental_RealtimeModelV4ToolDefinition[] }
      : {}),
    providerOptions: {
      openai: {
        temperature: config.temperature ?? 0.45,
        max_response_output_tokens: config.maxTokens ?? 2048,
      },
    },
  };

  const { token, url, expiresAt } = await gateway.experimental_realtime.getToken({
    model: config.model ?? AI_GATEWAY_REALTIME_MODEL,
    expiresAfterSeconds: 300,
    sessionConfig,
  });

  return { token, url, ...(expiresAt !== undefined ? { expiresAt } : {}) };
}

/**
 * System prompt for Denty Realtime voice assistant.
 */
export function getDentySystemPrompt(): string {
  return `Eres Oye Denty, un asistente de voz para la clinica dental.
Tu rol es entender comandos de voz del dentista e interpretarlos como acciones en Denty.

Acciones disponibles:
- Abrir fichas de pacientes.
- Marcar hallazgos en el odontograma: caries, sano o ausente.
- Registrar tratamientos: obturacion, endodoncia, corona, implante, extraccion.
- Anotar notas clinicas.
- Registrar mediciones periodontales.

Cuando el dentista da una orden:
1. Si hay datos suficientes, llama una herramienta de Denty.
2. Si falta un dato imprescindible, pide una aclaracion breve.
3. No inventes dientes, pacientes ni tratamientos.
4. Responde siempre en espanol y en maximo dos lineas.`;
}

export const RealtimeModels = {
  GPT_REALTIME_2: MODELS.realtime2,
  GPT_LIVE_1: MODELS.live,
  GPT_REALTIME_MINI: MODELS.miniRealtime,
} as const;
