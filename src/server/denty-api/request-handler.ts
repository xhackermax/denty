import { isAllowedDentyProxyRoute } from "@/shared/api/proxy-policy";
import { handleSupabaseDentyRoute } from "@/server/denty-supabase/route-handler";

export interface DentyRouteContext {
  params: Promise<{ path: string[] }>;
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function hasSameOriginForMutation(request: Request): boolean {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return true;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}

function apiError(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}

export async function handleDentyApiRequest(request: Request, backendPath: string): Promise<Response> {
  if (!hasSameOriginForMutation(request)) {
    return apiError(403, "INVALID_ORIGIN", "La mutación requiere un origen de la misma aplicación.");
  }
  if (!isAllowedDentyProxyRoute(request.method, backendPath)) {
    return apiError(404, "ROUTE_NOT_ALLOWED", "La ruta no forma parte del contrato Denty.");
  }
  const response = await handleSupabaseDentyRoute(request, backendPath);
  if (response) return response;
  return apiError(501, "SUPABASE_ROUTE_NOT_IMPLEMENTED", "La ruta aún no está implementada sobre la fuente canónica Supabase.");
}
