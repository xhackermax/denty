import type { QueryKey } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createRealtimeInvalidationBatcher } from "./realtime-bridge";

describe("createRealtimeInvalidationBatcher", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("coalesces repeated query keys from one burst of realtime events", () => {
    vi.useFakeTimers();
    const invalidated: QueryKey[] = [];
    const batcher = createRealtimeInvalidationBatcher((key) => invalidated.push(key), 100);

    batcher.enqueue([
      ["denty", "appointments"],
      ["denty", "dashboard"],
    ]);
    batcher.enqueue([
      ["denty", "appointments"],
      ["denty", "analytics"],
    ]);

    expect(invalidated).toEqual([]);
    vi.advanceTimersByTime(100);
    expect(invalidated).toEqual([
      ["denty", "appointments"],
      ["denty", "dashboard"],
      ["denty", "analytics"],
    ]);
  });

  it("drops queued work when the clinic subscription is disposed", () => {
    vi.useFakeTimers();
    const invalidate = vi.fn();
    const batcher = createRealtimeInvalidationBatcher(invalidate, 100);

    batcher.enqueue([["denty", "appointments"]]);
    batcher.dispose();
    vi.advanceTimersByTime(100);

    expect(invalidate).not.toHaveBeenCalled();
  });
});
