export type ImplantSurgeryField =
  | "system"
  | "lengthMm"
  | "diameterMm"
  | "placementDate"
  | "insertionTorqueNcm"
  | "primaryIsq";

export interface ImplantSurgeryData {
  system?: string;
  diameterMm?: number;
  lengthMm?: number;
  placementDate?: string;
  insertionTorqueNcm?: number;
  primaryIsq?: number;
  lotNumber?: string;
  connection?: string;
  notes?: string;
}

export function implantSurgeryDataFromAttributes(
  attributes: Readonly<Record<string, unknown>>,
): ImplantSurgeryData {
  return {
    system: typeof attributes.system === "string" ? attributes.system : "",
    ...(typeof attributes.diameterMm === "number" ? { diameterMm: attributes.diameterMm } : {}),
    ...(typeof attributes.lengthMm === "number" ? { lengthMm: attributes.lengthMm } : {}),
    placementDate:
      typeof attributes.placementDate === "string" ? attributes.placementDate : "",
    ...(typeof attributes.insertionTorqueNcm === "number"
      ? { insertionTorqueNcm: attributes.insertionTorqueNcm }
      : {}),
    ...(typeof attributes.primaryIsq === "number"
      ? { primaryIsq: attributes.primaryIsq }
      : {}),
    lotNumber: typeof attributes.lotNumber === "string" ? attributes.lotNumber : "",
    connection: typeof attributes.connection === "string" ? attributes.connection : "",
    notes: typeof attributes.notes === "string" ? attributes.notes : "",
  };
}

export interface ImplantSurgeryAppointmentLike {
  patientId: string;
  reason: string;
  startsAt: string;
  status?: string;
}

export interface ImplantSurgeryReminder {
  patientId: string;
  title: "Completar datos del implante colocado";
  message: string;
  href: string;
}

const REQUIRED_IMPLANT_SURGERY_FIELDS: readonly ImplantSurgeryField[] = [
  "system",
  "diameterMm",
  "lengthMm",
  "placementDate",
  "insertionTorqueNcm",
  "primaryIsq",
];

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function isImplantSurgeryReason(reason: string): boolean {
  const normalized = normalize(reason);
  if (!/implante|implantologia|all[- ]?on[- ]?[46]/.test(normalized)) return false;

  const explicitSurgery =
    /cirugia|quirurg|colocacion|colocar|insercion|fase quirurgica|all[- ]?on[- ]?[46]/.test(
      normalized,
    );
  if (explicitSurgery) return true;

  if (/revision|control|mantenimiento|impresion|escaneado/.test(normalized)) {
    return false;
  }
  return true;
}

export function implantSurgeryDataHref(patientId: string): string {
  return `/app/patients/${encodeURIComponent(patientId)}/odontogram?action=implant-surgery`;
}

export function implantSurgeryReminderForAppointment(
  appointment: ImplantSurgeryAppointmentLike,
  currentDate: string,
): ImplantSurgeryReminder | null {
  if (appointment.startsAt.slice(0, 10) !== currentDate) return null;
  if (appointment.status === "COMPLETED" || appointment.status === "CANCELLED") return null;
  if (!isImplantSurgeryReason(appointment.reason)) return null;

  return {
    patientId: appointment.patientId,
    title: "Completar datos del implante colocado",
    message:
      "Cirugía de implantes hoy. Al finalizar, registra sistema, diámetro, longitud, fecha, torque de inserción e ISQ.",
    href: implantSurgeryDataHref(appointment.patientId),
  };
}

export function missingImplantSurgeryFields(
  data: Readonly<ImplantSurgeryData>,
): ImplantSurgeryField[] {
  return REQUIRED_IMPLANT_SURGERY_FIELDS.filter((field) => {
    const value = data[field];
    if (typeof value === "number") return !Number.isFinite(value);
    return typeof value !== "string" || value.trim().length === 0;
  });
}
