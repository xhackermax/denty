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

/** «Oye Denty» with Claude: turns a spoken order into Denty tool calls to confirm. */
export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) {
        return apiError(403, "INVALID_ORIGIN", "Solo se aceptan peticiones del propio Denty.");
      }
    } catch {
      return apiError(403, "INVALID_ORIGIN", "Origen de petición inválido.");
    }
  }

  // Uses a paid API key: only signed-in clinic staff.
  const identity = await resolveRequestIdentity(request).catch(() => null);
  if (!identity) {
    return apiError(401, "UNAUTHENTICATED", "Inicia sesión en Denty para usar la voz.");
  }
  if (identity.actor.role === "PATIENT") {
    return apiError(403, "FORBIDDEN", "El asistente clínico es solo para el equipo de la clínica.");
  }

  const { ANTHROPIC_API_KEY, ANTHROPIC_VOICE_MODEL } = getServerEnv();
  if (!ANTHROPIC_API_KEY) {
    return apiError(
      503,
      "VOICE_CLAUDE_NOT_CONFIGURED",
      "Configura ANTHROPIC_API_KEY en Vercel para que Claude interprete las órdenes de voz.",
    );
  }

  const parsed = voiceInterpretSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, "INVALID_PAYLOAD", "La orden de voz no es válida.");
  }

  try {
    const interpretation = await interpretWithClaude({
      apiKey: ANTHROPIC_API_KEY,
      model: ANTHROPIC_VOICE_MODEL,
      transcript: parsed.data.text,
      screen: describeScreen(parsed.data.pathname),
      selectedTooth: parsed.data.selectedTooth,
    });
    return Response.json(
      { source: "claude", ...interpretation },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (caught) {
    if (caught instanceof ClaudeVoiceUnavailableError) {
      return apiError(422, "VOICE_CLAUDE_DECLINED", caught.message);
    }
    if (caught instanceof Anthropic.AuthenticationError) {
      return apiError(503, "VOICE_CLAUDE_KEY_INVALID", "La clave de Claude no es válida.");
    }
    if (caught instanceof Anthropic.RateLimitError) {
      return apiError(
        429,
        "VOICE_CLAUDE_RATE_LIMITED",
        "Claude está saturado; inténtalo en un momento.",
      );
    }
    if (caught instanceof Anthropic.APIError) {
      return apiError(502, "VOICE_CLAUDE_FAILED", "Claude no ha respondido correctamente.");
    }
    return apiError(502, "VOICE_CLAUDE_UNREACHABLE", "No se pudo contactar con Claude.");
  }
}
