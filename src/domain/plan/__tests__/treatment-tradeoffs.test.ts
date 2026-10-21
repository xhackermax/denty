import { describe, expect, it } from "vitest";

import { suggestedTradeoffs, tradeoffEntriesFor } from "../treatment-tradeoffs";

const ids = (treatmentCode: string, label: string, tooth?: string) =>
  tradeoffEntriesFor({ treatmentCode, label, tooth }).map((entry) => entry.id);

describe("tradeoffEntriesFor", () => {
  it("maps the clinic implant code to the single implant rows", () => {
    expect(ids("IMPLANT", "Implante").slice(0, 2)).toEqual([
      "b.implante-unitario",
      "m.implante-unitario-corona",
    ]);
  });

  it("puts the multi-rooted root canal first on a molar and the single-rooted one elsewhere", () => {
    const molar = ids("ENDODONTICS", "Endodoncia", "36");
    const incisor = ids("ENDODONTICS", "Endodoncia", "11");
    expect(molar.indexOf("m.endodoncia-multirradicular")).toBeLessThan(
      molar.indexOf("m.endodoncia-unirradicular"),
    );
    expect(incisor.indexOf("m.endodoncia-unirradicular")).toBeLessThan(
      incisor.indexOf("m.endodoncia-multirradicular"),
    );
    expect(molar[0]).toBe("b.endodoncia-restauracion");
  });

  it("uses the pediatric rows for baby teeth", () => {
    expect(ids("ENDODONTICS", "Endodoncia", "75")).toEqual([
      "m.pulpotomia-temporal",
      "m.pulpectomia-temporal",
    ]);
    expect(ids("EXTRACTION", "Extracción simple", "84")[0]).toBe("b.extraccion-de-diente-temporal");
  });

  it("prefers a row named exactly like the treatment over the code", () => {
    expect(ids("MISC", "Ortodoncia con alineadores")[0]).toBe("m.ortodoncia-con-alineadores");
    expect(ids("FILLING", "Obturación de ionómero de vidrio")[0]).toBe(
      "m.obturacion-de-ionomero-de-vidrio",
    );
  });

  it("reads a crown on an implant as implant work", () => {
    expect(ids("CROWN", "Corona sobre implante")[0]).toMatch(/implant/);
  });

  it("matches word forms without accents (zirconio · zirconia)", () => {
    expect(ids("CUSTOM", "Corona de zirconio")).toContain("m.corona-de-zirconia");
  });

  it("caps the candidates and returns nothing for unknown treatments", () => {
    expect(ids("IMPLANT", "Implante").length).toBeLessThanOrEqual(6);
    expect(ids("CONSULT", "Valoración")).toEqual([]);
    expect(ids("", "")).toEqual([]);
  });
});

describe("suggestedTradeoffs", () => {
  it("uses the patient sentences of the best row", () => {
    const result = suggestedTradeoffs([{ treatmentCode: "IMPLANT", label: "Implante" }]);
    expect(result.advantages).toContain("No requiere tallar los dientes vecinos.");
    expect(result.disadvantages).toContain("Requiere cirugía y soporte óseo.");
  });

  it.each([
    ["BRIDGE", "Puente 35-37", "Puede requerir tallar dientes vecinos."],
    ["REMOVABLE", "Prótesis removible", "Se retira para higiene."],
    ["ENDODONTICS", "Endodoncia", "Necesita restauración adecuada y controles."],
    ["EXTRACTION", "Exodoncia", "La pérdida del diente es definitiva."],
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
    expect(result.disadvantages).toContain("Morbilidad mayor");
  });

  it("suggests nothing for unknown or no treatments", () => {
    expect(suggestedTradeoffs([{ treatmentCode: "CONSULT", label: "Valoración" }])).toEqual({
      advantages: [],
      disadvantages: [],
    });
    expect(suggestedTradeoffs([])).toEqual({ advantages: [], disadvantages: [] });
  });
});
