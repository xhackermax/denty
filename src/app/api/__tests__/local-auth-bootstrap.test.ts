import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { GET, POST } from "../[...path]/route";

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

function createSupabaseFetch() {
  const users: Array<Record<string, unknown>> = [];
  const patients = [
    {
      id: "legacy-patient",
      clinic_id: "old-clinic",
      record_number: "DNT-OLD",
      first_name: "Demo",
      last_name: "Residual",
      dni: "00000000X",
      phone: null,
      email: null,
      birth_date: null,
      declared_source: null,
      declared_source_detail: null,
      photo_url: null,
      medical_profile: {},
      archived_at: null,
      version: 1,
      created_at: "2026-09-26T18:00:00.000Z",
      updated_at: "2026-09-26T18:00:00.000Z",
    },
    {
      id: "patient-portal",
      clinic_id: "clean-clinic",
      record_number: "DNT-000123",
      first_name: "Paciente",
      last_name: "Portal",
      dni: "12345678A",
      phone: null,
      email: null,
      birth_date: null,
      declared_source: null,
      declared_source_detail: null,
      photo_url: null,
      medical_profile: {},
      archived_at: null,
      version: 1,
      created_at: "2026-09-26T18:00:00.000Z",
      updated_at: "2026-09-26T18:00:00.000Z",
    },
    {
      id: "other-clean-patient",
      clinic_id: "clean-clinic",
      record_number: "DNT-000999",
      first_name: "Otro",
      last_name: "Paciente",
      dni: "99999999Z",
      phone: null,
      email: null,
      birth_date: null,
      declared_source: null,
      declared_source_detail: null,
      photo_url: null,
      medical_profile: {},
      archived_at: null,
      version: 1,
      created_at: "2026-09-26T18:00:00.000Z",
      updated_at: "2026-09-26T18:00:00.000Z",
    },
  ];

  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");

    if (url.pathname === "/rest/v1/denty_users" && method === "GET") {
      const usernameFilter = url.searchParams.get("username");
      if (usernameFilter?.startsWith("eq.")) {
        return json(users.filter((user) => user.username === usernameFilter.slice(3)));
      }
      const clinicFilter = url.searchParams.get("clinic_id");
      if (clinicFilter?.startsWith("eq.")) {
        return json(users.filter((user) => user.clinic_id === clinicFilter.slice(3)));
      }
      return json(users);
    }

    if (url.pathname === "/rest/v1/clinics" && method === "POST") {
      return json([{ id: "bootstrap-clinic" }], 201);
    }

    if (url.pathname === "/rest/v1/denty_users" && method === "POST") {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      const row = {
        id: "admin-user",
        active: true,
        created_at: "2026-09-27T17:00:00.000Z",
        updated_at: "2026-09-27T17:00:00.000Z",
        ...body,
      };
      users.push(row);
      return json([row], 201);
    }

    if (url.pathname === "/rest/v1/patients" && method === "GET") {
      const recordFilter = url.searchParams.get("record_number");
      const dniFilter = url.searchParams.get("dni");
      if (recordFilter?.startsWith("eq.") && dniFilter?.startsWith("eq.")) {
        return json(
          patients.filter(
            (patient) =>
              patient.record_number === recordFilter.slice(3) && patient.dni === dniFilter.slice(3),
          ),
        );
      }

      const idFilter = url.searchParams.get("id");
      if (idFilter?.startsWith("eq.")) {
        return json(patients.filter((patient) => patient.id === idFilter.slice(3)));
      }

      const clinicFilter = url.searchParams.get("clinic_id");
      if (clinicFilter?.startsWith("eq.")) {
        return json(patients.filter((patient) => patient.clinic_id === clinicFilter.slice(3)));
      }
      return json(patients);
    }

    return json({ message: `Unhandled ${method} ${url.pathname}` }, 500);
  });
}

