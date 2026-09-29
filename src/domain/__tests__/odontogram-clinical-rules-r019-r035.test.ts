import { describe, expect, it } from "vitest";

import { evaluateClinicalAction, type DentalEntity } from "../index";

let sequence = 100;
const dental = (overrides: Partial<DentalEntity>): DentalEntity => ({
  id: `advanced-rule-${(sequence += 1)}`,
  tooth: "16",
  entityType: "SURGERY",
  status: "observation",
  active: true,
  ...overrides,
});

const cases: readonly [string, DentalEntity, readonly DentalEntity[]][] = [
  [
    "R019",
    dental({ entityType: "ORTHODONTIC", status: "diastema_closure" }),
    [dental({ entityType: "RESTORATION", status: "diastema_closure" })],
  ],
  ["R020", dental({ entityType: "TOOTH_STATE", status: "pink_spot" }), []],
  ["R021", dental({ tooth: "36", entityType: "SINUS_LIFT", status: "sinus_lift" }), []],
  ["R022", dental({ entityType: "IMPLANT_COMPONENT", status: "locator" }), []],
  [
    "R023",
    dental({ entityType: "IMPLANT_COMPONENT", status: "bar" }),
    [dental({ entityType: "IMPLANT_COMPONENT", status: "locator" })],
  ],
  [
    "R024",
    dental({ entityType: "RESTORATION", status: "veneer" }),
    [dental({ entityType: "CROWN", status: "crown" })],
  ],
  [
    "R025",
    dental({ entityType: "PERIODONTAL_FINDING", status: "peri_implantitis" }),
    [dental({ entityType: "HEALTHY", status: "healthy" })],
  ],
  ["R026", dental({ tooth: "11", entityType: "PERIODONTAL_FINDING", status: "furcation" }), []],
  [
    "R027",
    dental({
      entityType: "IMPLANT",
      status: "immediate_loading",
      attributes: { insertionTorqueNcm: 20, primaryIsq: 50 },
    }),
    [],
  ],
  [
    "R028",
    dental({ entityType: "IMPLANT_COMPONENT", status: "tibase" }),
    [dental({ entityType: "IMPLANT", status: "implant_pending" })],
  ],
  [
    "R029",
    dental({ entityType: "IMPLANT_COMPONENT", status: "multiunit" }),
    [dental({ entityType: "CROWN", status: "single_crown" })],
  ],
  [
    "R030",
    dental({
      entityType: "ABUTMENT",
      status: "angled_abutment",
      attributes: { angleDeg: 30, straightScrewAccess: true },
    }),
    [],
  ],
  ["R031", dental({ entityType: "MEMBRANE", status: "membrane" }), []],
  [
    "R032",
    dental({
      entityType: "IMPLANT",
      status: "implant",
      attributes: {
        lifecycle: "REALIZADO",
        system: "TEST",
        diameterMm: 4.25,
        lengthMm: 10,
        placementDate: "2026-10-02",
        insertionTorqueNcm: 40,
        primaryIsq: 71,
      },
    }),
    [],
  ],
  [
    "R033",
    dental({
      entityType: "BRIDGE",
      status: "bridge_pending",
      attributes: { cantilever: true, allEndpointsAreAbutments: true },
    }),
    [],
  ],
  [
    "R034",
    dental({ entityType: "PONTIC", status: "pontic_pending" }),
    [dental({ entityType: "HEALTHY", status: "healthy" })],
  ],
  [
    "R035",
    dental({ entityType: "SURGERY", status: "apicoectomy" }),
    [dental({ entityType: "ENDO", status: "retreatment" })],
  ],
];

describe("clinical rules R019-R035", () => {
  it.each(cases)(
    "triggers %s with its intended clinical conflict",
    (ruleId, proposed, existing) => {
      const result = evaluateClinicalAction({ type: "UPSERT_ENTITY", entity: proposed }, existing);
      expect(result.ruleIds).toContain(ruleId);
      expect(result.outcome).not.toBe("ALLOW");
    },
  );

  it("validates exact dimensions when a manufacturer catalogue is available", () => {
    const implant = dental({
      entityType: "IMPLANT",
      status: "implant",
      attributes: { system: "TICARE", diameterMm: 9, lengthMm: 99 },
    });
    const result = evaluateClinicalAction({ type: "UPSERT_ENTITY", entity: implant }, [], {
      manufacturerCatalog: { TICARE: ["4.25x10", "3.75x11.5"] },
    });
    expect(result).toMatchObject({ outcome: "BLOCK" });
    expect(result.ruleIds).toContain("R032");
  });
});
