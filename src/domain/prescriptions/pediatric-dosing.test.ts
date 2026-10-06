import { describe, expect, it } from "vitest";

import { calculatePediatricDose, pediatricLineFromDose } from "./pediatric-dosing";

describe("pautas pediatricas de receta", () => {
  it("calcula paracetamol 100 mg/ml a 15 mg/kg cada 6 horas", () => {
    const dose = calculatePediatricDose({
      medication: "Paracetamol",
      weightKg: 18,
      ageMonths: 72,
      heightCm: 110,
    });

    expect(dose).toMatchObject({
      medication: "Paracetamol",
      doseMg: 270,
      volumeMl: 2.7,
      frequency: "Cada 6 horas",
      maxDailyMg: 1080,
    });
    expect(pediatricLineFromDose(dose)).toMatchObject({
      activeIngredient: "Paracetamol",
      strength: "270 mg (2,7 ml de 100 mg/ml)",
      pharmaceuticalForm: "Solución oral",
      frequency: "Cada 6 horas",
      duration: "3 días",
    });
  });

  it("bloquea ibuprofeno si no llega a 3 meses o 5 kg", () => {
    const dose = calculatePediatricDose({
      medication: "Ibuprofeno",
      weightKg: 4.8,
      ageMonths: 4,
      heightCm: 62,
    });

    expect(dose.allowed).toBe(false);
    expect(dose.warning).toMatch(/3 meses.*5 kg/i);
  });

  it("calcula ibuprofeno 20 mg/ml a 10 mg/kg cada 8 horas", () => {
    const dose = calculatePediatricDose({
      medication: "Ibuprofeno",
      weightKg: 20,
      ageMonths: 84,
      heightCm: 118,
    });

    expect(dose).toMatchObject({
      medication: "Ibuprofeno",
      doseMg: 200,
      volumeMl: 10,
      frequency: "Cada 8 horas",
      maxDailyMg: 600,
    });
  });

  it("incluye aviso de IMC alto sin cambiar automaticamente la dosis", () => {
    const dose = calculatePediatricDose({
      medication: "Amoxicilina",
      weightKg: 52,
      ageMonths: 120,
      heightCm: 130,
    });

    expect(dose.doseMg).toBe(866.67);
    expect(dose.warning).toMatch(/IMC alto/i);
  });
});
