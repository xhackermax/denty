import { describe, expect, it, vi } from "vitest";

import { SupabaseRestError } from "../../supabase/rest-client";
import type { SupabaseRestClient } from "../../supabase/rest-client";
import { TaskRepository, mapTaskRpcError } from "../task-repository";

const row = {
  id: "t1",
  patient_id: null,
  task_type: "GENERAL",
  title: "A",
  description: null,
  status: "OPEN",
  priority: "NORMAL",
  assignee_staff_id: null,
  due_at: null,
  source_type: null,
  source_id: null,
  position: 3,
  duration_min: 20,
  archived_at: null,
  scheduled_on: null,
  version: 2,
  created_at: "2026-09-30T10:00:00.000Z",
  updated_at: "2026-09-30T10:00:00.000Z",
};

function fakeClient() {
  const select = vi.fn().mockResolvedValue([row]);
  const rpc = vi.fn().mockResolvedValue(row);
  return { select, rpc, client: { select, rpc } as unknown as SupabaseRestClient };
}

describe("TaskRepository", () => {
  it("lists every clinic task ordered by position then created_at and maps new fields", async () => {
    const { client, select } = fakeClient();
    const result = await new TaskRepository(client, "c1").list();
    expect(select).toHaveBeenCalledWith(
      "tasks",
      expect.objectContaining({ clinic_id: "eq.c1", order: "position.asc,created_at.asc" }),
    );
    expect(result.items[0]).toMatchObject({ position: 3, durationMin: 20, archivedAt: null });
  });

  it("passes durationMin to create_task", async () => {
    const { client, rpc } = fakeClient();
    await new TaskRepository(client, "c1").create({ title: "A", durationMin: 40 });
    expect(rpc).toHaveBeenCalledWith(
      "create_task",
      expect.objectContaining({ p_clinic_id: "c1", p_duration_min: 40 }),
    );
  });

  it("defaults create durationMin to null so the db default applies", async () => {
    const { client, rpc } = fakeClient();
    await new TaskRepository(client, "c1").create({ title: "A" });
    expect(rpc.mock.calls[0]?.[1]).toMatchObject({ p_duration_min: null });
  });

  it("update sends only provided fields and flags explicit dueAt null", async () => {
    const { client, rpc } = fakeClient();
    const repo = new TaskRepository(client, "c1");
    await repo.update("t1", { archived: true, expectedVersion: 2 });
    expect(rpc).toHaveBeenLastCalledWith("update_task", {
      p_task_id: "t1",
      p_status: null,
      p_title: null,
      p_priority: null,
      p_duration_min: null,
      p_due_at: null,
      p_clear_due_at: false,
      p_archived: true,
      p_expected_version: 2,
      p_assignee_staff_id: null,
      p_scheduled_on: null,
      p_clear_scheduled_on: false,
    });
    await repo.update("t1", { dueAt: null });
    expect(rpc.mock.calls[1]?.[1]).toMatchObject({ p_due_at: null, p_clear_due_at: true });
    await repo.update("t1", { dueAt: "2026-10-01T10:00:00.000Z", status: "DONE" });
    expect(rpc.mock.calls[2]?.[1]).toMatchObject({
      p_due_at: "2026-10-01T10:00:00.000Z",
      p_clear_due_at: false,
      p_status: "DONE",
    });
  });

  it("maps scheduled_on to scheduledOn", async () => {
    const { client, rpc } = fakeClient();
    const repo = new TaskRepository(client, "c1");
    expect((await repo.list()).items[0]).toMatchObject({ scheduledOn: null });
    rpc.mockResolvedValueOnce({ ...row, scheduled_on: "2026-10-01" });
    expect(await repo.create({ title: "A" })).toMatchObject({ scheduledOn: "2026-10-01" });
  });

  it("create passes scheduledOn (null when absent)", async () => {
    const { client, rpc } = fakeClient();
    const repo = new TaskRepository(client, "c1");
    await repo.create({ title: "A", scheduledOn: "2026-10-01" });
    expect(rpc.mock.calls[0]?.[1]).toMatchObject({ p_scheduled_on: "2026-10-01" });
    await repo.create({ title: "A" });
    expect(rpc.mock.calls[1]?.[1]).toMatchObject({ p_scheduled_on: null });
  });

  it("update sets or clears scheduledOn", async () => {
    const { client, rpc } = fakeClient();
    const repo = new TaskRepository(client, "c1");
    await repo.update("t1", { scheduledOn: "2026-10-02" });
    expect(rpc.mock.calls[0]?.[1]).toMatchObject({
      p_scheduled_on: "2026-10-02",
      p_clear_scheduled_on: false,
    });
    await repo.update("t1", { scheduledOn: null });
    expect(rpc.mock.calls[1]?.[1]).toMatchObject({
      p_scheduled_on: null,
      p_clear_scheduled_on: true,
    });
  });

  it("reorder calls reorder_tasks with clinic and ids and maps the list", async () => {
    const { client, rpc } = fakeClient();
    rpc.mockResolvedValueOnce([row, { ...row, id: "t2", position: 4 }]);
    const result = await new TaskRepository(client, "c1").reorder(["t1", "t2"]);
    expect(rpc).toHaveBeenCalledWith("reorder_tasks", {
      p_clinic_id: "c1",
      p_ordered_ids: ["t1", "t2"],
    });
    expect(result.items.map((t) => t.id)).toEqual(["t1", "t2"]);
  });
});

describe("mapTaskRpcError", () => {
  const err = (status: number, message: string) =>
    new SupabaseRestError("x", status, { code: "P0001", message });

  it("maps domain errors to http statuses", () => {
    expect(mapTaskRpcError(err(400, "VERSION_CONFLICT"))?.status).toBe(409);
    expect(mapTaskRpcError(err(400, "TASK_NOT_FOUND"))?.status).toBe(404);
    expect(mapTaskRpcError(err(400, "TASK_NOT_IN_CLINIC"))?.status).toBe(422);
    expect(mapTaskRpcError(err(400, "DUPLICATE_TASK_IDS"))?.status).toBe(422);
    expect(mapTaskRpcError(err(403, "FORBIDDEN"))?.status).toBe(403);
  });

  it("ignores unknown errors", () => {
    expect(mapTaskRpcError(err(500, "boom"))).toBeNull();
    expect(mapTaskRpcError(new Error("VERSION_CONFLICT"))).toBeNull();
  });
});
