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
  patientId: idSchema,
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

export const finalizeBudgetSignatureInputSchema = z.object({
  expectedVersion: z.number().int().positive(),
  signerName: z.string().trim().min(1),
  signatureData: z.string().min(1),
});

export const updateDraftBudgetSchema = z.object({
  patientId: idSchema,
  expectedVersion: z.number().int().positive(),
  title: z.string().trim().max(120).nullable(),
  items: z
    .array(
      z.object({
        id: idSchema,
        unitPriceCents: z.number().int().nonnegative().max(2_147_483_647),
      }),
    )
    .max(200),
});

export const deleteDraftBudgetQuerySchema = z.object({
  patientId: idSchema,
  expectedVersion: z.coerce.number().int().positive(),
});

export const draftBudgetMutationResultSchema = z.object({
  budget: z
    .object({
      id: idSchema,
      code: z.string().min(1),
      status: z.string().min(1),
      totalCents: z.number().int().nonnegative(),
      version: z.number().int().positive(),
      revision: z.number().int().positive(),
      createdAt: z.coerce.string(),
      scope: z.enum(["plan", "primary", "secondary", "custom"]),
      title: z.string().nullable(),
      items: z.array(
        z.object({
          id: idSchema,
          description: z.string().min(1),
          tooth: z.string().nullable(),
          unitPriceCents: z.number().int().nonnegative(),
          quantity: z.number().int().positive(),
          totalCents: z.number().int().nonnegative(),
        }),
      ),
    })
    .passthrough(),
});

export const deletedDraftBudgetSchema = z.object({ deleted: z.literal(true) });

export const finalizedBudgetSignatureSchema = z.object({
  budget: z
    .object({
      id: idSchema,
      status: z.literal("SIGNED"),
      version: z.number().int().positive(),
      revision: z.number().int().positive(),
      totalCents: z.number().int().nonnegative(),
      sourcePlanVersion: z.number().int().positive().nullable().optional(),
    })
    .passthrough(),
  snapshot: z
    .object({
      id: idSchema,
      budgetId: idSchema,
      revision: z.number().int().positive(),
      signedAt: z.coerce.string(),
    })
    .passthrough(),
});

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
  code: z.string().trim().min(1).max(24),
  name: z.string().trim().min(1).max(120),
  prefix: z.string().trim().max(24).optional(),
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

export const paymentAllocationSchema = z
  .object({
    id: idSchema,
    paymentId: idSchema,
    invoiceId: idSchema,
    amountCents: z.number().int().positive(),
  })
  .passthrough();

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
    fiscalTaxId: z.string().trim().min(1).nullable().optional(),
    fiscalLegalName: z.string().trim().min(1).nullable().optional(),
    fiscalAddress: z.string().trim().min(1).nullable().optional(),
    verifactuEnvironment: z.enum(["test", "production"]).default("test"),
  })
  .passthrough();

export const updateBillingSettingsSchema = billingSettingsSchema.pick({
  fiscalMode: true,
  defaultDueDays: true,
  autoSubmitVerifactu: true,
  fiscalTaxId: true,
  fiscalLegalName: true,
  fiscalAddress: true,
  verifactuEnvironment: true,
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
