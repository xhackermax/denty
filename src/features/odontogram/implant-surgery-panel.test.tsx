// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import type { DentalEntity } from "@/domain";
import { buildCompletedImplantEntity } from "./implant-surgery-panel";

const planned: DentalEntity = {
  id: "implant-16",
  tooth: "16",
  entityType: "IMPLANT",
  status: "implant_pending",
  active: true,
  attributes: { lifecycle: "PLANIFICADO", prostheticDesign: "UNIT_TIBASE" },
};

describe("implant surgery completion", () => {
  it("enriches the same planned implant with actual data", () => {
    const completed = buildCompletedImplantEntity(planned, "16", {
      system: "Ticare INHEX",
      diameterMm: 4.25,
      lengthMm: 10,
      placementDate: "2026-09-27",
      insertionTorqueNcm: 40,
      primaryIsq: 71,
    });
    expect(completed.id).toBe(planned.id);
    expect(completed).toMatchObject({
      status: "implant",
      attributes: { lifecycle: "REALIZADO", prostheticDesign: "UNIT_TIBASE", system: "Ticare INHEX" },
    });
    expect(completed.attributes).not.toHaveProperty("lotNumber");
    expect(completed.attributes).not.toHaveProperty("connection");
    expect(completed.attributes).not.toHaveProperty("notes");
  });

  it("refuses completion while required actual data is missing", () => {
    expect(() => buildCompletedImplantEntity(planned, "16", { system: "Ticare" })).toThrow(/obligatorios/);
  });
});
