import { z } from "zod";

import type { ApiClient } from "../client";
import { patientSchema } from "../contracts";
import {
  acquisitionSourceInputSchema,
  attributionSummarySchema,
  attributionTouchRecordSchema,
  attributionTouchSchema,
  createUserSchema,
  financialDashboardQuerySchema,
  financialDashboardSchema,
  patientAttributionSchema,
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

const okSchema = z.object({ ok: z.literal(true) });

export function createAdminResource(client: ApiClient) {
  return {
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
      resetPassword: (id: string, password: string) =>
        client.mutation(
          `/api/users/${encodeId(id)}/reset-password`,
          okSchema,
          resetUserPasswordSchema.parse({ password }),
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
  } as const;
}
