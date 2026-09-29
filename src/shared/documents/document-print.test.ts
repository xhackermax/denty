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
