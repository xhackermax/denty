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

export const labAttachmentSchema = z
  .object({
    id: idSchema,
    fileName: z.string().min(1),
    mimeType: z.string().min(1),
    sizeBytes: z.number().int().positive().optional(),
    sha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    createdAt: isoDateTimeSchema.optional(),
  })
  .strict();

export const laboratorySchema = z
  .object({
    id: idSchema,
    name: z.string().min(1),
    taxId: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    defaultTurnaroundDays: z.number().int().min(0).max(365),
    active: z.boolean(),
    version: z.number().int().positive(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict();
export const laboratoriesSchema = z.object({ items: z.array(laboratorySchema) }).strict();
export const createLaboratorySchema = z
  .object({
    name: z.string().min(1),
    taxId: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    address: z.string().optional(),
    defaultTurnaroundDays: z.number().int().min(0).max(365).default(7),
  })
  .strict();
export const updateLaboratorySchema = createLaboratorySchema
  .partial()
  .extend({
    expectedVersion: z.number().int().positive(),
    active: z.boolean().optional(),
  })
  .strict();

export const laboratoryBalanceSchema = z
  .object({
    labId: idSchema,
    name: z.string().min(1),
    active: z.boolean(),
    accruedCents: z.number().int().nonnegative(),
    paidCents: z.number().int().nonnegative(),
    outstandingCents: z.number().int().nonnegative(),
    workCount: z.number().int().nonnegative(),
  })
  .strict();
export const laboratoryBalancesSchema = z
  .object({ items: z.array(laboratoryBalanceSchema) })
  .strict();

export const supplierInvoiceSchema = z
  .object({
    id: idSchema,
    laboratoryId: idSchema,
    siteId: idSchema.nullable().optional(),
    invoiceNumber: z.string().min(1),
    issuedAt: isoDateTimeSchema,
    totalCents: z.number().int().nonnegative(),
    status: z.enum(["OPEN", "PARTIALLY_PAID", "PAID", "VOID"]),
    documentPath: z.string().nullable().optional(),
    version: z.number().int().positive(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict();
export const supplierInvoicesSchema = z.object({ items: z.array(supplierInvoiceSchema) }).strict();
export const supplierInvoiceItemInputSchema = z
  .object({
    labWorkId: idSchema.optional(),
    category: z.string().min(1).default("LABORATORY"),
    productCode: z.string().optional(),
    description: z.string().min(1),
    quantity: z.number().positive().default(1),
    unitCostCents: z.number().int().nonnegative(),
    totalCents: z.number().int().nonnegative().optional(),
  })
  .strict();
export const recordSupplierInvoiceSchema = z
  .object({
    laboratoryId: idSchema,
    siteId: idSchema.optional(),
    invoiceNumber: z.string().min(1),
    issuedAt: isoDateTimeSchema,
    totalCents: z.number().int().nonnegative(),
    documentPath: z.string().optional(),
    items: z.array(supplierInvoiceItemInputSchema).default([]),
  })
  .strict();

export const supplierPaymentSchema = z
  .object({
    id: idSchema,
    laboratoryId: idSchema,
    amountCents: z.number().int().positive(),
    method: z.enum(["BANK_TRANSFER", "CARD", "CASH", "DIRECT_DEBIT", "OTHER"]),
    paidAt: isoDateTimeSchema,
    note: z.string().nullable().optional(),
    idempotencyKey: z.string().min(1),
    createdAt: isoDateTimeSchema,
  })
  .strict();
export const supplierPaymentsSchema = z.object({ items: z.array(supplierPaymentSchema) }).strict();
export const recordSupplierPaymentSchema = z
  .object({
    laboratoryId: idSchema,
    amountCents: z.number().int().positive(),
    method: z
      .enum(["BANK_TRANSFER", "CARD", "CASH", "DIRECT_DEBIT", "OTHER"])
      .default("BANK_TRANSFER"),
    paidAt: isoDateTimeSchema.optional(),
    note: z.string().optional(),
    idempotencyKey: z.string().min(1),
  })
  .strict();
export const allocateSupplierPaymentSchema = z
  .object({ invoiceId: idSchema, amountCents: z.number().int().positive() })
  .strict();

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

export const absenceSchema = z
  .object({
    id: idSchema,
    clinicId: idSchema.optional(),
    staffId: idSchema.optional(),
    siteId: idSchema.nullable().optional(),
    startsAt: isoDateTimeSchema.optional(),
    endsAt: isoDateTimeSchema.optional(),
    type: z.enum(["VACATION", "SICK_LEAVE", "PERMISSION", "PERSONAL", "OTHER"]).optional(),
    reason: z.string().nullable().optional(),
    status: z.string().optional(),
    version: z.number().int().positive().optional(),
    createdAt: isoDateTimeSchema.optional(),
    updatedAt: isoDateTimeSchema.optional(),
  })
  .passthrough();

export const absencesSchema = z.object({ items: z.array(absenceSchema) });

export type CreateAbsence = z.input<typeof createAbsenceSchema>;

export const taskStatusSchema = z.enum(["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"]);
export const taskPrioritySchema = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);
const scheduledOnSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Fecha inválida");
const taskDurationSchema = z.number().int().min(1).max(1440);
export const taskSchema = z
  .object({
    id: idSchema,
    patientId: idSchema.nullable().optional(),
    taskType: z.string().min(1),
    title: z.string().min(1),
    description: z.string().nullable().optional(),
    status: taskStatusSchema,
    priority: taskPrioritySchema,
    assigneeStaffId: idSchema.nullable().optional(),
    dueAt: isoDateTimeSchema.nullable().optional(),
    sourceType: z.string().nullable().optional(),
    sourceId: z.string().nullable().optional(),
    position: z.number().int(),
    durationMin: z.number().int().min(1).max(1440),
    archivedAt: isoDateTimeSchema.nullable().optional(),
    scheduledOn: scheduledOnSchema.nullable().optional(),
    version: z.number().int().positive(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .passthrough();
export const tasksSchema = z.object({ items: z.array(taskSchema) });
export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(1000).optional(),
  patientId: idSchema.optional(),
  taskType: z.string().min(1).max(80).optional(),
  priority: taskPrioritySchema.optional(),
  assigneeStaffId: idSchema.optional(),
  dueAt: isoDateTimeSchema.optional(),
  sourceType: z.string().max(80).optional(),
  sourceId: z.string().max(200).optional(),
  durationMin: taskDurationSchema.optional(),
  scheduledOn: scheduledOnSchema.optional(),
});
export const updateTaskSchema = z.object({
  status: taskStatusSchema.optional(),
  title: z.string().trim().min(1).max(200).optional(),
  priority: taskPrioritySchema.optional(),
  durationMin: taskDurationSchema.optional(),
  dueAt: isoDateTimeSchema.nullable().optional(),
  archived: z.boolean().optional(),
  expectedVersion: z.number().int().positive().optional(),
  assigneeStaffId: idSchema.optional(),
  scheduledOn: scheduledOnSchema.nullable().optional(),
});
export const reorderTasksSchema = z.object({
  orderedIds: z
    .array(idSchema)
    .min(1)
    .max(500)
    .refine((ids) => new Set(ids).size === ids.length, "orderedIds must not repeat ids"),
});
