import {
  createRealtimeSession,
  getDentySystemPrompt,
  RealtimeModels,
} from "@/server/realtime/gateway";
import { resolveRequestIdentity } from "@/server/denty-supabase/route-handler";
import { convertToolsForRealtime } from "@/features/voice/realtime-tools";

/**
 * POST /api/voice/realtime-session
 * Generates a temporary token for Vercel AI Gateway Realtime voice session.
 * Requires authentication - this ensures the API key stays server-side only.
 */
export async function POST(request: Request) {
  try {
    // Verify user is authenticated
    const identity = await resolveRequestIdentity(request);
    if (!identity) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create a new Realtime session with tool support
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
  } catch (error) {
    console.error("Failed to create Realtime session:", error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Failed to create session",
      },
      { status: 500 },
    );
  }
}
