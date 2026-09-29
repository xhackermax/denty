import { describe, expect, it } from "vitest";

import { buildPrescriptionPrintHtml, regimenSentence } from "./prescription-print";

describe("receta para imprimir", () => {
  it("escribe la posología como una frase", () => {
    expect(
      regimenSentence({
        unitsPerDose: "1 comprimido",
        frequency: "Cada 8 horas",
        duration: "7 días",
      }),
    ).toBe("1 comprimido cada 8 horas durante 7 días");
    expect(
      regimenSentence({
        unitsPerDose: "1 cápsula",
        frequency: "Cada 24 horas",
        duration: "Mientras tome el antiinflamatorio",
      }),
    ).toBe("1 cápsula cada 24 horas mientras tome el antiinflamatorio");
  });

  it("incluye clínica, sede, paciente, medicamentos y firma con colegiado", () => {
    const html = buildPrescriptionPrintHtml({
      clinicName: "Centro Dental Funcional",
      site: {
        name: "Av. Navarra",
        address: "Avenida de Navarra 17, local bajo, 50010",
        city: "Zaragoza",
        phone: "976 34 56 45",
      },
      date: "2026-09-29",
      patient: { name: "Lucía Pérez", dni: "12345678Z", recordNumber: "DNT-1" },
      prescriber: { name: "Dr. Isaac Tiburcio Adames", collegiateNumber: "50001600" },
      items: [
        {
          activeIngredient: "Ibuprofeno",
          strength: "600 mg",
          pharmaceuticalForm: "Comprimidos",
          route: "Oral",
          unitsPerDose: "1 comprimido",
          frequency: "Cada 8 horas",
          duration: "3 días",
          instructions: "Tomar con alimentos",
        },
      ],
    });
    for (const expected of [
      "Centro Dental Funcional",
      "Av. Navarra · Avenida de Navarra 17, local bajo, 50010 · Zaragoza · Tel. 976 34 56 45",
      "29/09/2026",
      "Lucía Pérez",
      "DNI/NIE 12345678Z",
      "Ibuprofeno 600 mg",
      "1 comprimido cada 8 horas durante 3 días",
      "Tomar con alimentos",
      "Dr. Isaac Tiburcio Adames",
      "Nº de colegiado 50001600",
    ]) {
      expect(html).toContain(expected);
    }
  });

  it("escapa el texto introducido por el usuario", () => {
    const html = buildPrescriptionPrintHtml({
      clinicName: "Clínica",
      date: "2026-09-29",
      patient: { name: "<script>alert(1)</script>" },
      prescriber: { name: "Dra. X" },
      items: [],
    });
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });
});