describe("local Supabase auth bootstrap", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SECRET_KEY = "test-secret";
    process.env.DENTY_SESSION_SECRET = "test-session-secret";
    vi.stubGlobal("fetch", createSupabaseFetch());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.DENTY_SESSION_SECRET;
  });

  test("admin/admin bootstraps a clean clinic and hides residual patients from other clinics", async () => {
    const loginResponse = await POST(
      new Request("https://denty.test/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://denty.test",
        },
        body: JSON.stringify({ identifier: "admin", password: "admin" }),
      }),
      { params: Promise.resolve({ path: ["auth", "login"] }) },
    );

    expect(loginResponse.status).toBe(200);
    await expect(loginResponse.json()).resolves.toMatchObject({
      user: { id: "admin-user", displayName: "Administrador", role: "ADMIN" },
    });

    const cookie = loginResponse.headers.get("set-cookie");
    expect(cookie).toContain("denty_session=");

    const sessionResponse = await GET(
      new Request("https://denty.test/api/auth/session", {
        headers: { cookie: cookie ?? "" },
      }),
      { params: Promise.resolve({ path: ["auth", "session"] }) },
    );

    expect(sessionResponse.status).toBe(200);
    await expect(sessionResponse.json()).resolves.toMatchObject({
      actor: { userId: "admin-user", clinicId: "bootstrap-clinic", role: "ADMIN" },
    });

    const patientsResponse = await GET(
      new Request("https://denty.test/api/patients", {
        headers: { cookie: cookie ?? "" },
      }),
      { params: Promise.resolve({ path: ["patients"] }) },
    );

    expect(patientsResponse.status).toBe(200);
    await expect(patientsResponse.json()).resolves.toMatchObject({
      items: [],
      total: 0,
    });
  });

  test("patient login uses record number plus DNI and only exposes that patient", async () => {
    const loginResponse = await POST(
      new Request("https://denty.test/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://denty.test",
        },
        body: JSON.stringify({ identifier: "DNT-000123", password: "12345678A" }),
      }),
      { params: Promise.resolve({ path: ["auth", "login"] }) },
    );

    expect(loginResponse.status).toBe(200);
    await expect(loginResponse.json()).resolves.toMatchObject({
      user: { id: "patient:patient-portal", displayName: "Paciente Portal", role: "PATIENT" },
    });

    const cookie = loginResponse.headers.get("set-cookie");
    expect(cookie).toContain("denty_session=");

    const patientsResponse = await GET(
      new Request("https://denty.test/api/patients", {
        headers: { cookie: cookie ?? "" },
      }),
      { params: Promise.resolve({ path: ["patients"] }) },
    );

    expect(patientsResponse.status).toBe(200);
    await expect(patientsResponse.json()).resolves.toMatchObject({
      items: [{ id: "patient-portal", recordNumber: "DNT-000123" }],
      total: 1,
    });
  });

  test("admin creates a staff user with role and password for later login", async () => {
    const bootstrapResponse = await POST(
      new Request("https://denty.test/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://denty.test",
        },
        body: JSON.stringify({ identifier: "admin", password: "admin" }),
      }),
      { params: Promise.resolve({ path: ["auth", "login"] }) },
    );
    const adminCookie = bootstrapResponse.headers.get("set-cookie") ?? "";

    const createResponse = await POST(
      new Request("https://denty.test/api/users", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://denty.test",
          cookie: adminCookie,
        },
        body: JSON.stringify({
          username: "recepcion",
          displayName: "Recepción",
          role: "RECEPTION",
          password: "clave-segura",
        }),
      }),
      { params: Promise.resolve({ path: ["users"] }) },
    );

    expect(createResponse.status).toBe(201);
    await expect(createResponse.json()).resolves.toMatchObject({
      displayName: "Recepción",
      role: "RECEPTION",
      username: "recepcion",
    });

    const loginResponse = await POST(
      new Request("https://denty.test/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://denty.test",
        },
        body: JSON.stringify({ identifier: "recepcion", password: "clave-segura" }),
      }),
      { params: Promise.resolve({ path: ["auth", "login"] }) },
    );

    expect(loginResponse.status).toBe(200);
    await expect(loginResponse.json()).resolves.toMatchObject({
      user: { displayName: "Recepción", role: "RECEPTION" },
    });
  });
});
