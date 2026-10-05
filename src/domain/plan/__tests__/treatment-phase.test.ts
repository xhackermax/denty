import { describe, expect, it } from "vitest";

import { splitPlanByPhase, treatmentPhase } from "../treatment-phase";

describe("treatmentPhase", () => {
  it.each([
    ["EXTRACTION", "Exodoncia"],
    ["ENDODONTICS", "Endodoncia"],
    ["FILLING", "Obturación"],
    ["PERIODONTICS", "Raspado y alisado radicular"],
    ["GINGIVECTOMY", "Gingivectomía"],
    ["SPLINT", "Férula de descarga"],
    ["HYGIENE", "Limpieza"],
    ["CUSTOM", "Curetaje por cuadrante"],
    ["CUSTOM", "Pulpotomía"],
    ["CUSTOM", "Obturación de composite"],
    ["CUSTOM", "Revisión postoperatoria"],
  ])("puts %s (%s) in the primary phase", (code, label) => {
    expect(treatmentPhase({ treatmentCode: code, label })).toBe("primary");
  });

  it.each([
    ["IMPLANT", "Implante"],
    ["CROWN_ZIRCONIA", "Corona de zirconio"],
    ["PROSTHESIS", "Puente fijo"],
    ["REMOVABLE", "Prótesis removible"],
    ["POST", "Perno de fibra"],
    ["CUSTOM", "Blanqueamiento dental"],
    ["CUSTOM", "Ortodoncia con alineadores"],
    ["TITANIUM_MESH", "Malla de titanio"],
    ["CUSTOM", "Elevación de seno"],
    ["CUSTOM", "Carilla de porcelana"],
  ])("puts %s (%s) in the secondary phase", (code, label) => {
    expect(treatmentPhase({ treatmentCode: code, label })).toBe("secondary");
  });

  it("ignores accents and case", () => {
    expect(treatmentPhase({ treatmentCode: "x", label: "FERULA DE DESCARGA" })).toBe("primary");
    expect(treatmentPhase({ treatmentCode: "x", label: "blanqueamiento" })).toBe("secondary");
  });

  it("keeps an unknown treatment in the primary phase, where nothing is postponed by mistake", () => {
    expect(treatmentPhase({ treatmentCode: "MISC", label: "Revisión" })).toBe("primary");
  });

  it("lets the secondary-phase word win when a label mentions both", () => {
    expect(
      treatmentPhase({ treatmentCode: "x", label: "Extracción y colocación de implante" }),
    ).toBe("secondary");
  });
});

describe("splitPlanByPhase", () => {
  const items = [
    { id: "a", treatmentCode: "IMPLANT", label: "Implante", status: "PLANNED" },
    { id: "b", treatmentCode: "FILLING", label: "Obturación", status: "PLANNED" },
    { id: "c", treatmentCode: "ENDODONTICS", label: "Endodoncia", status: "CANCELLED" },
    { id: "d", treatmentCode: "EXTRACTION", label: "Exodoncia", status: "SUPERSEDED" },
    { id: "e", treatmentCode: "POST", label: "Perno", status: "COMPLETED" },
  ];

  it("groups the open items into the two phases, in plan order", () => {
    expect(splitPlanByPhase(items)).toEqual({ primary: [items[1]], secondary: [items[0]] });
  });

  it("returns empty phases for an empty plan", () => {
    expect(splitPlanByPhase([])).toEqual({ primary: [], secondary: [] });
  });
});
