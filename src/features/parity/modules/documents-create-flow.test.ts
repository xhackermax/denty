import { describe, expect, it } from "vitest";

import { createDocumentRow, postCreateAction } from "./documents-create-flow";

const patient = {
  id: "patient-42",
  firstName: "Ana",
  lastName: "Martín",
  recordNumber: "000042",
  dni: "12345678Z",
};
const doctor = { id: "doctor-7", displayName: "Dra. Vega" };

describe("document creation flow", () => {
  it("builds one exact consent row preserving its clinical context", () => {
    const document = createDocumentRow({
      id: "DOC-NEW001",
      patient,
      doctor,
      clinicSite: "Av. Navarra",
      template: { value: "CONSENT_IMPLANT", label: "CI Implantes", type: "CONSENT", sourceUrl: "https://example.test/implant.pdf" },
      title: "  CI Implantes personalizado  ",
      createdAt: "2026-09-27T08:00:00.000Z",
    });

    expect(document).toMatchObject({
      id: "DOC-NEW001",
      patientId: "patient-42",
      patientName: "Ana Martín",
      patientRecordNumber: "000042",
      patientDni: "12345678Z",
      doctorId: "doctor-7",
      doctorName: "Dra. Vega",
      clinicSite: "Av. Navarra",
      templateCode: "CONSENT_IMPLANT",
      title: "CI Implantes personalizado",
      type: "CONSENT",
      state: "FINALIZED",
      sourceUrl: "https://example.test/implant.pdf",
    });
    expect(postCreateAction(document)).toEqual({ kind: "sign", documentId: "DOC-NEW001" });
  });

  it("opens the exact new non-consent row in preview", () => {
    const document = createDocumentRow({
      id: "DOC-NEW002",
      patient,
      doctor,
      clinicSite: "Cariñena",
      template: { value: "BUDGET", label: "Presupuesto", type: "BUDGET" },
      title: "Presupuesto cirugía",
      createdAt: "2026-09-27T08:05:00.000Z",
    });

    expect(document.state).toBe("DRAFT");
    expect(postCreateAction(document)).toEqual({ kind: "preview", documentId: "DOC-NEW002" });
  });
});
