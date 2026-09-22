import type { Appointment, Patient } from "@/shared/api";
import type { AgendaContext } from "@/shared/api/schemas/agenda";

import type {
  DemoAppointment,
  DemoPatient,
  DemoStaff,
} from "@/shared/demo/demo-data";

export type AgendaStatus = Appointment["status"];

export interface AgendaAppointmentView {
  id: string;
  patientId: string;
  patientName: string;
  staffId: string;
  siteId?: string;
  startsAt: string;
  endsAt: string;
  status: AgendaStatus;
  reason: string;
  version: number;
}

export interface AgendaStaffView {
  id: string;
  displayName: string;
}

export interface AgendaSiteView {
  id: string;
  name: string;
}

export function projectDemoAppointments(
  appointments: readonly DemoAppointment[],
): readonly AgendaAppointmentView[] {
  return appointments.map((appointment) => ({
    ...appointment,
    version: 1,
  }));
}

export function projectApiAppointments(
  appointments: readonly Appointment[],
  patients: readonly Patient[],
): readonly AgendaAppointmentView[] {
  const patientNames = new Map(
    patients.map((patient) => [
      patient.id,
      `${patient.firstName} ${patient.lastName}`,
    ]),
  );

  return appointments.map((appointment) => ({
    id: appointment.id,
    patientId: appointment.patientId,
    patientName: patientNames.get(appointment.patientId) ?? "Paciente",
    staffId: appointment.staffId,
    siteId: appointment.siteId,
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt,
    status: appointment.status,
    reason: appointment.reason ?? appointment.title,
    version: appointment.version,
  }));
}

export function projectDemoStaff(
  staff: readonly DemoStaff[],
): readonly AgendaStaffView[] {
  return staff.map((member) => ({
    id: member.id,
    displayName: member.displayName,
  }));
}

export function projectApiStaff(
  context?: AgendaContext,
): readonly AgendaStaffView[] {
  return (context?.staff ?? []).map((member) => ({
    id: member.id,
    displayName: member.displayName,
  }));
}

export function projectDemoPatients(
  patients: readonly DemoPatient[],
): readonly { id: string; label: string }[] {
  return patients.map((patient) => ({
    id: patient.id,
    label: `${patient.firstName} ${patient.lastName} · ${patient.recordNumber}`,
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

export function projectApiSites(
  context?: AgendaContext,
): readonly AgendaSiteView[] {
  return (context?.sites ?? []).map((site) => ({ id: site.id, name: site.name }));
}
