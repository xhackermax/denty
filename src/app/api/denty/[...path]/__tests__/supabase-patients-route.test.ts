import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { authenticatedHeaders, withAuthenticatedStaff } from "@/test/supabase-auth-fixture";

import { GET, POST } from "../route";

interface StoredPatient {
  id: string;
  clinic_id: string;
  record_number: string | null;
  first_name: string;
  last_name: string;
  dni: string | null;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  declared_source: string | null;
  declared_source_detail: string | null;
  photo_url: string | null;
  medical_profile: Record<string, unknown>;
  archived_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

function createSupabaseFetch() {
  const clinicId = "clinic-1";
  const patients: StoredPatient[] = [];
  const dentalEntities: Array<Record<string, unknown>> = [];
  let dentalEntityCounter = 0;

  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");

    if (url.pathname === "/rest/v1/clinics" && method === "GET") {
      return json([{ id: clinicId }]);
    }

    if (url.pathname === "/rest/v1/patients" && method === "POST") {
      const body = JSON.parse(String(init?.body)) as Partial<StoredPatient>;
      const now = "2026-09-26T18:00:00.000Z";
      const patient: StoredPatient = {
        id: "patient-1",
        clinic_id: clinicId,
        record_number: body.record_number ?? "DNT-000001",
        first_name: body.first_name ?? "",
        last_name: body.last_name ?? "",
        dni: body.dni ?? null,
        phone: body.phone ?? null,
        email: body.email ?? null,
        birth_date: body.birth_date ?? null,
        declared_source: body.declared_source ?? null,
        declared_source_detail: body.declared_source_detail ?? null,
        photo_url: body.photo_url ?? null,
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

    if (url.pathname === "/rest/v1/dental_entities" && method === "GET") {
      return json(dentalEntities.filter((entity) => entity.active === true));
    }
    if (url.pathname === "/rest/v1/dental_entities" && method === "PATCH") {
      for (const entity of dentalEntities) entity.active = false;
      return new Response(null, { status: 204 });
    }
    if (url.pathname === "/rest/v1/dental_entities" && method === "POST") {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      const row = {
        id: `entity-${++dentalEntityCounter}`,
        ...body,
      };
      dentalEntities.push(row);
      return json([row], 201);
    }
    if (url.pathname === "/rest/v1/rpc/save_odontogram_batch" && method === "POST") {
      const body = JSON.parse(String(init?.body)) as {
        p_expected_version: number;
        p_entities: Array<Record<string, unknown>>;
      };
      for (const entity of dentalEntities) entity.active = false;
      const rows = body.p_entities.map((entity) => {
        const row = {
          ...entity,
          id: `entity-${++dentalEntityCounter}`,
          patient_id: "patient-1",
          clinic_id: clinicId,
          entity_type: entity.entityType,
          active: true,
          version: body.p_expected_version + 1,
        };
        dentalEntities.push(row);
        return row;
      });
      return json({ version: body.p_expected_version + 1, entities: rows });
    }
    if (url.pathname === "/rest/v1/clinical_history_events" && method === "POST") {
      return json([{ id: "history-1" }], 201);
    }
    if (url.pathname === "/rest/v1/periodontal_measurements" && method === "GET") return json([]);
    if (url.pathname === "/rest/v1/odontogram_snapshots" && method === "GET") return json([]);

    return json({ message: `Unhandled ${method} ${url.pathname}` }, 500);
  });
}

function createSupabaseFetchWithLostPatientWrite() {
  const baseFetch = createSupabaseFetch();
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");

    if (url.pathname === "/rest/v1/patients" && method === "GET") {
      return json([]);
    }

    return baseFetch(input, init);
  });
}
describe("Supabase-backed patient API", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test-key";
    process.env.SUPABASE_SECRET_KEY = "test-secret";
    vi.stubGlobal("fetch", withAuthenticatedStaff(createSupabaseFetch(), { clinicId: "clinic-1" }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_PUBLISHABLE_KEY;
    delete process.env.SUPABASE_SECRET_KEY;
  });

  test("creates a patient profile that can immediately open an empty odontogram", async () => {
    const createResponse = await POST(
      new Request("https://denty.test/api/denty/api/patients", {
        method: "POST",
        headers: {
          ...authenticatedHeaders(),
          "content-type": "application/json",
          origin: "https://denty.test",
        },
        body: JSON.stringify({
          firstName: "Lucia",
          lastName: "Perez",
          dni: "12345678A",
          birthDate: "2018-04-03",
          medicalProfile: {
            allergies: [],
            medications: [],
            conditions: [],
            dentalRisks: ["bruxism"],
            notes: "",
            dentitionStage: "mixed",
          },
        }),
      }),
      { params: Promise.resolve({ path: ["api", "patients"] }) },
    );

    expect(createResponse.status).toBe(201);
    const patient = await createResponse.json();
    expect(patient).toMatchObject({
      id: "patient-1",
      clinicId: "clinic-1",
      firstName: "Lucia",
      lastName: "Perez",
      recordNumber: expect.any(String),
      version: 1,
      medicalProfile: {
        dentitionStage: "mixed",
      },
    });

    const odontogramResponse = await GET(
      new Request("https://denty.test/api/denty/api/patients/patient-1/odontogram", {
        headers: authenticatedHeaders(),
      }),
      { params: Promise.resolve({ path: ["api", "patients", "patient-1", "odontogram"] }) },
    );

    expect(odontogramResponse.status).toBe(200);
    await expect(odontogramResponse.json()).resolves.toEqual({
      id: "patient-1",
      patientId: "patient-1",
      version: 1,
      entities: [],
      periodontal: [],
      snapshots: [],
    });
  });

  test("rejects patient creation when Supabase does not confirm the inserted row on readback", async () => {
    vi.stubGlobal(
      "fetch",
      withAuthenticatedStaff(createSupabaseFetchWithLostPatientWrite(), { clinicId: "clinic-1" }),
    );

    const createResponse = await POST(
      new Request("https://denty.test/api/denty/api/patients", {
        method: "POST",
        headers: {
          ...authenticatedHeaders(),
          "content-type": "application/json",
          origin: "https://denty.test",
        },
        body: JSON.stringify({
          firstName: "Noelia",
          lastName: "SinPersistir",
          dni: "87654321B",
          birthDate: "2018-04-03",
        }),
      }),
      { params: Promise.resolve({ path: ["api", "patients"] }) },
    );

    expect(createResponse.status).toBe(502);
    await expect(createResponse.json()).resolves.toMatchObject({
      error: {
        code: "SUPABASE_ERROR",
        message: "Supabase no confirmo la ficha creada en lectura posterior.",
      },
    });
  });

  test("saves odontogram entities for a newly created patient profile", async () => {
    await POST(
      new Request("https://denty.test/api/denty/api/patients", {
        method: "POST",
        headers: {
          ...authenticatedHeaders(),
          "content-type": "application/json",
          origin: "https://denty.test",
        },
        body: JSON.stringify({ firstName: "Lucia", lastName: "Perez", dni: "12345678A" }),
      }),
      { params: Promise.resolve({ path: ["api", "patients"] }) },
    );

    const saveResponse = await POST(
      new Request("https://denty.test/api/denty/api/patients/patient-1/odontogram/batch", {
        method: "POST",
        headers: {
          ...authenticatedHeaders(),
          "content-type": "application/json",
          origin: "https://denty.test",
        },
        body: JSON.stringify({
          expectedVersion: 1,
          entities: [
            {
              id: "caries-46",
              tooth: "46",
              entityType: "CARIES",
              status: "caries_pending",
              active: true,
            },
          ],
        }),
      }),
      {
        params: Promise.resolve({ path: ["api", "patients", "patient-1", "odontogram", "batch"] }),
      },
    );

    expect(saveResponse.status).toBe(200);
    await expect(saveResponse.json()).resolves.toMatchObject({
      version: 2,
      entities: [
        {
          id: "entity-1",
          tooth: "46",
          entityType: "CARIES",
          status: "caries_pending",
          active: true,
          version: 2,
        },
      ],
    });
  });
});
