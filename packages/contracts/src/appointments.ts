import { z } from "zod";

import { isoDateTimeSchema, versionSchema } from "./common";

export const appointmentStatusSchema = z.enum([
  "PLANNED",
  "CONFIRMED",
  "ARRIVED",
  "IN_CHAIR",
  "COMPLETED",
  "NO_SHOW",
  "CANCELLED",
]);

export const appointmentDtoSchema = z.object({
  id: z.string().min(1),
  clinicId: z.string().min(1),
  patientId: z.string().min(1),
  staffId: z.string().min(1),
  siteId: z.string().min(1),
  cabinetId: z.string().min(1).nullable().optional(),
  clinicalPlanItemId: z.string().min(1).optional(),
  startsAt: isoDateTimeSchema,
  endsAt: isoDateTimeSchema,
  status: appointmentStatusSchema,
  title: z.string().min(1),
  reason: z.string().min(1).nullable().optional(),
  confirmedAt: isoDateTimeSchema.nullable().optional(),
  arrivedAt: isoDateTimeSchema.nullable().optional(),
  chairAt: isoDateTimeSchema.nullable().optional(),
  absentAt: isoDateTimeSchema.nullable().optional(),
  completedAt: isoDateTimeSchema.nullable().optional(),
  version: versionSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const createAppointmentRequestSchema = z.object({
  patientId: z.string().min(1),
  staffId: z.string().min(1),
  siteId: z.string().min(1),
  cabinetId: z.string().min(1).nullable().optional(),
  clinicalPlanItemId: z.string().min(1).optional(),
  startsAt: isoDateTimeSchema,
  endsAt: isoDateTimeSchema,
  title: z.string().min(1),
  reason: z.string().min(1).optional(),
});

export const updateAppointmentRequestSchema = createAppointmentRequestSchema.partial().extend({
  expectedVersion: versionSchema,
  status: appointmentStatusSchema.optional(),
});

export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;
export type AppointmentDto = z.infer<typeof appointmentDtoSchema>;
export type CreateAppointmentRequest = z.infer<typeof createAppointmentRequestSchema>;
export type UpdateAppointmentRequest = z.infer<typeof updateAppointmentRequestSchema>;
