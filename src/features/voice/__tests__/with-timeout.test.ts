import { afterEach, describe, expect, it, vi } from "vitest";

import { VoiceTimeoutError, withTimeout } from "../with-timeout";

describe("withTimeout", () => {
  afterEach(() => vi.useRealTimers());

  it("resolves with the value when the promise settles in time", async () => {
    await expect(withTimeout(Promise.resolve(7), 1_000)).resolves.toBe(7);
  });

  it("propagates the original rejection", async () => {
    await expect(withTimeout(Promise.reject(new Error("boom")), 1_000)).rejects.toThrow("boom");
  });

  it("rejects with VoiceTimeoutError when the promise is too slow", async () => {
    vi.useFakeTimers();
    const pending = withTimeout(new Promise<never>(() => undefined), 500);
    const assertion = expect(pending).rejects.toBeInstanceOf(VoiceTimeoutError);
    await vi.advanceTimersByTimeAsync(501);
    await assertion;
  });

  it("clears its timer once settled", async () => {
    vi.useFakeTimers();
    await withTimeout(Promise.resolve(1), 500);
    expect(vi.getTimerCount()).toBe(0);
  });
});
