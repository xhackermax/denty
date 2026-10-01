import { describe, expect, it } from "vitest";
import { clinicalGlyphFor, agendaClinicalGlyphs } from "../agenda/clinical-glyph";

describe("biblioteca clínica de agenda", () => {
  it.each([
    ["Profilaxis", "periodontal_hygiene"],
    ["Raspado Q1-Q4", "periodontal_hygiene"],
    ["Mantenimiento periodontal", "periodontal_hygiene"],
    ["Extracción 28", "extraction"],
    ["Cirugía 48 incluido", "surgery"],
    ["Exodoncia quirúrgica 48", "surgery"],
    ["Puente 14-16", "fixed_prosthesis"],
    ["Prótesis removible superior", "removable_prosthesis"],
    ["Prótesis total inferior", "complete_denture"],
    ["Ortodoncia inferior", "orthodontics"],
    ["Férula de descarga", "occlusal_splint"],
    ["Blanqueamiento", "whitening"],
    ["CBCT", "imaging"],
    ["Primera visita", "diagnostic"],
    ["Pulpotomía 75", "endodontics"],
    ["Corona pediátrica 55", "crown"],
    ["Carilla 11", "indirect_restoration"],
    ["Sellador 16", "sealant"],
  ])("%s usa la familia %s", (label, family) => {
    expect(clinicalGlyphFor({ label })?.family).toBe(family);
  });

  it("el código clínico tiene prioridad sobre el motivo de la cita", () => {
    expect(
      clinicalGlyphFor({ treatmentCode: "IMPLANT", label: "Revisión de corona", tooth: "46" }),
    ).toMatchObject({ family: "implantology", location: "46" });
  });
  it("una restauración insatisfactoria conserva las superficies y el estado de rehacer", () => {
    expect(
      clinicalGlyphFor({
        tooth: "26",
        treatmentCode: "FILLING",
        surfaces: ["M", "O", "D"],
        clinicalStatus: "restoration_unsatisfactory",
      }),
    ).toMatchObject({ state: "filling_bad", clinicalState: "redo", surfaces: ["M", "O", "D"] });
  });
  it("interpreta las superficies MOD del texto solo cuando no hay superficies estructuradas", () => {
    expect(clinicalGlyphFor({ label: "Caries MOD del 26" })?.surfaces).toEqual(["M", "O", "D"]);
    expect(clinicalGlyphFor({ label: "Caries MOD del 26", surfaces: ["D"] })?.surfaces).toEqual([
      "D",
    ]);
  });
  it("localiza rangos y cuadrantes sin usar SUP/INF para otros tratamientos", () => {
    expect(clinicalGlyphFor({ label: "Puente 14-16" })?.location).toBe("14–16");
    expect(clinicalGlyphFor({ label: "Raspado Q1-Q4" })?.location).toBe("Q1–Q4");
    expect(clinicalGlyphFor({ label: "Ortodoncia inferior" })?.location).toBe("INF");
    expect(clinicalGlyphFor({ label: "Implante superior" })?.location).toBeNull();
    expect(clinicalGlyphFor({ label: "Revisión 12 meses" })?.location).toBeNull();
  });
  it("respeta la pieza estructurada frente a otra pieza mencionada en las notas", () => {
    expect(
      clinicalGlyphFor({ treatmentCode: "CROWN", tooth: "11", label: "Corona 16" })?.location,
    ).toBe("11");
  });
  it("no oculta una revisión pendiente solo porque el implante de origen ya existe", () => {
    expect(
      clinicalGlyphFor({
        treatmentCode: "IMPLANT",
        tooth: "46",
        label: "Control implantológico",
        clinicalStatus: "implant",
      }),
    ).toMatchObject({ family: "implantology", clinicalState: "pending" });
  });
  it("un implante insatisfactorio conserva su estado existente", () => {
    expect(
      clinicalGlyphFor({
        treatmentCode: "IMPLANT",
        tooth: "46",
        label: "Implante 46",
        clinicalStatus: "implant_review",
      }),
    ).toMatchObject({ state: "implant_review", clinicalState: "redo" });
  });
  it("respeta un rango explícito del plan aunque la etiqueta no lo repita", () => {
    expect(
      clinicalGlyphFor({ treatmentCode: "BRIDGE", tooth: "14-16", label: "Puente" })?.location,
    ).toBe("14–16");
  });
  it("no convierte un trabajo terminado en un símbolo pendiente", () => {
    expect(clinicalGlyphFor({ label: "Obturación 16", completed: true })).toBeNull();
    expect(clinicalGlyphFor({ label: "Corona 16", planStatus: "COMPLETED" })).toBeNull();
  });
  it("separa tratamientos explícitos y conserva todos para el detalle", () => {
    const glyphs = agendaClinicalGlyphs({
      label: "Implante 46; Corona 11; Raspado Q1; Extracción 28",
    });
    expect(glyphs.map((glyph) => glyph.family)).toEqual([
      "implantology",
      "crown",
      "periodontal_hygiene",
      "extraction",
    ]);
  });
  it("no deduce tratamientos extra de las notas cuando hay un plan vinculado", () => {
    expect(
      agendaClinicalGlyphs({
        treatmentCode: "IMPLANT",
        tooth: "46",
        label: "Implante; comentar corona 11",
      }),
    ).toHaveLength(1);
  });
  it("no inventa tratamiento ni superficie a partir de notas administrativas", () => {
    expect(agendaClinicalGlyphs({ label: "Llamar al paciente a las 16" })).toEqual([]);
  });
});
