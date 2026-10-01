import { expect, test, vi } from "vitest";
import { deriveMouthState } from "@/domain/odontogram/mouth-state";
import { createPerioExam } from "@/domain/periodontal/exam";
import { applyPerioCommand, createPerioSession } from "@/domain/periodontal/entry-cursor";
import type { PerioDraftData } from "@/shared/api/schemas/perio-drafts";
import { createPerioDraftOwner } from "../draft-owner";
const mouth = deriveMouthState([]),
  id = "00000000-0000-4000-8000-000000000020";
function fixture() {
  const api = {
    get: vi.fn(async () => null),
    save: vi.fn(
      async (
        _patient: string,
        data: PerioDraftData,
        version: number,
        _generation: string | null,
      ) => ({ id, data, version: version + 1, updatedAt: "now" }),
    ),
    finish: vi.fn(async () => ({ examId: "exam" })),
  };
  return { owner: createPerioDraftOwner(), api };
}
test("load failure is retryable, concurrent initialization shares one request, reload discards explicitly", async () => {
  const { owner, api } = fixture(),
    changed = vi.fn(),
    unsubscribe = owner.subscribe(changed);
  api.get.mockRejectedValueOnce(new Error("Offline"));
  await expect(owner.initialize(api, "p", mouth, null)).rejects.toThrow("Offline");
  expect(owner.initialized).toBe(false);
  await Promise.all([
    owner.initialize(api, "p", mouth, null),
    owner.initialize(api, "p", mouth, null),
  ]);
  expect(api.get).toHaveBeenCalledTimes(2);
  expect(owner.error).toBe("");
  owner.update(applyPerioCommand(owner.session!, { type: "triplet", values: [4, 3, 4] }, mouth));
  owner.discard();
  expect(owner.session!.exam.teeth["18"]!.sites.MV.pd).toBe(null);
  owner.reload();
  expect(owner.session).toBe(null);
  await owner.initialize(api, "p", mouth, null);
  expect(api.get).toHaveBeenCalledTimes(3);
  unsubscribe();
  const count = changed.mock.calls.length;
  owner.discard();
  expect(changed).toHaveBeenCalledTimes(count);
});
test("previous examination stays closed and new examination starts with empty measurements", async () => {
  const { owner, api } = fixture(),
    prior = createPerioExam(mouth, [{ tooth: "18", site: "MV", probingDepth: 6 }]);
  await owner.initialize(api, "p", mouth, prior);
  expect(owner.closed).toBe(true);
  await owner.persist(owner.session!);
  await owner.finish();
  expect(api.save).not.toHaveBeenCalled();
  expect(api.finish).not.toHaveBeenCalled();
  owner.startNew(mouth, "clinical");
  expect(owner.closed).toBe(false);
  expect(owner.session!.exam.teeth["18"]!.sites.MV.pd).toBe(null);
});
test("save errors remain visible, retry uses the same revision and mouth reconciliation retains measurements", async () => {
  const { owner, api } = fixture();
  await expect(owner.persist(createPerioSession(createPerioExam(mouth), mouth))).rejects.toThrow(
    "todavía",
  );
  owner.reconcile(mouth);
  owner.discard();
  await owner.initialize(api, "p", mouth, null);
  owner.update(applyPerioCommand(owner.session!, { type: "triplet", values: [4, 3, 4] }, mouth));
  api.save.mockRejectedValueOnce(new Error("Conflict"));
  await expect(owner.persist(owner.session!)).rejects.toThrow("Conflict");
  expect(owner.dirty).toBe(true);
  expect(owner.status).toBe("Sin guardar");
  await owner.persist(owner.session!);
  expect(owner.dirty).toBe(false);
  const missing = deriveMouthState([
    { id: "absent", tooth: "18", entityType: "MISSING", status: "missing", active: true },
  ]);
  owner.reconcile(missing);
  expect(owner.dirty).toBe(true);
  expect(owner.session!.exam.teeth["18"]!.sites.MV.pd).toBe(4);
  await owner.persist(owner.session!);
  expect(api.save.mock.calls.at(-1)?.slice(2)).toEqual([1, id]);
});
test("pending completion locks new exams and reload; retry never saves the deleted draft", async () => {
  const { owner, api } = fixture();
  await owner.initialize(api, "p", mouth, null);
  owner.update(applyPerioCommand(owner.session!, { type: "triplet", values: [4, 3, 4] }, mouth));
  api.finish.mockRejectedValueOnce(new Error("Lost response"));
  const before = vi.fn(async () => {});
  await expect(owner.finish(before)).rejects.toThrow("Lost response");
  expect(owner.checkpoint).toEqual({ draftId: id, version: 1 });
  expect(owner.dirty).toBe(true);
  expect(() => owner.reload()).toThrow("Reintenta");
  expect(() => owner.startNew(mouth, "clinical")).toThrow("Reintenta");
  await owner.finish(before);
  expect(before).toHaveBeenCalledTimes(1);
  expect(api.save).toHaveBeenCalledTimes(1);
  expect(api.finish).toHaveBeenCalledTimes(2);
  expect(owner.closed).toBe(true);
});
test("a delayed save cannot clear subsequent edits and concurrent completion is ignored", async () => {
  const { owner, api } = fixture();
  await owner.initialize(api, "p", mouth, null);
  let release!: () => void;
  const delay = new Promise<void>((resolve) => {
    release = resolve;
  });
  api.save.mockImplementationOnce(async (_p, data, version) => {
    await delay;
    return { id, data, version: version + 1, updatedAt: "now" };
  });
  const first = applyPerioCommand(owner.session!, { type: "triplet", values: [4, 3, 4] }, mouth);
  owner.update(first);
  const save = owner.persist(first);
  owner.update(applyPerioCommand(first, { type: "triplet", values: [5, 4, 5] }, mouth));
  release();
  await save;
  expect(owner.dirty).toBe(true);
  const completion = owner.finish();
  await owner.finish();
  expect(() => owner.reload()).toThrow();
  expect(() => owner.startNew(mouth, "clinical")).toThrow();
  await completion;
  expect(api.finish).toHaveBeenCalledTimes(1);
});
