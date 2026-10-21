import { describe, expect, it } from "vitest";

import { comparePlanAlternatives } from "../plan-alternatives-comparison";

const planA = [
  { id: "p1", treatmentCode: "PERIODONTICS", label: "Raspado", tooth: null },
  { id: "p2", treatmentCode: "EXTRACTION", label: "Exodoncia", tooth: "36" },
  { id: "p3", treatmentCode: "IMPLANT", label: "Implante", tooth: "36" },
];

describe("comparePlanAlternatives", () => {
  it("treats the whole plan as common when there are no alternatives", () => {
    const result = comparePlanAlternatives(planA, []);
    expect(result.columns.map((column) => column.letter)).toEqual(["A"]);
    expect(result.common.map((item) => item.label)).toEqual(["Raspado", "Exodoncia", "Implante"]);
    expect(result.alternatives).toEqual([]);
  });

  it("separates shared steps from what each alternative changes", () => {
    const result = comparePlanAlternatives(planA, [
      {
        id: "b1",
        title: "Puente",
        advantages: "Sin cirugía de implante",
        disadvantages: "Talla dientes vecinos",
        items: [
          { id: "i1", clinicalPlanItemId: "p1", description: "Raspado", tooth: null },
          { id: "i2", clinicalPlanItemId: "p2", description: "Exodoncia", tooth: "36" },
          { id: "i3", clinicalPlanItemId: null, description: "Puente 35-37", tooth: "35" },
        ],
      },
    ]);

    expect(result.columns.map((column) => `${column.letter}:${column.title}`)).toEqual([
      "A:Plan completo",
      "B:Puente",
    ]);
    expect(result.columns[1]?.treatments.map((item) => item.treatmentCode)).toEqual([
      "PERIODONTICS",
      "EXTRACTION",
      "",
    ]);
    expect(result.common.map((item) => item.label)).toEqual(["Raspado", "Exodoncia"]);
    expect(result.alternatives).toEqual([
      {
        letter: "A",
        title: "Plan completo",
        exclusive: [expect.objectContaining({ label: "Implante", tooth: "36" })],
        advantages: null,
        disadvantages: null,
        suggestedAdvantages: expect.arrayContaining(["No requiere tallar los dientes vecinos."]),
        suggestedDisadvantages: expect.arrayContaining(["Requiere cirugía y soporte óseo."]),
      },
      {
        letter: "B",
        title: "Puente",
        exclusive: [expect.objectContaining({ label: "Puente 35-37", tooth: "35" })],
        advantages: "Sin cirugía de implante",
        disadvantages: "Talla dientes vecinos",
        suggestedAdvantages: expect.arrayContaining([
          "Repone el diente de forma fija y sin cirugía implantaria.",
        ]),
        suggestedDisadvantages: expect.arrayContaining(["Puede requerir tallar dientes vecinos."]),
      },
    ]);
  });

  it("matches alternative items without plan link by tooth and name", () => {
    const result = comparePlanAlternatives(planA, [
      {
        id: "b1",
        title: null,
        advantages: null,
        disadvantages: null,
        items: [{ id: "i1", clinicalPlanItemId: null, description: "raspado", tooth: null }],
      },
    ]);
    expect(result.columns[1]?.title).toBe("Alternativa");
    expect(result.common.map((item) => item.label)).toEqual(["Raspado"]);
  });

  it("lists the teeth each plan treats", () => {
    const result = comparePlanAlternatives(planA, []);
    expect(result.columns[0]?.teeth).toEqual(["36"]);
  });
});
