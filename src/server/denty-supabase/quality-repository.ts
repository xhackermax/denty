import { doctorScorecard } from "@/domain/doctor-performance";
import type { SupabaseRestClient } from "@/server/supabase/rest-client";

type Row = Record<string, unknown>;
const id = (row: Row, key: string) => String(row[key] ?? "");
const number = (row: Row, key: string) => typeof row[key] === "number" ? row[key] as number : null;

export class QualityRepository {
  constructor(private readonly db: SupabaseRestClient, private readonly clinicId: string) {}
  private where() { return { clinic_id: `eq.${this.clinicId}` }; }

  doctors() {
    return this.db.select<Row>("staff_members", {
      select: "id,display_name,role,active", ...this.where(), order: "display_name.asc",
    });
  }

  async patients(search: string) {
    const value = search.trim().replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ -]/g, "").slice(0, 70);
    if (value.length < 2) return [];
    return this.db.select<Row>("patients", {
      select: "id,first_name,last_name,record_number", ...this.where(),
      or: `(first_name.ilike.*${value}*,last_name.ilike.*${value}*,record_number.ilike.*${value}*)`,
      limit: 25,
    });
  }

  async patientAppointments(patientId: string) {
    const found = await this.db.select<Row>("patients", {
      select: "id", ...this.where(), id: `eq.${patientId}`,
    });
    if (!found.length) throw new Error("Paciente no encontrado en esta clínica.");
    const rows = await this.db.select<Row>("appointments", {
      select: "id,starts_at,title,status,staff_id",
      ...this.where(), patient_id: `eq.${patientId}`,
      order: "starts_at.desc", limit: 100,
    });
    return { items: rows.map(r => ({
      id: id(r, "id"), startsAt: id(r, "starts_at"),
      title: id(r, "title"), status: id(r, "status"),
    })) };
  }

  async incidents(patientId?: string, doctorId?: string, status?: string) {
    const query: Record<string, string | number> = {
      select: "*", ...this.where(), order: "occurred_at.desc", limit: 300,
    };
    if (patientId) query.patient_id = `eq.${patientId}`;
    if (doctorId) query.responsible_doctor_id = `eq.${doctorId}`;
    if (status) query.status = `eq.${status}`;
    const items = await this.db.select<Row>("clinical_incidents", query);
    const patients = items.length
      ? await this.db.select<Row>("patients", {
          select: "id,first_name,last_name,record_number", ...this.where(),
          id: `in.(${[...new Set(items.map(i => id(i, "patient_id")))].join(",")})`,
        })
      : [];
    const linkedIds = [...new Set(items.map(i => id(i, "appointment_id")).filter(Boolean))];
    const linked = linkedIds.length ? await this.db.select<Row>("appointments", {
      select: "id,starts_at", ...this.where(), id: `in.(${linkedIds.join(",")})`,
    }) : [];
    const appointmentDates = new Map(linked.map(a => [id(a, "id"), id(a, "starts_at")]));
    const byId = new Map(patients.map(p => [id(p, "id"), p]));
    return {
      items: items.map(item => {
        const patient = byId.get(id(item, "patient_id"));
        return {
          ...item, patientName: patient
            ? `${id(patient, "first_name")} ${id(patient, "last_name")}`.trim() : "Paciente",
          recordNumber: patient?.record_number ?? null,
          appointmentStart: appointmentDates.get(id(item, "appointment_id")) ?? null,
        };
      }),
      truncated: items.length >= 300,
    };
  }

  async createIncident(data: {
    patientId: string; appointmentId?: string | null; doctorId?: string | null;
    title: string; description: string; category: string; cause: string;
    severity: string; repeatTreatment: boolean; costCents: number;
  }) {
    const patients = await this.db.select<Row>("patients", {
      select: "id", ...this.where(), id: `eq.${data.patientId}`,
    });
    if (!patients.length) throw new Error("El paciente no pertenece a esta clínica.");
    if (data.appointmentId) {
      const appointments = await this.db.select<Row>("appointments", {
        select: "id,patient_id", ...this.where(), id: `eq.${data.appointmentId}`,
      });
      if (appointments.length !== 1 || id(appointments[0]!, "patient_id") !== data.patientId)
        throw new Error("La cita no pertenece al paciente indicado.");
    }
    if (data.doctorId) {
      const doctors = await this.db.select<Row>("staff_members", {
        select: "id", ...this.where(), id: `eq.${data.doctorId}`,
      });
      if (!doctors.length) throw new Error("Profesional ajeno a esta clínica.");
    }
    return this.db.insert<Row>("clinical_incidents", {
      clinic_id: this.clinicId, patient_id: data.patientId,
      appointment_id: data.appointmentId || null, responsible_doctor_id: data.doctorId || null,
      title: data.title.trim(), description: data.description.trim(),
      category: data.category, cause: data.cause, severity: data.severity,
      repeat_treatment: data.repeatTreatment, cost_cents: data.costCents,
    });
  }

  async updateIncident(incidentId: string, status: string, correctiveAction: string) {
    return this.db.patch<Row>("clinical_incidents", {
      ...this.where(), id: `eq.${incidentId}`,
    }, {
      status, corrective_action: correctiveAction.trim() || null,
      resolved_at: ["RESOLVED", "CLOSED"].includes(status) ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    });
  }

  async scorecards(start: string, end: string, siteId?: string) {
    const [staff, appointments, executions, incidents, implants, punches] = await Promise.all([
      this.doctors(),
      this.db.selectAll<Row>("appointments", {
        select: "id,patient_id,staff_id,status,site_id,starts_at",
        ...this.where(), starts_at: `gte.${start}`,
      }),
      this.db.selectAll<Row>("clinical_treatment_executions", {
        select: "id,doctor_id,patient_id,appointment_id,treatment_category,attributed_revenue_cents,executed_at",
        ...this.where(), executed_at: `gte.${start}`,
      }),
      this.db.selectAll<Row>("clinical_incidents", {
        select: "responsible_doctor_id,category,repeat_treatment,cause,occurred_at,appointment_id",
        ...this.where(), occurred_at: `gte.${start}`,
      }),
      this.db.selectAll<Row>("implant_placement_outcomes", {
        select: "doctor_id,appointment_id,outcome,failure_kind,recorded_at",
        ...this.where(), recorded_at: `gte.${start}`,
      }),
      this.db.selectAll<Row>("attendance_punches", {
        select: "id,staff_member_id,punch_type,occurred_at,corrects_punch_id,created_at",
        ...this.where(), occurred_at: `gte.${start}`, order: "occurred_at.asc",
      }),
    ]);
    const beforeEnd = (r: Row, key: string) => id(r, key) < end;
    const visits = appointments.filter(a => beforeEnd(a, "starts_at") && (!siteId || id(a, "site_id") === siteId));
    const completed = visits.filter(a => a.status === "COMPLETED");
    const completedIds = new Set(completed.map(a => id(a, "id")));
    const visitIds = new Set(visits.map(a => id(a, "id")));
    const performed = executions.filter(e =>
      beforeEnd(e, "executed_at") && completedIds.has(id(e, "appointment_id")));
    const incidentRows = incidents.filter(r => beforeEnd(r, "occurred_at")
      && (!siteId || (r.appointment_id !== null && visitIds.has(id(r, "appointment_id")))));
    const implantRows = implants.filter(r =>
      beforeEnd(r, "recorded_at") && (!siteId || visitIds.has(id(r, "appointment_id"))));
    const items = staff.filter(s => s.active !== false && /DENTIST|DOCTOR|ODONTO|CLINICIAN/i.test(id(s, "role"))).map(s => {
      const doctorId = id(s, "id");
      const card = doctorScorecard(doctorId,
        performed.map(e => ({
          doctorId: id(e, "doctor_id"), patientId: id(e, "patient_id"),
          appointmentId: id(e, "appointment_id"),
          treatmentCategory: id(e, "treatment_category"),
          attributedRevenueCents: number(e, "attributed_revenue_cents"),
        })),
        completed.map(a => ({
          doctorId: id(a, "staff_id"), patientId: id(a, "patient_id"),
          appointmentId: id(a, "id"), status: id(a, "status"),
        })),
        incidentRows.map(i => ({
          responsibleDoctorId: i.responsible_doctor_id ? id(i, "responsible_doctor_id") : null,
          category: id(i, "category"), repeatTreatment: i.repeat_treatment === true,
          cause: id(i, "cause"),
        })),
        implantRows.map(i => ({
          doctorId: id(i, "doctor_id"), outcome: id(i, "outcome") as "PLACED" | "FAILED" | "DEFERRED",
          failureKind: i.failure_kind ? id(i, "failure_kind") : null,
        })));
      const doctorPunches = punches.filter(p => id(p, "staff_member_id") === doctorId);
      const punchInPeriod = doctorPunches.filter(p => beforeEnd(p, "occurred_at"));
      const replaced = new Set(doctorPunches.map(p => id(p, "corrects_punch_id")).filter(Boolean));
      const effective = punchInPeriod.filter(p => !replaced.has(id(p, "id")))
        .sort((a, b) => id(a, "occurred_at").localeCompare(id(b, "occurred_at")));
      let started: number | null = null;
      let totalMs = 0;
      let anomaly = false;
      for (const punch of effective) {
        const at = Date.parse(id(punch, "occurred_at"));
        if (punch.punch_type === "IN") {
          if (started !== null) anomaly = true;
          started = at;
        } else if (started !== null && at > started) {
          totalMs += at - started; started = null;
        } else { anomaly = true; }
      }
      if (started !== null) anomaly = true;
      return { ...card, doctorName: id(s, "display_name"),
        attendanceHours: effective.length && !anomaly
          ? Math.round(totalMs / 36000) / 100 : null,
        attendanceNote: !effective.length ? "Sin fichajes"
          : anomaly ? "Fichajes incompletos: horas no calculables" : null,
      };
    });
    return { items, warning: "Los tratamientos proceden solo de ejecuciones confirmadas, nunca de planes pendientes. Los importes no atribuidos no se estiman. Las horas de fichaje corresponden a toda la clínica, ya que el fichaje no identifica sede; con filtros de sede no se desglosan." };
  }
}
