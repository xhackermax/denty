import type { Patient } from "@/shared/api";

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
  archivedAt?: string | null;
  version: number;
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
    ...(patient.archivedAt ? { archivedAt: patient.archivedAt } : {}),
    version: patient.version,
  };
}
