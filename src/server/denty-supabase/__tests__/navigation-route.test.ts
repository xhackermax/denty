import { describe, expect, it } from "vitest";

import { SupabaseRestClient } from "../../supabase/rest-client";
import { handleNavigationRoute } from "../navigation-route";

type Handler = (url: URL, init?: RequestInit) => Response;
const calls: { path: string; body?: unknown }[] = [];

function identity(role: string | null, handler: Handler) {
  if (!role) return null;
  const restClient = new SupabaseRestClient(
    { url: "https://example.supabase.co", key: "test" },
    async (input, init) => {
      const url = new URL(String(input));
      calls.push({
        path: url.pathname,
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      });
      return handler(url, init);
    },
  );
  return { actor: { role, clinicId: "c1", userId: "u1" }, restClient };
}

const request = (method: string, suffix = "", body?: unknown) =>
  new Request(`https://denty.example/api/navigation/layout${suffix}`, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
const parts = (suffix?: string) => ["api", "navigation", "layout", ...(suffix ? [suffix] : [])];

const stored: Handler = (url) => {
  if (url.pathname.endsWith("/clinic_settings")) {
    expect(url.searchParams.get("clinic_id")).toBe("eq.c1");
    return Response.json([{ navigation_layout: { pinned: ["agenda", "gone", "home"] } }]);
  }
  if (url.pathname.endsWith("/member_navigation_layouts")) {
    expect(url.searchParams.get("profile_id")).toBe("eq.u1");
    return Response.json([{ layout: { pinned: ["tasks"] } }]);
  }
  if (url.pathname.includes("/rpc/")) return Response.json(null);
  throw new Error(`Unexpected ${url.pathname}`);
};
const missingSchema: Handler = () =>
  Response.json(
    { code: "42703", message: "column navigation_layout does not exist" },
    { status: 400 },
  );

describe("navigation layout route", () => {
  it.each([
    [null, 401],
    ["PATIENT", 403],
  ])("rejects %s before touching the database", async (role, status) => {
    calls.length = 0;
    const response = await handleNavigationRoute(
      request("GET"),
      parts(),
      identity(role, () => {
        throw new Error("no database");
      }),
    );
    expect(response.status).toBe(status);
    expect(calls).toHaveLength(0);
  });

  it("returns the clinic default and the member's own order, without stale keys", async () => {
    const response = await handleNavigationRoute(
      request("GET"),
      parts(),
      identity("RECEPTION", stored),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      available: true,
      clinic: { pinned: ["agenda", "home"] },
      user: { pinned: ["tasks"] },
    });
  });

  it("reports the feature as unavailable while the migration is not applied", async () => {
    const response = await handleNavigationRoute(
      request("GET"),
      parts(),
      identity("DENTIST", missingSchema),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ available: false, clinic: null, user: null });
    const save = await handleNavigationRoute(
      request("PUT", "/me", { pinned: ["home"] }),
      parts("me"),
      identity("DENTIST", missingSchema),
    );
    expect(save.status).toBe(503);
    expect((await save.json()).error.code).toBe("NAVIGATION_LAYOUT_UNAVAILABLE");
  });

  it("lets any staff member save or clear their own order", async () => {
    calls.length = 0;
    const saved = await handleNavigationRoute(
      request("PUT", "/me", { pinned: ["tasks", "agenda"] }),
      parts("me"),
      identity("ASSISTANT", stored),
    );
    expect(saved.status).toBe(200);
    expect(calls[0]).toEqual({
      path: "/rest/v1/rpc/set_my_navigation_layout",
      body: { p_clinic_id: "c1", p_layout: { pinned: ["tasks", "agenda"] } },
    });
    calls.length = 0;
    await handleNavigationRoute(
      request("PUT", "/me", { pinned: null }),
      parts("me"),
      identity("ASSISTANT", stored),
    );
    expect(calls[0]?.body).toEqual({ p_clinic_id: "c1", p_layout: null });
  });

  it("only lets administrators change the clinic default", async () => {
    calls.length = 0;
    const denied = await handleNavigationRoute(
      request("PUT", "/clinic", { pinned: ["home"] }),
      parts("clinic"),
      identity("DENTIST", stored),
    );
    expect(denied.status).toBe(403);
    expect(calls).toHaveLength(0);
    const allowed = await handleNavigationRoute(
      request("PUT", "/clinic", { pinned: ["agenda", "home"] }),
      parts("clinic"),
      identity("ADMIN", stored),
    );
    expect(allowed.status).toBe(200);
    expect(calls[0]?.path).toBe("/rest/v1/rpc/set_clinic_navigation_layout");
  });

  it("rejects malformed orders and unknown routes", async () => {
    const invalid = await handleNavigationRoute(
      request("PUT", "/me", { pinned: ["home", "home"] }),
      parts("me"),
      identity("ADMIN", stored),
    );
    expect(invalid.status).toBe(400);
    expect((await invalid.json()).error.code).toBe("INVALID_PAYLOAD");
    const unknown = await handleNavigationRoute(
      request("DELETE"),
      parts(),
      identity("ADMIN", stored),
    );
    expect(unknown.status).toBe(404);
  });

  it("passes other database failures through", async () => {
    await expect(
      handleNavigationRoute(
        request("GET"),
        parts(),
        identity("ADMIN", () => Response.json({ message: "boom" }, { status: 500 })),
      ),
    ).rejects.toMatchObject({ status: 500, details: { message: "boom" } });
  });
});
