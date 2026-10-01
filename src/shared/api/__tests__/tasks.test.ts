import { describe, expect, it, vi } from "vitest";

import { ApiClient } from "../client";
import { createDentyApi } from "../endpoints";
import {
  createTaskSchema,
  reorderTasksSchema,
  taskSchema,
  updateTaskSchema,
} from "../schemas/core";

const baseTask = {
  id: "t1",
  taskType: "GENERAL",
  title: "Llamar al laboratorio",
  status: "OPEN",
  priority: "NORMAL",
  version: 1,
  position: 1,
  durationMin: 15,
  createdAt: "2026-09-30T10:00:00.000Z",
  updatedAt: "2026-09-30T10:00:00.000Z",
};

function makeApi() {
  const fetchImpl = vi.fn<typeof fetch>().mockImplementation(() =>
    Promise.resolve(
      new Response(JSON.stringify({ items: [] }), {
        headers: { "content-type": "application/json" },
      }),
    ),
  );
  const api = createDentyApi(new ApiClient({ baseUrl: "https://api.example.test", fetchImpl }));
  return { api, fetchImpl };
}

describe("task schemas", () => {
  it("requires position and durationMin and accepts nullable archivedAt", () => {
    expect(taskSchema.safeParse(baseTask).success).toBe(true);
    expect(taskSchema.safeParse({ ...baseTask, archivedAt: null }).success).toBe(true);
    expect(
      taskSchema.safeParse({ ...baseTask, archivedAt: "2026-09-30T12:00:00.000Z" }).success,
    ).toBe(true);
    expect(taskSchema.safeParse({ ...baseTask, position: undefined }).success).toBe(false);
    expect(taskSchema.safeParse({ ...baseTask, durationMin: undefined }).success).toBe(false);
  });

  it("bounds durationMin on create between 1 and 1440", () => {
    expect(createTaskSchema.safeParse({ title: "x", durationMin: 30 }).success).toBe(true);
    expect(createTaskSchema.safeParse({ title: "x", durationMin: 0 }).success).toBe(false);
    expect(createTaskSchema.safeParse({ title: "x", durationMin: 1441 }).success).toBe(false);
    expect(createTaskSchema.safeParse({ title: "x", durationMin: 1.5 }).success).toBe(false);
  });

  it("keeps the legacy status-only payload valid and allows the extended one", () => {
    expect(updateTaskSchema.safeParse({ status: "DONE", expectedVersion: 2 }).success).toBe(true);
    expect(
      updateTaskSchema.safeParse({
        title: "Nuevo",
        priority: "HIGH",
        durationMin: 45,
        dueAt: null,
        archived: true,
        expectedVersion: 3,
      }).success,
    ).toBe(true);
    expect(updateTaskSchema.safeParse({ durationMin: 2000 }).success).toBe(false);
    expect(updateTaskSchema.safeParse({ title: "  " }).success).toBe(false);
  });

  it("accepts scheduledOn as a real YYYY-MM-DD date (or null) on task, create and update", () => {
    expect(taskSchema.safeParse({ ...baseTask, scheduledOn: "2026-10-01" }).success).toBe(true);
    expect(taskSchema.safeParse({ ...baseTask, scheduledOn: null }).success).toBe(true);
    expect(createTaskSchema.safeParse({ title: "x", scheduledOn: "2026-10-01" }).success).toBe(
      true,
    );
    expect(updateTaskSchema.safeParse({ scheduledOn: "2024-02-29" }).success).toBe(true);
    expect(updateTaskSchema.safeParse({ scheduledOn: null }).success).toBe(true);
  });

  it("rejects malformed or impossible scheduledOn dates", () => {
    for (const bad of [
      "2026-02-31",
      "2026-13-01",
      "2025-02-29",
      "01/10/2026",
      "2026-10-01T10:00:00Z",
      "",
    ]) {
      expect(createTaskSchema.safeParse({ title: "x", scheduledOn: bad }).success).toBe(false);
      expect(updateTaskSchema.safeParse({ scheduledOn: bad }).success).toBe(false);
    }
    expect(createTaskSchema.safeParse({ title: "x", scheduledOn: null }).success).toBe(false);
  });

  it("validates reorder ids: 1..500 and no duplicates", () => {
    expect(reorderTasksSchema.safeParse({ orderedIds: ["a", "b"] }).success).toBe(true);
    expect(reorderTasksSchema.safeParse({ orderedIds: [] }).success).toBe(false);
    expect(reorderTasksSchema.safeParse({ orderedIds: ["a", "a"] }).success).toBe(false);
    const many = Array.from({ length: 501 }, (_, i) => `id-${i}`);
    expect(reorderTasksSchema.safeParse({ orderedIds: many }).success).toBe(false);
  });
});

describe("api.tasks client", () => {
  it("sends the extended PATCH payload", async () => {
    const { api, fetchImpl } = makeApi();
    await api.tasks
      .update("t 1", { archived: true, dueAt: null, expectedVersion: 2 })
      .catch(() => undefined);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe("https://api.example.test/api/tasks/t%201");
    const init = fetchImpl.mock.calls[0]?.[1];
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(String(init?.body))).toEqual({
      archived: true,
      dueAt: null,
      expectedVersion: 2,
    });
  });

  it("sends scheduledOn on create and update, null clears", async () => {
    const { api, fetchImpl } = makeApi();
    await api.tasks.create({ title: "x", scheduledOn: "2026-10-01" }).catch(() => undefined);
    expect(JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body))).toEqual({
      title: "x",
      scheduledOn: "2026-10-01",
    });
    await api.tasks.update("t1", { scheduledOn: null }).catch(() => undefined);
    expect(JSON.parse(String(fetchImpl.mock.calls[1]?.[1]?.body))).toEqual({ scheduledOn: null });
    expect(() => api.tasks.update("t1", { scheduledOn: "2026-02-31" })).toThrow();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("posts reorder with orderedIds", async () => {
    const { api, fetchImpl } = makeApi();
    await api.tasks.reorder(["b", "a"]);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe("https://api.example.test/api/tasks/reorder");
    const init = fetchImpl.mock.calls[0]?.[1];
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ orderedIds: ["b", "a"] });
  });

  it("rejects duplicate ids before hitting the network", () => {
    const { api, fetchImpl } = makeApi();
    expect(() => api.tasks.reorder(["a", "a"])).toThrow();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
