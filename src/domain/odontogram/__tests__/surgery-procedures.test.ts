import { expect, test } from "vitest";
import { createSurgeryEntity, SURGERY_PROCEDURES } from "../surgery-procedures";
import { clinicalGlyphFor } from "@/domain/agenda/clinical-glyph";
import type { DentalEntity } from "@/domain";
const implant: DentalEntity = {
  id: "implant16",
  tooth: "16",
  entityType: "IMPLANT",
  status: "implant_planned",
  active: true,
};
test.each(["gingivectomy", "bone_regularization", "titanium_mesh"])(
  "creates %s without losing tooth or lifecycle",
  (procedure) => {
    const entity = createSurgeryEntity(procedure, "16", "REALIZADO", [], "upper");
    expect(entity.tooth).toBe("16");
    expect(entity.attributes?.lifecycle).toBe("REALIZADO");
    expect(entity.entityType).toBe(procedure === "titanium_mesh" ? "MEMBRANE" : "SURGERY");
  },
);
test("guided splint belongs to an arch, linked only to its planned implants", () => {
  const e = createSurgeryEntity(
    "guided_surgery_splint",
    "16",
    "PLANIFICADO",
    [implant, { ...implant, id: "lower", tooth: "46" }],
    "upper",
  );
  expect(e.arch).toBe("upper");
  expect(e.tooth).toBeUndefined();
  expect(e.attributes?.linkedImplantIds).toEqual(["implant16"]);
});
test("rejects an arch without planned implants", () => {
  expect(() =>
    createSurgeryEntity("guided_surgery_splint", "16", "PLANIFICADO", [implant], "lower"),
  ).toThrow(/implantes/);
});
test("keeps alveoloplasty and distinguishes splint glyphs", () => {
  expect(SURGERY_PROCEDURES.some((p) => p.value === "alveoloplasty")).toBe(true);
  expect(clinicalGlyphFor({ label: "Férula quirúrgica guiada" })?.family).toBe("surgery");
  expect(clinicalGlyphFor({ label: "Férula de descarga" })?.family).toBe("occlusal_splint");
});

test("separates bone graft from ROG, keeps stable historical codes and adds soft tissue procedures", () => {
  const labels = Object.fromEntries(SURGERY_PROCEDURES.map(({ value, label }) => [value, label]));
  expect(labels.bone_graft).toBe("Injerto óseo");
  expect(labels.rog).toBe("Regeneración ósea guiada (ROG)");
  expect(labels.sinus_lift_internal).toBe("Elevación de seno interna");
  expect(labels.extraction_surgical).toBe("Exodoncia compleja / 3er molar");
  expect(labels.connective_tissue_graft).toBe("Injerto de tejido conectivo");
  expect(labels.pinhole_technique).toBe("Pinhole technique");
  expect(labels.coronectomy).toBe("Coronectomía");
  const rog = createSurgeryEntity("rog", "16", "PLANIFICADO", [], "upper");
  expect(rog.entityType).toBe("BONE_GRAFT");
  expect(rog.status).toBe("rog");
  const extraction = createSurgeryEntity("extraction_surgical", "18", "PLANIFICADO", [], "upper");
  expect(extraction.attributes?.impacted).toBeUndefined();
  expect(extraction.attributes?.complex).toBe(true);
});
