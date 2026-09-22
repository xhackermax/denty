import { z } from "zod";

import { idSchema, isoDateTimeSchema, paymentMethodSchema } from "../contracts";

export const invoiceLineInputSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  unitPriceCents: z.number().int(),
  taxRateBps: z.number().int().min(0).max(10_000).default(0),
  exemptionCode: z.string().optional(),
  clinicalPlanItemId: idSchema.optional(),
});

export const createInvoiceDraftSchema = z.object({
  patientId: idSchema.optional(),
  budgetId: idSchema.optional(),
  appointmentId: idSchema.optional(),
  seriesId: idSchema,
  type: z.enum(["STANDARD", "SIMPLIFIED", "RECTIFYING"]).default("STANDARD"),
  customerName: z.string().min(1),
  customerTaxId: z.string().optional(),
  customerAddress: z.string().optional(),
  lines: z.array(invoiceLineInputSchema).min(1),
});

export const invoiceStateSchema = z.enum(["DRAFT", "ISSUED", "RECTIFIED"]);

export const invoiceSchema = z
  .object({
    id: idSchema,
    patientId: idSchema.nullable().optional(),
    seriesId: idSchema,
    status: invoiceStateSchema,
    type: z.string().min(1),
    customerName: z.string().min(1),
    totalCents: z.number().int(),
    fullNumber: z.string().nullable().optional(),
    issuedAt: z.coerce.string().nullable().optional(),
    version: z.number().int().positive().optional(),
  })
  .passthrough();

export const invoicesSchema = z.object({ items: z.array(invoiceSchema) });

export const budgetSchema = z
  .object({
    id: idSchema,
    patientId: idSchema,
    totalCents: z.number().int().nonnegative().optional(),
    createdAt: z.coerce.string().optional(),
  })
  .passthrough();

export const budgetsSchema = z.object({ items: z.array(budgetSchema) });

export const invoiceSeriesSchema = z
  .object({
    id: idSchema,
    code: z.string().min(1),
    name: z.string().min(1),
    active: z.boolean().optional(),
  })
  .passthrough();

export const invoiceSeriesListSchema = z.object({
  items: z.array(invoiceSeriesSchema),
});

export const createInvoiceSeriesSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
});

export const allocatePaymentSchema = z.object({
  invoiceId: idSchema,
  amountCents: z.number().int().positive(),
});

export const paymentWithAllocationsSchema = z
  .object({
    id: idSchema,
    patientId: idSchema.nullable().optional(),
    amountCents: z.number().int().positive(),
    method: paymentMethodSchema,
    reference: z.string().nullable().optional(),
    receivedAt: z.coerce.string().optional(),
  })
  .passthrough();

export const paymentsSchema = z.object({
  items: z.array(paymentWithAllocationsSchema),
});


export const paymentAllocationSchema = z.object({
  id: idSchema,
  paymentId: idSchema,
  invoiceId: idSchema,
  amountCents: z.number().int().positive(),
}).passthrough();

export const rectifyInvoiceSchema = z.object({
  reason: z.string().min(1),
  lines: z.array(invoiceLineInputSchema).optional(),
  aeatRectificationType: z.enum(["R1", "R2", "R3", "R4", "R5"]).optional(),
});

export const billingSettingsSchema = z
  .object({
    fiscalMode: z.enum(["VERIFACTU", "NO_VERIFACTU"]),
    defaultDueDays: z.number().int().min(0).max(365),
    autoSubmitVerifactu: z.boolean(),
  })
  .passthrough();

export const updateBillingSettingsSchema = billingSettingsSchema.pick({
  fiscalMode: true,
  defaultDueDays: true,
  autoSubmitVerifactu: true,
});

export const verifactuStatusSchema = z.object({
  settings: billingSettingsSchema,
  provider: z.object({
    certificateConfigured: z.boolean(),
    environment: z.string().min(1),
  }),
  counts: z.object({
    pending: z.number().int().nonnegative(),
    accepted: z.number().int().nonnegative(),
    rejected: z.number().int().nonnegative(),
    error: z.number().int().nonnegative(),
    missingRecord: z.number().int().nonnegative(),
  }),
  items: z.array(z.object({ id: idSchema }).passthrough()),
});


export const verifactuSubmissionResultSchema = z
  .object({
    status: z.string().min(1).optional(),
    submission: z.object({ id: idSchema }).passthrough().optional(),
    provider: z.object({}).passthrough().optional(),
  })
  .passthrough();

export const accountingExportQuerySchema = z.object({
  start: isoDateTimeSchema.optional(),
  end: isoDateTimeSchema.optional(),
});
