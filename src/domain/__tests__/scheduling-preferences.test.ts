import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLAN_VISIT_GAP_DAYS,
  normalizePlanVisitGapDays,
  planVisitDates,
  resolvePlanVisitGapDays,
} from "../scheduling-preferences";

describe("scheduling preferences", () => {
  it("defaults to weekly plan visits", () => {
    expect(DEFAULT_PLAN_VISIT_GAP_DAYS).toBe(7);
    expect(planVisitDates("2026-10-01", 4, 7)).toEqual([
      "2026-10-01",
      "2026-10-08",
      "2026-10-15",
      "2026-10-22",
    ]);
  });
  it("clamps admin values", () => {
    expect(normalizePlanVisitGapDays(181)).toBe(180);
    expect(normalizePlanVisitGapDays(-4)).toBe(0);
  });
  it("lets a plan item override the default", () => {
    expect(resolvePlanVisitGapDays({ itemGapDays: 3, defaultGapDays: 7 })).toBe(3);
  });
});
