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
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
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
});
