import { addDaysMadrid, madridLocalDateTime, toMadridISO } from "@/domain/dates";
import type { Appointment, CreateAppointment, UpdateAppointment } from "@/shared/api";
import type { CreateAgendaBlock, CreateWaitlistEntry } from "@/shared/api/schemas/agenda";
import type { CreateAbsence } from "@/shared/api/schemas/core";

import { SupabaseRestError, type SupabaseRestClient } from "../supabase/rest-client";

interface AppointmentRow {
  id: string;
  clinic_id: string;
  patient_id: string;
  staff_id: string;
  site_id: string;
  cabinet_id: string | null;
  clinical_plan_item_id: string | null;
  rescheduled_from_id?: string | null;
  starts_at: string;
  ends_at: string;
  status: Appointment["status"];
  title: string;
  reason: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  arrived_at?: string | null;
  waiting_room_at?: string | null;
  chair_started_at?: string | null;
  completed_at?: string | null;
  no_show_at?: string | null;
  cancelled_at?: string | null;
}

interface AppointmentRpcResult extends Partial<AppointmentRow> {
  conflict?: boolean;
  currentVersion?: number;
}

interface PlanItemClinicalRow {
  id: string;
  status: string;
  tooth: string | null;
  treatment_code: string;
  treatment_code_snapshot: string | null;
  label: string;
  label_snapshot: string | null;
  dental_entity_id: string | null;
}
interface DentalEntitySurfacesRow {
  id: string;
  status: string;
  surfaces_json: string[] | null;
}
interface BlockRow {
  id: string;
  staff_id: string | null;
  site_id: string | null;
  cabinet_id: string | null;
  starts_at: string;
  ends_at: string;
  kind: string;
  reason: string | null;
}

