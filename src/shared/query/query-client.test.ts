import { afterEach, describe, expect, it, vi } from "vitest";

import { createDentyQueryClient } from "./query-client";

describe("createDentyQueryClient", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("evicts inactive route data after one minute", () => {
    vi.useFakeTimers();
    const client = createDentyQueryClient();
    client.setQueryData(["denty", "clinical", "patient-1", "odontogram"], { entities: [] });

    vi.advanceTimersByTime(60_001);

    expect(client.getQueryData(["denty", "clinical", "patient-1", "odontogram"])).toBeUndefined();
  });

  it("does not refetch every stale screen merely because the browser regains focus", () => {
    const client = createDentyQueryClient();

    expect(client.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(false);
  });
});
