import { z } from "zod";

import type { ApiClient } from "../client";
import { appointmentSchema } from "../contracts";
import {
  budgetResponseSchema,
  claimPatientInvitationSchema,
  claimedPatientAccountSchema,
  createFamilyGrantSchema,
  createPatientInvitationSchema,
  familyGrantSchema,
  familyGrantsSchema,
  patientAppointmentAvailabilitySchema,
  patientAppointmentRequestInputSchema,
  patientAppointmentRequestsSchema,
  patientAvailabilityQuerySchema,
  patientBookingSchema,
  patientInvitationSchema,
  patientPaymentIntentInputSchema,
  patientProjectionSchema,
  patientSourceRecordedSchema,
  patientSourceSchema,
  paymentIntentSchema,
} from "../schemas/portal";
import { encodeId, withQuery } from "./shared";

export function createPortalResource(client: ApiClient) {
  return {
    appointments: {
      availability: (patientId: string, query: z.input<typeof patientAvailabilityQuerySchema>) => {
        const parsed = patientAvailabilityQuerySchema.parse(query);
        return client.request(
          withQuery(`/api/patient/${encodeId(patientId)}/appointment-availability`, parsed),
          patientAppointmentAvailabilitySchema,
        );
      },
      book: (patientId: string, payload: z.input<typeof patientBookingSchema>) =>
        client.mutation(
          `/api/patient/${encodeId(patientId)}/appointments/book`,
          appointmentSchema,
          patientBookingSchema.parse(payload),
        ),
      requests: {
        list: (patientId: string) =>
          client.request(
            `/api/patient/${encodeId(patientId)}/appointment-requests`,
            patientAppointmentRequestsSchema,
          ),
        create: (
          patientId: string,
          payload: z.input<typeof patientAppointmentRequestInputSchema>,
        ) =>
          client.mutation(
            `/api/patient/${encodeId(patientId)}/appointment-requests`,
            z.object({ id: z.string().min(1) }).passthrough(),
            patientAppointmentRequestInputSchema.parse(payload),
          ),
      },
    },
    invitations: {
      create: (patientId: string, payload: z.input<typeof createPatientInvitationSchema>) =>
        client.mutation(
          `/api/patients/${encodeId(patientId)}/invitations`,
          patientInvitationSchema,
          createPatientInvitationSchema.parse(payload),
        ),
      claim: (payload: z.input<typeof claimPatientInvitationSchema>) => {
        const parsed = claimPatientInvitationSchema.parse(payload);
        const { token, ...account } = parsed;
        return client.mutation("/api/patient/claim", claimedPatientAccountSchema, {
          token,
          ...account,
        });
      },
    },
    family: {
      list: (patientId: string) =>
        client.request(`/api/patients/${encodeId(patientId)}/family-grants`, familyGrantsSchema),
      create: (patientId: string, payload: z.input<typeof createFamilyGrantSchema>) =>
        client.mutation(
          `/api/patients/${encodeId(patientId)}/family-grants`,
          familyGrantSchema,
          createFamilyGrantSchema.parse(payload),
        ),
      revoke: (patientId: string, grantId: string) =>
        client.mutation(
          `/api/patients/${encodeId(patientId)}/family-grants/${encodeId(grantId)}`,
          familyGrantSchema,
          {},
          { method: "DELETE" },
        ),
    },
    projection: (patientId: string) =>
      client.request(`/api/patient/${encodeId(patientId)}/projection`, patientProjectionSchema),
    setSourceOnce: (patientId: string, payload: z.input<typeof patientSourceSchema>) =>
      client.mutation(
        `/api/patient/${encodeId(patientId)}/source`,
        patientSourceRecordedSchema,
        patientSourceSchema.parse(payload),
        { method: "PUT" },
      ),
    checkIn: (appointmentId: string) =>
      client.mutation(`/api/patient/check-in/${encodeId(appointmentId)}`, appointmentSchema, {}),
    respondToBudget: (budgetId: string, payload: z.input<typeof budgetResponseSchema>) =>
      client.mutation(
        `/api/patient/budgets/${encodeId(budgetId)}/respond`,
        z.object({ id: z.string().min(1) }).passthrough(),
        budgetResponseSchema.parse(payload),
      ),
    createPaymentIntent: (
      patientId: string,
      payload: z.input<typeof patientPaymentIntentInputSchema>,
    ) =>
      client.mutation(
        `/api/patient/${encodeId(patientId)}/payment-intents`,
        paymentIntentSchema,
        patientPaymentIntentInputSchema.parse(payload),
      ),
  } as const;
}
