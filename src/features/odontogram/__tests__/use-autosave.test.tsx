// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAutosave } from "../use-autosave";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup(save: (value: { n: number }) => Promise<void>, enabled = true) {
  const initial = { n: 0 };
  const view = renderHook(
    ({ value, on }) => useAutosave({ value, enabled: on, delayMs: 1000, save }),
    { initialProps: { value: initial, on: enabled } },
  );
  const edit = (n: number) => {
    const value = { n };
    view.rerender({ value, on: enabled });
    return value;
  };
  return { ...view, initial, edit };
}

const settle = async (ms = 1000) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

describe("useAutosave", () => {
  it("saves the latest value once edits pause, then reports it as saved", async () => {
    const save = vi.fn(async () => undefined);
    const { result, edit } = setup(save);
    expect(result.current).toMatchObject({ dirty: false, status: "idle" });

    edit(1);
    await settle(500);
    const last = edit(2);
    expect(result.current).toMatchObject({ dirty: true, status: "pending" });
    await settle(999);
    expect(save).not.toHaveBeenCalled();
    await settle(1);

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(last);
    expect(result.current).toMatchObject({ dirty: false, status: "saved" });
  });

  it("saves again after an edit made while a save was running", async () => {
    let finish!: () => void;
    const save = vi
      .fn<(value: { n: number }) => Promise<void>>()
      .mockImplementationOnce(() => new Promise<void>((resolve) => (finish = resolve)))
      .mockResolvedValue(undefined);
    const { result, edit } = setup(save);

    edit(1);
    await settle();
    expect(result.current.status).toBe("saving");
    const later = edit(2);
    await settle();
    expect(save).toHaveBeenCalledTimes(1);

    await act(async () => finish());
    await settle();
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith(later);
    expect(result.current).toMatchObject({ dirty: false, status: "saved" });
  });

  it("stops after a failure until the next edit or an explicit retry", async () => {
    const save = vi
      .fn<(value: { n: number }) => Promise<void>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(undefined);
    const { result, edit } = setup(save);

    edit(1);
    await settle();
    expect(result.current).toMatchObject({ status: "error", dirty: true });
    expect((result.current.error as Error).message).toBe("offline");
    await settle(5000);
    expect(save).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.flush();
    });
    expect(save).toHaveBeenCalledTimes(2);
    expect(result.current).toMatchObject({ status: "saved", dirty: false, error: null });
  });

  it("flush waits for a running save and then saves the latest edit", async () => {
    let finish!: () => void;
    const save = vi
      .fn<(value: { n: number }) => Promise<void>>()
      .mockImplementationOnce(() => new Promise<void>((resolve) => (finish = resolve)))
      .mockResolvedValue(undefined);
    const { result, edit } = setup(save);
    edit(1);
    await settle();
    const latest = edit(2);

    let flushed = false;
    const pending = act(async () => {
      await result.current.flush();
      flushed = true;
    });
    await act(async () => finish());
    await pending;

    expect(flushed).toBe(true);
    expect(save).toHaveBeenLastCalledWith(latest);
    expect(result.current.dirty).toBe(false);
  });

  it("flush saves at once and rethrows so callers can stay put on failure", async () => {
    const save = vi.fn<(value: { n: number }) => Promise<void>>().mockRejectedValue(new Error("x"));
    const { result, edit } = setup(save);
    edit(1);
    await expect(
      act(async () => {
        await result.current.flush();
      }),
    ).rejects.toThrow("x");
  });

  it("does nothing while disabled and forgets edits on reset", async () => {
    const save = vi.fn(async () => undefined);
    const { result, rerender } = setup(save, false);
    const edited = { n: 1 };
    rerender({ value: edited, on: false });
    await settle(3000);
    expect(save).not.toHaveBeenCalled();
    expect(result.current.dirty).toBe(true);

    act(() => result.current.reset(edited));
    expect(result.current).toMatchObject({ dirty: false, status: "idle" });
  });
});
