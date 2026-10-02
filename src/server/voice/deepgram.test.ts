import { describe, expect, it, vi } from "vitest";

import {
  DeepgramCredentialError,
  DeepgramUnavailableError,
  buildDeepgramListenUrl,
  requestDeepgramAccessToken,
} from "./deepgram";

const API_KEY = "dg-secret-key-123";

describe("buildDeepgramListenUrl", () => {
  it("streams 16 kHz mono PCM in Spanish with partial results", () => {
    const url = new URL(buildDeepgramListenUrl({ model: "nova-3", language: "es" }));
    expect(`${url.protocol}//${url.host}${url.pathname}`).toBe("wss://api.deepgram.com/v1/listen");
    expect(url.searchParams.get("model")).toBe("nova-3");
    expect(url.searchParams.get("language")).toBe("es");
    expect(url.searchParams.get("encoding")).toBe("linear16");
    expect(url.searchParams.get("sample_rate")).toBe("16000");
    expect(url.searchParams.get("channels")).toBe("1");
    expect(url.searchParams.get("interim_results")).toBe("true");
    expect(url.searchParams.get("smart_format")).toBe("true");
  });

  it("only adds key terms when they are explicitly enabled", () => {
    const plain = new URL(buildDeepgramListenUrl({ model: "nova-3", language: "es" }));
    expect(plain.searchParams.getAll("keyterm")).toEqual([]);
    const boosted = new URL(
      buildDeepgramListenUrl({
        model: "nova-3",
        language: "es",
        keyterms: ["periodontitis", "raspado y alisado"],
      }),
    );
    expect(boosted.searchParams.getAll("keyterm")).toEqual(["periodontitis", "raspado y alisado"]);
  });

  it("never puts credentials in the URL", () => {
    const url = buildDeepgramListenUrl({ model: "nova-3", language: "es" });
    expect(url).not.toMatch(/token|key/i);
  });
});

describe("requestDeepgramAccessToken", () => {
  it("asks Deepgram for a short-lived token with the server key", async () => {
    const fetchFn = vi.fn(async () =>
      Response.json({ access_token: "jwt-temporal", expires_in: 30 }),
    );
    const token = await requestDeepgramAccessToken({ apiKey: API_KEY, ttlSeconds: 30, fetchFn });
    expect(token).toEqual({ accessToken: "jwt-temporal", expiresIn: 30 });
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.deepgram.com/v1/auth/grant");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("authorization")).toBe(`Token ${API_KEY}`);
    expect(JSON.parse(String(init.body))).toEqual({ ttl_seconds: 30 });
  });

  it("reports an invalid server key without echoing it", async () => {
    const fetchFn = vi.fn(async () => Response.json({ err_msg: API_KEY }, { status: 401 }));
    const failure = requestDeepgramAccessToken({ apiKey: API_KEY, ttlSeconds: 30, fetchFn });
    await expect(failure).rejects.toBeInstanceOf(DeepgramCredentialError);
    await expect(failure).rejects.not.toThrow(API_KEY);
  });

  it("treats network failures and malformed answers as unavailable", async () => {
    const offline = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    await expect(
      requestDeepgramAccessToken({ apiKey: API_KEY, ttlSeconds: 30, fetchFn: offline }),
    ).rejects.toBeInstanceOf(DeepgramUnavailableError);

    const malformed = vi.fn(async () => Response.json({}));
    await expect(
      requestDeepgramAccessToken({ apiKey: API_KEY, ttlSeconds: 30, fetchFn: malformed }),
    ).rejects.toBeInstanceOf(DeepgramUnavailableError);

    const overloaded = vi.fn(async () => new Response("busy", { status: 503 }));
    await expect(
      requestDeepgramAccessToken({ apiKey: API_KEY, ttlSeconds: 30, fetchFn: overloaded }),
    ).rejects.toBeInstanceOf(DeepgramUnavailableError);
  });
});
