import { describe, expect, it } from "vitest";

import { certificateData } from "@/features/parity/modules/documents-module";

import { buildDocumentPrintHtml } from "./document-print";
import { longDate, parseTemplate } from "./template-render";

describe("parseTemplate", () => {
  it("splits headings, lists and paragraphs and fills placeholders", () => {
    const blocks = parseTemplate(
      "D./Dña. {{paciente}}\ncon DNI {{dni}}.\n\n## Riesgos\n- Dolor\n- Inflamación\n\nFin {{desconocido}}",
      { paciente: "Ana Ruiz", dni: "1234" },
    );
    expect(blocks).toEqual([
      { kind: "paragraph", text: "D./Dña. Ana Ruiz con DNI 1234." },
      { kind: "heading", text: "Riesgos" },
      { kind: "list", items: ["Dolor", "Inflamación"] },
      { kind: "paragraph", text: "Fin" },
    ]);
  });

  it("writes long Spanish dates", () => {
    expect(longDate("2026-09-29")).toBe("29 de septiembre de 2026");
  });
});

describe("buildDocumentPrintHtml", () => {
  const base = {
    clinicName: "Clínica <Denty>",
    title: "Consentimiento",
    body: "## Texto\nHola {{paciente}}",
    values: { paciente: "Ana & Luis" },
    date: "2026-09-29",
    patient: { name: "Ana & Luis" },
    doctor: { name: "Dra. Pérez", collegiateNumber: "28001234" },
  };

  it("escapes values and shows the professional's collegiate number", () => {
    const html = buildDocumentPrintHtml({ ...base, kind: "consent" });
    expect(html).toContain("Clínica &lt;Denty&gt;");
    expect(html).toContain("Hola Ana &amp; Luis");
    expect(html).toContain("28001234");
    expect(html).not.toContain("<Denty>");
  });

  it("prints a signed debt statement with image and without clinical revocation", () => {
    const html = buildDocumentPrintHtml({
      ...base,
      kind: "debt",
      title: "Reconocimiento de deuda",
      body: "D./Dña. {{paciente}} reconoce deuda de {{importe_deuda}} euros a {{acreedor}}.",
      values: {
        paciente: "Ana Ruiz",
        importe_deuda: "350,00",
        acreedor: "Centro Dental Funcional S.L.",
      },
      patient: { name: "Ana Ruiz", dni: "12345678Z" },
      signed: { signerName: "Ana Ruiz", signedAt: "2026-10-10T10:00:00Z" },
      signatureImageDataUrl: "data:image/png;base64,aGVsbG8=",
    });
    expect(html).toContain("350,00 euros");
    expect(html).toContain("12345678Z");
    expect(html).toContain("Firma electrónica simple");
    expect(html).toContain("data:image/png;base64,aGVsbG8=");
    expect(html).not.toContain("<h2>Revocación</h2>");
  });

  it("prints a privacy receipt signature without pretending to collect consent for care", () => {
    const html = buildDocumentPrintHtml({
      ...base,
      kind: "privacy",
      title: "Información de protección de datos",
      body: "Se informa a {{paciente}} del tratamiento de sus datos por {{acreedor}}.",
      values: { paciente: "Ana Ruiz", acreedor: "Clínica Sanitaria S.L." },
      patient: { name: "Ana Ruiz", dni: "12345678Z" },
      signed: { signerName: "Ana Ruiz", signedAt: "2026-10-10T10:00:00Z" },
      signatureImageDataUrl: "data:image/png;base64,aGVsbG8=",
    });
    expect(html).toContain("Firma de recepción de información");
    expect(html).toContain("Clínica Sanitaria S.L.");
    expect(html).toContain("data:image/png;base64,aGVsbG8=");
    expect(html).not.toContain("<h2>Revocación</h2>");
    expect(html).not.toContain("Paciente/deudor");
  });

  it("states the electronic signature when the document is signed", () => {
    const html = buildDocumentPrintHtml({
      ...base,
      kind: "consent",
      signed: { signerName: "Ana", signedAt: "2026-09-29T10:00:00Z" },
    });
    expect(html).toMatch(/electr/i);
  });
});

describe("certificateData", () => {
  it("builds the time, reason and companion sentences", () => {
    const data = certificateData({
      date: "2026-09-29",
      from: "10:00",
      to: "11:30",
      reason: "recibir tratamiento odontológico",
      companionName: "Luis Ruiz",
      companionDni: "5678X",
      doctorId: "d1",
    });
    expect(data.horario).toBe(", desde las 10:00 hasta las 11:30 horas");
    expect(data.motivo).toBe(", para recibir tratamiento odontológico");
    expect(data.acompanante).toContain("Luis Ruiz, con DNI/NIE 5678X,");
  });

  it("leaves optional parts empty", () => {
    const data = certificateData({
      date: "2026-09-29",
      from: "",
      to: "",
      reason: null,
      companionName: " ",
      companionDni: "",
      doctorId: null,
    });
    expect([data.horario, data.motivo, data.acompanante]).toEqual(["", "", ""]);
  });
});
