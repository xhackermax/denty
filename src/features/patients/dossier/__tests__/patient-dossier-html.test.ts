import { describe, expect, it } from "vitest";

import type { Appointment } from "@/shared/api";
import type { TreatmentComparisonRecord } from "@/shared/api/schemas/clinical-arguments";

import { buildPatientDossierHtml, type PatientDossierInput } from "../patient-dossier-html";

const appointment = (id: string, startsAt: string, status: Appointment["status"]): Appointment => ({
  id,
  clinicId: "c1",
  patientId: "p1",
  staffId: "s1",
  siteId: "site1",
  startsAt,
  endsAt: startsAt,
  status,
  title: "Revisión",
  reason: id === "a1" ? "Endodoncia 36" : null,
  version: 1,
  createdAt: startsAt,
  updatedAt: startsAt,
});

const comparison = (version: number, note: string): TreatmentComparisonRecord => ({
  id: `c${version}`,
  patientId: "p1",
  seriesId: "s1",
  version,
  decision: "ACCEPTED",
  chosenOptionId: "b1",
  decisionNote: note,
  catalogVersion: "1.0",
  professionalName: "Dra. Ruiz",
  createdBy: "u1",
  createdAt: `2026-10-0${version}T10:00:00Z`,
  content: {
    options: [
      {
        id: "b1",
        label: "Opción 1",
        title: "Salvar el diente",
        code: "P-1",
        totalCents: 84_000,
        treatments: [{ description: "Endodoncia", tooth: "36", totalCents: 34_000 }],
        advantages: [],
        disadvantages: [],
      },
    ],
    common: [],
    consequences: [],
  },
});

const input: PatientDossierInput = {
  clinicName: "Clínica & Co",
  date: "21/10/2026",
  patient: {
    name: "Lucía <b>Martín</b>",
    recordNumber: "H-12",
    dni: "1234Z",
    birthDate: "1990-05-04",
    phone: "600000000",
    email: null,
  },
  medicalAlerts: ["Alergia · Penicilina"],
  odontogram: [
    { id: "e1", tooth: "36", entityType: "CARIES", status: "caries", active: true },
    { id: "e2", tooth: "11", entityType: "RESTORATION", status: "crown", active: false },
    { id: "e3", tooth: "55", entityType: "MISSING", status: "missing", active: true },
  ],
  planItems: [
    {
      id: "i1",
      treatmentCode: "FILLING",
      label: "Obturación",
      tooth: "36",
      priceCents: 6000,
      status: "PLANNED",
    },
  ],
  comparisons: [comparison(1, "Primera versión"), comparison(2, "Versión vigente")],
  budgets: [
    {
      code: "P-2026-1",
      title: "Rehabilitación",
      status: "SIGNED",
      totalCents: 6000,
      createdAt: "2026-10-01T10:00:00Z",
      items: [{ description: "Obturación", tooth: "36", totalCents: 6000 }],
    },
  ],
  appointments: [
    appointment("a2", "2026-09-01T08:00:00Z", "COMPLETED"),
    appointment("a1", "2026-11-03T09:30:00Z", "CONFIRMED"),
  ],
  documents: [
    {
      title: "Consentimiento endodoncia",
      type: "CONSENT",
      status: "SIGNED",
      createdAt: "2026-10-02T10:00:00Z",
      signedAt: "2026-10-02T10:05:00Z",
      html: "<!doctype html><html><head><style>body { margin: 0; } h1 { font-size: 14pt; }</style></head><body><h1>Consentimiento endodoncia</h1></body></html>",
    },
    {
      title: "Radiografía.pdf",
      type: "CLINICAL_DOCUMENT",
      status: "FINAL",
      createdAt: "2026-10-03T10:00:00Z",
      html: null,
    },
  ],
};

