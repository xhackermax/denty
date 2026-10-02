import { isInternalVoiceRole } from "@/features/assistant/tools/assistant-policy";
import { resolveRequestIdentity } from "@/server/denty-supabase/route-handler";
import {
  DeepgramCredentialError,
  buildDeepgramListenUrl,
  requestDeepgramAccessToken,
} from "@/server/voice/deepgram";
import { deepgramTokenLimiter } from "@/server/voice/deepgram-token-limiter";
import { getServerEnv } from "@/shared/config/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Only needs to outlive opening the WebSocket; every session asks for a new one.
const TOKEN_TTL_SECONDS = 30;

const NO_STORE = { "cache-control": "no-store", pragma: "no-cache" } as const;

function apiError(
  status: number,
  code: string,
  message: string,
  headers: Record<string, string> = {},
): Response {
  return Response.json(
    { error: { code, message } },
    { status, headers: { ...NO_STORE, ...headers } },
  );
}

/** Short-lived Deepgram credential so the browser can stream audio without the server key. */
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

  const identity = await resolveRequestIdentity(request).catch(() => null);
  if (!identity) {
    return apiError(401, "UNAUTHENTICATED", "Inicia sesión en Denty para usar el dictado.");
  }
  if (!isInternalVoiceRole(identity.actor.role)) {
    return apiError(403, "FORBIDDEN", "El dictado es solo para el equipo de la clínica.");
  }

  const env = getServerEnv();
  if (!env.DEEPGRAM_API_KEY) {
    return apiError(
      503,
      "VOICE_TRANSCRIPTION_NOT_CONFIGURED",
      "Configura DEEPGRAM_API_KEY en el servidor para usar el micrófono con Deepgram.",
    );
  }

  const decision = deepgramTokenLimiter.check(identity.actor.userId);
  if (!decision.allowed) {
    return apiError(
      429,
      "VOICE_TRANSCRIPTION_RATE_LIMITED",
      "Has abierto demasiadas sesiones de voz seguidas. Espera un momento.",
      { "retry-after": String(decision.retryAfterSeconds) },
    );
  }

  try {
    const token = await requestDeepgramAccessToken({
      apiKey: env.DEEPGRAM_API_KEY,
      ttlSeconds: TOKEN_TTL_SECONDS,
    });
    const keyterms = (env.DEEPGRAM_KEYTERMS ?? "")
      .split(",")
      .map((term) => term.trim())
      .filter(Boolean);
    return Response.json(
      {
        accessToken: token.accessToken,
        expiresIn: token.expiresIn,
        listenUrl: buildDeepgramListenUrl({
          model: env.DEEPGRAM_MODEL,
          language: env.DEEPGRAM_LANGUAGE,
          keyterms,
        }),
      },
      { headers: NO_STORE },
    );
  } catch (caught) {
    if (caught instanceof DeepgramCredentialError) {
      return apiError(
        503,
        "VOICE_TRANSCRIPTION_KEY_INVALID",
        "La clave de Deepgram del servidor no es válida.",
      );
    }
    return apiError(
      502,
      "VOICE_TRANSCRIPTION_UNAVAILABLE",
      "Deepgram no está disponible ahora mismo.",
    );
  }
}
