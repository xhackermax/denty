"use client";

import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useEffect } from "react";

import { getSupabaseBrowserClient } from "@/shared/supabase-browser";
import { useActiveTenant } from "@/shared/tenancy/active-context";
import { dentyQueryKeys } from "./keys";

const TABLE_INVALIDATIONS: Record<string, readonly QueryKey[]> = {
  patients: [dentyQueryKeys.patients.root, dentyQueryKeys.dashboard.root],
  appointments: [dentyQueryKeys.appointments.root, dentyQueryKeys.dashboard.root, dentyQueryKeys.analytics.root],
  dental_entities: [dentyQueryKeys.clinical.root],
  periodontal_measurements: [dentyQueryKeys.clinical.root],
  odontogram_snapshots: [dentyQueryKeys.clinical.root],
  clinical_history_events: [dentyQueryKeys.clinical.root],
  clinical_plans: [dentyQueryKeys.clinical.root, dentyQueryKeys.finance.root],
  clinical_plan_items: [dentyQueryKeys.clinical.root, dentyQueryKeys.finance.root],
  documents: [dentyQueryKeys.documents.root, dentyQueryKeys.clinical.root, dentyQueryKeys.dashboard.root],
  prescriptions: [dentyQueryKeys.prescriptions.root],
  lab_works: [dentyQueryKeys.laboratory.root, dentyQueryKeys.finance.root, dentyQueryKeys.analytics.root, dentyQueryKeys.dashboard.root],
  budgets: [dentyQueryKeys.finance.root, dentyQueryKeys.clinical.root, dentyQueryKeys.analytics.root, dentyQueryKeys.dashboard.root],
  invoices: [dentyQueryKeys.finance.root, dentyQueryKeys.analytics.root, dentyQueryKeys.dashboard.root],
  payments: [dentyQueryKeys.finance.root, dentyQueryKeys.analytics.root, dentyQueryKeys.dashboard.root],
  payment_allocations: [dentyQueryKeys.finance.root, dentyQueryKeys.analytics.root],
  alerts: [dentyQueryKeys.alerts.root, dentyQueryKeys.dashboard.root],
  staff_members: [dentyQueryKeys.staff.root, dentyQueryKeys.appointments.root],
  communications: [dentyQueryKeys.communications.root],
  marketing_campaigns: [dentyQueryKeys.campaigns.root, dentyQueryKeys.analytics.root],
};

function tableFromBroadcast(message: { payload?: unknown } | unknown): string | null {
  if (!message || typeof message !== "object") return null;
  const broadcast = message as { payload?: unknown };
  const payload = broadcast.payload;
  if (!payload || typeof payload !== "object") return null;
  const value = payload as Record<string, unknown>;
  if (typeof value.table === "string") return value.table;
  const nested = value.payload;
  if (nested && typeof nested === "object" && typeof (nested as Record<string, unknown>).table === "string") {
    return (nested as Record<string, string>).table ?? null;
  }
  return null;
}

export function DentyRealtimeBridge() {
  const queryClient = useQueryClient();
  const { activeClinicId } = useActiveTenant();

  useEffect(() => {
    if (!activeClinicId) return undefined;
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`clinic:${activeClinicId}`, { config: { private: true } })
      .on("broadcast", { event: "*" }, (message) => {
        const table = tableFromBroadcast(message);
        const keys = table ? TABLE_INVALIDATIONS[table] : undefined;
        const invalidations = keys?.length ? keys : [dentyQueryKeys.dashboard.root];
        for (const queryKey of invalidations) void queryClient.invalidateQueries({ queryKey });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [activeClinicId, queryClient]);

  return null;
}
