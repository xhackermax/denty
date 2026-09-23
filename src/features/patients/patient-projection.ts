import type { Patient } from "@/shared/api";

import type { DemoPatient } from "@/shared/demo/demo-data";

export interface PatientCardView {
  id: string;
  recordNumber: string;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  dni?: string | null;
  lastVisitAt?: string | null;
  nextVisitAt?: string | null;
  balanceCents?: number;
}

export function patientCardFromDemo(patient: DemoPatient): PatientCardView {
  return {
    id: patient.id,
    recordNumber: patient.recordNumber,
    firstName: patient.firstName,
    lastName: patient.lastName,
    ...(patient.photoUrl ? { photoUrl: patient.photoUrl } : {}),
    dni: patient.dni,
    ...(patient.lastVisitAt ? { lastVisitAt: patient.lastVisitAt } : {}),
    ...(patient.nextVisitAt ? { nextVisitAt: patient.nextVisitAt } : {}),
    balanceCents: patient.balanceCents,
  };
}

export function patientCardFromApi(patient: Patient): PatientCardView {
  return {
    id: patient.id,
    recordNumber: patient.recordNumber ?? "—",
    firstName: patient.firstName,
    lastName: patient.lastName,
    ...(patient.photoUrl ? { photoUrl: patient.photoUrl } : {}),
    ...(patient.dni ? { dni: patient.dni } : {}),
    ...(patient.lastVisitAt ? { lastVisitAt: patient.lastVisitAt } : {}),
    ...(patient.nextVisitAt ? { nextVisitAt: patient.nextVisitAt } : {}),
  };
}
