import { unzipSync, strFromU8 } from "fflate";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { authenticatedHeaders, withAuthenticatedStaff } from "@/test/supabase-auth-fixture";
import { GET } from "../route";

const clinicId = "clinic-1";
let rows: Record<string, Record<string, unknown>[]>;
let role: "ADMIN" | "RECEPTION" = "ADMIN";
let failData = false;
const fetchData = async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  const table = url.pathname.split("/").at(-1)!;
  if (failData) return Response.json({ message: "Database unavailable" }, { status: 503 });
  if (!(table in rows)) return Response.json({ message: `Unexpected ${table}` }, { status: 500 });
  const filtered = rows[table]!.filter(
    (row) =>
      url.searchParams.get("clinic_id") === `eq.${row.clinic_id}` &&
      (url.searchParams.get("archived_at") !== "is.null" || row.archived_at == null),
  );
  const range = new Headers(init?.headers).get("range");
  const [start, end] = range?.split("-").map(Number) ?? [0, filtered.length - 1];
  return Response.json(filtered.slice(start, end! + 1), {
    headers: { "content-range": `${start}-${end}/${filtered.length}` },
  });
};
const call = (suffix: string, authenticated = true) =>
  GET(
    new Request(`https://denty.test/api/denty/api/admin/export/${suffix}`, {
      headers: authenticated ? authenticatedHeaders() : {},
    }),
    { params: Promise.resolve({ path: ["api", "admin", "export", suffix.split("?")[0]!] }) },
  );

beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test-key");
  vi.stubEnv("SUPABASE_SECRET_KEY", "test-secret");
  role = "ADMIN";
  failData = false;
  rows = {
    patients: [
      {
        id: "p1",
        clinic_id: clinicId,
        first_name: 'Ana, "María"',
        last_name: "García",
        email: "ana@example.com",
        phone: "+34600111222",
        birth_date: "1990-01-02",
        created_at: "2026-10-01T10:00:00Z",
        archived_at: null,
      },
      { id: "foreign", clinic_id: "clinic-2", first_name: "Foreign" },
    ],
    staff_members: [{ id: "s1", clinic_id: clinicId, display_name: "Dra. Pérez" }],
    appointments: [
      {
        id: "a1",
        clinic_id: clinicId,
        patient_id: "p1",
        staff_id: "s1",
        starts_at: "2026-10-01T10:00:00Z",
        ends_at: "2026-10-01T10:30:00Z",
        status: "CONFIRMED",
      },
    ],
    clinical_plans: [
      { id: "plan1", clinic_id: clinicId, patient_id: "p1", created_at: "2026-10-01T10:00:00Z" },
    ],
    clinical_plan_items: [
      {
        id: "t1",
        clinic_id: clinicId,
        plan_id: "plan1",
        label: "Empaste",
        label_snapshot: "Empaste dental",
        status: "COMPLETED",
        price_cents: 8000,
        price_snapshot_cents: 8500,
        tooth: "16",
        created_at: "2026-10-01T10:00:00Z",
      },
      {
        id: "t2",
        clinic_id: clinicId,
        plan_id: "plan1",
        label: "Revisión",
        status: "PLANNED",
        price_cents: 0,
        price_snapshot_cents: null,
      },
    ],
  };
  vi.stubGlobal("fetch", (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (
      url.pathname === "/rest/v1/staff_members" &&
      url.searchParams.get("select") === "id,display_name"
    )
      return fetchData(input, init);
    return withAuthenticatedStaff(fetchData, { clinicId, role })(input, init);
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("admin exports", () => {
  test("counts treatment items rather than plans", async () => {
    const res = await call("overview");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ patientCount: 1, appointmentCount: 1, treatmentCount: 2 });
  });
  test("CSV contains names, birth dates and correctly quoted text", async () => {
    const res = await call("patients?format=csv");
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('"Ana, ""María"" García"');
    expect(text).toContain('"1990-01-02"');
    expect(text).not.toContain("Foreign");
    expect(res.headers.get("cache-control")).toContain("no-store");
  });
  test("exports every patient across database page limits", async () => {
    rows.patients = Array.from({ length: 1001 }, (_, i) => ({
      ...rows.patients![0],
      id: `p${i}`,
      first_name: `Patient${i}`,
    }));
    const res = await call("patients");
    const text = await res.text();
    expect(text).toContain('"p1000"');
    expect(text.trim().split(/\r?\n/)).toHaveLength(1002);
  });
  test("appointments contain names, Madrid local times and duration", async () => {
    const res = await call("appointments");
    const text = await res.text();
    expect(text).toContain("Dra. Pérez");
    expect(text).toContain("García");
    expect(text).toContain('"2026-10-01","12:00","30"');
  });
  test("treatments include actual item descriptions, patients and euro amounts", async () => {
    const res = await call("treatments");
    const text = await res.text();
    expect(text).toContain("Empaste dental");
    expect(text).toContain("García");
    expect(text).toContain('"85"');
    expect(text).toContain('"0"');
  });
  test.each(["patients", "appointments", "treatments"])(
    "%s Excel is a real workbook with string cells",
    async (entity) => {
      rows.patients![0]!.first_name = '=HYPERLINK("https://example.com")';
      const res = await call(`${entity}?format=xlsx`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("spreadsheetml.sheet");
      const bytes = new Uint8Array(await res.arrayBuffer());
      expect(Array.from(bytes.slice(0, 2))).toEqual([80, 75]);
      const files = unzipSync(bytes);
      expect(files["[Content_Types].xml"]).toBeDefined();
      const sheet = strFromU8(files["xl/worksheets/sheet1.xml"]!);
      const strings = files["xl/sharedStrings.xml"]
        ? strFromU8(files["xl/sharedStrings.xml"]!)
        : sheet;
      expect(strings).toContain("HYPERLINK");
      expect(sheet).not.toContain("<f>");
    },
  );
  test("CSV neutralizes spreadsheet formula prefixes", async () => {
    rows.patients![0]!.first_name = "=1+1";
    expect(await (await call("patients")).text()).toContain("'=1+1");
  });
  test.each(["unknown?format=csv", "patients?format=pdf"])(
    "rejects invalid export %s",
    async (path) => {
      expect((await call(path)).status).toBe(400);
    },
  );
  test("requires authentication", async () => {
    expect((await call("patients", false)).status).toBe(401);
  });
  test.each(["overview", "patients", "appointments", "treatments"])(
    "requires users.manage for %s",
    async (path) => {
      role = "RECEPTION";
      expect((await call(path)).status).toBe(403);
    },
  );
  test("database failures do not return a successful partial export", async () => {
    failData = true;
    expect((await call("patients")).status).toBeGreaterThanOrEqual(500);
  });
});
