import type { z } from "zod";

import { analyticsQuerySchema } from "@/shared/api/schemas/analytics";
import type { SupabaseRestClient } from "../supabase/rest-client";

export type AnalyticsQuery = z.output<typeof analyticsQuerySchema>;

function rpcScope(clinicId: string, query: AnalyticsQuery) {
  return {
    p_clinic_id: clinicId,
    p_start: query.start ?? null,
    p_end: query.end ?? null,
    p_site_id: query.siteId ?? null,
    p_staff_id: query.staffId ?? null,
  };
}

export class AnalyticsRepository {
  constructor(
    private readonly client: SupabaseRestClient,
    private readonly clinicId: string,
  ) {}

  summary(query: AnalyticsQuery) {
    return this.client.rpc<Record<string, unknown>>(
      "analytics_summary",
      rpcScope(this.clinicId, query),
    );
  }

  treatments(query: AnalyticsQuery) {
    return this.client.rpc<{ items: Record<string, unknown>[] }>("analytics_treatments", {
      ...rpcScope(this.clinicId, query),
      p_specialty: query.specialty ?? null,
      p_category: query.category ?? null,
      p_limit: query.limit ?? 100,
    });
  }

  profitability(query: AnalyticsQuery) {
    return this.client.rpc<{ items: Record<string, unknown>[] }>("analytics_profitability", {
      ...rpcScope(this.clinicId, query),
      p_specialty: query.specialty ?? null,
      p_category: query.category ?? null,
      p_limit: query.limit ?? 100,
    });
  }

  doctors(query: AnalyticsQuery) {
    return this.client.rpc<{ items: Record<string, unknown>[] }>("analytics_doctors", {
      ...rpcScope(this.clinicId, query),
      p_limit: query.limit ?? 100,
    });
  }

  monthly(query: AnalyticsQuery) {
    return this.client.rpc<{ items: Record<string, unknown>[] }>("analytics_monthly", {
      ...rpcScope(this.clinicId, query),
      p_limit: query.limit ?? 120,
    });
  }

  periods(query: AnalyticsQuery) {
    return this.client.rpc<{ items: Record<string, unknown>[] }>("analytics_periods", {
      ...rpcScope(this.clinicId, query),
      p_granularity: query.granularity ?? "month",
      p_limit: query.limit ?? 120,
    });
  }

  specialties(query: AnalyticsQuery) {
    return this.client.rpc<{ items: Record<string, unknown>[] }>("analytics_specialties", {
      ...rpcScope(this.clinicId, query),
      p_limit: query.limit ?? 100,
    });
  }

  kpiDefinitions() {
    return this.client.rpc<Record<string, unknown>>("analytics_kpi_definitions", {});
  }
}
