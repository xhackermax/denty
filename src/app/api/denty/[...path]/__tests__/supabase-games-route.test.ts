import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { authenticatedHeaders, withAuthenticatedStaff } from "@/test/supabase-auth-fixture";
import { GET, POST } from "../route";

const json = (payload: unknown, status = 200) => Response.json(payload, { status });

beforeEach(() => {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test-key";
  process.env.SUPABASE_SECRET_KEY = "test-secret";
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_PUBLISHABLE_KEY;
  delete process.env.SUPABASE_SECRET_KEY;
});

test("serves the Denty Games dashboard through the verified-arrival RPC", async () => {
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.pathname === "/rest/v1/rpc/get_patient_game_dashboard") {
      expect(await JSON.parse(String(init?.body))).toEqual({
        p_clinic_id: "clinic-1",
        p_patient_id: "patient-1",
      });
      return json({
        patientId: "patient-1",
        profile: { label: "Ficha **1234" },
        visit: { active: false, rewardGamesCount: 0, rewardPotentialCents: 0, voucher: null },
        games: [],
      });
    }
    return json([]);
  });
  vi.stubGlobal("fetch", withAuthenticatedStaff(fetchMock, { clinicId: "clinic-1" }));

  const response = await GET(
    new Request("https://denty.test/api/denty/api/patient/patient-1/games/dashboard", {
      headers: authenticatedHeaders(),
    }),
    { params: Promise.resolve({ path: ["api", "patient", "patient-1", "games", "dashboard"] }) },
  );

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toMatchObject({ patientId: "patient-1" });
});

test("creates a Denty Games voucher only through the arrived-appointment RPC", async () => {
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.pathname === "/rest/v1/rpc/create_patient_game_voucher") {
      expect(await JSON.parse(String(init?.body))).toEqual({
        p_clinic_id: "clinic-1",
        p_patient_id: "patient-1",
      });
      return json({
        id: "voucher-1",
        patientId: "patient-1",
        appointmentId: "appointment-1",
        amountCents: 100,
        status: "AVAILABLE",
      });
    }
    return json([]);
  });
  vi.stubGlobal("fetch", withAuthenticatedStaff(fetchMock, { clinicId: "clinic-1" }));

  const response = await POST(
    new Request("https://denty.test/api/denty/api/patient/patient-1/games/voucher", {
      method: "POST",
      headers: { ...authenticatedHeaders(), origin: "https://denty.test" },
      body: "{}",
    }),
    { params: Promise.resolve({ path: ["api", "patient", "patient-1", "games", "voucher"] }) },
  );

  expect(response.status).toBe(201);
  await expect(response.json()).resolves.toMatchObject({ id: "voucher-1" });
});
