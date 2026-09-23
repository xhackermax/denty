import { z } from "zod";

import type { ApiClient } from "../client";
import {
  analyticsItemsSchema,
  analyticsQuerySchema,
  analyticsResultSchema,
  createSupplierInvoiceSchema,
  createTreatmentCostRecipeSchema,
  retireTreatmentCostRecipeSchema,
} from "../schemas/analytics";
import { encodeId, withQuery } from "./shared";

function analyticsPath(path: string, query: z.input<typeof analyticsQuerySchema>): string {
  return withQuery(path, analyticsQuerySchema.parse(query));
}

export function createAnalyticsResource(client: ApiClient) {
  return {
    summary: (query: z.input<typeof analyticsQuerySchema> = {}) =>
      client.request(analyticsPath("/api/analytics/summary", query), analyticsResultSchema),
    comparison: (query: z.input<typeof analyticsQuerySchema> = {}) =>
      client.request(analyticsPath("/api/analytics/comparison", query), analyticsResultSchema),
    specialties: (query: z.input<typeof analyticsQuerySchema> = {}) =>
      client.request(analyticsPath("/api/analytics/specialties", query), analyticsItemsSchema),
    treatments: (query: z.input<typeof analyticsQuerySchema> = {}) =>
      client.request(analyticsPath("/api/analytics/treatments", query), analyticsItemsSchema),
    profitability: (query: z.input<typeof analyticsQuerySchema> = {}) =>
      client.request(analyticsPath("/api/analytics/profitability", query), analyticsItemsSchema),
    doctors: (query: z.input<typeof analyticsQuerySchema> = {}) =>
      client.request(analyticsPath("/api/analytics/doctors", query), analyticsItemsSchema),
    losses: (query: z.input<typeof analyticsQuerySchema> = {}) =>
      client.request(analyticsPath("/api/analytics/losses", query), analyticsResultSchema),
    monthly: (query: z.input<typeof analyticsQuerySchema> = {}) =>
      client.request(analyticsPath("/api/analytics/monthly", query), analyticsItemsSchema),
    events: (query: z.input<typeof analyticsQuerySchema> = {}) =>
      client.request(analyticsPath("/api/analytics/events", query), analyticsItemsSchema),
    drilldown: (category: string, query: z.input<typeof analyticsQuerySchema> = {}) =>
      client.request(
        withQuery("/api/analytics/treatments/drilldown", {
          ...analyticsQuerySchema.parse(query),
          category,
        }),
        analyticsResultSchema,
      ),
    purchases: (query: z.input<typeof analyticsQuerySchema> = {}) =>
      client.request(analyticsPath("/api/analytics/purchases", query), analyticsResultSchema),
    suppliers: () => client.request("/api/suppliers", analyticsItemsSchema),
    recordSupplierInvoice: (payload: z.input<typeof createSupplierInvoiceSchema>) =>
      client.mutation(
        "/api/supplier-invoices",
        z.object({ id: z.string().min(1) }).passthrough(),
        createSupplierInvoiceSchema.parse(payload),
      ),
    costRecipes: {
      list: () => client.request("/api/analytics/cost-recipes", analyticsItemsSchema),
      create: (payload: z.input<typeof createTreatmentCostRecipeSchema>) =>
        client.mutation(
          "/api/analytics/cost-recipes",
          z.object({ id: z.string().min(1) }).passthrough(),
          createTreatmentCostRecipeSchema.parse(payload),
        ),
      retire: (id: string, payload: z.input<typeof retireTreatmentCostRecipeSchema> = {}) =>
        client.mutation(
          `/api/analytics/cost-recipes/${encodeId(id)}/retire`,
          z.object({ id: z.string().min(1) }).passthrough(),
          retireTreatmentCostRecipeSchema.parse(payload),
        ),
    },
  } as const;
}
