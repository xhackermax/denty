import { z } from "zod";

import {
  appointmentSchema,
  createAppointmentSchema,
  idSchema,
  isoDateTimeSchema,
} from "../contracts";

const looseEntitySchema = z.object({ id: idSchema }).passthrough();

export const agendaStaffSchema = z
  .object({
    id: idSchema,
    displayName: z.string().min(1),
    active: z.boolean().optional(),
    role: z.string().optional(),
    // Weekly rota: which site the professional works at on each weekday (0 = Sunday).
    schedules: z
      .array(
        z.object({
          siteId: idSchema,
          weekday: z.number().int().min(0).max(6),
          startsAt: z.string(),
          endsAt: z.string(),
        }),
      )
      .default([]),
  })
  .passthrough();

export const agendaCabinetSchema = z
  .object({
    id: idSchema,
    name: z.string().min(1),
  })
  .passthrough();

export const agendaSiteSchema = z
  .object({
    id: idSchema,
    name: z.string().min(1),
    city: z.string().nullable().optional(),
    active: z.boolean().optional(),
    cabinets: z.array(agendaCabinetSchema).default([]),
  })
  .passthrough();

export const agendaAppointmentRequestSchema = z
  .object({
    id: idSchema,
    patientId: idSchema,
    status: z.string().min(1),
    requestedAt: isoDateTimeSchema.optional(),
    note: z.string().nullable().optional(),
    patient: z
      .object({
        id: idSchema,
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        phone: z.string().nullable().optional(),
      })
      .optional(),
  })
  .passthrough();

export const agendaAppointmentRequestsSchema = z.object({
  items: z.array(agendaAppointmentRequestSchema),
});

export const scheduleAppointmentRequestSchema = createAppointmentSchema
  .omit({ allowOverlap: true })
  .partial({
    patientId: true,
  });

export const agendaContextSchema = z.object({
  staff: z.array(agendaStaffSchema),
  sites: z.array(agendaSiteSchema),
  actor: z.object({
    role: z.string().min(1),
    staffId: idSchema.nullable().optional(),
  }),
  settings: z
    .object({
      defaultPlanVisitGapDays: z.number().int().min(0).max(180),
      clinicDefaultPlanVisitGapDays: z.number().int().min(0).max(180),
      staffOverridePlanVisitGapDays: z.number().int().min(0).max(180).nullable(),
    })
    .optional(),
});

export const availabilitySlotSchema = z.object({
  startsAt: z.coerce.string(),
  endsAt: z.coerce.string(),
});

export const agendaAvailabilitySchema = z.object({
  date: z.string().min(1).optional(),
  staffId: idSchema.optional(),
  durationMin: z.number().int().positive().optional(),
  slots: z.array(availabilitySlotSchema),
});

export const createAgendaBlockSchema = z.object({
  staffId: idSchema.nullable().optional(),
  siteId: idSchema.nullable().optional(),
  cabinetId: idSchema.nullable().optional(),
  startsAt: isoDateTimeSchema,
  endsAt: isoDateTimeSchema,
  kind: z.string().min(1).optional(),
  reason: z.string().optional(),
});

export const agendaBlockSchema = looseEntitySchema.extend({
  startsAt: z.coerce.string(),
  endsAt: z.coerce.string(),
});

export const agendaBlockViewSchema = z.object({
  id: idSchema,
  staffId: idSchema.nullable(),
  siteId: idSchema.nullable(),
  cabinetId: idSchema.nullable(),
  startsAt: z.coerce.string(),
  endsAt: z.coerce.string(),
  kind: z.string().min(1),
  reason: z.string().nullable(),
});

export const agendaBlocksSchema = z.object({ items: z.array(agendaBlockViewSchema) });
export type AgendaBlockView = z.infer<typeof agendaBlockViewSchema>;

export const createWaitlistEntrySchema = z.object({
  patientId: idSchema,
  preferredStaffId: idSchema.optional(),
  siteId: idSchema.optional(),
  earliestAt: isoDateTimeSchema.optional(),
  latestAt: isoDateTimeSchema.optional(),
  durationMin: z.number().int().positive().default(30),
  reason: z.string().optional(),
  priority: z.number().int().default(0),
});

export const waitlistEntrySchema = looseEntitySchema.extend({
  patientId: idSchema,
  active: z.boolean().optional(),
  priority: z.number().int().optional(),
});

export const waitlistSchema = z.object({
  items: z.array(waitlistEntrySchema),
});

export const cancelCascadeSchema = z.object({
  reason: z.string().min(1),
});

export const cancelCascadeResultSchema = z.object({
  cancelled: appointmentSchema,
  proposal: z.object({
    affected: z.array(
      z.object({
        id: idSchema,
        startsAt: z.coerce.string(),
        title: z.string().min(1),
      }),
    ),
    autoApplied: z.boolean(),
    message: z.string(),
  }),
});

export const schedulePlanItemSchema = z.object({
  visits: z.number().int().positive().optional(),
  durationMin: z.number().int().positive().optional(),
  staffId: idSchema.optional(),
  siteId: idSchema.optional(),
  gapDays: z.number().int().nonnegative().nullable().optional(),
  startDate: z.string().min(1).optional(),
});

export const scheduledPlanItemResultSchema = z
  .object({
    appointments: z.array(appointmentSchema).optional(),
  })
  .passthrough();

export const agendaGameStatusSchema = z.object({
  items: z.array(
    z
      .object({
        id: idSchema,
        status: z.string().min(1),
        visitSession: z.unknown().nullable().optional(),
        voucher: z.unknown().nullable().optional(),
      })
      .passthrough(),
  ),
});

export type AgendaContext = z.infer<typeof agendaContextSchema>;
export type AgendaStaff = z.infer<typeof agendaStaffSchema>;
export type AgendaSite = z.infer<typeof agendaSiteSchema>;

export const agendaSettingsSchema = z.object({
  defaultPlanVisitGapDays: z.number().int().min(0).max(180),
  clinicDefaultPlanVisitGapDays: z.number().int().min(0).max(180),
  staffOverridePlanVisitGapDays: z.number().int().min(0).max(180).nullable(),
});
export const updateAgendaSettingsSchema = z.object({
  defaultPlanVisitGapDays: z.number().int().min(0).max(180),
  staffId: idSchema.optional(),
});
export const waitTimeMetricsSchema = z.object({
  appointmentCount: z.number().int().nonnegative(),
  avgWaitMinutes: z.coerce.number(),
  avgChairMinutes: z.coerce.number(),
  avgArrivalDelayMinutes: z.coerce.number(),
  onTimeRate: z.coerce.number(),
});
export type CreateAgendaBlock = z.input<typeof createAgendaBlockSchema>;
export type CreateWaitlistEntry = z.input<typeof createWaitlistEntrySchema>;

export const agendaMonthSummarySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  days: z.array(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      count: z.number().int().nonnegative(),
      patientIds: z.array(z.string()),
    }),
  ),
});

export const nextSlotSchema = z.object({
  startsAt: z.coerce.string(),
  endsAt: z.coerce.string(),
  staffId: idSchema,
  staffName: z.string().min(1),
});

export const nextSlotsSchema = z.object({
  part: z.enum(["AM", "PM"]).nullable(),
  durationMin: z.number().int().positive(),
  slots: z.array(nextSlotSchema),
});
export type NextSlot = z.infer<typeof nextSlotSchema>;
