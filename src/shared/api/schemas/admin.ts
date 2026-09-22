import { z } from "zod";

import {
  idSchema,
  patientAcquisitionSourceSchema,
  roleSchema,
} from "../contracts";

export const userRoleSchema = roleSchema;

export const userSchema = z
  .object({
    id: idSchema,
    displayName: z.string().min(1),
    role: userRoleSchema,
    active: z.boolean().optional(),
  })
  .passthrough();

export const usersSchema = z.object({ items: z.array(userSchema) });

export const createUserSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().min(1).optional(),
  displayName: z.string().min(1),
  role: userRoleSchema.default("RECEPTION"),
  password: z.string().min(8).optional(),
  pin: z.string().min(4).max(12).optional(),
  staffId: idSchema.optional(),
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

const dashboardDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}(?:T.*)?$/, "Fecha ISO no válida");

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
