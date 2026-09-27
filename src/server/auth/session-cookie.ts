import crypto from "node:crypto";

import { permissionsForRole, type Permission, type Role } from "@/domain/permissions";

export const DENTY_SESSION_COOKIE = "denty_session";

export interface DentySessionActor {
  userId: string;
  clinicId: string;
  role: Role;
  permissions: Permission[];
  sessionId: string;
  staffId?: string | undefined;
  patientIds?: string[] | undefined;
}

interface CookiePayload extends DentySessionActor {
  exp: number;
}

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function sign(value: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function sessionSecret(explicit: string | undefined, fallbackKey: string | undefined): string {
  const secret = explicit?.trim() || fallbackKey?.trim();
  if (!secret) throw new Error("DENTY_SESSION_SECRET o clave Supabase requerida para firmar sesiones.");
  return secret;
}

export function createSessionCookie(
  actor: Omit<DentySessionActor, "sessionId" | "permissions"> & {
    permissions?: Permission[] | undefined;
  },
  options: { sessionSecret?: string | undefined; fallbackKey?: string | undefined; maxAgeSeconds?: number },
) {
  const maxAgeSeconds = options.maxAgeSeconds ?? 60 * 60 * 10;
  const payload: CookiePayload = {
    ...actor,
    permissions: actor.permissions ?? permissionsForRole(actor.role),
    sessionId: crypto.randomUUID(),
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  };
  const encoded = base64Url(JSON.stringify(payload));
  const signature = sign(encoded, sessionSecret(options.sessionSecret, options.fallbackKey));
  return `${DENTY_SESSION_COOKIE}=${encoded}.${signature}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

export function clearSessionCookie() {
  return `${DENTY_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function readSessionFromRequest(
  request: Request,
  options: { sessionSecret?: string | undefined; fallbackKey?: string | undefined },
): DentySessionActor | null {
  const raw = readCookie(request.headers.get("cookie") ?? "", DENTY_SESSION_COOKIE);
  if (!raw) return null;
  const [encoded, signature] = raw.split(".");
  if (!encoded || !signature) return null;
  const secret = sessionSecret(options.sessionSecret, options.fallbackKey);
  const expected = sign(encoded, secret);
  if (Buffer.byteLength(signature) !== Buffer.byteLength(expected)) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as CookiePayload;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return {
    userId: payload.userId,
    clinicId: payload.clinicId,
    role: payload.role,
    permissions: payload.permissions,
    sessionId: payload.sessionId,
    staffId: payload.staffId,
    patientIds: payload.patientIds,
  };
}

function readCookie(header: string, name: string): string | null {
  for (const part of header.split(";")) {
    const [rawName, ...rest] = part.trim().split("=");
    if (rawName === name) return rest.join("=");
  }
  return null;
}