interface StaffRow {
  id: string;
  display_name: string;
  active: boolean;
  role?: string;
  profile_id?: string | null;
  collegiate_number?: string | null;
}
interface SiteRow {
  id: string;
  name: string;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  active?: boolean;
}
interface StaffScheduleRow {
  staff_member_id: string;
  site_id: string | null;
  weekday: number;
  starts_at: string;
  ends_at: string;
}
interface CabinetRow {
  id: string;
  site_id: string;
  name: string;
}
interface SettingsRow {
  clinic_id: string;
  default_plan_visit_gap_days: number;
  updated_at: string;
}
interface StaffSettingsRow {
  staff_member_id: string;
  default_plan_visit_gap_days: number | null;
}
interface WaitlistRow {
  id: string;
  patient_id: string;
  appointment_id: string | null;
  preferred_staff_id: string | null;
  site_id: string | null;
  earliest_at: string | null;
  latest_at: string | null;
  duration_min: number;
  reason: string | null;
  priority: number;
  status: string;
  created_at: string;
  updated_at: string;
}
interface AppointmentRequestRow {
  id: string;
  clinic_id: string;
  patient_id: string;
  preferred_staff_id: string | null;
  site_id: string | null;
  preferred_start_at: string | null;
  preferred_end_at: string | null;
  note: string | null;
  status: "PENDING" | "SCHEDULED" | "CANCELLED";
  scheduled_appointment_id: string | null;
  requested_at: string;
  created_at: string;
  updated_at: string;
}
interface AbsenceRow {
  id: string;
  clinic_id: string;
  staff_member_id: string;
  site_id: string | null;
  starts_at: string;
  ends_at: string;
  type: string;
  reason: string | null;
  status: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export class AgendaRepository {
  constructor(
    private readonly client: SupabaseRestClient,
    private readonly clinicId: string,
  ) {}

  async listAppointments(date?: string, siteId?: string): Promise<Appointment[]> {
    const query: Record<string, string | number | undefined> = {
      select: "*",
      clinic_id: `eq.${this.clinicId}`,
      order: "starts_at.asc",
    };
    if (siteId) query.site_id = `eq.${siteId}`;
    if (date) {
      const start = madridLocalDateTime(date, "00:00");
      const end = addDaysMadrid(start, 1);
      query.starts_at = `gte.${toMadridISO(start)}`;
      query.and = `(starts_at.lt.${toMadridISO(end)})`;
    }
    const rows = await this.client.select<AppointmentRow>("appointments", query);
    return this.attachClinicalContext(rows.map(mapAppointment));
  }

  /**
   * Reads tooth, treatment and surfaces from the linked plan item so the agenda can
   * draw the odontogram glyph without duplicating clinical data on the appointment.
   */
  private async attachClinicalContext(appointments: Appointment[]): Promise<Appointment[]> {
    const planItemIds = [...new Set(appointments.flatMap((item) => item.clinicalPlanItemId ?? []))];
    if (planItemIds.length === 0) return appointments;
    const items = await this.client.select<PlanItemClinicalRow>("clinical_plan_items", {
      select:
        "id,tooth,treatment_code,treatment_code_snapshot,label,label_snapshot,dental_entity_id,status",
      clinic_id: `eq.${this.clinicId}`,
      id: `in.(${planItemIds.join(",")})`,
    });
    const entityIds = [...new Set(items.flatMap((item) => item.dental_entity_id ?? []))];
    const entities = entityIds.length
      ? await this.client.select<DentalEntitySurfacesRow>("dental_entities", {
          select: "id,surfaces_json,status",
          clinic_id: `eq.${this.clinicId}`,
          id: `in.(${entityIds.join(",")})`,
        })
      : [];
    const entitiesById = new Map(entities.map((row) => [row.id, row]));
    const byId = new Map(items.map((item) => [item.id, item]));
    return appointments.map((appointment) => {
      const item = appointment.clinicalPlanItemId
        ? byId.get(appointment.clinicalPlanItemId)
        : undefined;
      if (!item) return appointment;
      return {
        ...appointment,
        clinical: {
          planStatus: item.status ?? null,
          clinicalStatus: item.dental_entity_id
            ? (entitiesById.get(item.dental_entity_id)?.status ?? null)
            : null,
          tooth: item.tooth,
          treatmentCode: item.treatment_code_snapshot ?? item.treatment_code,
          label: item.label_snapshot ?? item.label,
          surfaces: item.dental_entity_id
            ? (entitiesById.get(item.dental_entity_id)?.surfaces_json ?? [])
            : [],
        },
      };
    });
  }

  async listBlocks(date: string, siteId?: string) {
    const start = madridLocalDateTime(date, "00:00");
    const end = addDaysMadrid(start, 1);
    const rows = await this.client.select<BlockRow>("appointment_blocks", {
      select: "id,staff_id,site_id,cabinet_id,starts_at,ends_at,kind,reason",
      clinic_id: `eq.${this.clinicId}`,
      starts_at: `lt.${toMadridISO(end)}`,
      and: `(ends_at.gt.${toMadridISO(start)})`,
      ...(siteId ? { or: `(site_id.is.null,site_id.eq.${siteId})` } : {}),
      order: "starts_at.asc",
    });
    return {
      items: rows.map((row) => ({
        id: row.id,
        staffId: row.staff_id,
        siteId: row.site_id,
        cabinetId: row.cabinet_id,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        kind: row.kind,
        reason: row.reason,
      })),
    };
  }

  async createAppointment(payload: CreateAppointment): Promise<Appointment> {
    const result = await this.client.rpc<AppointmentRpcResult>("book_appointment", {
      p_clinic_id: this.clinicId,
      p_patient_id: payload.patientId,
      p_staff_id: payload.staffId,
      p_site_id: payload.siteId,
      p_cabinet_id: payload.cabinetId ?? null,
      p_clinical_plan_item_id: payload.clinicalPlanItemId ?? null,
      p_starts_at: payload.startsAt,
      p_ends_at: payload.endsAt,
      p_title: payload.title,
      p_reason: payload.reason ?? null,
      p_rescheduled_from_id: payload.rescheduledFromId ?? null,
    });
    return mapRpcAppointment(result);
  }

  async updateAppointment(
    id: string,
    payload: UpdateAppointment,
  ): Promise<Appointment | { conflict: true; currentVersion: number }> {
    const result = await this.client.rpc<AppointmentRpcResult>("update_appointment", {
      p_appointment_id: id,
      p_expected_version: payload.expectedVersion,
      p_patient_id: payload.patientId ?? null,
      p_staff_id: payload.staffId ?? null,
      p_site_id: payload.siteId ?? null,
      p_cabinet_id: payload.cabinetId ?? null,
      p_clinical_plan_item_id: payload.clinicalPlanItemId ?? null,
      p_starts_at: payload.startsAt ?? null,
      p_ends_at: payload.endsAt ?? null,
      p_title: payload.title ?? null,
      p_reason: payload.reason ?? null,
    });
    if (result.conflict)
      return { conflict: true, currentVersion: result.currentVersion ?? payload.expectedVersion };
    return mapRpcAppointment(result);
  }

  async transitionAppointment(
    id: string,
    expectedVersion: number,
    status: Appointment["status"],
    reason?: string,
  ): Promise<Appointment | { conflict: true; currentVersion: number }> {
    const functionName = status === "NO_SHOW" ? "mark_no_show" : "transition_appointment";
    const body =
      status === "NO_SHOW"
        ? { p_appointment_id: id, p_expected_version: expectedVersion, p_reason: reason ?? null }
        : {
            p_appointment_id: id,
            p_expected_version: expectedVersion,
            p_new_status: status,
            p_reason: reason ?? null,
          };
    const result = await this.client.rpc<AppointmentRpcResult>(functionName, body);
    if (result.conflict)
      return { conflict: true, currentVersion: result.currentVersion ?? expectedVersion };
    return mapRpcAppointment(result);
  }

  async getContext(actor: { role: string; staffId?: string | null }) {
    const [staff, sites, cabinets, schedules, settings] = await Promise.all([
      this.client.select<StaffRow>("staff_members", {
        select: "id,display_name,active,role",
        clinic_id: `eq.${this.clinicId}`,
        active: "eq.true",
        order: "display_name.asc",
      }),
      this.client.select<SiteRow>("sites", {
        select: "id,name,city,active",
        clinic_id: `eq.${this.clinicId}`,
        active: "eq.true",
        order: "name.asc",
      }),
      this.client.select<CabinetRow>("cabinets", {
        select: "id,site_id,name",
        clinic_id: `eq.${this.clinicId}`,
        order: "name.asc",
      }),
      this.listWeeklySchedules(),
      this.getSettings(actor.staffId ?? undefined),
    ]);
    return {
      staff: staff.map((row) => ({
        id: row.id,
        displayName: row.display_name,
        active: row.active,
        ...(row.role ? { role: row.role } : {}),
        schedules: schedulesFor(schedules, row.id),
      })),
      sites: sites.map((site) => ({
        id: site.id,
        name: site.name,
        city: site.city ?? null,
        active: site.active ?? true,
        cabinets: cabinets
          .filter((cabinet) => cabinet.site_id === site.id)
          .map((cabinet) => ({ id: cabinet.id, name: cabinet.name })),
      })),
      actor: { role: actor.role, staffId: actor.staffId ?? null },
      settings,
    };
  }

  private listWeeklySchedules() {
    return this.client.select<StaffScheduleRow>("staff_schedules", {
      select: "staff_member_id,site_id,weekday,starts_at,ends_at",
      clinic_id: `eq.${this.clinicId}`,
      active: "eq.true",
      effective_from: "is.null",
      effective_until: "is.null",
      order: "weekday.asc,starts_at.asc",
    });
  }

  /** Administration: every site (active or not) and every professional with their rota. */
  async getSitesOverview() {
    const [sites, cabinets, staff, schedules] = await Promise.all([
      this.client.select<SiteRow>("sites", {
        select: "id,name,city,address,phone,active",
        clinic_id: `eq.${this.clinicId}`,
        order: "name.asc",
      }),
      this.client.select<CabinetRow>("cabinets", {
        select: "id,site_id,name",
        clinic_id: `eq.${this.clinicId}`,
      }),
      this.client.select<StaffRow>("staff_members", {
        select: "id,display_name,active,role,profile_id,collegiate_number",
        clinic_id: `eq.${this.clinicId}`,
        order: "display_name.asc",
      }),
      this.listWeeklySchedules(),
    ]);
    return {
      sites: sites.map((site) => ({
        id: site.id,
        name: site.name,
        city: site.city ?? null,
        address: site.address ?? null,
        phone: site.phone ?? null,
        active: site.active ?? true,
        cabinetCount: cabinets.filter((cabinet) => cabinet.site_id === site.id).length,
      })),
      staff: staff.map((row) => ({
        id: row.id,
        displayName: row.display_name,
        role: (row.role ?? "DENTIST") as "ADMIN" | "RECEPTION" | "DENTIST" | "ASSISTANT",
        active: row.active,
        collegiateNumber: row.collegiate_number ?? null,
        hasLogin: Boolean(row.profile_id),
        schedules: schedulesFor(schedules, row.id),
      })),
    };
  }

  async saveSite(
    siteId: string | null,
    input: {
      name: string;
      city?: string | null | undefined;
      address?: string | null | undefined;
      phone?: string | null | undefined;
      active: boolean;
      cabinetCount: number;
    },
  ) {
    await this.client.rpc("admin_save_site", {
      p_clinic_id: this.clinicId,
      p_site_id: siteId,
      p_name: input.name,
      p_city: input.city ?? null,
      p_address: input.address ?? null,
      p_phone: input.phone ?? null,
      p_active: input.active,
      p_cabinet_count: input.cabinetCount,
    });
    return this.getSitesOverview();
  }

  async saveStaffMember(
    staffId: string | null,
    input: {
      displayName: string;
      role: string;
      active: boolean;
      collegiateNumber?: string | null | undefined;
    },
  ) {
    await this.client.rpc("admin_save_staff_member", {
      p_clinic_id: this.clinicId,
      p_staff_id: staffId,
      p_display_name: input.displayName,
      p_role: input.role,
      p_active: input.active,
      p_collegiate_number: input.collegiateNumber ?? null,
    });
    return this.getSitesOverview();
  }

  async setStaffSchedule(
    staffId: string,
    entries: ReadonlyArray<{ siteId: string; weekday: number; startsAt: string; endsAt: string }>,
  ) {
    await this.client.rpc("admin_set_staff_schedule", {
      p_clinic_id: this.clinicId,
      p_staff_id: staffId,
      p_entries: entries,
    });
    return this.getSitesOverview();
  }

  async availability(input: {
    date: string;
    staffId?: string;
    siteId?: string;
    durationMin?: number;
  }) {
    return this.client.rpc<Record<string, unknown>>("agenda_availability", {
      p_clinic_id: this.clinicId,
      p_date: input.date,
      p_staff_id: input.staffId ?? null,
      p_site_id: input.siteId ?? null,
      p_duration_min: input.durationMin ?? 30,
    });
  }

  async createBlock(payload: CreateAgendaBlock) {
    const row = await this.client.rpc<Record<string, unknown>>("create_agenda_block", {
      p_clinic_id: this.clinicId,
      p_staff_id: payload.staffId ?? null,
      p_site_id: payload.siteId ?? null,
      p_cabinet_id: payload.cabinetId ?? null,
      p_starts_at: payload.startsAt,
      p_ends_at: payload.endsAt,
      p_kind: payload.kind ?? "BLOCK",
      p_reason: payload.reason ?? null,
    });
    return mapLooseRow(row);
  }

  async listWaitlist(patientIds?: readonly string[]) {
    const rows = await this.client.select<WaitlistRow>("patient_waitlist_requests", {
      select: "*",
      clinic_id: `eq.${this.clinicId}`,
      status: "eq.ACTIVE",
      order: "priority.desc,created_at.asc",
    });
    const allowed = patientIds?.length ? new Set(patientIds) : null;
    return {
      items: rows.filter((row) => !allowed || allowed.has(row.patient_id)).map(mapWaitlist),
    };
  }

  async createWaitlist(payload: CreateWaitlistEntry) {
    const row = await this.client.insert<WaitlistRow>("patient_waitlist_requests", {
      clinic_id: this.clinicId,
      patient_id: payload.patientId,
      preferred_staff_id: payload.preferredStaffId ?? null,
      site_id: payload.siteId ?? null,
      earliest_at: payload.earliestAt ?? null,
      latest_at: payload.latestAt ?? null,
      duration_min: payload.durationMin,
      reason: payload.reason ?? null,
      priority: payload.priority,
      status: "ACTIVE",
    });
    return mapWaitlist(row);
  }

  async withdrawWaitlist(id: string) {
    const row = await this.client.rpc<WaitlistRow>("withdraw_waitlist_request", {
      p_request_id: id,
    });
    return mapWaitlist(row);
  }

  async fulfillWaitlist(id: string, appointmentId?: string) {
    const row = await this.client.rpc<WaitlistRow>("fulfill_waitlist_request", {
      p_request_id: id,
      p_appointment_id: appointmentId ?? null,
    });
    return mapWaitlist(row);
  }

  async listAppointmentRequests(patientId?: string) {
    const query: Record<string, string | number | undefined> = {
      select: "*",
      clinic_id: `eq.${this.clinicId}`,
      order: "requested_at.desc",
    };
    if (patientId) query.patient_id = `eq.${patientId}`;
    const rows = await this.client.select<AppointmentRequestRow>("appointment_requests", query);
    return { items: rows.map(mapAppointmentRequest) };
  }

  async createAppointmentRequest(patientId: string, note?: string) {
    const row = await this.client.rpc<AppointmentRequestRow>("create_appointment_request", {
      p_clinic_id: this.clinicId,
      p_patient_id: patientId,
      p_note: note ?? null,
    });
    return mapAppointmentRequest(row);
  }

  async cancelAppointmentRequest(id: string) {
    const row = await this.client.rpc<AppointmentRequestRow>("cancel_appointment_request", {
      p_request_id: id,
    });
    return mapAppointmentRequest(row);
  }

  async scheduleAppointmentRequest(
    id: string,
    payload: {
      staffId: string;
      siteId: string;
      cabinetId?: string | null;
      startsAt: string;
      endsAt: string;
      title: string;
      reason?: string;
    },
  ): Promise<Appointment> {
    const row = await this.client.rpc<AppointmentRpcResult>("schedule_appointment_request", {
      p_request_id: id,
      p_staff_id: payload.staffId,
      p_site_id: payload.siteId,
      p_cabinet_id: payload.cabinetId ?? null,
      p_starts_at: payload.startsAt,
      p_ends_at: payload.endsAt,
      p_title: payload.title,
      p_reason: payload.reason ?? null,
    });
    return mapRpcAppointment(row);
  }

  async getSettings(staffId?: string) {
    const [clinicRows, staffRows] = await Promise.all([
      this.client.select<SettingsRow>("clinic_settings", {
        select: "*",
        clinic_id: `eq.${this.clinicId}`,
        limit: 1,
      }),
      staffId
        ? this.client.select<StaffSettingsRow>("staff_settings", {
            select: "staff_member_id,default_plan_visit_gap_days",
            clinic_id: `eq.${this.clinicId}`,
            staff_member_id: `eq.${staffId}`,
            limit: 1,
          })
        : Promise.resolve([]),
    ]);
    const clinicGap = clinicRows[0]?.default_plan_visit_gap_days ?? 7;
    const staffGap = staffRows[0]?.default_plan_visit_gap_days ?? null;
    return {
      defaultPlanVisitGapDays: staffGap ?? clinicGap,
      clinicDefaultPlanVisitGapDays: clinicGap,
      staffOverridePlanVisitGapDays: staffGap,
    };
  }

  async setSettings(defaultPlanVisitGapDays: number, staffId?: string) {
    await this.client.rpc("set_agenda_settings", {
      p_clinic_id: this.clinicId,
      p_default_gap_days: defaultPlanVisitGapDays,
      p_staff_id: staffId ?? null,
    });
    return this.getSettings(staffId);
  }

  async listAbsences() {
    const rows = await this.client.select<AbsenceRow>("staff_absences", {
      select: "*",
      clinic_id: `eq.${this.clinicId}`,
      status: "neq.CANCELLED",
      order: "starts_at.asc",
    });
    return { items: rows.map(mapAbsence) };
  }

  async createAbsence(payload: CreateAbsence) {
    const row = await this.client.rpc<AbsenceRow>("create_staff_absence", {
      p_clinic_id: this.clinicId,
      p_staff_id: payload.staffId,
      p_site_id: payload.siteId ?? null,
      p_starts_at: payload.startsAt,
      p_ends_at: payload.endsAt,
      p_type: payload.type,
      p_reason: payload.reason ?? null,
    });
    return mapAbsence(row);
  }

  async cancelAbsence(id: string) {
    const row = await this.client.rpc<AbsenceRow>("cancel_staff_absence", { p_absence_id: id });
    return mapAbsence(row);
  }

  async waitTimeMetrics(input: { from: string; to: string; siteId?: string; staffId?: string }) {
    return this.client.rpc<Record<string, unknown>>("analytics_wait_times", {
      p_clinic_id: this.clinicId,
      p_from: input.from,
      p_to: input.to,
      p_site_id: input.siteId ?? null,
      p_staff_id: input.staffId ?? null,
    });
  }
}

function mapAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    clinicId: row.clinic_id,
    patientId: row.patient_id,
    staffId: row.staff_id,
    siteId: row.site_id,
    ...(row.cabinet_id ? { cabinetId: row.cabinet_id } : {}),
    ...(row.clinical_plan_item_id ? { clinicalPlanItemId: row.clinical_plan_item_id } : {}),
    ...(row.rescheduled_from_id ? { rescheduledFromId: row.rescheduled_from_id } : {}),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    title: row.title,
    reason: row.reason,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRpcAppointment(row: AppointmentRpcResult): Appointment {
  if (
    !row.id ||
    !row.clinic_id ||
    !row.patient_id ||
    !row.staff_id ||
    !row.site_id ||
    !row.starts_at ||
    !row.ends_at ||
    !row.status ||
    !row.title ||
    !row.version ||
    !row.created_at ||
    !row.updated_at
  ) {
    throw new SupabaseRestError("Supabase devolvió una cita incompleta.", 502, row);
  }
  return mapAppointment(row as AppointmentRow);
}

function mapLooseRow(row: Record<string, unknown>) {
  return {
    ...row,
    id: String(row.id ?? ""),
    startsAt: String(row.starts_at ?? ""),
    endsAt: String(row.ends_at ?? ""),
  };
}
function mapWaitlist(row: WaitlistRow) {
  return {
    id: row.id,
    patientId: row.patient_id,
    ...(row.appointment_id ? { appointmentId: row.appointment_id } : {}),
    ...(row.preferred_staff_id ? { preferredStaffId: row.preferred_staff_id } : {}),
    ...(row.site_id ? { siteId: row.site_id } : {}),
    ...(row.earliest_at ? { earliestAt: row.earliest_at } : {}),
    ...(row.latest_at ? { latestAt: row.latest_at } : {}),
    durationMin: row.duration_min,
    reason: row.reason,
    priority: row.priority,
    status: row.status,
    active: row.status === "ACTIVE",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
function mapAppointmentRequest(row: AppointmentRequestRow) {
  return {
    id: row.id,
    patientId: row.patient_id,
    status: row.status,
    requestedAt: row.requested_at,
    note: row.note,
    ...(row.preferred_staff_id ? { preferredStaffId: row.preferred_staff_id } : {}),
    ...(row.site_id ? { siteId: row.site_id } : {}),
    ...(row.preferred_start_at ? { preferredStartAt: row.preferred_start_at } : {}),
    ...(row.preferred_end_at ? { preferredEndAt: row.preferred_end_at } : {}),
    ...(row.scheduled_appointment_id
      ? { scheduledAppointmentId: row.scheduled_appointment_id }
      : {}),
  };
}
function mapAbsence(row: AbsenceRow) {
  return {
    id: row.id,
    clinicId: row.clinic_id,
    staffId: row.staff_member_id,
    siteId: row.site_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    type: row.type,
    reason: row.reason,
    status: row.status,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function schedulesFor(rows: readonly StaffScheduleRow[], staffId: string) {
  return rows
    .filter((row) => row.staff_member_id === staffId && row.site_id)
    .map((row) => ({
      siteId: row.site_id as string,
      weekday: row.weekday,
      startsAt: row.starts_at.slice(0, 5),
      endsAt: row.ends_at.slice(0, 5),
    }));
}
