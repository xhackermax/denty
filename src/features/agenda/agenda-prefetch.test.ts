import { describe, expect, it } from "vitest";

import { agendaPrefetchDates } from "./agenda-data";

describe("agendaPrefetchDates", () => {
  it("warms only the first three days after a weekly range", () => {
    expect(agendaPrefetchDates("2026-10-05", 7)).toEqual([
      "2026-10-12",
      "2026-10-13",
      "2026-10-14",
    ]);
  });

  it("never prefetches more days than the active view contains", () => {
    expect(agendaPrefetchDates("2026-10-05", 1)).toEqual(["2026-10-06"]);
  });
});
