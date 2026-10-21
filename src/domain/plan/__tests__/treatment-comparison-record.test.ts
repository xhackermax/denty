import { describe, expect, test } from "vitest";

import {
  buildComparisonContent,
  comparisonConsequences,
  decisionSummary,
  textPhrases,
  validateComparisonDecision,
  type ComparisonBudget,
} from "../treatment-comparison-record";

const endo: ComparisonBudget = {
  id: "budget-endo",
  code: "P-1",
  title: "Salvar el diente",
  totalCents: 90_000,
  advantages: "• Conserva tu diente natural.\n• Evita dejar un espacio.",
  disadvantages: "- Puede reinfectarse.\n\n",
  items: [
    { key: "plan:hyg", description: "Limpieza dental", tooth: null, totalCents: 6_000 },
    { key: "plan:endo", description: "Endodoncia", tooth: "36", totalCents: 34_000 },
    { key: "plan:crown", description: "Corona de zirconio", tooth: "36", totalCents: 50_000 },
  ],
};
const implant: ComparisonBudget = {
  id: "budget-implant",
  code: "P-2",
  title: null,
  totalCents: 160_000,
  advantages: null,
  disadvantages: "",
  items: [
    { key: "plan:hyg", description: "Limpieza dental", tooth: null, totalCents: 6_000 },
    { key: "proc:ext", description: "Extracción", tooth: "36", totalCents: 9_000 },
    { key: "proc:imp", description: "Implante", tooth: "36", totalCents: 145_000 },
  ],
};

describe("textPhrases", () => {
  test("convierte el texto de la rama en frases sin viñetas ni líneas vacías", () => {
    expect(textPhrases(endo.advantages)).toEqual([
      "Conserva tu diente natural.",
      "Evita dejar un espacio.",
    ]);
    expect(textPhrases(endo.disadvantages)).toEqual(["Puede reinfectarse."]);
    expect(textPhrases(null)).toEqual([]);
  });
});

describe("buildComparisonContent", () => {
  test("guarda opciones con su coste, lo común una sola vez y las consecuencias elegidas", () => {
    const content = buildComparisonContent([endo, implant], new Set(["plan:hyg"]), [
      { id: "C02", decision: "Extraer y dejar el espacio", consequence: "Movimiento dentario" },
    ]);
    expect(content.common).toEqual([
      { description: "Limpieza dental", tooth: null, totalCents: 6_000 },
    ]);
    expect(content.options).toEqual([
      {
        id: "budget-endo",
        label: "Opción 1",
        title: "Salvar el diente",
        code: "P-1",
        totalCents: 90_000,
        treatments: [
          { description: "Endodoncia", tooth: "36", totalCents: 34_000 },
          { description: "Corona de zirconio", tooth: "36", totalCents: 50_000 },
        ],
        advantages: ["Conserva tu diente natural.", "Evita dejar un espacio."],
        disadvantages: ["Puede reinfectarse."],
        implications: expect.objectContaining({ procedures: 3, surgery: false }),
      },
      expect.objectContaining({
        id: "budget-implant",
        label: "Opción 2",
        title: "P-2",
        implications: expect.objectContaining({ surgery: true, irreversible: true }),
      }),
    ]);
    expect(content.consequences).toHaveLength(1);
  });
});

describe("comparisonConsequences", () => {
  test("propone solo las consecuencias pertinentes a los tratamientos comparados", () => {
    const ids = comparisonConsequences([endo, implant]).map((item) => item.id);
    expect(ids).toEqual(expect.arrayContaining(["C01", "C02", "C03", "C10"]));
    expect(ids).not.toContain("C04");
  });

  test("sin tratamientos reconocibles no inventa consecuencias", () => {
    expect(
      comparisonConsequences([
        {
          ...implant,
          items: [{ key: "x", description: "Informe para la mutua", tooth: null, totalCents: 0 }],
        },
      ]),
    ).toEqual([]);
  });
});

describe("validateComparisonDecision", () => {
  const options = ["budget-endo", "budget-implant"];
  test("aceptar exige elegir una de las opciones comparadas", () => {
    expect(
      validateComparisonDecision({ decision: "ACCEPTED", chosenOptionId: null }, options),
    ).toBe("Elige la opción que acepta el paciente.");
    expect(
      validateComparisonDecision({ decision: "ACCEPTED", chosenOptionId: "otro" }, options),
    ).toBe("Elige la opción que acepta el paciente.");
    expect(
      validateComparisonDecision({ decision: "ACCEPTED", chosenOptionId: "budget-endo" }, options),
    ).toBeNull();
  });

  test("las demás decisiones no llevan opción elegida", () => {
    expect(
      validateComparisonDecision({ decision: "POSTPONED", chosenOptionId: "budget-endo" }, options),
    ).toBe("Solo se elige una opción cuando el paciente acepta.");
    expect(
      validateComparisonDecision({ decision: "NO_TREATMENT", chosenOptionId: null }, options),
    ).toBeNull();
  });
});

describe("decisionSummary", () => {
  const content = buildComparisonContent([endo, implant], new Set(["plan:hyg"]), []);
  test("nombra la opción aceptada", () => {
    expect(decisionSummary({ decision: "ACCEPTED", chosenOptionId: "budget-endo" }, content)).toBe(
      "Acepta la Opción 1 · Salvar el diente",
    );
  });
  test("describe el resto de decisiones", () => {
    expect(decisionSummary({ decision: "POSTPONED", chosenOptionId: null }, content)).toBe(
      "Aplaza el tratamiento",
    );
    expect(decisionSummary({ decision: "ACCEPTED", chosenOptionId: "x" }, content)).toBe(
      "Acepta una opción",
    );
  });
});
