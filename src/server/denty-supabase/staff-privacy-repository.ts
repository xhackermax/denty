import type { SupabaseRestClient } from "../supabase/rest-client";

interface AttendanceRow {
  id: string;
  clinic_id: string;
  staff_member_id: string;
  profile_id: string;
  punch_type: "IN" | "OUT";
  occurred_at: string;
  source: string;
  corrects_punch_id: string | null;
  correction_reason: string | null;
  created_at: string;
}
interface PrivacyRow {
  id: string;
  clinic_id: string;
  patient_id: string;
  request_type: "ACCESS" | "EXPORT" | "RECTIFICATION" | "RESTRICTION" | "ERASURE";
  status: "PENDING" | "IN_REVIEW" | "COMPLETED" | "REJECTED";
  requested_at: string;
  due_at: string;
  assigned_to: string | null;
  request_note: string | null;
  resolution_note: string | null;
  resolution_document_id: string | null;
  closed_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

function madridDate(value: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
const punch = (r: AttendanceRow) => ({
  id: r.id,
  staffId: r.staff_member_id,
  profileId: r.profile_id,
  type: r.punch_type,
  occurredAt: r.occurred_at,
  source: r.source,
  correctsPunchId: r.corrects_punch_id,
  correctionReason: r.correction_reason,
  createdAt: r.created_at,
});
const privacy = (r: PrivacyRow) => ({
  id: r.id,
  patientId: r.patient_id,
  type: r.request_type,
  status: r.status,
  requestedAt: r.requested_at,
  dueAt: r.due_at,
  assignedTo: r.assigned_to,
  requestNote: r.request_note,
  resolutionNote: r.resolution_note,
  resolutionDocumentId: r.resolution_document_id,
  closedAt: r.closed_at,
  version: r.version,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export class StaffPrivacyRepository {
  constructor(
    private readonly client: SupabaseRestClient,
    private readonly clinicId: string,
    private readonly profileId: string,
  ) {}

  async attendanceMe(date: string) {
    const rows = await this.client.select<AttendanceRow>("attendance_punches", {
      select: "*",
      clinic_id: `eq.${this.clinicId}`,
      profile_id: `eq.${this.profileId}`,
      order: "occurred_at.asc",
    });
    const punches = rows.filter((row) => madridDate(row.occurred_at) === date).map(punch);
    const last = punches.at(-1);
    return {
      date,
      timeZone: "Europe/Madrid",
      nextAction: last?.type === "IN" ? ("OUT" as const) : ("IN" as const),
      punches,
    };
  }

  async clock() {
    return this.client.rpc<{
      punch: ReturnType<typeof punch>;
      nextAction: "IN" | "OUT";
      date: string;
    }>("clock_attendance", {
      p_clinic_id: this.clinicId,
      p_occurred_at: new Date().toISOString(),
    });
  }

  async daily(date: string) {
    const rows = await this.client.select<AttendanceRow>("attendance_punches", {
      select: "*",
      clinic_id: `eq.${this.clinicId}`,
      order: "occurred_at.asc",
    });
    const dayRows = rows.filter((row) => madridDate(row.occurred_at) === date);
    const grouped = new Map<string, AttendanceRow[]>();
    for (const row of dayRows)
      grouped.set(row.staff_member_id, [...(grouped.get(row.staff_member_id) ?? []), row]);
    return {
      date,
      timeZone: "Europe/Madrid",
      rows: [...grouped.entries()].map(([userId, entries]) => ({
        userId,
        staffId: userId,
        punches: entries.map(punch),
      })),
    };
  }

  async correctPunch(id: string, occurredAt: string, reason?: string) {
    const row = await this.client.rpc<AttendanceRow>("correct_attendance_punch", {
      p_punch_id: id,
      p_occurred_at: occurredAt,
      p_reason: reason ?? "Corrección administrativa",
    });
    return punch(row);
  }

  async listPrivacy() {
    const rows = await this.client.select<PrivacyRow>("privacy_requests", {
      select: "*",
      clinic_id: `eq.${this.clinicId}`,
      order: "requested_at.desc",
    });
    return { items: rows.map(privacy) };
  }
  async createPrivacy(input: { patientId: string; type: string; note?: string }) {
    return privacy(
      await this.client.rpc<PrivacyRow>("create_privacy_request", {
        p_clinic_id: this.clinicId,
        p_patient_id: input.patientId,
        p_type: input.type,
        p_note: input.note ?? null,
      }),
    );
  }
  async updatePrivacy(
    id: string,
    input: {
      status: string;
      resolutionNote?: string;
      assignedTo?: string | null;
      resolutionDocumentId?: string | null;
      expectedVersion?: number;
    },
  ) {
    return privacy(
      await this.client.rpc<PrivacyRow>("transition_privacy_request", {
        p_request_id: id,
        p_status: input.status,
        p_resolution_note: input.resolutionNote ?? null,
        p_assigned_to: input.assignedTo ?? null,
        p_resolution_document_id: input.resolutionDocumentId ?? null,
        p_expected_version: input.expectedVersion ?? null,
      }),
    );
  }
}
