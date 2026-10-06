"use client";

import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useEffect } from "react";

import { getSupabaseBrowserClient } from "@/shared/supabase-browser";
import { useActiveTenant } from "@/shared/tenancy/active-context";
import { dentyQueryKeys } from "./keys";

// Keep one table per line: the Stage 3/8/9/10 contract checks read this map line by line.
// prettier-ignore
const TABLE_INVALIDATIONS: Record<string, readonly QueryKey[]> = {
  patients: [dentyQueryKeys.patients.root, dentyQueryKeys.dashboard.root],
  appointments: [dentyQueryKeys.appointments.root, dentyQueryKeys.dashboard.root, dentyQueryKeys.analytics.root, dentyQueryKeys.alerts.root],
  appointment_status_events: [dentyQueryKeys.appointments.root, dentyQueryKeys.dashboard.root, dentyQueryKeys.analytics.root],
  staff_absences: [dentyQueryKeys.appointments.root, dentyQueryKeys.staff.root, dentyQueryKeys.dashboard.root],
  patient_waitlist_requests: [dentyQueryKeys.appointments.root, dentyQueryKeys.portal.root],
  appointment_requests: [dentyQueryKeys.appointments.root, dentyQueryKeys.portal.root],
  clinic_settings: [dentyQueryKeys.appointments.root, dentyQueryKeys.settings.root],
  staff_settings: [dentyQueryKeys.appointments.root, dentyQueryKeys.settings.root],
  dental_entities: [dentyQueryKeys.clinical.root],
  periodontal_measurements: [dentyQueryKeys.clinical.root],
  odontogram_snapshots: [dentyQueryKeys.clinical.root],
  clinical_history_events: [dentyQueryKeys.clinical.root],
  clinical_plans: [dentyQueryKeys.clinical.root, dentyQueryKeys.finance.root],
  clinical_plan_items: [dentyQueryKeys.clinical.root, dentyQueryKeys.finance.root, dentyQueryKeys.analytics.root, dentyQueryKeys.dashboard.root],
  documents: [dentyQueryKeys.documents.root, dentyQueryKeys.clinical.root, dentyQueryKeys.dashboard.root],
  prescriptions: [dentyQueryKeys.prescriptions.root],
  laboratories: [dentyQueryKeys.laboratory.root, dentyQueryKeys.analytics.root, dentyQueryKeys.dashboard.root],
  lab_works: [dentyQueryKeys.laboratory.root, dentyQueryKeys.finance.root, dentyQueryKeys.analytics.root, dentyQueryKeys.dashboard.root, dentyQueryKeys.alerts.root],
  lab_work_status_events: [dentyQueryKeys.laboratory.root, dentyQueryKeys.dashboard.root],
  lab_reworks: [dentyQueryKeys.laboratory.root, dentyQueryKeys.analytics.root],
  lab_attachments: [dentyQueryKeys.laboratory.root],
  laboratory_work_types: [dentyQueryKeys.laboratory.root],
  laboratory_price_list_items: [dentyQueryKeys.laboratory.root],
  supplier_invoices: [dentyQueryKeys.laboratory.root, dentyQueryKeys.finance.root, dentyQueryKeys.analytics.root, dentyQueryKeys.dashboard.root],
  supplier_invoice_items: [dentyQueryKeys.laboratory.root, dentyQueryKeys.analytics.root, dentyQueryKeys.dashboard.root],
  supplier_payments: [dentyQueryKeys.laboratory.root, dentyQueryKeys.finance.root, dentyQueryKeys.analytics.root, dentyQueryKeys.dashboard.root],
  supplier_payment_allocations: [dentyQueryKeys.laboratory.root, dentyQueryKeys.finance.root, dentyQueryKeys.analytics.root, dentyQueryKeys.dashboard.root],
  budgets: [dentyQueryKeys.finance.root, dentyQueryKeys.clinical.root, dentyQueryKeys.analytics.root, dentyQueryKeys.dashboard.root],
  invoice_series: [dentyQueryKeys.finance.root, dentyQueryKeys.settings.root],
  billing_settings: [dentyQueryKeys.finance.root, dentyQueryKeys.settings.root],
  invoices: [dentyQueryKeys.finance.root, dentyQueryKeys.patients.root, dentyQueryKeys.analytics.root, dentyQueryKeys.dashboard.root],
  invoice_lines: [dentyQueryKeys.finance.root, dentyQueryKeys.patients.root, dentyQueryKeys.analytics.root, dentyQueryKeys.dashboard.root],
  payments: [dentyQueryKeys.finance.root, dentyQueryKeys.patients.root, dentyQueryKeys.analytics.root, dentyQueryKeys.dashboard.root],
  payment_allocations: [dentyQueryKeys.finance.root, dentyQueryKeys.patients.root, dentyQueryKeys.analytics.root, dentyQueryKeys.dashboard.root],
  payment_attempts: [dentyQueryKeys.finance.root, dentyQueryKeys.patients.root],
  fiscal_records: [dentyQueryKeys.finance.root, dentyQueryKeys.patients.root, dentyQueryKeys.analytics.root, dentyQueryKeys.dashboard.root],
  alerts: [dentyQueryKeys.alerts.root, dentyQueryKeys.dashboard.root],
  staff_members: [dentyQueryKeys.staff.root, dentyQueryKeys.appointments.root],
  attendance_punches: [dentyQueryKeys.staff.root],
  privacy_requests: [dentyQueryKeys.security.root],
  patient_attribution_touchpoints: [dentyQueryKeys.patients.root, dentyQueryKeys.campaigns.root],
  patient_attribution: [dentyQueryKeys.patients.root, dentyQueryKeys.campaigns.root, dentyQueryKeys.analytics.root],
  communication_messages: [dentyQueryKeys.communications.root],
  communication_consents: [dentyQueryKeys.communications.root],
  communication_outbox: [dentyQueryKeys.communications.root],
  tasks: [dentyQueryKeys.tasks.root],
  communications: [dentyQueryKeys.communications.root],
  marketing_campaigns: [dentyQueryKeys.campaigns.root, dentyQueryKeys.analytics.root],
};

function tableFromBroadcast(
  message: { payload?: unknown } | Record<string, unknown>,
): string | null {
  const payload = message.payload;
  if (!payload || typeof payload !== "object") return null;
  const value = payload as Record<string, unknown>;
  if (typeof value.table === "string") return value.table;
  const nested = value.payload;
  if (nested && typeof nested === "object") {
    const table = (nested as Record<string, unknown>).table;
    if (typeof table === "string") return table;
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
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeClinicId, queryClient]);

  return null;
}
