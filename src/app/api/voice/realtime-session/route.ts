import {
  createRealtimeSession,
  getDentySystemPrompt,
  RealtimeModels,
} from "@/server/realtime/gateway";
import { resolveRequestIdentity } from "@/server/denty-supabase/route-handler";
import { convertToolsForRealtime } from "@/features/voice/realtime-tools";
import {
  resolveSupabaseAuthCredentials,
  resolveSupabasePublicCredentials,
} from "@/server/supabase/credentials";
import { getServerEnv } from "@/shared/config/env";

/**
 * POST /api/voice/realtime-session
 * Generates a temporary token for Vercel AI Gateway Realtime voice session.
 * Requires authentication - this ensures the API key stays server-side only.
 */
export async function POST(request: Request) {
  try {
    // Check if Supabase is configured
    const env = getServerEnv();
    const publicCreds = resolveSupabasePublicCredentials(env);
    if (!publicCreds) {
      return Response.json({ error: "Supabase no está configurado" }, { status: 503 });
    }

    const authCreds = resolveSupabaseAuthCredentials(env);
    if (!authCreds) {
      return Response.json(
        { error: "Supabase no está listo para validar la sesión" },
        { status: 503 },
      );
    }

    // Verify user is authenticated
    const identity = await resolveRequestIdentity(request);
    if (!identity) {
      return Response.json(
        { error: "Usuario no autenticado" },
        { status: 401 },
      );
    }

    // Create a new Realtime session with tool support
    try {
      const sessionToken = await createRealtimeSession({
        model: RealtimeModels.GPT_REALTIME_2,
        instructions: getDentySystemPrompt(),
        voice: "nova",
        maxTokens: 2048,
        modalities: ["text", "audio"],
        temperature: 0.7,
        tools: convertToolsForRealtime(),
      });

      // Return only the client secret (the token)
      return Response.json(
        {
          token: sessionToken.client_secret.value,
          expiresAt: sessionToken.client_secret.expires_at,
        },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        },
      );
    } catch (gatewayError) {
      console.error("Vercel AI Gateway error:", gatewayError);
      // If the error includes rate limit or auth issues, provide specific feedback
      const errorMsg = gatewayError instanceof Error ? gatewayError.message : "";
      if (errorMsg.includes("401") || errorMsg.includes("403")) {
        return Response.json(
          { error: "Clave de API no configurada correctamente" },
          { status: 503 },
        );
      }
      if (errorMsg.includes("429")) {
        return Response.json(
          { error: "Demasiadas solicitudes. Intenta de nuevo en unos segundos" },
          { status: 429 },
        );
      }
      throw gatewayError;
    }
  } catch (error) {
    console.error("Failed to create Realtime session:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo crear la sesión de voz",
      },
      { status: 500 },
    );
  }
}
