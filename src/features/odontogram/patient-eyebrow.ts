export interface EyebrowPatient {
  firstName: string;
  lastName: string;
  recordNumber: string;
}

/** Who the chart belongs to, as staff recognise them: name plus record number. */
export function patientEyebrow(patient: EyebrowPatient | undefined): string {
  if (!patient) return "Paciente";
  const name = [patient.firstName, patient.lastName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");
  return `${name} · ${patient.recordNumber.trim()}`;
}
