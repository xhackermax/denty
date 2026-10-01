import { agendaClinicalGlyphs, type ClinicalGlyphModel, type RotaShift } from "@/domain";
import type { Appointment, Patient } from "@/shared/api";
import type { AgendaContext } from "@/shared/api/schemas/agenda";

export type AgendaStatus = Appointment["status"];

export interface AgendaAppointmentView {
  id: string;
  patientId: string;
  patientName: string;
  staffId: string;
  siteId?: string;
  cabinetId?: string;
  clinicalPlanItemId?: string;
  startsAt: string;
  endsAt: string;
  status: AgendaStatus;
  reason: string;
  version: number;
  glyph: ClinicalGlyphModel | null;
  glyphs: readonly ClinicalGlyphModel[];
}

export interface AgendaStaffView {
  id: string;
  displayName: string;
  schedules: readonly RotaShift[];
}

export interface AgendaSiteView {
  id: string;
  name: string;
}

export interface AgendaCabinetView {
  id: string;
  name: string;
  siteId: string;
  siteName: string;
}

export function projectApiAppointments(
  appointments: readonly Appointment[],
  patients: readonly Patient[],
): readonly AgendaAppointmentView[] {
  const patientNames = new Map(
    patients.map((patient) => [patient.id, `${patient.firstName} ${patient.lastName}`]),
  );

  return appointments.map((appointment) => {
    const reason = appointment.reason ?? appointment.title;
    const glyphs = agendaClinicalGlyphs({
      tooth: appointment.clinical?.tooth,
      surfaces: appointment.clinical?.surfaces,
      treatmentCode: appointment.clinical?.treatmentCode,
      label: appointment.clinical?.label ?? reason,
      appointmentReason: reason,
      planStatus: appointment.clinical?.planStatus,
      clinicalStatus: appointment.clinical?.clinicalStatus,
      completed: appointment.status === "COMPLETED",
    });
    return {
      id: appointment.id,
      patientId: appointment.patientId,
      patientName: patientNames.get(appointment.patientId) ?? "Paciente",
      staffId: appointment.staffId,
      siteId: appointment.siteId,
      ...(appointment.cabinetId ? { cabinetId: appointment.cabinetId } : {}),
      ...(appointment.clinicalPlanItemId
        ? { clinicalPlanItemId: appointment.clinicalPlanItemId }
        : {}),
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      status: appointment.status,
      reason,
      version: appointment.version,
      glyph: glyphs[0] ?? null,
      glyphs,
    };
  });
}

export function projectApiStaff(context?: AgendaContext): readonly AgendaStaffView[] {
  return (context?.staff ?? []).map((member) => ({
    id: member.id,
    displayName: member.displayName,
    schedules: member.schedules ?? [],
  }));
}

export function projectApiPatients(
  patients: readonly Patient[],
): readonly { id: string; label: string }[] {
  return patients.map((patient) => ({
    id: patient.id,
    label: `${patient.firstName} ${patient.lastName} · ${patient.recordNumber ?? "—"}`,
  }));
}

export function projectApiSites(context?: AgendaContext): readonly AgendaSiteView[] {
  return (context?.sites ?? []).map((site) => ({ id: site.id, name: site.name }));
}

export function projectApiCabinets(context?: AgendaContext): readonly AgendaCabinetView[] {
  return (context?.sites ?? []).flatMap((site) =>
    site.cabinets.map((cabinet) => ({
      id: cabinet.id,
      name: cabinet.name,
      siteId: site.id,
      siteName: site.name,
    })),
  );
}
