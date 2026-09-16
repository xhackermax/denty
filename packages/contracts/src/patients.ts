import { z } from "zod";

import { isoDateTimeSchema, versionSchema } from "./common";

export const patientDtoSchema = z.object({
  id: z.string().min(1),
  clinicId: z.string().min(1),
  legacyId: z.number().int().positive().nullable().optional(),
  recordNumber: z.string().min(1).nullable().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dni: z.string().min(1).nullable().optional(),
  phone: z.string().min(1).nullable().optional(),
  email: z.string().email().nullable().optional(),
  birthDate: isoDateTimeSchema.nullable().optional(),
  archivedAt: isoDateTimeSchema.nullable().optional(),
  version: versionSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const createPatientRequestSchema = z.object({
  recordNumber: z.string().min(1).optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dni: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  email: z.string().email().optional(),
  birthDate: isoDateTimeSchema.optional(),
});

export const updatePatientRequestSchema = createPatientRequestSchema.partial().extend({
  expectedVersion: versionSchema,
});

export type PatientDto = z.infer<typeof patientDtoSchema>;
export type CreatePatientRequest = z.infer<typeof createPatientRequestSchema>;
export type UpdatePatientRequest = z.infer<typeof updatePatientRequestSchema>;
