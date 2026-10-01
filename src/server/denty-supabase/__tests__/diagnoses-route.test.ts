import { expect, test } from "vitest";
import { handleDiagnosesRoute } from "../diagnoses-route";
import { SupabaseRestClient } from "../../supabase/rest-client";
const parts = ["api", "patients", "p", "diagnoses"];
const row = {
  id: "d",
  clinic_id: "clinic",
  patient_id: "p",
  encounter_id: null,
  category: "periodontal",
  value: "gingivitis",
  detail: {},
  justification: "Sangrado",
  status: "active",
  created_by: "doctor",
  created_at: "2026-10-01T12:00:00Z",
  version: 1,
};
const request = (body: unknown = {}) =>
  new Request("https://denty.example/api/patients/p/diagnoses", {
    method: "POST",
    body: JSON.stringify(body),
  });
test.each([null, "PATIENT", "RECEPTION", "ASSISTANT"])(
  "rejects diagnosis writes without clinical confirmation: %s",
  async (role) => {
    let calls = 0;
    const client = new SupabaseRestClient(
      { url: "https://example.supabase.co", key: "test" },
      async () => {
        calls++;
        return Response.json([]);
      },
    );
    const response = await handleDiagnosesRoute(
      request(),
      parts,
      role ? { actor: { role, clinicId: "clinic" }, restClient: client } : null,
    );
    expect(response.status).toBe(role ? 403 : 401);
    expect(calls).toBe(0);
  },
);
test("validates before mutation and enforces clinic-scoped patient lookup", async () => {
  let writes = 0;
  let filter = "";
  const client = new SupabaseRestClient(
    { url: "https://example.supabase.co", key: "test" },
    async (input, init) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/patients")) {
        filter = url.searchParams.get("clinic_id") ?? "";
        return Response.json([]);
      }
      if (init?.method === "POST") writes++;
      return Response.json(row);
    },
  );
  const identity = { actor: { role: "DENTIST", clinicId: "clinic" }, restClient: client };
  await expect(
    handleDiagnosesRoute(
      request({ category: "periodontal", value: "gingivitis", detail: {} }),
      parts,
      identity,
    ),
  ).rejects.toThrow();
  await expect(
    handleDiagnosesRoute(
      request({
        category: "periodontal",
        value: "gingivitis",
        detail: {},
        justification: "Sangrado",
      }),
      parts,
      identity,
    ),
  ).rejects.toMatchObject({ status: 404 });
  expect(filter).toBe("eq.clinic");
  expect(writes).toBe(0);
});
test("creates history records and returns current latest active diagnosis per category", async () => {
  const client = new SupabaseRestClient(
    { url: "https://example.supabase.co", key: "test" },
    async (input, init) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/patients")) return Response.json([{ id: "p" }]);
      if (url.pathname.includes("/rpc/")) {
        expect(init?.method).toBe("POST");
        return Response.json(row);
      }
      return Response.json([row, { ...row, id: "old", created_at: "2026-09-01T12:00:00Z" }]);
    },
  );
  const identity = { actor: { role: "DENTIST", clinicId: "clinic" }, restClient: client };
  expect(
    (
      await handleDiagnosesRoute(
        request({
          category: "periodontal",
          value: "gingivitis",
          detail: {},
          justification: "Sangrado",
        }),
        parts,
        identity,
      )
    ).status,
  ).toBe(201);
  const list = await handleDiagnosesRoute(
    new Request("https://denty.example/api/patients/p/diagnoses"),
    parts,
    identity,
  );
  const body = await list.json();
  expect(body.current).toHaveLength(1);
  expect(body.history).toHaveLength(2);
});
test("adds one root-planing selection per chosen quadrant through one transaction", async () => {
  let payload: Record<string, unknown> = {};
  const client = new SupabaseRestClient(
    { url: "https://example.supabase.co", key: "test" },
    async (input, init) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/patients")) return Response.json([{ id: "p" }]);
      if (url.pathname.includes("/rpc/")) {
        payload = JSON.parse(String(init?.body));
        return Response.json({ added: 2 });
      }
      return Response.json([{ ...row, value: "periodontitis" }]);
    },
  );
  const response = await handleDiagnosesRoute(
    request({ selections: [{ id: "root-planing", quadrants: [1, 3] }] }),
    [...parts, "d", "plan"],
    { actor: { role: "DENTIST", clinicId: "clinic" }, restClient: client },
  );
  expect(response.status).toBe(201);
  expect(payload.p_items).toEqual([
    { code: "ROOT_PLANING", quadrant: 1 },
    { code: "ROOT_PLANING", quadrant: 3 },
  ]);
  expect(payload.p_diagnosis_id).toBe("d");
});
