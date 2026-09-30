import Anthropic from "@anthropic-ai/sdk";

import { resolveRequestIdentity } from "@/server/denty-supabase/route-handler";
import {
  ClaudeVoiceUnavailableError,
  interpretWithClaude,
} from "@/server/voice/claude-voice-interpreter";
import { voiceInterpretSchema } from "@/shared/api/schemas/voice";
import { getServerEnv } from "@/shared/config/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function apiError(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}

function describeScreen(pathname: string | undefined): string {
  if (!pathname) return "desconocida";
  if (/\/odontogram(?:\/|$)/.test(pathname)) return "odontograma del paciente";
  if (/^\/app\/patients\/[^/]+/.test(pathname)) return "ficha del paciente";
  if (pathname.startsWith("/app/agenda")) return "agenda";
  return pathname;
}

/** Oye Denty: turns a spoken order into Denty tool calls to confirm or execute. */
export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) {
        return apiError(403, "INVALID_ORIGIN", "Solo se aceptan peticiones del propio Denty.");
      }
    } catch {
      return apiError(403, "INVALID_ORIGIN", "Origen de peticion invalido.");
    }
  }

  const identity = await resolveRequestIdentity(request).catch(() => null);
  if (!identity) {
    return apiError(401, "UNAUTHENTICATED", "Inicia sesion en Denty para usar la voz.");
  }
  if (identity.actor.role === "PATIENT") {
    return apiError(403, "FORBIDDEN", "El asistente clinico es solo para el equipo de la clinica.");
  }

  const parsed = voiceInterpretSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, "INVALID_PAYLOAD", "La orden de voz no es valida.");
  }

  const {
    AI_GATEWAY_API_KEY,
    AI_GATEWAY_VOICE_MODEL,
    VERCEL_OIDC_TOKEN,
    ANTHROPIC_API_KEY,
    ANTHROPIC_VOICE_MODEL,
  } = getServerEnv();
  const gatewayApiKey = AI_GATEWAY_API_KEY ?? VERCEL_OIDC_TOKEN;
  const voiceConfig = ANTHROPIC_API_KEY
    ? { apiKey: ANTHROPIC_API_KEY, model: ANTHROPIC_VOICE_MODEL, source: "claude" as const }
    : gatewayApiKey
      ? {
          apiKey: gatewayApiKey,
          model: AI_GATEWAY_VOICE_MODEL,
          baseURL: "https://ai-gateway.vercel.sh",
          source: "vercel-ai-gateway" as const,
        }
      : null;

  if (!voiceConfig) {
    return apiError(
      503,
      "VOICE_AI_NOT_CONFIGURED",
      "Activa Vercel AI Gateway o configura ANTHROPIC_API_KEY para interpretar las ordenes de voz.",
    );
  }

  try {
    const interpretation = await interpretWithClaude({
      apiKey: voiceConfig.apiKey,
      model: voiceConfig.model,
      baseURL: "baseURL" in voiceConfig ? voiceConfig.baseURL : undefined,
      transcript: parsed.data.text,
      screen: describeScreen(parsed.data.pathname),
      selectedTooth: parsed.data.selectedTooth,
    });
    return Response.json(
      { source: voiceConfig.source, ...interpretation },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (caught) {
    if (caught instanceof ClaudeVoiceUnavailableError) {
      return apiError(422, "VOICE_AI_DECLINED", caught.message);
    }
    if (caught instanceof Anthropic.AuthenticationError) {
      return apiError(503, "VOICE_AI_KEY_INVALID", "La credencial de IA de voz no es valida.");
    }
    if (caught instanceof Anthropic.RateLimitError) {
      return apiError(
        429,
        "VOICE_AI_RATE_LIMITED",
        "La IA de voz esta saturada; intentalo en un momento.",
      );
    }
    if (caught instanceof Anthropic.APIError) {
      return apiError(502, "VOICE_AI_FAILED", "La IA de voz no ha respondido correctamente.");
    }
    return apiError(502, "VOICE_AI_UNREACHABLE", "No se pudo contactar con la IA de voz.");
  }
}
