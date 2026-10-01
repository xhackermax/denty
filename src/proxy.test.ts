import { afterEach, describe, expect, test, vi } from "vitest";

describe("app route proxy", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  test("validates the session against the same deployment when no external API URL is configured", async () => {
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
    expect(response.headers.get("location")).toBe(
      "https://denty-repo.vercel.app/login?next=%2Fapp",
    );
  });
});

describe("session failure and refresh handling", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });
  function request(path = "/app") {
    const req = new Request(`https://denty.test${path}`, {
      headers: { cookie: "denty_sb_access=old; denty_sb_refresh=old-refresh; other=keep" },
    });
    Object.defineProperty(req, "nextUrl", { value: new URL(req.url) });
    return req;
  }
  test("invalid session JSON fails closed with a controlled 503", async () => {
    const { proxy } = await import("./proxy");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("upstream HTML", { status: 200 })),
    );
    const response = await proxy(request() as Parameters<typeof proxy>[0]);
    expect(response.status).toBe(503);
  });
  test("forwards refreshed cookies to the downstream request as well as the browser", async () => {
    const { proxy } = await import("./proxy");
    const headers = new Headers();
    headers.append("set-cookie", "denty_sb_access=new; Path=/; HttpOnly");
    headers.append("set-cookie", "denty_sb_refresh=new-refresh; Path=/; HttpOnly");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {
            actor: {
              userId: "user",
              clinicId: "clinic",
              role: "ADMIN",
              permissions: ["users.manage"],
              sessionId: "session",
            },
            permissions: ["users.manage"],
          },
          { headers },
        ),
      ),
    );
    const response = await proxy(request() as Parameters<typeof proxy>[0]);
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-request-cookie")).toContain("denty_sb_access=new");
    expect(response.headers.get("x-middleware-request-cookie")).toContain("other=keep");
    expect(response.headers.getSetCookie()).toHaveLength(2);
  });
  test("the admin contacts route is protected by the proxy matcher", async () => {
    const { config } = await import("./proxy");
    expect(config.matcher).toContain("/admin/:path*");
  });
});
