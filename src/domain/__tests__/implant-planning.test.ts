import { describe, expect, it } from "vitest";

import { createImplantStack } from "../odontogram";
import { createPlannedImplant } from "../odontogram/implant-planning";

describe("implant prosthetic planning", () => {
  it("creates a planned implant without fabricated surgery-day fixture data", () => {
    const plan = createPlannedImplant("16", "UNIT_TIBASE");
    expect(plan.implant).toMatchObject({
      tooth: "16",
      entityType: "IMPLANT",
      attributes: { lifecycle: "PLANIFICADO" },
    });
    expect(plan.implant.attributes).not.toHaveProperty("system");
    expect(plan.implant.attributes).not.toHaveProperty("diameterMm");
    expect(plan.implant.attributes).not.toHaveProperty("lengthMm");
    expect(plan.implant.attributes).not.toHaveProperty("insertionTorqueNcm");
    expect(plan.implant.attributes).not.toHaveProperty("primaryIsq");
  });

  it("keeps the legacy three-entity implant stack readable", () => {
    const stack = createImplantStack("16");
    expect(stack).toHaveLength(3);
    expect(stack.map((entity) => entity.entityType)).toEqual(["IMPLANT", "ABUTMENT", "CROWN"]);
  });
});
