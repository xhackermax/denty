import { describe, expect, it } from "vitest";
import {
  addDependency,
  budgetCategoryForTreatment,
  clinicalPhaseForTreatment,
  changePlanItemPhase,
  changePlanItemPriority,
  friendlyAlternativeLabel,
  orderedPlan,
  removeDependency,
  suggestKennedyClass,
  validateGraph,
  type TreatmentPlanGraph,
} from "../plan";

const graph: TreatmentPlanGraph = {
  items: [
    {
      id: "crown",
      treatmentCode: "crown",
      label: "Corona 36",
      phase: 5,
      priority: 70,
      status: "PLANNED",
    },
    {
      id: "endo",
      treatmentCode: "endo",
      label: "Endodoncia 36",
      phase: 1,
      priority: 90,
      status: "PLANNED",
    },
  ],
  dependencies: [{ itemId: "crown", dependsOnId: "endo", reason: "Endodoncia previa" }],
};

describe("treatment plan domain", () => {
  it("ordena por dependencias, fase y prioridad", () => {
    expect(orderedPlan(graph).map((item) => item.id)).toEqual(["endo", "crown"]);
  });

  it("impide ciclos y dependencias sin motivo", () => {
    expect(() =>
      addDependency(graph, { itemId: "endo", dependsOnId: "crown", reason: "Ciclo" }),
    ).toThrow(/circular/);
    expect(() =>
      validateGraph({
        ...graph,
        dependencies: [{ itemId: "crown", dependsOnId: "endo", reason: "" }],
      }),
    ).toThrow(/motivo/);
  });

  it("porta las categorías históricas de presupuesto", () => {
    expect(budgetCategoryForTreatment({ treatmentCode: "implant", label: "Implante 36" })).toBe(
      "Cirugía e implantes",
    );
    expect(
      budgetCategoryForTreatment({ treatmentCode: "crown", label: "Corona" }),
    ).toBe("Prótesis");
    expect(budgetCategoryForTreatment({ treatmentCode: "aligner", label: "Alineadores" })).toBe(
      "Ortodoncia",
    );
    expect(budgetCategoryForTreatment({ treatmentCode: "endo", label: "Endodoncia" })).toBe(
      "Terapia básica",
    );
  });

  it("recupera la fase clínica histórica sin convertirla en lógica de UI", () => {
    expect(clinicalPhaseForTreatment({ treatmentCode: "endo", clinicalReason: "Dolor" })).toBe(1);
    expect(clinicalPhaseForTreatment({ treatmentCode: "raspado" })).toBe(2);
    expect(clinicalPhaseForTreatment({ treatmentCode: "caries_restoration" })).toBe(3);
    expect(clinicalPhaseForTreatment({ treatmentCode: "missing_tooth" })).toBe(4);
    expect(clinicalPhaseForTreatment({ treatmentCode: "crown" })).toBe(5);
  });

  it("exige motivo también al quitar una dependencia", () => {
    expect(() => removeDependency(graph, "crown", "endo", " ")).toThrow(/motivo clínico/);
    expect(
      removeDependency(graph, "crown", "endo", "Endodoncia ya completada").dependencies,
    ).toEqual([]);
  });

  it("sugiere Kennedy de forma conservadora y exige revisión profesional después", () => {
    expect(suggestKennedyClass(["18", "17", "28", "27"])).toBe("I");
    expect(suggestKennedyClass(["18", "17"])).toBe("II");
    expect(suggestKennedyClass(["14", "15"])).toBe("III");
    expect(suggestKennedyClass(["13", "12", "11", "21", "22", "23"])).toBe("IV");
    expect(suggestKennedyClass(["18", "38"])).toBe("UNCLASSIFIED");
  });

});

describe("plan history recovery rules", () => {
  it("requires a clinical reason for manual phase and priority changes", () => {
    const item = graph.items[0];
    if (!item) throw new Error("Fixture vacía");
    expect(() => changePlanItemPhase(item, 2, " ")).toThrow(/motivo clínico/);
    expect(changePlanItemPhase(item, 2, "Control de infección primero").item.phase).toBe(2);
    expect(() => changePlanItemPriority(item, 101, "Motivo")).toThrow(/0 y 100/);
  });

  it("uses patient-friendly alternative labels", () => {
    expect(friendlyAlternativeLabel("bridge")).toBe("Reponer con puente");
    expect(friendlyAlternativeLabel("removable")).toBe("Prótesis removible");
    expect(friendlyAlternativeLabel("implant replacement")).toBe("Sustituir el diente");
  });
});
