import { z } from "zod";

import { appointmentSchema, idSchema, patientAcquisitionSourceSchema } from "../contracts";

export const patientAvailabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  siteId: idSchema.optional(),
  durationMin: z.number().int().min(20).max(120).default(30),
});

export const patientAppointmentAvailabilitySchema = z.object({
  date: z.string().min(1),
  durationMin: z.number().int().positive(),
  sites: z.array(
    z.object({
      site: z.object({ id: idSchema, name: z.string().min(1) }).passthrough(),
      slots: z.array(
        z.object({
          startsAt: z.coerce.string(),
          endsAt: z.coerce.string(),
        }),
      ),
    }),
  ),
});

export const patientBookingSchema = z.object({
  startsAt: z.string().datetime(),
  siteId: idSchema,
  durationMin: z.number().int().min(20).max(120).default(30),
  reason: z.string().trim().max(300).optional(),
});

export const patientAppointmentRequestInputSchema = z.object({
  note: z.string().trim().max(300).optional(),
});

export const patientAppointmentRequestSchema = z.object({ id: idSchema }).passthrough();
export const patientAppointmentRequestsSchema = z.object({
  items: z.array(patientAppointmentRequestSchema),
});

export const createPatientInvitationSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(1).optional(),
  expiresHours: z.number().int().positive().max(720).optional(),
});

export const patientInvitationSchema = z.object({
  id: idSchema,
  token: z.string().min(1),
  expiresAt: z.coerce.string(),
});

export const familyGrantSchema = z.object({ id: idSchema }).passthrough();
export const familyGrantsSchema = z.object({ items: z.array(familyGrantSchema) });
export const createFamilyGrantSchema = z.object({
  userId: idSchema,
  relation: z.string().min(1).max(40).optional(),
});

export const claimPatientInvitationSchema = z.object({
  token: z.string().min(1),
  displayName: z.string().min(1),
  email: z.string().email().optional(),
  username: z.string().min(1).optional(),
  password: z.string().min(8),
});

export const claimedPatientAccountSchema = z.object({
  id: idSchema,
  role: z.literal("PATIENT"),
  permissions: z.array(z.string()),
});

export const portalPatientSchema = z.object({
  id: idSchema,
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
});

export const portalBudgetSchema = z
  .object({
    id: idSchema,
    status: z.string().min(1),
    totalCents: z.number().int(),
  })
  .passthrough();

export const patientProjectionSchema = z
  .object({
    patient: portalPatientSchema,
    acquisitionSourceAnswered: z.boolean(),
    appointments: z.array(appointmentSchema).default([]),
    plan: z.unknown().nullable().optional(),
    budgets: z.array(portalBudgetSchema).default([]),
    documents: z.array(z.object({ id: idSchema }).passthrough()).default([]),
    prescriptions: z.array(z.object({ id: idSchema }).passthrough()).default([]),
  })
  .passthrough();

export const patientSourceSchema = z.object({
  declaredSource: patientAcquisitionSourceSchema,
  declaredSourceDetail: z.string().max(200).optional(),
});

export const patientSourceRecordedSchema = z.object({ recorded: z.literal(true) });

export const budgetResponseSchema = z.object({
  acceptedItemIds: z.array(idSchema).optional(),
  termsVersion: z.string().optional(),
});

export const patientPaymentIntentInputSchema = z.object({
  amountCents: z.number().int().positive(),
  invoiceId: idSchema.optional(),
  budgetId: idSchema.optional(),
  currency: z.string().length(3).default("EUR"),
  expiresAt: z.string().datetime({ offset: true }).optional(),
});

export const paymentIntentSchema = z.object({ id: idSchema }).passthrough();
export { appointmentSchema };

export type PatientProjection = z.infer<typeof patientProjectionSchema>;
