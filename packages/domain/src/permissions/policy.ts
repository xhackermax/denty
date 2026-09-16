import type { ActorContext, Permission, Role } from "./types";

const ALL: Permission[] = [
  "patients.read","patients.write_demographics","clinical.read","clinical.write","clinical.approve_plan",
  "agenda.read.all","agenda.read.own","agenda.write","finance.read","finance.write","billing.issue",
  "documents.read","documents.write","documents.sign","lab.read","lab.write","settings.manage",
  "users.manage","audit.read","analysis.read","patient.self"
];

export const rolePermissions: Record<Role, Permission[]> = {
  ADMIN: ALL,
  RECEPTION: ["patients.read","patients.write_demographics","agenda.read.all","agenda.write","finance.read","finance.write","documents.read","documents.write","lab.read","lab.write"],
  DENTIST: ["patients.read","clinical.read","clinical.write","clinical.approve_plan","agenda.read.own","agenda.write","finance.read","finance.write","documents.read","documents.write","documents.sign","lab.read","lab.write"],
  ASSISTANT: ["patients.read","clinical.read","agenda.read.own","agenda.write","documents.read","lab.read","lab.write"],
  PATIENT: ["patient.self","documents.read","documents.sign"]
};

export function normalizeRole(input: string): Role {
  const key = input.trim().toUpperCase();
  if (key === "SECRETARY" || key === "SECRETARIA" || key === "OPERATIONAL") return "RECEPTION";
  if (["ADMIN","RECEPTION","DENTIST","ASSISTANT","PATIENT"].includes(key)) return key as Role;
  throw new Error(`Unknown role: ${input}`);
}

export function permissionsForRole(role: Role): Permission[] { return [...rolePermissions[role]]; }
export function can(actor: ActorContext, permission: Permission): boolean { return actor.permissions.includes(permission); }
export function canAccessAppointment(actor: ActorContext, appointment: { staffId: string }): boolean {
  if (can(actor,"agenda.read.all")) return true;
  return can(actor,"agenda.read.own") && Boolean(actor.staffId) && actor.staffId === appointment.staffId;
}
export function canAccessPatient(actor: ActorContext, patientId: string): boolean {
  if (actor.role !== "PATIENT") return can(actor,"patients.read") || can(actor,"clinical.read");
  return actor.patientIds?.includes(patientId) ?? false;
}
