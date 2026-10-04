import { describe, expect, it, vi } from "vitest";

import { budgetNeedsSync, createClinicalAutoSync } from "../auto-sync";

type Result = Parameters<typeof budgetNeedsSync>[0];

const result = (
  statuses: string[],
  budget: { status: string; outdated: boolean } | null = null,
): Result =>
  ({
    plan: { id: "plan", items: statuses.map((status, index) => ({ id: `i${index}`, status })) },
    summary: { updated: 0, added: 0, superseded: 0, coveredByExisting: 0, linked: 0, completed: 0 },
    sync: {
      budget: budget && { id: "b", code: "P-1", totalCents: 0, sourcePlanVersion: 1, ...budget },
    },
  }) as unknown as Result;

describe("budgetNeedsSync", () => {
  it("builds or refreshes a draft while there is treatment to do", () => {
    expect(budgetNeedsSync(result(["PLANNED"]))).toBe(true);
    expect(budgetNeedsSync(result(["PLANNED"], { status: "DRAFT", outdated: true }))).toBe(true);
    expect(budgetNeedsSync(result(["PLANNED"], { status: "DRAFT", outdated: false }))).toBe(true);
  });

  it("never touches a signed budget that still matches the plan", () => {
    expect(budgetNeedsSync(result(["PLANNED"], { status: "SIGNED", outdated: false }))).toBe(false);
  });

  it("opens a new draft revision when a signed budget no longer matches the plan", () => {
    expect(budgetNeedsSync(result(["PLANNED"], { status: "SIGNED", outdated: true }))).toBe(true);
  });

  it("does not create empty budgets", () => {
    expect(budgetNeedsSync(result([]))).toBe(false);
    expect(budgetNeedsSync(result(["COMPLETED", "CANCELLED", "SUPERSEDED"]))).toBe(false);
    expect(budgetNeedsSync({ ...result([]), plan: null } as Result)).toBe(false);
  });
});

describe("createClinicalAutoSync", () => {
  const deferred = () => {
    let resolve!: () => void;
    const promise = new Promise<void>((done) => (resolve = done));
    return { promise, resolve };
  };

  it("syncs the plan, then the budget when needed, and reports the outcome", async () => {
    const syncPlan = vi.fn(async () => result(["PLANNED"]));
    const syncBudget = vi.fn(async () => undefined);
    const onDone = vi.fn();
    const sync = createClinicalAutoSync({ syncPlan, syncBudget, onDone });

    await sync.request();

    expect(syncPlan).toHaveBeenCalledOnce();
    expect(syncBudget).toHaveBeenCalledOnce();
    expect(onDone).toHaveBeenCalledWith({ ok: true, budgetUpdated: true });
  });

  it("skips the budget when it must stay as signed", async () => {
    const syncBudget = vi.fn(async () => undefined);
    const onDone = vi.fn();
    const sync = createClinicalAutoSync({
      syncPlan: async () => result(["PLANNED"], { status: "SIGNED", outdated: false }),
      syncBudget,
      onDone,
    });
    await sync.request();
    expect(syncBudget).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledWith({ ok: true, budgetUpdated: false });
  });

  it("coalesces saves made while a sync is running into one more pass", async () => {
    const gate = deferred();
    const syncPlan = vi
      .fn<() => Promise<Result>>()
      .mockImplementationOnce(async () => {
        await gate.promise;
        return result([]);
      })
      .mockResolvedValue(result([]));
    const sync = createClinicalAutoSync({ syncPlan, syncBudget: vi.fn(), onDone: vi.fn() });

    const first = sync.request();
    void sync.request();
    void sync.request();
    gate.resolve();
    await first;
    await sync.idle();

    expect(syncPlan).toHaveBeenCalledTimes(2);
  });

  it("reports failures without throwing", async () => {
    const onDone = vi.fn();
    const sync = createClinicalAutoSync({
      syncPlan: async () => {
        throw new Error("offline");
      },
      syncBudget: vi.fn(),
      onDone,
    });
    await expect(sync.request()).resolves.toBeUndefined();
    expect(onDone).toHaveBeenCalledWith({ ok: false, error: expect.any(Error) });
  });
});
