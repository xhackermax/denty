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
    patientId: idSchema.optional(),
  })
  .passthrough();

export const usersSchema = z.object({ items: z.array(userSchema) });

export const createUserSchema = z
  .object({
    // Patient accounts may omit these: the server takes them from the patient record
    // and the first-access password is the patient's DNI.
    email: z.string().email().optional(),
    displayName: z.string().min(1).optional(),
    role: userRoleSchema.default("RECEPTION"),
    password: z.string().min(8).optional(),
    staffId: idSchema.optional(),
    patientId: idSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.role === "PATIENT") {
      if (!value.patientId)
        context.addIssue({ code: "custom", path: ["patientId"], message: "Elige el paciente." });
      return;
    }
    if (!value.email)
      context.addIssue({ code: "custom", path: ["email"], message: "El email es obligatorio." });
    if (!value.displayName)
      context.addIssue({ code: "custom", path: ["displayName"], message: "Falta el nombre." });
    if (!value.password || value.password.length < 12)
      context.addIssue({
        code: "custom",
        path: ["password"],
        message: "La contraseña del personal debe tener al menos 12 caracteres.",
      });
  });

export const updateUserSchema = z.object({
  displayName: z.string().min(1).optional(),
  active: z.boolean().optional(),
  role: userRoleSchema.optional(),
});

export const resetUserPasswordSchema = z
  .object({
    password: z.string().min(8).optional(),
    /** Patient accounts only: go back to the DNI-based first-access password. */
    useDni: z.boolean().optional(),
  })
  .refine((value) => Boolean(value.password) !== Boolean(value.useDni), {
    message: "Indica una contraseña nueva o restablece al DNI.",
  });

export const resetUserPasswordResultSchema = z.object({
  ok: z.literal(true),
  usedDni: z.boolean().optional(),
});

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

// Sites (sedes), their doctors and the weekly rota per site.
const clockTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora HH:MM");

export const staffScheduleEntrySchema = z
  .object({
    siteId: idSchema,
    weekday: z.number().int().min(0).max(6),
    startsAt: clockTimeSchema,
    endsAt: clockTimeSchema,
  })
  .refine((entry) => entry.endsAt > entry.startsAt, {
    message: "La hora de salida debe ser posterior a la de entrada.",
  });

export const adminSiteSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  city: z.string().nullable(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  active: z.boolean(),
  cabinetCount: z.number().int().min(0),
});

export const adminStaffMemberSchema = z.object({
  id: idSchema,
  displayName: z.string().min(1),
  role: z.enum(["ADMIN", "RECEPTION", "DENTIST", "ASSISTANT"]),
  active: z.boolean(),
  collegiateNumber: z.string().nullable(),
  hasLogin: z.boolean(),
  schedules: z.array(staffScheduleEntrySchema),
});

export const adminSitesOverviewSchema = z.object({
  sites: z.array(adminSiteSchema),
  staff: z.array(adminStaffMemberSchema),
});

export const saveSiteSchema = z.object({
  name: z.string().trim().min(1).max(120),
  city: z.string().trim().max(120).nullable().optional(),
  address: z.string().trim().max(240).nullable().optional(),
  phone: z.string().trim().max(60).nullable().optional(),
  active: z.boolean().default(true),
  cabinetCount: z.number().int().min(0).max(30).default(1),
});

export const saveStaffMemberSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  role: z.enum(["ADMIN", "RECEPTION", "DENTIST", "ASSISTANT"]).default("DENTIST"),
  active: z.boolean().default(true),
  collegiateNumber: z.string().trim().max(30).nullable().optional(),
});

export const setStaffScheduleSchema = z.object({
  entries: z.array(staffScheduleEntrySchema).max(60),
});

export type AdminSite = z.infer<typeof adminSiteSchema>;
export type AdminStaffMember = z.infer<typeof adminStaffMemberSchema>;
export type AdminSitesOverview = z.infer<typeof adminSitesOverviewSchema>;
export type StaffScheduleEntry = z.infer<typeof staffScheduleEntrySchema>;
