import { describe, expect, it } from "vitest";

import { shouldCreateBudgetRevision } from "../implant-budget-versioning";

describe("signed implant budget versioning", () => {
  it("requires a revision when the current plan differs from the signed snapshot", () => {
    expect(
      shouldCreateBudgetRevision({
        signedFingerprint: "signed-v1",
        currentPlanFingerprint: "plan-v2",
      }),
    ).toBe(true);
  });

  it("does not revise an unchanged signed snapshot", () => {
    expect(
      shouldCreateBudgetRevision({ signedFingerprint: "same", currentPlanFingerprint: "same" }),
    ).toBe(false);
  });

  it("does not invent a revision when there is no signed snapshot", () => {
    expect(
      shouldCreateBudgetRevision({ signedFingerprint: null, currentPlanFingerprint: "draft" }),
    ).toBe(false);
  });
});
