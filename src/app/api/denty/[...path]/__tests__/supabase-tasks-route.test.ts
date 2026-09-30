import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { authenticatedHeaders, withAuthenticatedStaff } from "@/test/supabase-auth-fixture";

import { GET, PATCH, POST } from "../route";

const CLINIC = "clinic-1";
const now = "2026-09-30T10:00:00.000Z";

interface Row extends Record<string, unknown> {
  id: string;
  clinic_id: string;
  position: number;
  version: number;
  archived_at: string | null;
}

function mkRow(id: string, position: number, clinic = CLINIC): Row {
  return {
    id,
    clinic_id: clinic,
    patient_id: null,
    task_type: "GENERAL",
    title: `Tarea ${id}`,
    description: null,
    status: "OPEN",
    priority: "NORMAL",
    assignee_staff_id: null,
    due_at: null,
    source_type: null,
    source_id: null,
    position,
    duration_min: 15,
    archived_at: null,
    version: 1,
    created_at: now,
    updated_at: now,
  };
}

function pgError(message: string, status = 400) {
  return Response.json({ code: "P0001", message }, { status });
}

function createFetch(rows: Row[]) {
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
    if (url.pathname === "/rest/v1/tasks") {
      return Response.json(
        rows.filter((r) => r.clinic_id === CLINIC).sort((a, b) => a.position - b.position),
      );
    }
    if (url.pathname === "/rest/v1/rpc/reorder_tasks") {
      const ids = body.p_ordered_ids as string[];
      if (new Set(ids).size !== ids.length) return pgError("DUPLICATE_TASK_IDS");
      const owned = ids.every((id) => rows.some((r) => r.id === id && r.clinic_id === CLINIC));
      if (!owned) return pgError("TASK_NOT_IN_CLINIC");
      ids.forEach((id, i) => {
        const r = rows.find((x) => x.id === id);
        if (r) {
          r.position = i + 1;
          r.version += 1;
        }
      });
      return Response.json(
        rows
          .filter((r) => r.clinic_id === CLINIC && !r.archived_at)
          .sort((a, b) => a.position - b.position),
      );
    }
    if (url.pathname === "/rest/v1/rpc/update_task") {
      const r = rows.find((x) => x.id === body.p_task_id);
      if (!r) return pgError("TASK_NOT_FOUND");
      if (body.p_expected_version != null && body.p_expected_version !== r.version)
        return pgError("VERSION_CONFLICT", 409);
      if (body.p_archived === true) r.archived_at = now;
      r.version += 1;
      return Response.json(r);
    }
    if (url.pathname === "/rest/v1/rpc/update_task_status") {
      return Response.json({ ...rows[0], status: body.p_status });
    }
    return Response.json({ message: `Unhandled ${url.pathname}` }, { status: 500 });
  });
}

const call = (
  handler: typeof GET | typeof POST | typeof PATCH,
  path: string[],
  init: { method?: string; body?: unknown } = {},
) =>
  handler(
    new Request(`https://denty.test/api/denty/${path.join("/")}`, {
      method: init.method ?? "GET",
      headers: {
        ...authenticatedHeaders(),
        "content-type": "application/json",
        origin: "https://denty.test",
      },
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    }),
    { params: Promise.resolve({ path }) },
  );

describe("Supabase-backed tasks API", () => {
  let rows: Row[];
  let fetchMock: ReturnType<typeof createFetch>;
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test-key";
    process.env.SUPABASE_SECRET_KEY = "test-secret";
    rows = [mkRow("a", 1), mkRow("b", 2), mkRow("c", 3), mkRow("x", 1, "clinic-2")];
    fetchMock = createFetch(rows);
    vi.stubGlobal("fetch", withAuthenticatedStaff(fetchMock, { clinicId: CLINIC }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_PUBLISHABLE_KEY;
    delete process.env.SUPABASE_SECRET_KEY;
  });

  const rpcCalls = (name: string) =>
    fetchMock.mock.calls.filter(([i]) => new URL(String(i)).pathname === `/rest/v1/rpc/${name}`);

  test("GET /api/tasks exposes position, durationMin and archivedAt", async () => {
    const res = await call(GET, ["api", "tasks"]);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: Array<Record<string, unknown>> };
    expect(body.items.map((t) => t.id)).toEqual(["a", "b", "c"]);
    expect(body.items[0]).toMatchObject({ position: 1, durationMin: 15, archivedAt: null });
  });

  test("POST /api/tasks/reorder reorders and returns the list", async () => {
    const res = await call(POST, ["api", "tasks", "reorder"], {
      method: "POST",
      body: { orderedIds: ["c", "a", "b"] },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: Array<{ id: string; position: number }> };
    expect(body.items.map((t) => [t.id, t.position])).toEqual([
      ["c", 1],
      ["a", 2],
      ["b", 3],
    ]);
  });

  test("reorder rejects repeated ids without calling the rpc", async () => {
    const res = await call(POST, ["api", "tasks", "reorder"], {
      method: "POST",
      body: { orderedIds: ["a", "a"] },
    });
    expect(res.status).toBe(400);
    expect(rpcCalls("reorder_tasks")).toHaveLength(0);
  });

  test("reorder with a foreign id is rejected by the rpc as 422", async () => {
    const res = await call(POST, ["api", "tasks", "reorder"], {
      method: "POST",
      body: { orderedIds: ["a", "x"] },
    });
    expect(res.status).toBe(422);
    expect(rows.find((r) => r.id === "a")?.position).toBe(1);
  });

  test("PATCH with the extended payload archives via update_task", async () => {
    const res = await call(PATCH, ["api", "tasks", "a"], {
      method: "PATCH",
      body: { archived: true, expectedVersion: 1 },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toMatchObject({ id: "a", version: 2 });
    expect(body.archivedAt).toBe(now);
    expect(rpcCalls("update_task")).toHaveLength(1);
  });

  test("PATCH stale expectedVersion returns 409", async () => {
    const res = await call(PATCH, ["api", "tasks", "a"], {
      method: "PATCH",
      body: { title: "Otro", expectedVersion: 9 },
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("TASK_VERSION_CONFLICT");
  });

  test("legacy {status, expectedVersion} payload keeps using update_task_status", async () => {
    const res = await call(PATCH, ["api", "tasks", "a"], {
      method: "PATCH",
      body: { status: "DONE", expectedVersion: 1 },
    });
    expect(res.status).toBe(200);
    expect(rpcCalls("update_task_status")).toHaveLength(1);
    expect(rpcCalls("update_task")).toHaveLength(0);
  });
});
