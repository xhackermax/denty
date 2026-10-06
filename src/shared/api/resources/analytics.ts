import { z } from "zod";

import type { ApiClient } from "../client";
import {
  analyticsItemsSchema,
  analyticsKpiDefinitionsSchema,
  analyticsMetricItemsSchema,
  analyticsQuerySchema,
  analyticsResultSchema,
  createTreatmentCostRecipeSchema,
  retireTreatmentCostRecipeSchema,
} from "../schemas/analytics";
import { encodeId, withQuery } from "./shared";

function analyticsPath(path: string, query: z.input<typeof analyticsQuerySchema>): string {
  return withQuery(path, analyticsQuerySchema.parse(query));
}

export function createAnalyticsResource(client: ApiClient) {
  return {
    kpiDefinitions: () =>
      client.request("/api/analytics/kpi-definitions", analyticsKpiDefinitionsSchema),
    summary: (query: z.input<typeof analyticsQuerySchema> = {}) =>
      client.request(analyticsPath("/api/analytics/summary", query), analyticsResultSchema),
    comparison: (query: z.input<typeof analyticsQuerySchema> = {}) =>
      client.request(analyticsPath("/api/analytics/comparison", query), analyticsResultSchema),
    specialties: (query: z.input<typeof analyticsQuerySchema> = {}) =>
      client.request(
        analyticsPath("/api/analytics/specialties", query),
        analyticsMetricItemsSchema,
      ),
    treatments: (query: z.input<typeof analyticsQuerySchema> = {}) =>
      client.request(analyticsPath("/api/analytics/treatments", query), analyticsMetricItemsSchema),
    profitability: (query: z.input<typeof analyticsQuerySchema> = {}) =>
      client.request(
        analyticsPath("/api/analytics/profitability", query),
        analyticsMetricItemsSchema,
      ),
    doctors: (query: z.input<typeof analyticsQuerySchema> = {}) =>
      client.request(analyticsPath("/api/analytics/doctors", query), analyticsMetricItemsSchema),
    losses: (query: z.input<typeof analyticsQuerySchema> = {}) =>
      client.request(analyticsPath("/api/analytics/losses", query), analyticsResultSchema),
    monthly: (query: z.input<typeof analyticsQuerySchema> = {}) =>
      client.request(analyticsPath("/api/analytics/monthly", query), analyticsMetricItemsSchema),
    periods: (query: z.input<typeof analyticsQuerySchema> = {}) =>
      client.request(analyticsPath("/api/analytics/periods", query), analyticsMetricItemsSchema),
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
