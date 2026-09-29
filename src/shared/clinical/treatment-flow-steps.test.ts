import { describe, expect, it } from "vitest";

import {
  hasNewTreatmentWork,
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

describe("abrir el flujo al guardar el odontograma", () => {
  const caries16 = { tooth: "16", entityType: "CARIES", status: "caries_pending", surfaces: ["D"] };
  it("una caries nueva lleva al plan y a dar cita", () => {
    expect(hasNewTreatmentWork([], [caries16])).toBe(true);
  });
  it("un tratamiento planificado o defectuoso nuevo también", () => {
    expect(
      hasNewTreatmentWork([], [{ tooth: "36", entityType: "ENDO", status: "endo_planned" }]),
    ).toBe(true);
    expect(
      hasNewTreatmentWork(
        [],
        [{ tooth: "26", entityType: "RESTORATION", status: "restoration_unsatisfactory" }],
      ),
    ).toBe(true);
  });
  it("no se abre si no hay nada nuevo que tratar", () => {
    expect(hasNewTreatmentWork([caries16], [{ ...caries16, surfaces: ["D"] }])).toBe(false);
    expect(
      hasNewTreatmentWork([], [{ tooth: "11", entityType: "HEALTHY", status: "healthy" }]),
    ).toBe(false);
    expect(
      hasNewTreatmentWork(
        [],
        [{ tooth: "14", entityType: "RESTORATION", status: "restoration_completed" }],
      ),
    ).toBe(false);
    expect(hasNewTreatmentWork([], [{ ...caries16, active: false }])).toBe(false);
  });
});
