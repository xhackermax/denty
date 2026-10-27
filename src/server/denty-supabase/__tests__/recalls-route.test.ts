import { describe, expect, test } from "vitest";

import { SupabaseRestClient } from "../../supabase/rest-client";
import { handleRecallsRoute, isRecallsRoute } from "../recalls-route";

type Call = { path: string; body: Record<string, unknown> | null };

function fakeClient(respond: (call: Call) => Response | unknown = () => ({})) {
  const calls: Call[] = [];
  const client = new SupabaseRestClient(
    { url: "https://example.supabase.co", key: "test" },
    async (input, init) => {
      const url = new URL(String(input));
      const call = {
        path: url.pathname.replace("/rest/v1/", ""),
        body: init?.body ? JSON.parse(String(init.body)) : null,
      };
      calls.push(call);
      const result = respond(call);
      return result instanceof Response ? result : Response.json(result);
    },
  );
  return { client, calls };
}

const READ = ["recalls.read"];
const MANAGE = ["recalls.read", "recalls.manage"];
const ADMIN = ["recalls.read", "recalls.manage", "recalls.templates.manage"];

const identity = (permissions: string[], client: SupabaseRestClient) => ({
  actor: { clinicId: "clinic-1", permissions },
  restClient: client,
});

const call = (method: string, path: string, body?: unknown) => {
  const request = new Request(`https://denty.example${path}`, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { request, parts: new URL(request.url).pathname.split("/").filter(Boolean) };
};

const template = {
  code: "HIGIENE",
  name: "Higiene semestral",
  category: "GENERAL",
  description: null,
  intervalValue: 6,
  intervalUnit: "MESES",
  anchorType: "FECHA_MANUAL",
  leadDays: 14,
  maxAttempts: 3,
  autoRecurrence: true,
  autoEnroll: false,
  messagingEnabled: false,
  channels: [],
  reminderOffsets: [],
  messageTemplateKey: null,
  defaultSiteId: null,
  defaultStaffId: null,
  active: true,
};

const pgError = (message: string, status = 400) =>
  Response.json({ code: "P0001", message }, { status });

describe("isRecallsRoute", () => {
  test("matches only /api/recalls", () => {
    expect(isRecallsRoute(["api", "recalls"])).toBe(true);
    expect(isRecallsRoute(["api", "recalls", "templates"])).toBe(true);
    expect(isRecallsRoute(["api", "recovery", "worklist"])).toBe(false);
  });
});

describe("handleRecallsRoute", () => {
  test("requires a session", async () => {
    const { request, parts } = call("GET", "/api/recalls");
    const response = await handleRecallsRoute(request, parts, null);
    expect(response.status).toBe(401);
  });

  test("lists recalls with the filters from the query string", async () => {
    const { client, calls } = fakeClient(() => ({ total: 0, kpis: {}, items: [] }));
    const { request, parts } = call("GET", "/api/recalls?page=2&state=VENCIDO&search=ana&siteId=");
    const response = await handleRecallsRoute(request, parts, identity(READ, client));
    expect(response.status).toBe(200);
    expect(calls[0]).toEqual({
      path: "rpc/recall_list",
      body: {
        p_clinic_id: "clinic-1",
        p_filters: { state: "VENCIDO", search: "ana", includeClosed: false },
        p_page: 2,
        p_page_size: 25,
      },
    });
  });

  test("rejects invalid list filters before calling Supabase", async () => {
    const { client, calls } = fakeClient();
    const { request, parts } = call("GET", "/api/recalls?state=RARO");
    const response = await handleRecallsRoute(request, parts, identity(READ, client));
    expect(response.status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  test("forbids reading without recalls.read", async () => {
    const { client, calls } = fakeClient();
    const { request, parts } = call("GET", "/api/recalls");
    const response = await handleRecallsRoute(request, parts, identity([], client));
    expect(response.status).toBe(403);
    expect(calls).toHaveLength(0);
  });

  test("only template managers create or change recall types", async () => {
    const { client, calls } = fakeClient(() => ({ id: "t1" }));
    const create = call("POST", "/api/recalls/templates", template);
    expect(
      (await handleRecallsRoute(create.request, create.parts, identity(MANAGE, client))).status,
    ).toBe(403);
    const again = call("POST", "/api/recalls/templates", template);
    const response = await handleRecallsRoute(again.request, again.parts, identity(ADMIN, client));
    expect(response.status).toBe(201);
    expect(calls[0]).toMatchObject({
      path: "rpc/recall_template_save",
      body: { p_clinic_id: "clinic-1", p_template_id: null, p_payload: template },
    });
  });

  test("updates a template with its version and the recompute choice", async () => {
    const { client, calls } = fakeClient(() => ({ id: "t1" }));
    const { request, parts } = call("PUT", "/api/recalls/templates/t1", {
      template,
      expectedVersion: 3,
      recomputePending: true,
    });
    const response = await handleRecallsRoute(request, parts, identity(ADMIN, client));
    expect(response.status).toBe(200);
    expect(calls[0]).toEqual({
      path: "rpc/recall_template_save",
      body: {
        p_clinic_id: "clinic-1",
        p_template_id: "t1",
        p_payload: { ...template, recomputePending: true },
        p_expected_version: 3,
      },
    });
  });

  test("assigns patients through the idempotent RPC", async () => {
    const { client, calls } = fakeClient(() => ({ added: 1, skipped: [], dryRun: false }));
    const { request, parts } = call("POST", "/api/recalls/templates/t1/assign", {
      patientIds: ["p1"],
      dueOverrides: { p1: "2027-01-15" },
      idempotencyKey: "assign-123456",
    });
    const response = await handleRecallsRoute(request, parts, identity(MANAGE, client));
    expect(response.status).toBe(200);
    expect(calls[0]).toEqual({
      path: "rpc/recall_assign_patients",
      body: {
        p_clinic_id: "clinic-1",
        p_template_id: "t1",
        p_patient_ids: ["p1"],
        p_anchor_date: null,
        p_due_overrides: { p1: "2027-01-15" },
        p_idempotency_key: "assign-123456",
        p_dry_run: false,
      },
    });
  });

  test("applies an action with the expected version", async () => {
    const { client, calls } = fakeClient(() => ({ id: "r1" }));
    const { request, parts } = call("POST", "/api/recalls/r1/actions", {
      action: "POSTPONE",
      payload: { until: "2026-12-01" },
      expectedVersion: 4,
    });
    const response = await handleRecallsRoute(request, parts, identity(MANAGE, client));
    expect(response.status).toBe(200);
    expect(calls[0]).toEqual({
      path: "rpc/recall_update",
      body: {
        p_clinic_id: "clinic-1",
        p_recall_id: "r1",
        p_action: "POSTPONE",
        p_payload: { until: "2026-12-01" },
        p_expected_version: 4,
      },
    });
  });

  test("reads history and runs bulk actions", async () => {
    const { client, calls } = fakeClient(() => ({ items: [], updated: 0, failed: [] }));
    const history = call("GET", "/api/recalls/r1/history");
    expect(
      (await handleRecallsRoute(history.request, history.parts, identity(READ, client))).status,
    ).toBe(200);
    const bulk = call("POST", "/api/recalls/bulk", { ids: ["r1", "r2"], action: "CANCEL" });
    expect(
      (await handleRecallsRoute(bulk.request, bulk.parts, identity(MANAGE, client))).status,
    ).toBe(200);
    expect(calls.map((item) => item.path)).toEqual([
      "rpc/recall_history",
      "rpc/recall_bulk_update",
    ]);
  });

  test("previews candidates and archives templates", async () => {
    const { client, calls } = fakeClient(() => ({ total: 0, items: [] }));
    const candidates = call("POST", "/api/recalls/candidates", { maxAge: 14 });
    expect(
      (await handleRecallsRoute(candidates.request, candidates.parts, identity(MANAGE, client)))
        .status,
    ).toBe(200);
    const archive = call("POST", "/api/recalls/templates/t1/archive", { archive: true });
    expect(
      (await handleRecallsRoute(archive.request, archive.parts, identity(ADMIN, client))).status,
    ).toBe(200);
    expect(calls[1]).toEqual({
      path: "rpc/recall_template_archive",
      body: { p_clinic_id: "clinic-1", p_template_id: "t1", p_archive: true, p_reason: null },
    });
  });

  test("translates database rule errors into clear responses", async () => {
    const cases: [string, number, string][] = [
      ["VERSION_CONFLICT", 409, "RECALL_VERSION_CONFLICT"],
      ["RECALL_CODE_TAKEN", 409, "RECALL_CODE_TAKEN"],
      ["RECALL_INVALID_TRANSITION", 409, "RECALL_INVALID_TRANSITION"],
      ["APPOINTMENT_NOT_ELIGIBLE", 422, "APPOINTMENT_NOT_ELIGIBLE"],
      ["RECALL_NOT_FOUND", 404, "RECALL_NOT_FOUND"],
      ["FORBIDDEN", 403, "FORBIDDEN"],
    ];
    for (const [message, status, code] of cases) {
      const { client } = fakeClient(() => pgError(message));
      const { request, parts } = call("POST", "/api/recalls/r1/actions", { action: "CONTACT" });
      const response = await handleRecallsRoute(request, parts, identity(MANAGE, client));
      expect(response.status, message).toBe(status);
      const body = (await response.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe(code);
      expect(body.error.message).not.toMatch(/[A-Z]{3,}_[A-Z]+/);
    }
  });

  test("returns 400 for an invalid body and 404 for unknown paths", async () => {
    const { client } = fakeClient();
    const invalid = call("POST", "/api/recalls/r1/actions", { action: "FLY" });
    expect(
      (await handleRecallsRoute(invalid.request, invalid.parts, identity(MANAGE, client))).status,
    ).toBe(400);
    const unknown = call("DELETE", "/api/recalls/r1");
    expect(
      (await handleRecallsRoute(unknown.request, unknown.parts, identity(ADMIN, client))).status,
    ).toBe(404);
  });
});
