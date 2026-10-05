import { describe, expect, it } from "vitest";

import { buildTreatmentPlanDocument } from "@/domain/plan/treatment-plan-document";

import { buildTreatmentPlanPrintHtml } from "../treatment-plan-print";

const document = buildTreatmentPlanDocument(
  [
    {
      id: "1",
      treatmentCode: "FILLING",
      label: "Obturación",
      tooth: "46",
      priceCents: 6000,
      status: "PLANNED",
    },
    {
      id: "2",
      treatmentCode: "IMPLANT",
      label: "Implante",
      tooth: "36",
      priceCents: 90000,
      status: "PLANNED",
    },
  ],
  { patientName: "Lucía <b>Martín</b>" },
);
const html = buildTreatmentPlanPrintHtml(document, {
  clinicName: "Clínica & Co",
  patientName: "Lucía <b>Martín</b>",
  recordNumber: "DNT-1",
  date: "05/10/2026",
});

describe("buildTreatmentPlanPrintHtml", () => {
  it("prints both phases with each step explained", () => {
    expect(html).toContain("Fase 1 · Recuperar la salud");
    expect(html).toContain("Fase 2 · Reponer y mejorar");
    expect(html).toContain("Empaste");
    expect(html).toContain("dientes 46");
    expect(html).toContain("Inconvenientes y riesgos");
    expect(html).toContain("Por qué en este orden.");
  });

  it("escapes names typed by people", () => {
    expect(html).not.toContain("<b>Martín</b>");
    expect(html).toContain("Lucía &lt;b&gt;Martín&lt;/b&gt;");
    expect(html).toContain("Clínica &amp; Co");
  });

  it("shows phase and plan totals", () => {
    expect(html).toMatch(/Total Fase 1: 60,00/);
    expect(html).toMatch(/Total del plan: 960,00/);
  });
});
