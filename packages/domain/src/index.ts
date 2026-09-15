export type Role = "admin" | "operational";
export type Permission =
  | "managePatients"
  | "manageAgenda"
  | "manageLabs"
  | "manageFinance"
  | "manageClinicalDocs"
  | "manageSettings"
  | "manageUsers"
  | "viewAuditLog";

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  recordNumber?: string;
  archived?: boolean;
}

export interface StaffMember {
  id: string;
  name: string;
  role: Role;
  siteId?: string;
}

export interface ClinicSite {
  id: string;
  name: string;
  address?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  clinicianId: string;
  siteId: string;
  startsAt: string;
  endsAt: string;
  status: "planned" | "confirmed" | "completed" | "cancelled";
}

export interface LabWork {
  id: string;
  patientId: string;
  title: string;
  labName: string;
  status: "planned" | "sent" | "received" | "delivered";
}

export interface ConsentTemplate {
  id: string;
  title: string;
  version: number;
  body: string;
  active: boolean;
}

export interface ConsentDocument {
  id: string;
  patientId: string;
  templateId: string;
  title: string;
  body: string;
  status: "draft" | "signed";
  signatureData?: string;
}

export interface FinanceSummary {
  totalBudgeted: number;
  paid: number;
  pending: number;
}

export interface PaymentLine {
  total: number;
  paid: number;
}

export interface ClinicSnapshot {
  patients: Patient[];
  staff: StaffMember[];
  sites: ClinicSite[];
  appointments: Appointment[];
  labWorks: LabWork[];
  consentTemplates: ConsentTemplate[];
  consentDocuments: ConsentDocument[];
  payments: PaymentLine[];
  finance: FinanceSummary;
}

export const rolePermissions: Record<Role, Permission[]> = {
  admin: [
    "managePatients",
    "manageAgenda",
    "manageLabs",
    "manageFinance",
    "manageClinicalDocs",
    "manageSettings",
    "manageUsers",
    "viewAuditLog"
  ],
  operational: ["managePatients", "manageAgenda", "manageLabs", "manageFinance", "manageClinicalDocs"]
};

export function fullPatientName(patient: Pick<Patient, "firstName" | "lastName">): string {
  return `${patient.firstName} ${patient.lastName}`.trim();
}

export function canRoleAccess(role: Role, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function createConsentDocument(input: {
  id?: string;
  patient: Patient;
  template: ConsentTemplate;
  clinician?: StaffMember;
  doctor?: StaffMember;
  site: ClinicSite;
  date: string;
}): ConsentDocument {
  const clinician = input.clinician ?? input.doctor;
  if (!clinician) {
    throw new Error("createConsentDocument requires a clinician or doctor");
  }

  const header = [
    `Paciente: ${fullPatientName(input.patient)}`,
    `Doctor/a responsable: ${clinician.name}`,
    `Centro/Sede: ${[input.site.name, input.site.address].filter(Boolean).join(" - ")}`,
    `Fecha: ${input.date}`
  ].join("\n");

  return {
    id: input.id ?? `consent-${input.template.id}-${input.patient.id}`,
    patientId: input.patient.id,
    templateId: input.template.id,
    title: input.template.title,
    body: `${header}\n\n${input.template.body}\n\nFirma del paciente: pendiente de firma digital.`,
    status: "draft"
  };
}

export function calculateFinanceSummary(items: PaymentLine[]): FinanceSummary {
  const totalBudgeted = items.reduce((sum, item) => sum + item.total, 0);
  const paid = items.reduce((sum, item) => sum + item.paid, 0);
  return { totalBudgeted, paid, pending: Math.max(0, totalBudgeted - paid) };
}
