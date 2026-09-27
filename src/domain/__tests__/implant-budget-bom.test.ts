import { describe, expect, it } from "vitest";

import { createPlannedImplant, deriveImplantBudgetBom } from "../odontogram/implant-planning";

describe("implant budget BOM", () => {
  it("derives explicit billable lines for a unit implant with TiBase", () => {
    const lines = deriveImplantBudgetBom(createPlannedImplant("16", "UNIT_TIBASE"));
    expect(lines.map((line) => line.code)).toEqual([
      "IMPLANT_FIXTURE",
      "TIBASE",
      "PROSTHETIC_SCREW",
      "DEFINITIVE_IMPLANT_CROWN",
    ]);
    expect(lines.every((line) => line.tooth === "16" && line.billable)).toBe(true);
  });

  it("creates explicit Multiunit components per planned site", () => {
    const plans = ["16", "14", "12"].map((tooth) => createPlannedImplant(tooth, "MULTIUNIT_FIXED"));
    const lines = plans.flatMap(deriveImplantBudgetBom);
    expect(lines.filter((line) => line.code === "MULTIUNIT")).toHaveLength(3);
    expect(lines.filter((line) => line.code === "PROSTHETIC_SCREW")).toHaveLength(3);
  });

  it("never combines bar and Locator in one explicit plan", () => {
    const bar = deriveImplantBudgetBom(createPlannedImplant("36", "BAR_OVERDENTURE"));
    const locator = deriveImplantBudgetBom(createPlannedImplant("36", "LOCATOR_OVERDENTURE"));
    expect(bar.some((line) => line.code === "BAR")).toBe(true);
    expect(bar.some((line) => line.code === "LOCATOR")).toBe(false);
    expect(locator.some((line) => line.code === "LOCATOR")).toBe(true);
    expect(locator.some((line) => line.code === "BAR")).toBe(false);
  });
});
