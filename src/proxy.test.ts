import { afterEach, describe, expect, test, vi } from "vitest";

describe("app route proxy", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
    delete process.env.DENTY_API_URL;
  });

  test("validates the session against the same deployment when no external API URL is configured", async () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = "false";
    const { proxy } = await import("./proxy");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { error: { code: "UNAUTHENTICATED", message: "No hay sesión activa." } },
          { status: 401 },
        ),
      ),
    );

    const request = new Request("https://denty-repo.vercel.app/app") as Parameters<typeof proxy>[0];
    Object.defineProperty(request, "nextUrl", {
      value: new URL("https://denty-repo.vercel.app/app"),
    });

    const response = await proxy(request);

    expect(fetch).toHaveBeenCalledWith(
      new URL("https://denty-repo.vercel.app/api/auth/session"),
      expect.objectContaining({ cache: "no-store" }),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://denty-repo.vercel.app/login?next=%2Fapp");
  });
});
