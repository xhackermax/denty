import { describe, expect, it } from "vitest";

import { suggestedTradeoffs } from "../treatment-tradeoffs";

describe("suggestedTradeoffs", () => {
  it("suggests the usual pros and cons of an implant", () => {
    const result = suggestedTradeoffs([{ treatmentCode: "IMPLANT", label: "Implante" }]);
    expect(result.advantages).toContain("Reposición fija que no desgasta los dientes vecinos");
    expect(result.disadvantages).toContain("Requiere cirugía y unos meses de integración");
  });

  it("treats a crown on an implant as implant work, not as a natural tooth crown", () => {
    const result = suggestedTradeoffs([{ treatmentCode: "CROWN", label: "Corona sobre implante" }]);
    expect(result.disadvantages).not.toContain("Hay que tallar el diente");
  });

  it.each([
    ["BRIDGE", "Puente 35-37", "Hay que tallar los dientes vecinos"],
    ["DENTURE", "Prótesis removible", "Menos estable y cómoda que una opción fija"],
    ["ENDODONTICS", "Endodoncia", "Suele necesitar una corona después"],
    ["EXTRACTION", "Exodoncia", "Se pierde el diente y conviene reponerlo"],
  ])("%s · %s", (treatmentCode, label, disadvantage) => {
    expect(suggestedTradeoffs([{ treatmentCode, label }]).disadvantages).toContain(disadvantage);
  });

  it("merges several treatments without repeating lines", () => {
    const result = suggestedTradeoffs([
      { treatmentCode: "IMPLANT", label: "Implante 36" },
      { treatmentCode: "IMPLANT", label: "Implante 46" },
      { treatmentCode: "BONE_GRAFT", label: "Injerto óseo" },
    ]);
    expect(new Set(result.advantages).size).toBe(result.advantages.length);
    expect(result.disadvantages).toContain("Cirugía adicional y más tiempo de tratamiento");
  });

  it("suggests nothing for unknown or no treatments", () => {
    expect(suggestedTradeoffs([{ treatmentCode: "CONSULT", label: "Valoración" }])).toEqual({
      advantages: [],
      disadvantages: [],
    });
    expect(suggestedTradeoffs([])).toEqual({ advantages: [], disadvantages: [] });
  });
});
