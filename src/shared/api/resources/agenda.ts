import { z } from "zod";

import type { ApiClient } from "../client";
import { appointmentSchema } from "../contracts";
import {
  agendaAppointmentRequestsSchema,
  agendaAvailabilitySchema,
  agendaBlockSchema,
  agendaContextSchema,
  agendaGameStatusSchema,
  cancelCascadeResultSchema,
  cancelCascadeSchema,
  createAgendaBlockSchema,
  createWaitlistEntrySchema,
  scheduleAppointmentRequestSchema,
  scheduledPlanItemResultSchema,
  schedulePlanItemSchema,
  waitlistEntrySchema,
  waitlistSchema,
} from "../schemas/agenda";
import { encodeId, withQuery } from "./shared";

const looseResultSchema = z.object({ id: z.string().min(1) }).passthrough();

export function createAgendaResource(client: ApiClient) {
  return {
    appointmentRequests: {
      list: () =>
        client.request("/api/agenda/appointment-requests", agendaAppointmentRequestsSchema),
      schedule: (id: string, payload: z.input<typeof scheduleAppointmentRequestSchema>) =>
        client.mutation(
          `/api/agenda/appointment-requests/${encodeId(id)}/schedule`,
          appointmentSchema,
          scheduleAppointmentRequestSchema.parse(payload),
        ),
      cancel: (id: string) =>
        client.mutation(
          `/api/agenda/appointment-requests/${encodeId(id)}/cancel`,
          looseResultSchema,
          {},
        ),
    },
    context: () => client.request("/api/agenda/context", agendaContextSchema),
    gameStatus: () => client.request("/api/agenda/game-status", agendaGameStatusSchema),
    availability: (query: {
      date?: string;
      staffId?: string;
      siteId?: string;
      durationMin?: number;
    }) =>
      client.request(
        withQuery("/api/agenda/availability", query),
        agendaAvailabilitySchema,
      ),
    blocks: {
      create: (payload: z.input<typeof createAgendaBlockSchema>) =>
        client.mutation(
          "/api/agenda/blocks",
          agendaBlockSchema,
          createAgendaBlockSchema.parse(payload),
        ),
    },
    waitlist: {
      list: () => client.request("/api/agenda/waitlist", waitlistSchema),
      create: (payload: z.input<typeof createWaitlistEntrySchema>) =>
        client.mutation(
          "/api/agenda/waitlist",
          waitlistEntrySchema,
          createWaitlistEntrySchema.parse(payload),
        ),
    },
    cancelCascade: (appointmentId: string, reason: string) =>
      client.mutation(
        `/api/appointments/${encodeId(appointmentId)}/cancel-cascade`,
        cancelCascadeResultSchema,
        cancelCascadeSchema.parse({ reason }),
      ),
    schedulePlanItem: (
      planItemId: string,
      payload: z.input<typeof schedulePlanItemSchema>,
    ) =>
      client.mutation(
        `/api/agenda/schedule-plan-item/${encodeId(planItemId)}`,
        scheduledPlanItemResultSchema,
        schedulePlanItemSchema.parse(payload),
      ),
  } as const;
}
