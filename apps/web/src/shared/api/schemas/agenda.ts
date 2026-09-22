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

export const scheduleAppointmentRequestSchema = createAppointmentSchema.partial({
  patientId: true,
});

export const agendaContextSchema = z.object({
  staff: z.array(agendaStaffSchema),
  sites: z.array(agendaSiteSchema),
  actor: z.object({
    role: z.string().min(1),
    staffId: idSchema.nullable().optional(),
  }),
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
