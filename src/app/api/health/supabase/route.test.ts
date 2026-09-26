import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

describe("Supabase health route", () => {
  afterEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SECRET_KEY;
    vi.unstubAllGlobals();
  });

  it("acepta una secret key moderna sin enviarla como bearer JWT", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SECRET_KEY = "sb_secret_test-key";
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      expect(url.pathname).toBe("/rest/v1/clinics");
      expect(url.searchParams.get("select")).toBe("id");
      expect(url.searchParams.get("limit")).toBe("1");
      const headers = new Headers(init?.headers);
      expect(headers.get("apikey")).toBe("sb_secret_test-key");
      expect(headers.has("authorization")).toBe(false);
      return Response.json({ openapi: "3.0.0" });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, service: "supabase", status: 200 });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("extrae la secret key cuando Vercel contiene un bloque de variables pegado", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SECRET_KEY = [
      "SUPABASE_SECRET_KEY=sb_secret_test-key",
      "SUPABASE_PUBLISHABLE_KEY=sb_publishable_test-key",
    ].join("\n");
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get("apikey")).toBe("sb_secret_test-key");
      return Response.json({ openapi: "3.0.0" });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
