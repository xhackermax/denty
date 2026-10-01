import { createGateway } from "@ai-sdk/gateway";

import { resolveRequestIdentity } from "@/server/denty-supabase/route-handler";
import { gatewayTranscriptionModel } from "@/server/voice/transcription-config";
import { getServerEnv } from "@/shared/config/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AUDIO_BYTES = 12 * 1024 * 1024;

function apiError(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}

function normalizeAudioMediaType(mediaType: string): string {
  const normalized = mediaType.toLowerCase().split(";")[0]?.trim();
  if (normalized === "audio/webm") return "audio/webm";
  if (normalized === "audio/ogg") return "audio/ogg";
  if (normalized === "audio/mpeg") return "audio/mpeg";
  if (normalized === "audio/mp3") return "audio/mpeg";
  if (normalized === "audio/mp4") return "audio/mp4";
  if (normalized === "audio/wav" || normalized === "audio/wave" || normalized === "audio/x-wav") {
    return "audio/wav";
  }
  return normalized || "audio/webm";
}

export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) {
        return apiError(
          403,
          "INVALID_ORIGIN",
          "La transcripción solo acepta peticiones del propio Denty.",
        );
      }
    } catch {
      return apiError(403, "INVALID_ORIGIN", "Origen de petición inválido.");
    }
  }

  // Stage 13: transcription spends a paid API key — only signed-in Denty users.
  const identity = await resolveRequestIdentity(request).catch(() => null);
  if (!identity) {
    return apiError(401, "UNAUTHENTICATED", "Inicia sesión en Denty para usar el dictado por voz.");
  }

  const { AI_GATEWAY_API_KEY, VERCEL_OIDC_TOKEN, OPENAI_API_KEY, OPENAI_TRANSCRIBE_MODEL } =
    getServerEnv();
  const gatewayApiKey = AI_GATEWAY_API_KEY ?? VERCEL_OIDC_TOKEN;
  if (!OPENAI_API_KEY && !gatewayApiKey) {
    return apiError(
      503,
      "VOICE_TRANSCRIPTION_NOT_CONFIGURED",
      "Configura AI_GATEWAY_API_KEY en Vercel para transcribir voz.",
    );
  }

  let incoming: FormData;
  try {
    incoming = await request.formData();
  } catch {
    return apiError(400, "INVALID_AUDIO_FORM", "La petición de voz debe usar multipart/form-data.");
  }

  const audio = incoming.get("audio");
  if (!(audio instanceof File) || audio.size === 0) {
    return apiError(400, "AUDIO_REQUIRED", "No se ha recibido una grabación de audio.");
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return apiError(413, "AUDIO_TOO_LARGE", "La grabación supera el límite de 12 MB.");
  }

  if (gatewayApiKey) {
    try {
      const gateway = createGateway({ apiKey: gatewayApiKey });
      const audioBytes = new Uint8Array(await audio.arrayBuffer());
      const mediaType = normalizeAudioMediaType(audio.type || "audio/webm");
      const model = gateway.transcription(gatewayTranscriptionModel(OPENAI_TRANSCRIBE_MODEL));
      const result = await model.doGenerate({
        audio: audioBytes,
        mediaType,
        providerOptions: {
          openai: { language: "es" },
        },
        abortSignal: request.signal,
        headers: {},
      });
      const text = result.text.trim();
      if (!text) {
        return apiError(422, "VOICE_EMPTY_TRANSCRIPT", "No se ha detectado voz inteligible.");
      }
      return Response.json({ text }, { headers: { "cache-control": "no-store" } });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "La transcripcion ha fallado.";
      return apiError(502, "VOICE_TRANSCRIPTION_FAILED", detail);
    }
  }

  const payload = new FormData();
  payload.set("file", audio, audio.name || "denty-voice.webm");
  payload.set("model", OPENAI_TRANSCRIBE_MODEL);
  payload.set("language", "es");

  let upstream: Response;
  try {
    upstream = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: payload,
      cache: "no-store",
    });
  } catch {
    return apiError(
      502,
      "VOICE_TRANSCRIPTION_UNREACHABLE",
      "No se pudo contactar con el servicio de transcripción.",
    );
  }

  const body = (await upstream.json().catch(() => null)) as {
    text?: unknown;
    error?: { message?: unknown };
  } | null;
  if (!upstream.ok) {
    const detail =
      typeof body?.error?.message === "string"
        ? body.error.message
        : "La transcripción ha fallado.";
    return apiError(502, "VOICE_TRANSCRIPTION_FAILED", detail);
  }

  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return apiError(422, "VOICE_EMPTY_TRANSCRIPT", "No se ha detectado voz inteligible.");

  return Response.json({ text }, { headers: { "cache-control": "no-store" } });
}
