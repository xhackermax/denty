import { describe, expect, it } from "vitest";

import { SupabaseRestClient } from "../../supabase/rest-client";
import { handleNextSlotsRoute } from "../next-slots-route";

const now = () => Date.parse("2026-10-02T08:07:00Z"); // Friday 10:07 in Madrid
const slot = {
  startsAt: "2026-10-02T10:15:00+02:00",
  endsAt: "2026-10-02T10:45:00+02:00",
  staffId: "s1",
  staffName: "Dra. Ana",
};

function identity(role: string | null, onRpc: (body: Record<string, unknown>) => Response) {
  if (!role) return null;
  const restClient = new SupabaseRestClient(
    { url: "https://example.supabase.co", key: "test" },
    async (input, init) => {
      expect(new URL(String(input)).pathname).toBe("/rest/v1/rpc/agenda_next_slots");
      return onRpc(JSON.parse(String(init?.body)));
    },
  );
  return { actor: { role, clinicId: "c1" }, restClient };
}

const get = (query = "") => new Request(`https://denty.example/api/agenda/next-slots${query}`);
const ok = () => Response.json({ durationMin: 30, slots: [slot] });

describe("next slots route", () => {
  it.each([
    [null, 401],
    ["PATIENT", 403],
  ])("rejects %s before touching the database", async (role, status) => {
    const response = await handleNextSlotsRoute(
      get(),
      identity(role, () => {
        throw new Error("no database");
      }),
      {},
      now,
    );
    expect(response.status).toBe(status);
  });

  it("searches the afternoon from now for any doctor by default length", async () => {
    let body: Record<string, unknown> = {};
    const response = await handleNextSlotsRoute(
      get("?part=PM"),
      identity("RECEPTION", (sent) => ((body = sent), ok())),
      {},
      now,
    );
    expect(response.status).toBe(200);
    expect(body).toEqual({
      p_clinic_id: "c1",
      p_not_before: "2026-10-02T10:07:00+02:00",
      p_from_minute: 840,
      p_to_minute: 1440,
      p_duration_min: 30,
      p_staff_id: null,
      p_site_id: null,
      p_limit: 6,
      p_horizon_days: 60,
    });
    expect(await response.json()).toEqual({ part: "PM", durationMin: 30, slots: [slot] });
  });

  it("passes the morning window, doctor, site, length and start day through", async () => {
    let body: Record<string, unknown> = {};
    await handleNextSlotsRoute(
      get("?part=am&durationMin=60&staffId=s1&siteId=site&from=2026-10-10&limit=3"),
      identity("DENTIST", (sent) => ((body = sent), ok())),
      {},
      now,
    );
    expect(body).toMatchObject({
      p_not_before: "2026-10-10T00:00:00+02:00",
      p_from_minute: 0,
      p_to_minute: 840,
      p_duration_min: 60,
      p_staff_id: "s1",
      p_site_id: "site",
      p_limit: 3,
    });
  });

  it.each([
    ["?part=noche", "INVALID_PART"],
    ["?durationMin=0", "INVALID_DURATION"],
    ["?durationMin=abc", "INVALID_DURATION"],
    ["?from=10-10-2026", "INVALID_DATE"],
    ["?limit=99", "INVALID_LIMIT"],
  ])("rejects %s", async (query, code) => {
    const response = await handleNextSlotsRoute(get(query), identity("ADMIN", ok), {}, now);
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe(code);
  });

  it("only answers GET", async () => {
    const response = await handleNextSlotsRoute(
      new Request("https://denty.example/api/agenda/next-slots", { method: "POST" }),
      identity("ADMIN", ok),
      {},
      now,
    );
    expect(response.status).toBe(405);
  });
});
