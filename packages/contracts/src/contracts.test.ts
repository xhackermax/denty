import { describe, expect, test } from "vitest";

import {
  apiErrorSchema,
  appointmentDtoSchema,
  createAppointmentRequestSchema,
  createPatientRequestSchema,
  pageSchema,
  patientDtoSchema,
  updateAppointmentRequestSchema,
  updatePatientRequestSchema,
} from "./index";

describe("patient contracts", () => {
  test("parses valid patient DTOs and rejects invalid create requests", () => {
    expect(
      patientDtoSchema.parse({
        id: "patient-1",
        clinicId: "clinic-1",
        firstName: "Ana",
        lastName: "Mora",
        version: 2,
        createdAt: "2026-09-16T10:00:00.000Z",
        updatedAt: "2026-09-16T10:05:00.000Z",
      }),
    ).toMatchObject({ id: "patient-1", version: 2 });

    expect(() => createPatientRequestSchema.parse({ firstName: "", lastName: "Mora" })).toThrow();
  });

  test("requires expectedVersion for patient updates", () => {
    expect(updatePatientRequestSchema.parse({ expectedVersion: 3, phone: "+34 600 000 000" })).toEqual({
      expectedVersion: 3,
      phone: "+34 600 000 000",
    });
    expect(() => updatePatientRequestSchema.parse({ phone: "+34 600 000 000" })).toThrow();
  });
});

describe("appointment contracts", () => {
  test("parses appointments and validates status values", () => {
    expect(
      appointmentDtoSchema.parse({
        id: "appointment-1",
        clinicId: "clinic-1",
        patientId: "patient-1",
        staffId: "staff-1",
        siteId: "site-1",
        startsAt: "2026-09-16T09:00:00.000Z",
        endsAt: "2026-09-16T09:45:00.000Z",
        status: "ARRIVED",
        title: "Revisión",
        arrivedAt: "2026-09-16T09:03:00.000Z",
        version: 4,
        createdAt: "2026-09-16T08:00:00.000Z",
        updatedAt: "2026-09-16T09:03:00.000Z",
      }),
    ).toMatchObject({ status: "ARRIVED", version: 4 });

    expect(() =>
      createAppointmentRequestSchema.parse({
        patientId: "patient-1",
        staffId: "staff-1",
        siteId: "site-1",
        startsAt: "not-a-date",
        endsAt: "2026-09-16T09:45:00.000Z",
        title: "Revisión",
      }),
    ).toThrow();
  });

  test("requires expectedVersion for appointment updates", () => {
    expect(updateAppointmentRequestSchema.parse({ expectedVersion: 2, status: "IN_CHAIR" })).toEqual({
      expectedVersion: 2,
      status: "IN_CHAIR",
    });
    expect(() => updateAppointmentRequestSchema.parse({ status: "IN_CHAIR" })).toThrow();
  });
});

describe("common contracts", () => {
  test("parses API errors and pages", () => {
    expect(apiErrorSchema.parse({ error: { code: "VERSION_CONFLICT", message: "Conflicto", correlationId: "c1" } })).toEqual({
      error: { code: "VERSION_CONFLICT", message: "Conflicto", correlationId: "c1" },
    });
    expect(pageSchema(patientDtoSchema).parse({ items: [], total: 0, page: 1, pageSize: 25 })).toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 25,
    });
  });
});
