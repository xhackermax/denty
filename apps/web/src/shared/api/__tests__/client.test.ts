import { z } from "zod";
import { describe, expect, it, vi } from "vitest";

import { ApiClient } from "../client";
import { DentyApiError } from "../errors";

const responseSchema = z.object({ ok: z.literal(true), id: z.string() });

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
  });
}

describe("ApiClient", () => {
  it("validates successful responses with Zod", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ ok: true, id: "x1" }));
    const client = new ApiClient({ baseUrl: "https://api.example.test", fetchImpl });

    await expect(client.request("/api/test", responseSchema)).resolves.toEqual({
      ok: true,
      id: "x1",
    });
  });

  it("maps 409 to a typed conflict with correlation id", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: "VERSION_CONFLICT",
            message: "La ficha cambió en otro puesto.",
            correlationId: "corr-409",
          },
        },
        { status: 409 },
      ),
    );
    const client = new ApiClient({ baseUrl: "https://api.example.test", fetchImpl });

    try {
      await client.request("/api/patients/p1", responseSchema);
      throw new Error("Expected request to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(DentyApiError);
      if (error instanceof DentyApiError) {
        expect(error.kind).toBe("conflict");
        expect(error.code).toBe("VERSION_CONFLICT");
        expect(error.correlationId).toBe("corr-409");
      }
    }
  });

  it("adds an idempotency key to mutations", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ ok: true, id: "m1" }));
    const client = new ApiClient({ baseUrl: "https://api.example.test", fetchImpl });

    await client.mutation("/api/payments", responseSchema, { amountCents: 5000 });

    const request = fetchImpl.mock.calls[0]?.[1];
    expect(new Headers(request?.headers).get("idempotency-key")).toMatch(/^denty-/);
  });

  it("rejects responses that violate the contract", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ ok: "yes" }));
    const client = new ApiClient({ baseUrl: "https://api.example.test", fetchImpl });

    await expect(client.request("/api/test", responseSchema)).rejects.toMatchObject({
      kind: "invalid_response",
    });
  });

  it("returns text responses without JSON coercion", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("a,b\n1,2", {
        headers: { "content-type": "text/csv" },
      }),
    );
    const client = new ApiClient({ baseUrl: "https://api.example.test", fetchImpl });

    await expect(client.requestText("/api/export.csv")).resolves.toBe("a,b\n1,2");
  });

  it("returns binary responses through the same error boundary", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        headers: { "content-type": "application/pdf" },
      }),
    );
    const client = new ApiClient({ baseUrl: "https://api.example.test", fetchImpl });

    const blob = await client.requestBlob("/api/document.pdf");
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBe(3);
  });

  it("maps raw download failures through DentyApiError", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(
        { error: { code: "DOCUMENT_NOT_READY", message: "No disponible" } },
        { status: 409 },
      ),
    );
    const client = new ApiClient({ baseUrl: "https://api.example.test", fetchImpl });

    await expect(client.requestBlob("/api/document.pdf")).rejects.toMatchObject({
      kind: "conflict",
      code: "DOCUMENT_NOT_READY",
    });
  });

});
