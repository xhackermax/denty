import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  appendAuthSessionCookies,
  appendRefreshedTokenCookies,
  decodeJwtSessionId,
  readAuthCookies,
} from "../src/server/auth/auth-session.ts";

function jwt(payload) {
  const head = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${head}.${body}.signature`;
}

const authSource = await readFile(
  new URL("../src/server/supabase/auth-client.ts", import.meta.url),
  "utf8",
);
assert.match(authSource, /from\s+["']@supabase\/supabase-js["']/);
assert.match(authSource, /auth\.signInWithPassword\(/);
assert.match(authSource, /auth\.refreshSession\(/);
assert.match(authSource, /auth\.getUser\(/);
assert.match(authSource, /auth\.admin\.createUser\(/);
assert.match(authSource, /auth\.admin\.signOut\(accessToken,\s*["']local["']\)/);
assert.doesNotMatch(authSource, /\/auth\/v1\//);

const session = {
  accessToken: jwt({ session_id: "00000000-0000-0000-0000-000000000099", exp: 4102444800 }),
  refreshToken: "refresh-token",
  expiresIn: 3600,
  expiresAt: 4102444800,
  tokenType: "bearer",
  user: { id: "00000000-0000-0000-0000-000000000001", email: "staff@clinic.es" },
};

const headers = new Headers();
appendAuthSessionCookies(headers, session, "00000000-0000-0000-0000-000000000003", {
  secure: true,
});
const cookies = headers.getSetCookie?.() ?? [headers.get("set-cookie")].filter(Boolean);
assert.equal(cookies.length, 3);
assert.ok(cookies.every((cookie) => cookie.includes("HttpOnly")));
assert.ok(cookies.every((cookie) => cookie.includes("SameSite=Lax")));
assert.ok(cookies.every((cookie) => cookie.includes("Secure")));

const refreshHeaders = new Headers();
appendRefreshedTokenCookies(refreshHeaders, session, "00000000-0000-0000-0000-000000000003", {
  secure: false,
});
const refreshedCookies =
  refreshHeaders.getSetCookie?.() ?? [refreshHeaders.get("set-cookie")].filter(Boolean);
assert.equal(refreshedCookies.length, 3);

const request = new Request("https://denty.test/app", {
  headers: {
    cookie:
      "denty_sb_access=abc; denty_sb_refresh=def; denty_app_session=00000000-0000-0000-0000-000000000003",
  },
});
assert.deepEqual(readAuthCookies(request), {
  accessToken: "abc",
  refreshToken: "def",
  appSessionId: "00000000-0000-0000-0000-000000000003",
});
assert.equal(decodeJwtSessionId(session.accessToken), "00000000-0000-0000-0000-000000000099");

console.log("stage1 auth runtime: OK");
