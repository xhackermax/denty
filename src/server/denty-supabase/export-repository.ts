import { dateYMDMadrid, hhmm } from "@/domain/dates";
import type { SupabaseRestClient } from "../supabase/rest-client";

export type ExportEntity = "patients" | "appointments" | "treatments";
export interface ExportTable {
  headers: string[];
  rows: (string | number | null)[][];
}
interface PatientRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  created_at: string;
}
interface AppointmentRow {
  id: string;
  patient_id: string;
  staff_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
}
interface PlanRow {
  id: string;
  patient_id: string;
}
interface TreatmentRow {
  id: string;
  plan_id: string;
  label: string;
  label_snapshot: string | null;
  status: string;
  price_cents: number | null;
  price_snapshot_cents: number | null;
  tooth: string | null;
  created_at: string;
}
const patientColumns = "id,first_name,last_name,email,phone,birth_date,created_at";
const patientName = (patient: PatientRow) =>
  [patient.first_name, patient.last_name].filter(Boolean).join(" ");

export class ExportRepository {
  constructor(
    private readonly client: SupabaseRestClient,
    private readonly clinicId: string,
  ) {}

  private query(select: string) {
    return { select, clinic_id: `eq.${this.clinicId}`, order: "id.asc" };
  }

  async overview() {
    const count = async (table: string, activePatients = false) => {
      const result = await this.client.selectPage<{ id: string }>(
        table,
        {
          ...this.query("id"),
          ...(activePatients ? { archived_at: "is.null" } : {}),
        },
        { offset: 0, limit: 1 },
      );
      return result.total;
    };
    const [patientCount, appointmentCount, treatmentCount] = await Promise.all([
      count("patients", true),
      count("appointments"),
      count("clinical_plan_items"),
    ]);
    return { patientCount, appointmentCount, treatmentCount };
  }

  async table(entity: ExportEntity): Promise<ExportTable> {
    const patients = await this.client.selectAll<PatientRow>("patients", {
      ...this.query(patientColumns),
      ...(entity === "patients" ? { archived_at: "is.null" } : {}),
    });
    if (entity === "patients")
      return {
        headers: ["ID", "Nombre", "Email", "Teléfono", "Fecha de nacimiento", "Creado"],
        rows: patients.map((p) => [
          p.id,
          patientName(p),
          p.email,
          p.phone,
          p.birth_date,
          p.created_at,
        ]),
      };
    const patientNames = new Map(patients.map((p) => [p.id, patientName(p)]));
    if (entity === "appointments") {
      const [appointments, staff] = await Promise.all([
        this.client.selectAll<AppointmentRow>(
          "appointments",
          this.query("id,patient_id,staff_id,starts_at,ends_at,status"),
        ),
        this.client.selectAll<{ id: string; display_name: string }>(
          "staff_members",
          this.query("id,display_name"),
        ),
      ]);
      const staffNames = new Map(staff.map((s) => [s.id, s.display_name]));
      return {
        headers: ["ID", "Paciente", "Doctor", "Fecha", "Hora", "Duración (min)", "Estado"],
        rows: appointments.map((a) => [
          a.id,
          patientNames.get(a.patient_id) ?? a.patient_id,
          staffNames.get(a.staff_id) ?? a.staff_id,
          dateYMDMadrid(a.starts_at),
          hhmm(a.starts_at),
          (Date.parse(a.ends_at) - Date.parse(a.starts_at)) / 60000,
          a.status,
        ]),
      };
    }
    const [plans, treatments] = await Promise.all([
      this.client.selectAll<PlanRow>("clinical_plans", this.query("id,patient_id")),
      this.client.selectAll<TreatmentRow>(
        "clinical_plan_items",
        this.query(
          "id,plan_id,label,label_snapshot,status,price_cents,price_snapshot_cents,tooth,created_at",
        ),
      ),
    ]);
    const planPatients = new Map(plans.map((p) => [p.id, p.patient_id]));
    return {
      headers: ["ID", "Paciente", "Descripción", "Estado", "Importe (EUR)", "Fecha", "Pieza"],
      rows: treatments.map((t) => {
        const patientId = planPatients.get(t.plan_id);
        const price = t.price_snapshot_cents ?? t.price_cents;
        return [
          t.id,
          patientId ? (patientNames.get(patientId) ?? patientId) : null,
          t.label_snapshot ?? t.label,
          t.status,
          price == null ? null : price / 100,
          t.created_at ? dateYMDMadrid(t.created_at) : null,
          t.tooth,
        ];
      }),
    };
  }
}
