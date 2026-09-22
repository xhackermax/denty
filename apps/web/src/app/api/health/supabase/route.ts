import { getServerEnv } from "@/shared/config/env";

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
  const supabaseUrl = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return json(503, {
      ok: false,
      service: "supabase",
      code: "SUPABASE_NOT_CONFIGURED",
    });
  }

  try {
    const response = await fetch(new URL("/rest/v1/", supabaseUrl), {
      headers: {
        apikey: supabaseKey,
        authorization: `Bearer ${supabaseKey}`,
      },
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
