import { z } from "zod";

import { idSchema, patientAcquisitionSourceSchema, roleSchema } from "../contracts";

export const userRoleSchema = roleSchema;

export const userSchema = z
  .object({
    id: idSchema,
    displayName: z.string().min(1),
    email: z.string().email().optional(),
    role: userRoleSchema,
    active: z.boolean().optional(),
  })
  .passthrough();

export const usersSchema = z.object({ items: z.array(userSchema) });

export const createUserSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1),
  role: userRoleSchema.default("RECEPTION"),
  password: z.string().min(12),
  staffId: idSchema.optional(),
  patientId: idSchema.optional(),
});

export const updateUserSchema = z.object({
  displayName: z.string().min(1).optional(),
  active: z.boolean().optional(),
  role: userRoleSchema.optional(),
});

export const resetUserPasswordSchema = z.object({ password: z.string().min(8) });

export const acquisitionSourceInputSchema = z.object({
  declaredSource: patientAcquisitionSourceSchema,
  declaredSourceDetail: z.string().max(200).optional(),
});

export const attributionTouchSchema = z
  .object({
    touchRole: z.enum(["FIRST", "LAST", "ASSISTED"]).default("FIRST"),
    source: z.string().min(1).optional(),
    provider: z.string().min(1).optional(),
    campaignId: z.string().max(160).optional(),
    campaignName: z.string().max(200).optional(),
    utmSource: z.string().max(120).optional(),
    utmMedium: z.string().max(120).optional(),
    utmCampaign: z.string().max(200).optional(),
    utmContent: z.string().max(200).optional(),
    clickId: z.string().max(240).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    occurredAt: z.string().datetime({ offset: true }).optional(),
  })
  .refine((value) => Boolean(value.source || value.provider), {
    message: "source or provider is required",
  });

export const attributionTouchRecordSchema = z.object({ id: idSchema }).passthrough();
export const patientAttributionSchema = z
  .object({
    patient: z.object({ id: idSchema }).passthrough(),
    touches: z.array(attributionTouchRecordSchema),
  })
  .passthrough();
export const attributionSummarySchema = z.object({}).passthrough();

const dashboardDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}(?:T.*)?$/, "Fecha ISO no válida");

export const financialDashboardQuerySchema = z.object({
  start: dashboardDateSchema.optional(),
  end: dashboardDateSchema.optional(),
});

export const financialDashboardSchema = z
  .object({
    period: z.object({ start: z.coerce.date(), end: z.coerce.date() }).passthrough(),
    kpis: z.object({}).passthrough(),
    byTreatment: z.array(z.object({}).passthrough()),
    byPaymentMethod: z.array(z.object({}).passthrough()),
    bySite: z.array(z.object({}).passthrough()),
    byDoctor: z.array(z.object({}).passthrough()),
    marketingSpend: z.array(z.object({}).passthrough()),
    monthly: z.array(z.object({}).passthrough()),
  })
  .passthrough();

export const treatmentCatalogItemSchema = z.object({
  id: idSchema,
  code: z.string().min(1),
  name: z.string().min(1),
  specialty: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  defaultPriceCents: z.number().int().nonnegative(),
  baseCostCents: z.number().int().nonnegative(),
  defaultDurationMin: z.number().int().positive().nullable().optional(),
  requiresLab: z.boolean(),
  active: z.boolean(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  version: z.number().int().positive(),
  createdAt: z.coerce.string(),
  updatedAt: z.coerce.string(),
});

export const treatmentCatalogSchema = z.object({ items: z.array(treatmentCatalogItemSchema) });

export const treatmentCatalogCreateSchema = z.object({
  code: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(160),
  specialty: z.string().trim().max(120).nullable().optional(),
  category: z.string().trim().max(120).nullable().optional(),
  defaultPriceCents: z.number().int().nonnegative().default(0),
  baseCostCents: z.number().int().nonnegative().default(0),
  defaultDurationMin: z.number().int().positive().nullable().optional(),
  requiresLab: z.boolean().default(false),
  active: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const treatmentCatalogUpdateSchema = treatmentCatalogCreateSchema.partial().extend({
  expectedVersion: z.number().int().positive(),
});
