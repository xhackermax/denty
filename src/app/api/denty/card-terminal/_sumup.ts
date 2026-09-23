import { sessionResponseSchema } from "@/shared/api/contracts";
import { getServerEnv } from "@/shared/config/env";

const SUMUP_API_BASE = "https://api.sumup.com";
export interface SumUpReader {
  id: string;
  name: string;
  status: string;
  device?: {
    model?: string;
    identifier?: string;
  };
}

export class TerminalRouteError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function terminalErrorStatus(error: unknown, fallback: number): number {
  return error instanceof TerminalRouteError ? error.status : fallback;
}

export function requireSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) throw new TerminalRouteError("Origen de solicitud no válido", 403);
  if (new URL(origin).origin !== new URL(request.url).origin) {
    throw new TerminalRouteError("Origen de solicitud no autorizado", 403);
  }
}

export async function requireFinanceSession(request: Request): Promise<void> {
  const { DENTY_API_URL } = getServerEnv();
  if (!DENTY_API_URL) {
    throw new TerminalRouteError("DENTY_API_URL no configurado", 503);
  }
  const headers = new Headers({ accept: "application/json" });
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  let response: Response;
  try {
    response = await fetch(new URL("/api/auth/session", `${DENTY_API_URL.replace(/\/$/, "")}/`), {
      headers,
      cache: "no-store",
      redirect: "manual",
    });
  } catch {
    throw new TerminalRouteError("No se pudo validar la sesión Denty", 503);
  }
  if (response.status === 401) {
    throw new TerminalRouteError("Sesión no autenticada", 401);
  }
  if (!response.ok) {
    throw new TerminalRouteError("No se pudo validar la sesión Denty", 503);
  }
  const parsed = sessionResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new TerminalRouteError("Sesión Denty no válida", 503);
  }
  if (!parsed.data.actor.permissions.includes("finance.write")) {
    throw new TerminalRouteError("No tienes permiso para operar el datáfono", 403);
  }
}

function requiredEnv(name: "SUMUP_API_KEY" | "SUMUP_MERCHANT_CODE") {
  const value = process.env[name];
  if (!value) throw new Error(`${name} no configurado`);
  return value;
}
export function sumupConfig() {
  return {
    apiKey: requiredEnv("SUMUP_API_KEY"),
    merchantCode: requiredEnv("SUMUP_MERCHANT_CODE"),
    affiliateKey: process.env.SUMUP_AFFILIATE_KEY,
    appId: process.env.SUMUP_APP_ID,
    defaultReaderId: process.env.SUMUP_READER_ID,
  };
}
export async function sumupRequest(path: string, init?: RequestInit) {
  const { apiKey } = sumupConfig();
  const response = await fetch(`${SUMUP_API_BASE}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail =
      typeof body?.detail === "string" ? body.detail : `SumUp respondió ${response.status}`;
    throw new Error(detail);
  }
  return body as Record<string, unknown>;
}
