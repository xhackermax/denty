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
}).strict();

export const analyticsItemSchema = z.object({
  id: idSchema.optional(),
  treatment: z.string().optional(),
  treatmentCode: z.string().optional(),
  label: z.string().optional(),
  name: z.string().optional(),
  doctorId: idSchema.optional(),
  doctorName: z.string().optional(),
  staffId: idSchema.optional(),
  month: z.string().optional(),
  category: z.string().optional(),
  count: z.number().int().nonnegative().optional(),
  producedCents: z.number().int().optional(),
  invoicedCents: z.number().int().optional(),
  collectedCents: z.number().int().optional(),
  pendingCents: z.number().int().optional(),
  costCents: z.number().int().optional(),
  marginCents: z.number().int().optional(),
  conversionPercent: z.number().optional(),
  noShowPercent: z.number().optional(),
}).strict();

export const analyticsResultSchema = z.object({
  period: z.object({ start: isoDateTimeSchema.optional(), end: isoDateTimeSchema.optional() }).strict().optional(),
  producedCents: z.number().int().optional(),
  invoicedCents: z.number().int().optional(),
  collectedCents: z.number().int().optional(),
  pendingCents: z.number().int().optional(),
  costCents: z.number().int().optional(),
  marginCents: z.number().int().optional(),
  conversionPercent: z.number().optional(),
  noShowPercent: z.number().optional(),
  count: z.number().int().nonnegative().optional(),
}).strict();

export const analyticsItemsSchema = z.object({ items: z.array(analyticsItemSchema) }).strict();

export const supplierInvoiceItemSchema = z.object({
  category: z.string().min(1),
  productCode: z.string().optional(),
  description: z.string().min(1),
  quantity: z.number().positive().default(1),
  unitCostCents: z.number().int().nonnegative(),
  totalCents: z.number().int().nonnegative().optional(),
}).strict();

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
}).strict();

export const treatmentCostItemSchema = z.object({
  category: z.string().min(1),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitCostCents: z.number().int().nonnegative(),
}).strict();

export const createTreatmentCostRecipeSchema = z.object({
  treatmentCode: z.string().min(1),
  activeFrom: isoDateTimeSchema.optional(),
  items: z.array(treatmentCostItemSchema).min(1),
}).strict();

export const retireTreatmentCostRecipeSchema = z.object({ activeUntil: isoDateTimeSchema.optional() }).strict();
