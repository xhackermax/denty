import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { authenticatedHeaders, withAuthenticatedStaff } from "@/test/supabase-auth-fixture";

import { GET } from "../route";

const CLINIC = "clinic-1";

const call = (query: string) =>
  GET(
    new Request(`https://denty.test/api/denty/api/agenda/month-summary${query}`, {
      headers: { ...authenticatedHeaders(), origin: "https://denty.test" },
    }),
    { params: Promise.resolve({ path: ["api", "agenda", "month-summary"] }) },
  );

describe("GET /api/agenda/month-summary", () => {
  let requested: URL[];

  beforeEach(() => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test-key";
    process.env.SUPABASE_SECRET_KEY = "test-secret";
    requested = [];
    vi.stubGlobal(
      "fetch",
      withAuthenticatedStaff(
        async (input) => {
          const url = new URL(input instanceof Request ? input.url : String(input));
          if (url.pathname === "/rest/v1/appointments") {
            requested.push(url);
            return Response.json([
              { starts_at: "2026-10-02T07:00:00+00:00", patient_id: "p1", status: "CONFIRMED" },
              { starts_at: "2026-10-02T09:00:00+00:00", patient_id: "p2", status: "CANCELLED" },
              { starts_at: "2026-10-16T08:00:00+00:00", patient_id: "p3", status: "PLANNED" },
            ]);
          }
          throw new Error(`unexpected ${url.pathname}`);
        },
        { clinicId: CLINIC },
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("returns one light summary per day for the clinic's month", async () => {
    const response = await call("?month=2026-10");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      month: "2026-10",
      days: [
        { date: "2026-10-02", count: 1, patientIds: ["p1"] },
        { date: "2026-10-16", count: 1, patientIds: ["p3"] },
      ],
    });
    const url = requested[0];
    expect(url?.searchParams.get("select")).toBe("starts_at,patient_id,status");
    expect(url?.searchParams.get("clinic_id")).toBe(`eq.${CLINIC}`);
    expect(url?.searchParams.get("starts_at")).toBe("gte.2026-10-01T00:00:00+02:00");
    expect(url?.searchParams.get("and")).toBe("(starts_at.lt.2026-11-01T00:00:00+01:00)");
  });

  test("filters by site when one is active", async () => {
    await call("?month=2026-10&siteId=site-9");
    expect(requested[0]?.searchParams.get("site_id")).toBe("eq.site-9");
  });

  test("rejects a malformed month", async () => {
    const response = await call("?month=2026-13");
    expect(response.status).toBe(400);
    expect(requested).toHaveLength(0);
  });
});
