import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { authenticatedHeaders, withAuthenticatedStaff } from "@/test/supabase-auth-fixture";

import { resetDeepgramTokenLimiterForTests } from "@/server/voice/deepgram-token-limiter";

import { POST } from "./route";

const API_KEY = "dg-server-secret";

function deepgramGrant(response: () => Response) {
  const calls: RequestInit[] = [];
  const fetchFn = async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url === "https://api.deepgram.com/v1/auth/grant") {
      calls.push(init ?? {});
      return response();
    }
    throw new Error(`unexpected fetch ${url}`);
  };
  return { fetchFn, calls };
}

function call(headers: Record<string, string> = {}) {
  return POST(
    new Request("https://denty.test/api/voice/deepgram-token", {
      method: "POST",
      headers: { origin: "https://denty.test", ...headers },
    }),
  );
}

beforeEach(() => {
  resetDeepgramTokenLimiterForTests();
  vi.stubEnv("SUPABASE_URL", "https://supabase.test");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "test-key");
  vi.stubEnv("DEEPGRAM_API_KEY", API_KEY);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("rejects requests without a Denty session", async () => {
  const response = await call();
  expect(response.status).toBe(401);
});

test("rejects other origins before authentication", async () => {
  const response = await call({ origin: "https://evil.test" });
  expect(response.status).toBe(403);
});

test("explains when Deepgram is not configured", async () => {
  vi.stubEnv("DEEPGRAM_API_KEY", "");
  const grant = deepgramGrant(() => Response.json({ access_token: "x" }));
  vi.stubGlobal("fetch", withAuthenticatedStaff(grant.fetchFn, { clinicId: "clinic" }));
  const response = await call(authenticatedHeaders());
  expect(response.status).toBe(503);
  expect((await response.json()).error.code).toBe("VOICE_TRANSCRIPTION_NOT_CONFIGURED");
  expect(grant.calls).toHaveLength(0);
});

test("issues a short-lived token and the listen URL without caching or leaking the key", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const info = vi.spyOn(console, "log").mockImplementation(() => undefined);
  const grant = deepgramGrant(() =>
    Response.json({ access_token: "jwt-temporal", expires_in: 30 }),
  );
  vi.stubGlobal(
    "fetch",
    withAuthenticatedStaff(grant.fetchFn, { clinicId: "clinic", role: "RECEPTION" }),
  );
  const response = await call(authenticatedHeaders());
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  const body = await response.json();
  expect(body.accessToken).toBe("jwt-temporal");
  expect(body.expiresIn).toBe(30);
  expect(new URL(body.listenUrl).host).toBe("api.deepgram.com");
  const raw = JSON.stringify(body);
  expect(raw).not.toContain(API_KEY);
  expect(new Headers(grant.calls[0]?.headers).get("authorization")).toBe(`Token ${API_KEY}`);
  for (const spy of [log, info]) {
    for (const args of spy.mock.calls) expect(JSON.stringify(args)).not.toContain(API_KEY);
  }
});

test("limits how often one user can open voice sessions", async () => {
  const grant = deepgramGrant(() => Response.json({ access_token: "jwt", expires_in: 30 }));
  vi.stubGlobal("fetch", withAuthenticatedStaff(grant.fetchFn, { clinicId: "clinic" }));
  let last: Response | undefined;
  for (let attempt = 0; attempt < 13; attempt += 1) last = await call(authenticatedHeaders());
  expect(last?.status).toBe(429);
  expect(Number(last?.headers.get("retry-after"))).toBeGreaterThan(0);
  expect(grant.calls).toHaveLength(12);
});

test("reports an invalid Deepgram key as a configuration problem", async () => {
  const grant = deepgramGrant(() =>
    Response.json({ err_msg: "Invalid credentials" }, { status: 401 }),
  );
  vi.stubGlobal("fetch", withAuthenticatedStaff(grant.fetchFn, { clinicId: "clinic" }));
  const response = await call(authenticatedHeaders());
  expect(response.status).toBe(503);
  expect((await response.json()).error.code).toBe("VOICE_TRANSCRIPTION_KEY_INVALID");
});

test("reports Deepgram outages as a gateway error", async () => {
  const grant = deepgramGrant(() => new Response("down", { status: 502 }));
  vi.stubGlobal("fetch", withAuthenticatedStaff(grant.fetchFn, { clinicId: "clinic" }));
  const response = await call(authenticatedHeaders());
  expect(response.status).toBe(502);
  expect((await response.json()).error.code).toBe("VOICE_TRANSCRIPTION_UNAVAILABLE");
});
