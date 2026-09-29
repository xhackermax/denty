import type { SupabaseRestClient } from "../supabase/rest-client";

interface AlertRow {
  id: string;
  clinic_id: string;
  patient_id: string | null;
  source_type: string;
  source_id: string | null;
  dedupe_key: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "REVIEWED" | "SNOOZED" | "RESOLVED";
  category: string;
  title: string;
  message: string;
  assignee_member_id: string | null;
  due_at: string | null;
  snoozed_until: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface AlertsListResult {
  items: Array<Record<string, unknown> & { id: string }>;
  openCount: number;
  criticalCount: number;
}

function mapAlert(row: AlertRow) {
  return {
    id: row.id,
    patientId: row.patient_id,
    sourceType: row.source_type,
    sourceId: row.source_id,
    dedupeKey: row.dedupe_key,
    priority: row.priority,
    status: row.status,
    category: row.category,
    title: row.title,
    message: row.message,
    assigneeMemberId: row.assignee_member_id,
    dueAt: row.due_at,
    snoozedUntil: row.snoozed_until,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class AlertsRepository {
  constructor(
    private readonly client: SupabaseRestClient,
    private readonly clinicId: string,
  ) {}

  list(): Promise<AlertsListResult> {
    return this.client.rpc<AlertsListResult>("list_open_alerts", { p_clinic_id: this.clinicId });
  }

  async reviewAlert(id: string) {
    return mapAlert(await this.client.rpc<AlertRow>("review_alert", { p_alert_id: id }));
  }

  async resolveAlert(id: string) {
    return mapAlert(await this.client.rpc<AlertRow>("resolve_alert", { p_alert_id: id }));
  }

  async snoozeAlert(id: string, until: string) {
    return mapAlert(
      await this.client.rpc<AlertRow>("snooze_alert", { p_alert_id: id, p_until: until }),
    );
  }

  async assignAlert(id: string, userId: string | null) {
    return mapAlert(
      await this.client.rpc<AlertRow>("assign_alert", { p_alert_id: id, p_user_id: userId }),
    );
  }
}
