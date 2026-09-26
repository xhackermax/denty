import { getServerEnv } from "@/shared/config/env";
import { resolveSupabaseCredentials } from "@/server/supabase/credentials";
import { buildSupabaseRestHeaders } from "@/server/supabase/rest-client";

function json(status: number, body: Record<string, unknown>): Response {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
    },
  });
}

export async function GET(): Promise<Response> {
  const env = getServerEnv();
  const credentials = resolveSupabaseCredentials(env);

  if (!credentials) {
    return json(503, {
      ok: false,
      service: "supabase",
      code: "SUPABASE_NOT_CONFIGURED",
    });
  }

  try {
    const response = await fetch(new URL("/rest/v1/", credentials.url), {
      headers: buildSupabaseRestHeaders(credentials.key),
      cache: "no-store",
    });

    return json(response.ok ? 200 : 502, {
      ok: response.ok,
      service: "supabase",
      status: response.status,
    });
  } catch {
    return json(502, {
      ok: false,
      service: "supabase",
      code: "SUPABASE_UNREACHABLE",
    });
  }
}
