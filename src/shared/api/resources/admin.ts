import { z } from "zod";

import type { ApiClient } from "../client";
import { patientSchema } from "../contracts";
import {
  acquisitionSourceInputSchema,
  addPaymentTerminalSchema,
  adminSitesOverviewSchema,
  paymentTerminalsOverviewSchema,
  paymentTerminalsSchema,
  terminalProviderTestResultSchema,
  testTerminalProviderSchema,
  updatePaymentTerminalSchema,
  saveSiteSchema,
  saveStaffMemberSchema,
  setStaffScheduleSchema,
  attributionSummarySchema,
  attributionTouchRecordSchema,
  attributionTouchSchema,
  createUserSchema,
  deleteUserResultSchema,
  financialDashboardQuerySchema,
  financialDashboardSchema,
  patientAttributionSchema,
  resetUserPasswordResultSchema,
  resetUserPasswordSchema,
  updateUserSchema,
  userSchema,
  usersSchema,
  treatmentCatalogCreateSchema,
  treatmentCatalogItemSchema,
  treatmentCatalogSchema,
  treatmentCatalogUpdateSchema,
} from "../schemas/admin";
import { encodeId } from "./shared";
import { withQuery } from "./shared";

export function createAdminResource(client: ApiClient) {
  return {
    paymentTerminals: {
      /** Terminals reception can charge with (no secrets, no provider round trip). */
      forCharging: () => client.request("/api/payment-terminals", paymentTerminalsSchema),
      overview: () =>
        client.request("/api/admin/payment-terminals", paymentTerminalsOverviewSchema),
      add: (payload: z.input<typeof addPaymentTerminalSchema>) =>
        client.mutation(
          "/api/admin/payment-terminals",
          paymentTerminalsOverviewSchema,
          addPaymentTerminalSchema.parse(payload),
        ),
      update: (id: string, payload: z.input<typeof updatePaymentTerminalSchema>) =>
        client.mutation(
          `/api/admin/payment-terminals/${encodeId(id)}`,
          paymentTerminalsOverviewSchema,
          updatePaymentTerminalSchema.parse(payload),
          { method: "PATCH" },
        ),
      remove: (id: string) =>
        client.mutation(
          `/api/admin/payment-terminals/${encodeId(id)}`,
          paymentTerminalsOverviewSchema,
          undefined,
          { method: "DELETE" },
        ),
      test: (payload: z.input<typeof testTerminalProviderSchema>) =>
        client.mutation(
          "/api/admin/payment-terminals/test",
          terminalProviderTestResultSchema,
          testTerminalProviderSchema.parse(payload),
        ),
    },
    sites: {
      overview: () => client.request("/api/admin/sites", adminSitesOverviewSchema),
      create: (payload: z.input<typeof saveSiteSchema>) =>
        client.mutation(
          "/api/admin/sites",
          adminSitesOverviewSchema,
          saveSiteSchema.parse(payload),
        ),
      update: (id: string, payload: z.input<typeof saveSiteSchema>) =>
        client.mutation(
          `/api/admin/sites/${encodeId(id)}`,
          adminSitesOverviewSchema,
          saveSiteSchema.parse(payload),
          { method: "PATCH" },
        ),
      createStaff: (payload: z.input<typeof saveStaffMemberSchema>) =>
        client.mutation(
          "/api/admin/staff",
          adminSitesOverviewSchema,
          saveStaffMemberSchema.parse(payload),
        ),
      updateStaff: (id: string, payload: z.input<typeof saveStaffMemberSchema>) =>
        client.mutation(
          `/api/admin/staff/${encodeId(id)}`,
          adminSitesOverviewSchema,
          saveStaffMemberSchema.parse(payload),
          { method: "PATCH" },
        ),
      setSchedule: (staffId: string, payload: z.input<typeof setStaffScheduleSchema>) =>
        client.mutation(
          `/api/admin/staff/${encodeId(staffId)}/schedule`,
          adminSitesOverviewSchema,
          setStaffScheduleSchema.parse(payload),
          { method: "PUT" },
        ),
    },
    treatmentCatalog: {
      list: () => client.request("/api/admin/treatment-catalog", treatmentCatalogSchema),
      create: (payload: z.input<typeof treatmentCatalogCreateSchema>) =>
        client.mutation(
          "/api/admin/treatment-catalog",
          treatmentCatalogItemSchema,
          treatmentCatalogCreateSchema.parse(payload),
        ),
      update: (id: string, payload: z.input<typeof treatmentCatalogUpdateSchema>) =>
        client.mutation(
          `/api/admin/treatment-catalog/${encodeId(id)}`,
          treatmentCatalogItemSchema,
          treatmentCatalogUpdateSchema.parse(payload),
          { method: "PATCH" },
        ),
    },
    users: {
      list: () => client.request("/api/users", usersSchema),
      create: (payload: z.input<typeof createUserSchema>) =>
        client.mutation("/api/users", userSchema, createUserSchema.parse(payload)),
      update: (id: string, payload: z.input<typeof updateUserSchema>) =>
        client.mutation(`/api/users/${encodeId(id)}`, userSchema, updateUserSchema.parse(payload), {
          method: "PATCH",
        }),
      resetPassword: (id: string, payload: z.input<typeof resetUserPasswordSchema>) =>
        client.mutation(
          `/api/users/${encodeId(id)}/reset-password`,
          resetUserPasswordResultSchema,
          resetUserPasswordSchema.parse(payload),
        ),
      delete: (id: string) =>
        client.mutation(
          `/api/users/${encodeId(id)}`,
          deleteUserResultSchema,
          {},
          { method: "DELETE" },
        ),
    },
    attribution: {
      setSource: (patientId: string, payload: z.input<typeof acquisitionSourceInputSchema>) =>
        client.mutation(
          `/api/patients/${encodeId(patientId)}/source`,
          patientSchema,
          acquisitionSourceInputSchema.parse(payload),
          { method: "PUT" },
        ),
      get: (patientId: string) =>
        client.request(
          `/api/patients/${encodeId(patientId)}/attribution`,
          patientAttributionSchema,
        ),
      addTouch: (patientId: string, payload: z.input<typeof attributionTouchSchema>) =>
        client.mutation(
          `/api/patients/${encodeId(patientId)}/attribution`,
          attributionTouchRecordSchema,
          attributionTouchSchema.parse(payload),
        ),
      summary: () => client.request("/api/admin/attribution/summary", attributionSummarySchema),
    },
    financialDashboard: (query: z.input<typeof financialDashboardQuerySchema> = {}) =>
      client.request(
        withQuery("/api/admin/financial-dashboard", financialDashboardQuerySchema.parse(query)),
        financialDashboardSchema,
      ),
    export: {
      overview: () =>
        client.request(
          "/api/admin/export/overview",
          z.object({
            patientCount: z.number(),
            appointmentCount: z.number(),
            treatmentCount: z.number(),
          }),
        ),
      execute: (entity: "patients" | "appointments" | "treatments", format: "csv" | "xlsx") =>
        client.requestBlob(withQuery(`/api/admin/export/${entity}`, { format })),
    },
  } as const;
}
