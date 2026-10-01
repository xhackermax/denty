import { expect, test, vi } from "vitest";
import { DraftWriter } from "../draft-writer";
test("serializes revisions and finishes only after latest draft reaches server", async () => {
  let release!: () => void;
  const first = new Promise<void>((resolve) => {
    release = resolve;
  });
  const save = vi.fn(async (data: number, version: number) => {
    if (data === 1) await first;
    return version + 1;
  });
  const writer = new DraftWriter(save, 0);
  const a = writer.write(1);
  const b = writer.write(2);
  expect(save).toHaveBeenCalledTimes(0);
  release();
  await Promise.all([a, b]);
  expect(save.mock.calls).toEqual([
    [1, 0],
    [2, 1],
  ]);
  expect(await writer.flush()).toBe(2);
});
test("retains failed revision without allowing finalization and retries explicitly", async () => {
  const save = vi.fn().mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce(1);
  const writer = new DraftWriter<number>(save, 0);
  await expect(writer.write(3)).rejects.toThrow("Offline");
  await expect(writer.flush()).rejects.toThrow("Offline");
  await writer.write(3);
  expect(await writer.flush()).toBe(1);
});
