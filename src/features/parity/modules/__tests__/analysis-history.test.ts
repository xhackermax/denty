import { describe, expect, it } from "vitest";

import { mergeHistoryWithNewPatients } from "../analysis-history";

describe("mergeHistoryWithNewPatients", () => {
  it("attaches new patients to the matching financial period", () => {
    expect(
      mergeHistoryWithNewPatients(
        [{ periodStart: "2026-02-01", producedCents: 500 }],
        [{ periodStart: "2026-02-01", count: 3 }],
      ),
    ).toEqual([{ periodStart: "2026-02-01", producedCents: 500, newPatients: 3 }]);
  });

  it("keeps periods that only have new patients or only finance data, newest first", () => {
    expect(
      mergeHistoryWithNewPatients(
        [
          { periodStart: "2026-03-01", producedCents: 100 },
          { periodStart: "2026-01-01", producedCents: 200 },
        ],
        [{ periodStart: "2026-02-01", count: 4 }],
      ),
    ).toEqual([
      { periodStart: "2026-03-01", producedCents: 100, newPatients: 0 },
      { periodStart: "2026-02-01", newPatients: 4 },
      { periodStart: "2026-01-01", producedCents: 200, newPatients: 0 },
    ]);
  });

  it("drops finance rows without a period and handles empty inputs", () => {
    expect(mergeHistoryWithNewPatients([{ producedCents: 1 }], [])).toEqual([]);
    expect(mergeHistoryWithNewPatients([], [])).toEqual([]);
  });
});
