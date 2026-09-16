export type Role = "ADMIN" | "RECEPTION" | "DENTIST" | "ASSISTANT" | "PATIENT";

export type Permission =
  | "patients.read" | "patients.write_demographics"
  | "clinical.read" | "clinical.write" | "clinical.approve_plan"
  | "agenda.read.all" | "agenda.read.own" | "agenda.write"
  | "finance.read" | "finance.write" | "billing.issue"
  | "documents.read" | "documents.write" | "documents.sign"
  | "lab.read" | "lab.write"
  | "settings.manage" | "users.manage" | "audit.read" | "analysis.read"
  | "patient.self";

export interface ActorContext {
  userId: string;
  clinicId: string;
  role: Role;
  staffId?: string;
  patientIds?: string[];
  permissions: Permission[];
  sessionId: string;
}
