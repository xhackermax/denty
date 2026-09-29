import type { Patient, UpdatePatient } from "@/shared/api/contracts";

export interface PatientEditDraft {
  firstName: string;
  lastName: string;
  dni: string;
  phone: string;
  email: string;
  birthDate: string;
  declaredSource: string;
  declaredSourceDetail: string;
}

export function patientEditDraft(patient: Patient): PatientEditDraft {
  return {
    firstName: patient.firstName ?? "",
    lastName: patient.lastName ?? "",
    dni: patient.dni ?? "",
    phone: patient.phone ?? "",
    email: patient.email ?? "",
    birthDate: patient.birthDate ?? "",
    declaredSource: patient.declaredSource ?? "",
    declaredSourceDetail: patient.declaredSourceDetail ?? "",
  };
}

export type PatientEditResult =
  { ok: true; payload: UpdatePatient | null } | { ok: false; error: string };

/**
 * Turns the edit form into a minimal PATCH: only changed fields are sent and an
 * emptied optional field becomes null so the server clears it.
 */
export function buildPatientUpdate(patient: Patient, draft: PatientEditDraft): PatientEditResult {
  const firstName = draft.firstName.trim();
  const lastName = draft.lastName.trim();
  if (!firstName || !lastName) return { ok: false, error: "Nombre y apellidos son obligatorios." };
  const email = draft.email.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, error: "El email no tiene un formato válido." };
  const birthDate = draft.birthDate.trim();
  if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate))
    return { ok: false, error: "La fecha de nacimiento no es válida." };

  const original = patientEditDraft(patient);
  const payload: Record<string, unknown> = {};
  if (firstName !== original.firstName) payload.firstName = firstName;
  if (lastName !== original.lastName) payload.lastName = lastName;
  const normalize: Partial<Record<keyof PatientEditDraft, (value: string) => string>> = {
    dni: (value) => value.trim().toUpperCase(),
    email: (value) => value.trim().toLowerCase(),
  };
  const optional: Array<keyof PatientEditDraft> = [
    "dni",
    "phone",
    "email",
    "birthDate",
    "declaredSource",
    "declaredSourceDetail",
  ];
  for (const key of optional) {
    const clean = normalize[key] ?? ((value: string) => value.trim());
    const value = clean(draft[key]);
    if (value === clean(original[key])) continue;
    payload[key] = value || null;
  }
  if (Object.keys(payload).length === 0) return { ok: true, payload: null };
  return {
    ok: true,
    payload: { ...payload, expectedVersion: patient.version } as UpdatePatient,
  };
}
