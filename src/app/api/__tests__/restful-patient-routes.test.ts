import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  TEST_AUTH,
  authenticatedHeaders,
  withAuthenticatedStaff,
} from "@/test/supabase-auth-fixture";

import { GET, POST } from "../[...path]/route";

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

function createSupabaseFetch() {
  const patients: Array<Record<string, unknown>> = [];
  const dentalEntities: Array<Record<string, unknown>> = [];

  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined),
    );
    // Stage 1/2: data access must run with the signed-in user's JWT (RLS),
    // never with the service key.
    if (headers.get("authorization") !== `Bearer ${TEST_AUTH.accessToken}`) {
      return json({ code: "PGRST301", message: "Missing user bearer token" }, 401);
    }
    if (url.pathname === "/rest/v1/clinics" && method === "GET") {
      return json([{ id: "clinic-1" }]);
    }

    if (url.pathname === "/rest/v1/patients" && method === "POST") {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      const now = "2026-09-26T18:00:00.000Z";
      const patient = {
        id: "patient-1",
        clinic_id: "clinic-1",
        record_number: "DNT-000001",
        first_name: body.first_name,
        last_name: body.last_name,
        dni: null,
        phone: null,
        email: null,
        birth_date: null,
        declared_source: null,
        declared_source_detail: null,
        photo_url: null,
        medical_profile: body.medical_profile ?? {},
        archived_at: null,
        version: 1,
        created_at: now,
        updated_at: now,
      };
      patients.unshift(patient);
      return json([patient], 201);
    }

    if (url.pathname === "/rest/v1/patients" && method === "GET") {
      const idFilter = url.searchParams.get("id");
      if (idFilter?.startsWith("eq.")) {
        return json(patients.filter((patient) => patient.id === idFilter.slice(3)));
      }
      return json(patients);
    }

    if (url.pathname === "/rest/v1/dental_entities" && method === "GET")
      return json(dentalEntities);
    if (url.pathname === "/rest/v1/periodontal_measurements" && method === "GET") return json([]);
    if (url.pathname === "/rest/v1/odontogram_snapshots" && method === "GET") return json([]);

    return json({ message: `Unhandled ${method} ${url.pathname}` }, 500);
  });
}

describe("RESTful patient routes", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test-key";
    process.env.SUPABASE_SECRET_KEY = "sb_secret_test-key";
    vi.stubGlobal("fetch", withAuthenticatedStaff(createSupabaseFetch(), { clinicId: "clinic-1" }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_PUBLISHABLE_KEY;
    delete process.env.SUPABASE_SECRET_KEY;
  });

  test("creates and opens a patient through /api/patients without the legacy /api/denty prefix", async () => {
    const createResponse = await POST(
      new Request("https://denty.test/api/patients", {
        method: "POST",
        headers: {
          ...authenticatedHeaders(),
          "content-type": "application/json",
          origin: "https://denty.test",
        },
        body: JSON.stringify({ firstName: "Lucia", lastName: "Perez", dni: "12345678A" }),
      }),
      { params: Promise.resolve({ path: ["patients"] }) },
    );

    expect(createResponse.status).toBe(201);
    await expect(createResponse.json()).resolves.toMatchObject({
      id: "patient-1",
      clinicId: "clinic-1",
      firstName: "Lucia",
      lastName: "Perez",
    });

    const odontogramResponse = await GET(
      new Request("https://denty.test/api/patients/patient-1/odontogram", {
        headers: authenticatedHeaders(),
      }),
      { params: Promise.resolve({ path: ["patients", "patient-1", "odontogram"] }) },
    );

    expect(odontogramResponse.status).toBe(200);
    await expect(odontogramResponse.json()).resolves.toMatchObject({
      patientId: "patient-1",
      entities: [],
    });
  });
});
