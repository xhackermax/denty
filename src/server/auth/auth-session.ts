import type { SupabaseAuthSession } from "../supabase/auth-client";

export const DENTY_ACCESS_COOKIE = "denty_sb_access";
export const DENTY_REFRESH_COOKIE = "denty_sb_refresh";
export const DENTY_APP_SESSION_COOKIE = "denty_app_session";

export interface AuthCookieState {
  accessToken: string | null;
  refreshToken: string | null;
  appSessionId: string | null;
}

export function readAuthCookies(request: Request): AuthCookieState {
  const header = request.headers.get("cookie") ?? "";
  return {
    accessToken: readCookie(header, DENTY_ACCESS_COOKIE),
    refreshToken: readCookie(header, DENTY_REFRESH_COOKIE),
    appSessionId: readCookie(header, DENTY_APP_SESSION_COOKIE),
  };
}

export function appendAuthSessionCookies(
  headers: Headers,
  session: SupabaseAuthSession,
  appSessionId: string,
  options: { secure: boolean },
): void {
  const accessMaxAge = Math.max(60, session.expiresAt - Math.floor(Date.now() / 1000));
  headers.append(
    "set-cookie",
    serializeCookie(DENTY_ACCESS_COOKIE, session.accessToken, {
      maxAge: accessMaxAge,
      secure: options.secure,
    }),
  );
  headers.append(
    "set-cookie",
    serializeCookie(DENTY_REFRESH_COOKIE, session.refreshToken, {
      maxAge: 60 * 60 * 24 * 30,
      secure: options.secure,
    }),
  );
  headers.append(
    "set-cookie",
    serializeCookie(DENTY_APP_SESSION_COOKIE, appSessionId, {
      maxAge: 60 * 60 * 24 * 30,
      secure: options.secure,
    }),
  );
}

export function appendRefreshedTokenCookies(
  headers: Headers,
  session: SupabaseAuthSession,
  appSessionId: string,
  options: { secure: boolean },
): void {
  const accessMaxAge = Math.max(60, session.expiresAt - Math.floor(Date.now() / 1000));
  headers.append(
    "set-cookie",
    serializeCookie(DENTY_ACCESS_COOKIE, session.accessToken, {
      maxAge: accessMaxAge,
      secure: options.secure,
    }),
  );
  headers.append(
    "set-cookie",
    serializeCookie(DENTY_REFRESH_COOKIE, session.refreshToken, {
      maxAge: 60 * 60 * 24 * 30,
      secure: options.secure,
    }),
  );
  headers.append(
    "set-cookie",
    serializeCookie(DENTY_APP_SESSION_COOKIE, appSessionId, {
      maxAge: 60 * 60 * 24 * 30,
      secure: options.secure,
    }),
  );
}

export function appendClearedAuthCookies(headers: Headers, options: { secure: boolean }): void {
  for (const name of [DENTY_ACCESS_COOKIE, DENTY_REFRESH_COOKIE, DENTY_APP_SESSION_COOKIE]) {
    headers.append("set-cookie", serializeCookie(name, "", { maxAge: 0, secure: options.secure }));
  }
}

export function decodeJwtSessionId(accessToken: string): string | null {
  const claims = decodeJwtPayload(accessToken);
  return typeof claims?.session_id === "string" ? claims.session_id : null;
}

export function decodeJwtExpiry(accessToken: string): number | null {
  const claims = decodeJwtPayload(accessToken);
  return typeof claims?.exp === "number" ? claims.exp : null;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2 || !parts[1]) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}

function readCookie(header: string, name: string): string | null {
  for (const part of header.split(";")) {
    const [rawName, ...rest] = part.trim().split("=");
    if (rawName === name) {
      try {
        return decodeURIComponent(rest.join("="));
      } catch {
        return null;
      }
    }
  }
  return null;
}

function serializeCookie(
  name: string,
  value: string,
  options: { maxAge: number; secure: boolean },
): string {
  const attrs = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.max(0, Math.floor(options.maxAge))}`,
  ];
  if (options.secure) attrs.push("Secure");
  return attrs.join("; ");
}
