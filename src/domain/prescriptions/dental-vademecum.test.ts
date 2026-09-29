import { describe, expect, it } from "vitest";

import {
  DENTAL_MEDICATIONS,
  PRESCRIPTION_PROTOCOLS,
  emptyPrescriptionLine,
  findMedicationPreset,
  isCompleteLine,
  lineFromPreset,
} from "./dental-vademecum";

describe("vademécum dental", () => {
  it("elegir un medicamento rellena la línea completa", () => {
    const preset = findMedicationPreset("amoxicilina");
    expect(preset).toBeDefined();
    const line = lineFromPreset(preset!);
    expect(line).toMatchObject({
      activeIngredient: "Amoxicilina",
      strength: "750 mg",
      frequency: "Cada 8 horas",
      duration: "7 días",
    });
    expect(isCompleteLine(line)).toBe(true);
  });

  it("encuentra el medicamento sin importar tildes ni mayúsculas", () => {
    expect(findMedicationPreset("AMOXICILINA / ACIDO CLAVULANICO")?.strengths[0]).toBe(
      "875 mg / 125 mg",
    );
  });

  it("todas las pautas rápidas usan medicamentos del vademécum", () => {
    for (const protocol of PRESCRIPTION_PROTOCOLS) {
      for (const name of protocol.medications) expect(findMedicationPreset(name)).toBeDefined();
    }
  });

  it("cada medicamento trae una línea prescribible", () => {
    for (const medication of DENTAL_MEDICATIONS) {
      expect(isCompleteLine(lineFromPreset(medication))).toBe(true);
    }
    expect(isCompleteLine(emptyPrescriptionLine())).toBe(false);
  });
});
