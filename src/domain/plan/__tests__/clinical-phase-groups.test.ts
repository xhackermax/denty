import { describe, expect, it } from "vitest";

import {
  CLINICAL_PHASE_GROUPS,
  clinicalPhaseGroup,
  groupByClinicalPhase,
} from "../clinical-phase-groups";

describe("clinicalPhaseGroup", () => {
  it.each([
    ["PERIODONTICS", "Raspado y alisado radicular", "periodontal"],
    ["PERIO_SURGERY", "Cirugía periodontal", "periodontal"],
    ["GINGIVECTOMY", "Gingivectomía", "periodontal"],
    ["EXTRACTION", "Exodoncia", "surgical"],
    ["EXTRACTION_SURGICAL", "Extracción quirúrgica del cordal", "surgical"],
    ["IMPLANT", "Implante", "surgical"],
    ["BONE_GRAFT", "Injerto óseo", "surgical"],
    ["SINUS_LIFT", "Elevación de seno", "surgical"],
    ["FILLING", "Obturación composite", "conservative"],
    ["ENDODONTICS", "Endodoncia", "conservative"],
    ["CROWN", "Corona sobre implante", "prosthetic"],
    ["BRIDGE", "Puente de 3 piezas", "prosthetic"],
    ["DENTURE", "Prótesis removible", "prosthetic"],
    ["VENEER", "Carilla", "prosthetic"],
    ["ORTHO", "Ortodoncia con alineadores", "orthodontic"],
    ["HYGIENE", "Limpieza profesional", "maintenance"],
    ["SEALANT", "Sellado de fisuras", "maintenance"],
    ["CONSULT", "Valoración", "other"],
  ])("%s · %s → %s", (treatmentCode, label, expected) => {
    expect(clinicalPhaseGroup({ treatmentCode, label })).toBe(expected);
  });

  it("uses the catalogue specialty when the name says nothing", () => {
    expect(
      clinicalPhaseGroup({
        treatmentCode: "X1",
        label: "Procedimiento A",
        specialty: "PERIODONTICS",
      }),
    ).toBe("periodontal");
  });
});

describe("groupByClinicalPhase", () => {
  it("returns only non-empty groups in clinical order, keeping item order", () => {
    const groups = groupByClinicalPhase([
      { id: "1", treatmentCode: "CROWN", label: "Corona" },
      { id: "2", treatmentCode: "EXTRACTION", label: "Exodoncia 18" },
      { id: "3", treatmentCode: "PERIODONTICS", label: "Raspado" },
      { id: "4", treatmentCode: "EXTRACTION", label: "Exodoncia 28" },
    ]);
    expect(groups.map((group) => group.key)).toEqual(["periodontal", "surgical", "prosthetic"]);
    expect(groups[1]?.items.map((item) => item.id)).toEqual(["2", "4"]);
    expect(groups[1]?.label).toBe("Fase quirúrgica");
  });

  it("returns no groups for an empty plan", () => {
    expect(groupByClinicalPhase([])).toEqual([]);
  });

  it("names every phase", () => {
    expect(CLINICAL_PHASE_GROUPS.map((group) => group.label)).toEqual([
      "Fase periodontal",
      "Fase quirúrgica",
      "Fase conservadora",
      "Fase prostodóncica",
      "Fase ortodóncica",
      "Mantenimiento",
      "Otros",
    ]);
  });
});