describe("buildPatientDossierHtml", () => {
  const html = buildPatientDossierHtml(input);

  it("is titled after the patient, with escaped data", () => {
    expect(html).toContain("<title>Dossier de Lucía &lt;b&gt;Martín&lt;/b&gt;</title>");
    expect(html).not.toContain("<b>Martín</b>");
    expect(html).toContain("Clínica &amp; Co");
    expect(html).toContain("Ficha H-12 · DNI/NIE 1234Z · Nacimiento 04/05/1990");
    expect(html).toContain("Alergia · Penicilina");
  });

  it("lists every part in the index, each on its own page", () => {
    const parts = [
      "Odontograma",
      "Plan de tratamiento",
      "Comparación y decisión de tratamiento",
      "Presupuestos",
      "Citas",
      "Documentos",
    ];
    parts.forEach((title, index) => expect(html).toContain(`<td>${index + 1}. ${title}</td>`));
    expect(html.match(/<section class="part"/g)).toHaveLength(parts.length);
  });

  it("draws the odontogram grid with active findings only", () => {
    expect(html).toMatch(/<td class="marked"><b>36<\/b><small>[^<]+<\/small><\/td>/);
    expect(html).toContain('<td class=""><b>11</b></td>');
    expect(html).toContain("Dentición temporal");
    expect(html).toContain("Diente 36");
  });

  it("embeds the plan and only the latest version of each comparison", () => {
    expect(html).toContain("Obturación");
    expect(html).toContain("Versión vigente");
    expect(html).not.toContain("Primera versión");
    expect(html).toContain('<section class="dossier-part-1">');
  });

  it("prints budgets with their lines and total", () => {
    expect(html).toContain("Rehabilitación");
    expect(html).toContain("P-2026-1 · Firmado · 01/10/2026");
    expect(html).toContain("Diente 36 · Obturación");
  });

  it("prints the subtotal, applied discounts and early-payment offer of a budget", () => {
    const discounted = buildPatientDossierHtml({
      ...input,
      budgets: [
        {
          code: "P-2026-2",
          status: "DRAFT",
          subtotalCents: 100_000,
          totalCents: 90_000,
          discountLabel: "Familiar",
          discountPercent: 10,
          discountAmountCents: 0,
          earlyPaymentPercent: 5,
          earlyPaymentApplied: false,
          items: [{ description: "Implante", totalCents: 100_000 }],
        },
      ],
    });
    const amounts = (text: string) => text.replace(/\u00a0/g, " ");
    expect(amounts(discounted)).toContain("<td>Subtotal</td><td class=\"amount\">1000,00 €</td>");
    expect(amounts(discounted)).toContain("Descuento (Familiar · 10 %)</td><td class=\"amount\">-100,00 €");
    expect(amounts(discounted)).toContain("<td>Total</td><td class=\"amount\">900,00 €</td>");
    expect(amounts(discounted)).toContain("Con pronto pago (−5 %)</td><td class=\"amount\">855,00 €");
  });

  it("lists appointments newest first with their status", () => {
    const upcoming = html.indexOf("Endodoncia 36");
    const past = html.indexOf("01/09/2026");
    expect(upcoming).toBeGreaterThan(-1);
    expect(past).toBeGreaterThan(upcoming);
    expect(html).toContain("Confirmada");
    expect(html).toContain("Finalizada");
  });

  it("includes printable documents and flags uploaded files it cannot include", () => {
    expect(html).toContain("<h1>Consentimiento endodoncia</h1>");
    expect(html).toContain("Firmado · 02/10/2026");
    expect(html).toContain("Radiografía.pdf");
    expect(html).toContain("(archivo adjunto, no incluido)");
    expect(html).toContain("2 documentos · 1 incluido");
  });

  it("says so when a part is empty", () => {
    const blank = buildPatientDossierHtml({
      ...input,
      medicalAlerts: [],
      odontogram: [],
      planItems: [],
      comparisons: [],
      budgets: [],
      appointments: [],
      documents: [],
    });
    expect(blank).toContain("No hay tratamientos pendientes en el plan.");
    expect(blank).toContain("Todavía no se ha guardado ninguna comparación.");
    expect(blank).toContain("El paciente no tiene presupuestos.");
    expect(blank).toContain("El paciente no tiene citas registradas.");
    expect(blank).toContain("El paciente no tiene documentos.");
    expect(blank).not.toContain("Alertas clínicas");
    expect(blank).not.toContain("Dentición temporal");
  });
});
