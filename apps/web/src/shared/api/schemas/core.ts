import { z } from "zod";

import {
  appointmentSchema,
  documentSchema,
  idSchema,
  isoDateTimeSchema,
  labWorkSchema,
} from "../contracts";

export const appointmentsSchema = z.array(appointmentSchema);
export const labWorksSchema = z.object({ items: z.array(labWorkSchema) });
export const documentsSchema = z.object({ items: z.array(documentSchema) });

export const labReworkSchema = z.object({
  reason: z.string().min(1),
  etaAt: isoDateTimeSchema.optional(),
  costCents: z.number().int().nonnegative().optional(),
});

export const labAgendaWarningSchema = z.object({
  warning: z.boolean(),
  appointments: z
    .array(
      z.object({
        id: idSchema,
        startsAt: z.coerce.string(),
      }),
    )
    .optional(),
});


export const labAttachmentInputSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  base64: z.string().min(1),
});

export const labAttachmentSchema = z.object({ id: idSchema }).passthrough();

export const documentTemplateSchema = z.object({ id: idSchema }).passthrough();
export const documentTemplatesSchema = z.object({
  items: z.array(documentTemplateSchema),
});

export const createDocumentTemplateSchema = z.object({
  code: z.string().min(1),
  title: z.string().min(1),
  body: z.string(),
  schema: z.unknown().optional(),
});

export const createDocumentTemplateVersionSchema = z.object({
  title: z.string().min(1).optional(),
  body: z.string(),
  schema: z.unknown().optional(),
});

export const attendanceCertificateSchema = z.object({
  patientId: idSchema,
  siteId: idSchema.optional(),
  date: z.string().min(1),
  start: z.string().min(1).optional(),
  end: z.string().min(1).optional(),
  city: z.string().optional(),
  procedure: z.string().optional(),
  includeProcedure: z.boolean().default(false),
});

export const deliverDocumentSchema = z.object({
  channel: z.enum(["PORTAL", "EMAIL", "SMS", "WHATSAPP", "NONE"]).default("PORTAL"),
  message: z.string().optional(),
});

export const attendancePunchSchema = z.object({ id: idSchema }).passthrough();
export const attendanceMeSchema = z.object({
  date: z.string().min(1),
  timeZone: z.string().min(1),
  nextAction: z.enum(["IN", "OUT"]),
  punches: z.array(attendancePunchSchema),
});

export const attendancePunchResultSchema = z.object({
  punch: attendancePunchSchema,
  nextAction: z.enum(["IN", "OUT"]),
  date: z.string().min(1),
});

export const attendanceCorrectionSchema = z.object({
  occurredAt: isoDateTimeSchema,
  reason: z.string().optional(),
});

export const attendanceDailySchema = z.object({
  date: z.string().min(1),
  timeZone: z.string().min(1),
  rows: z.array(z.object({ userId: idSchema }).passthrough()),
});

export const createAbsenceSchema = z.object({
  staffId: idSchema,
  siteId: idSchema.optional(),
  startsAt: isoDateTimeSchema,
  endsAt: isoDateTimeSchema,
  type: z.enum(["VACATION", "SICK_LEAVE", "PERMISSION", "PERSONAL", "OTHER"]),
  reason: z.string().optional(),
});

export const absenceSchema = z.object({ id: idSchema }).passthrough();
