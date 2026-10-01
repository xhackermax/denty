import { describe, expect, it } from "vitest";
import { AGENDA_TREATMENT_OPTIONS, agendaTreatmentOptions } from "../agenda/treatment-options";
import { clinicalGlyphFor } from "../agenda/clinical-glyph";
describe("complete agenda treatment suggestions", () => {
  it.each(AGENDA_TREATMENT_OPTIONS)("represents $label", ({ label, family }) => {
    expect(clinicalGlyphFor({ label })?.family).toBe(family);
  });
  it("merges active catalog entries without duplicates and preserves custom treatments", () => {
    const result = agendaTreatmentOptions([
      { name: "REVISIÓN", active: true },
      { name: "Tratamiento propio", active: true },
      { name: "Desactivado", active: false },
    ]);
    expect(result.filter((name) => /revisi[oó]n$/i.test(name))).toEqual(["REVISIÓN"]);
    expect(result).toContain("Tratamiento propio");
    expect(result).not.toContain("Desactivado");
  });
  it.each([
    ["CHECKUP", "review"],
    ["PROSTHESIS", "fixed_prosthesis"],
    ["POST", "endodontics"],
  ])("recognizes catalog code %s", (treatmentCode, family) => {
    expect(clinicalGlyphFor({ treatmentCode, label: "Tratamiento del catálogo" })?.family).toBe(
      family,
    );
  });
});
