import { describe, expect, it } from "vitest";

import {
  eurosToCents,
  initialTreatmentFlowStep,
  isOpenPlanItem,
  treatmentFlowBlocker,
  type TreatmentFlowState,
} from "./treatment-flow-steps";

const base: TreatmentFlowState = { openItemCount: 2, pendingConsentCount: 0, budget: null };

describe("treatment flow steps", () => {
  it("starts at the plan unless the current budget is already signed", () => {
    expect(initialTreatmentFlowStep(base)).toBe("plan");
    expect(
      initialTreatmentFlowStep({ ...base, budget: { status: "SIGNED", outdated: false } }),
    ).toBe("appointments");
    expect(
      initialTreatmentFlowStep({ ...base, budget: { status: "SIGNED", outdated: true } }),
    ).toBe("plan");
  });

  it("blocks each step until its requirement is met", () => {
    expect(treatmentFlowBlocker("plan", { ...base, openItemCount: 0 })).toMatch(/odontograma/);
    expect(treatmentFlowBlocker("plan", base)).toBeNull();
    expect(treatmentFlowBlocker("consents", { ...base, pendingConsentCount: 1 })).toMatch(/1/);
    expect(treatmentFlowBlocker("budget", base)).not.toBeNull();
    expect(
      treatmentFlowBlocker("signature", { ...base, budget: { status: "DRAFT", outdated: false } }),
    ).not.toBeNull();
    expect(
      treatmentFlowBlocker("signature", { ...base, budget: { status: "SIGNED", outdated: false } }),
    ).toBeNull();
  });

  it("recognises closed plan items", () => {
    expect(isOpenPlanItem({ status: "PLANNED" })).toBe(true);
    expect(isOpenPlanItem({ status: "superseded" })).toBe(false);
    expect(isOpenPlanItem({ status: "COMPLETED" })).toBe(false);
  });

  it("parses euro amounts", () => {
    expect(eurosToCents("45")).toBe(4500);
    expect(eurosToCents("45,5")).toBe(4550);
    expect(eurosToCents("1.200,00 €")).toBe(120000);
    expect(eurosToCents(60)).toBe(6000);
    expect(eurosToCents("-3")).toBeNull();
    expect(eurosToCents("abc")).toBeNull();
  });
});
