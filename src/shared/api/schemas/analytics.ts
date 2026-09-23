import { z } from "zod";

import { idSchema, isoDateTimeSchema } from "../contracts";

export const analyticsQuerySchema = z.object({
  start: isoDateTimeSchema.optional(),
  end: isoDateTimeSchema.optional(),
  staffId: idSchema.optional(),
  siteId: idSchema.optional(),
  specialty: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  limit: z.number().int().positive().max(200).optional(),
});

export const analyticsResultSchema = z.object({}).passthrough();
export const analyticsItemsSchema = z
  .object({
    items: z.array(z.object({}).passthrough()),
  })
  .passthrough();

export const supplierInvoiceItemSchema = z.object({
  category: z.string().min(1),
  productCode: z.string().optional(),
  description: z.string().min(1),
  quantity: z.number().positive().default(1),
  unitCostCents: z.number().int().nonnegative(),
  totalCents: z.number().int().nonnegative().optional(),
});

export const createSupplierInvoiceSchema = z.object({
  supplierId: idSchema.optional(),
  supplierName: z.string().min(1),
  supplierTaxId: z.string().optional(),
  supplierCategory: z.string().optional(),
  siteId: idSchema.optional(),
  invoiceNumber: z.string().min(1),
  issuedAt: isoDateTimeSchema,
  totalCents: z.number().int().nonnegative().optional(),
  documentPath: z.string().optional(),
  items: z.array(supplierInvoiceItemSchema).default([]),
});

export const treatmentCostItemSchema = z.object({
  category: z.string().min(1),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitCostCents: z.number().int().nonnegative(),
});

export const createTreatmentCostRecipeSchema = z.object({
  treatmentCode: z.string().min(1),
  activeFrom: isoDateTimeSchema.optional(),
  items: z.array(treatmentCostItemSchema).min(1),
});

export const retireTreatmentCostRecipeSchema = z.object({
  activeUntil: isoDateTimeSchema.optional(),
});
