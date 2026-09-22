import { getServerEnv } from "@/shared/config/env";
import { isAllowedDentyProxyRoute } from "@/shared/api/proxy-policy";

interface ProxyContext {
  params: Promise<{ path: string[] }>;
}

const FORWARDED_REQUEST_HEADERS = [
  "accept",
  "content-type",
  "cookie",
  "idempotency-key",
  "x-correlation-id",
] as const;

const FORWARDED_RESPONSE_HEADERS = [
  "cache-control",
  "content-disposition",
  "content-type",
  "etag",
  "x-correlation-id",
] as const;

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function hasSameOriginForMutation(request: Request): boolean {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return true;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function apiError(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}

function copyRequestHeaders(request: Request): Headers {
  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

function copyResponseHeaders(upstream: Response): Headers {
  const headers = new Headers();
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  const cookieHeaders = upstream.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const cookies = cookieHeaders.getSetCookie?.() ?? [];
  if (cookies.length) {
    for (const cookie of cookies) headers.append("set-cookie", cookie);
  } else {
    const cookie = upstream.headers.get("set-cookie");
    if (cookie) headers.append("set-cookie", cookie);
  }
  return headers;
}

async function proxyRequest(request: Request, context: ProxyContext): Promise<Response> {
  const { path } = await context.params;
  if (!hasSameOriginForMutation(request)) {
    return apiError(
      403,
      "INVALID_ORIGIN",
      "La mutación requiere un origen de la misma aplicación.",
    );
  }
  const backendPath = `/${path.join("/")}`;
  if (!isAllowedDentyProxyRoute(request.method, backendPath)) {
    return apiError(404, "ROUTE_NOT_ALLOWED", "La ruta no forma parte del contrato Denty.");
  }

  const { DENTY_API_URL } = getServerEnv();
  if (!DENTY_API_URL) {
    return apiError(
      503,
      "API_NOT_CONFIGURED",
      "DENTY_API_URL no está configurado para este entorno.",
    );
  }

  const incomingUrl = new URL(request.url);
  const target = new URL(backendPath, `${DENTY_API_URL.replace(/\/$/, "")}/`);
  target.search = incomingUrl.search;

  const init: RequestInit = {
    method: request.method,
    headers: copyRequestHeaders(request),
    cache: "no-store",
    redirect: "manual",
  };
  if (!new Set(["GET", "HEAD"]).has(request.method)) {
    const body = await request.arrayBuffer();
    if (body.byteLength > 0) init.body = body;
  }

  try {
    const upstream = await fetch(target, init);
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: copyResponseHeaders(upstream),
    });
  } catch {
    return apiError(502, "API_UNREACHABLE", "No se pudo contactar con Denty API.");
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
