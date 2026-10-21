import { describe, expect, test } from "vitest";

import type { TreatmentComparisonRecord } from "@/shared/api/schemas/clinical-arguments";
import { buildTreatmentComparisonPrintHtml } from "../treatment-comparison-print";

const record: TreatmentComparisonRecord = {
  id: "c1",
  patientId: "p1",
  seriesId: "s1",
  version: 2,
  decision: "ACCEPTED",
  chosenOptionId: "b1",
  decisionNote: "Prefiere conservar el diente <siempre>.",
  catalogVersion: "1.0",
  professionalName: "Dra. Ruiz · Col. 2812",
  createdBy: "u1",
  createdAt: "2026-10-21T10:00:00Z",
  content: {
    options: [
      {
        id: "b1",
        label: "Opción 1",
        title: "Salvar el diente",
        code: "P-1",
        totalCents: 84_000,
        treatments: [{ description: "Endodoncia", tooth: "36", totalCents: 34_000 }],
        advantages: ["Conserva tu diente natural."],
        disadvantages: ["Puede producirse una reinfección."],
      },
      {
        id: "b2",
        label: "Opción 2",
        title: "Extraer y poner implante",
        code: "P-2",
        totalCents: 160_000,
        treatments: [{ description: "Implante", tooth: "36", totalCents: 145_000 }],
        advantages: [],
        disadvantages: [],
      },
    ],
    common: [{ description: "Limpieza dental", tooth: null, totalCents: 6_000 }],
    consequences: [
      {
        id: "C10",
        decision: "Posponer el tratamiento de una infección activa",
        consequence: "Persistencia o extensión de infección",
      },
    ],
  },
};

const context = {
  clinicName: "Clínica Sonrisa",
  patientName: "Ana López",
  recordNumber: "H-12",
  date: "21/10/2026",
};

describe("buildTreatmentComparisonPrintHtml", () => {
  const html = buildTreatmentComparisonPrintHtml(record, context);

  test("incluye fecha, profesional, paciente y versión del contenido", () => {
    expect(html).toContain("Clínica Sonrisa");
    expect(html).toContain("Ana López");
    expect(html).toContain("Ficha H-12");
    expect(html).toContain("21/10/2026");
    expect(html).toContain("Dra. Ruiz · Col. 2812");
    expect(html).toContain("Versión 2 de esta comparación");
    expect(html).toContain("catálogo clínico v1.0");
  });

  test("muestra cada alternativa con su coste, ventajas y desventajas, y lo común una vez", () => {
    expect(html).toContain("Opción 1 · Salvar el diente");
    expect(html).toContain("Opción 2 · Extraer y poner implante");
    expect(html).toContain("Conserva tu diente natural.");
    expect(html).toContain("Puede producirse una reinfección.");
    expect(html).toMatch(/840,00\s€/);
    expect(html.match(/Limpieza dental/g)).toHaveLength(1);
    expect(html).toContain("Diente 36 · Endodoncia");
  });

  test("recoge la decisión, la nota y las consecuencias explicadas", () => {
    expect(html).toContain("Acepta la Opción 1 · Salvar el diente");
    expect(html).toContain("Prefiere conservar el diente &lt;siempre&gt;.");
    expect(html).toContain("Posponer el tratamiento de una infección activa");
  });

  test("sin consecuencias ni nota no imprime secciones vacías", () => {
    const plain = buildTreatmentComparisonPrintHtml(
      {
        ...record,
        decision: "POSTPONED",
        chosenOptionId: null,
        decisionNote: "",
        content: { ...record.content, consequences: [], common: [] },
      },
      { ...context, recordNumber: null },
    );
    expect(plain).toContain("Aplaza el tratamiento");
    expect(plain).not.toContain("Si se pospone");
    expect(plain).not.toContain("Tratamientos comunes");
    expect(plain).not.toContain("Ficha");
    expect(plain).not.toContain("Sin ventajas");
  });
});
