import { describe, expect, it } from "vitest";

import { createStateEntity } from "@/shared/odontogram/odontogram-wire";

import { entityForVoiceAction, mergeVoiceEntities, treatmentToothState } from "../voice-odontogram";

describe("voice odontogram", () => {
  it("maps spoken treatments to tooth states", () => {
    expect(treatmentToothState("restoration", "PLANNED")).toBe("filling_pending");
    expect(treatmentToothState("endodontics", "COMPLETED")).toBe("endo");
    expect(treatmentToothState("crown", "UNSATISFACTORY")).toBe("crown_bad");
    expect(treatmentToothState("extraction", "PLANNED")).toBe("extraction");
    expect(treatmentToothState("extraction", "COMPLETED")).toBe("missing");
    expect(treatmentToothState("prophylaxis", "PLANNED")).toBeNull();
  });

  it("builds the entity for caries and planned fillings", () => {
    expect(
      entityForVoiceAction({
        type: "odontogram.set_state",
        patientRef: "",
        tooth: "36",
        status: "CARIES",
        surfaces: ["D"],
      }),
    ).toMatchObject({ tooth: "36", status: "caries", surfaces: ["D"] });
    expect(
      entityForVoiceAction({
        type: "clinical.add_item",
        patientRef: "",
        tooth: "14",
        treatmentCode: "restoration",
        label: "Obturación 14",
        surfaces: ["O", "M"],
      }),
    ).toMatchObject({ tooth: "14", status: "filling_pending", surfaces: ["O", "M"] });
  });

  it("keeps the rest of the odontogram when adding a finding", () => {
    const current = [
      createStateEntity("11", "crown"),
      createStateEntity("36", "healthy"),
      createStateEntity("46", "caries", ["O"]),
    ];
    const merged = mergeVoiceEntities(current, [createStateEntity("36", "caries", ["D"])]);
    expect(merged.map((entity) => `${entity.tooth}:${entity.status}`).sort()).toEqual([
      "11:crown",
      "36:caries",
      "46:caries",
    ]);
  });

  it("replaces a planned filling when it is done, and whole-tooth states replace everything", () => {
    const current = [
      createStateEntity("14", "filling_pending", ["M", "O"]),
      createStateEntity("14", "caries", ["D"]),
    ];
    const done = mergeVoiceEntities(current, [createStateEntity("14", "filling", ["O", "M"])]);
    expect(done.map((entity) => entity.status).sort()).toEqual(["caries", "filling"]);
    const missing = mergeVoiceEntities(done, [createStateEntity("14", "missing")]);
    expect(missing.map((entity) => entity.status)).toEqual(["missing"]);
  });
});
