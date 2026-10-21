import { describe, expect, test } from "vitest";

import { implicationLines, optionImplications } from "../tradeoff-implications";

const item = (label: string, tooth: string | null = "36") => ({
  treatmentCode: "",
  label,
  tooth,
});

describe("optionImplications", () => {
  test("extracción e implante: cirugía, paso irreversible y mantenimiento del implante", () => {
    expect(optionImplications([item("Extracción"), item("Implante")])).toEqual({
      procedures: 2,
      surgery: true,
      irreversible: true,
      maintenance: ["Programa de higiene y revisiones"],
    });
  });

  test("endodoncia y corona: sin cirugía, con tallado irreversible de la corona", () => {
    const result = optionImplications([item("Endodoncia"), item("Corona completa")]);
    expect(result.surgery).toBe(false);
    expect(result.irreversible).toBe(true);
    expect(result.maintenance).toEqual([]);
  });

  test("férula y periodoncia: reversible, sin cirugía y con sus controles", () => {
    const result = optionImplications([
      item("Férula de estabilización", null),
      item("Raspado y alisado radicular", null),
    ]);
    expect(result).toMatchObject({ surgery: false, irreversible: false });
    expect(result.maintenance).toEqual([
      "Calendario de mantenimiento periodontal",
      "Programar revisión de adaptación y contactos",
    ]);
  });

  test("sin tratamientos reconocibles no afirma nada", () => {
    expect(optionImplications([item("Informe para la mutua", null)])).toEqual({
      procedures: 1,
      surgery: false,
      irreversible: false,
      maintenance: [],
    });
  });
});

describe("implicationLines", () => {
  test("enumera solo lo que el catálogo respalda", () => {
    expect(
      implicationLines({
        procedures: 2,
        surgery: true,
        irreversible: true,
        maintenance: ["Programa de higiene y revisiones"],
      }),
    ).toEqual([
      "2 procedimientos",
      "Incluye cirugía",
      "Incluye pasos irreversibles",
      "Mantenimiento: programa de higiene y revisiones",
    ]);
    expect(
      implicationLines({ procedures: 1, surgery: false, irreversible: false, maintenance: [] }),
    ).toEqual(["1 procedimiento"]);
  });
});
