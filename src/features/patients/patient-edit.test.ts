import { describe, expect, it } from "vitest";

import type { Patient } from "@/shared/api/contracts";
import { buildPatientUpdate, patientEditDraft } from "./patient-edit";

const patient: Patient = {
  id: "11111111-1111-1111-1111-111111111111",
  clinicId: "22222222-2222-2222-2222-222222222222",
  recordNumber: "DNT-000123",
  firstName: "Lucía",
  lastName: "Pérez Soto",
  dni: "12345678z",
  phone: "600123456",
  email: "lucia@correo.es",
  birthDate: "1984-05-12",
  version: 4,
  createdAt: "2026-09-01T10:00:00+02:00",
  updatedAt: "2026-09-01T10:00:00+02:00",
};

describe("buildPatientUpdate", () => {
  it("sends nothing when nothing changed", () => {
    expect(buildPatientUpdate(patient, patientEditDraft(patient))).toEqual({
      ok: true,
      payload: null,
    });
  });

  it("sends only changed fields with the expected version", () => {
    const draft = { ...patientEditDraft(patient), lastName: " Pérez Gil ", phone: "611222333" };
    expect(buildPatientUpdate(patient, draft)).toEqual({
      ok: true,
      payload: { lastName: "Pérez Gil", phone: "611222333", expectedVersion: 4 },
    });
  });

  it("clears emptied optional fields with null", () => {
    const draft = { ...patientEditDraft(patient), email: "", birthDate: "" };
    expect(buildPatientUpdate(patient, draft)).toEqual({
      ok: true,
      payload: { email: null, birthDate: null, expectedVersion: 4 },
    });
  });

  it("normalises the DNI and rejects invalid input", () => {
    const draft = { ...patientEditDraft(patient), dni: "x1234567l" };
    expect(buildPatientUpdate(patient, draft)).toMatchObject({
      payload: { dni: "X1234567L" },
    });
    expect(buildPatientUpdate(patient, { ...draft, firstName: " " })).toMatchObject({ ok: false });
    expect(buildPatientUpdate(patient, { ...draft, email: "no-es-email" })).toMatchObject({
      ok: false,
    });
  });
});
