export const ROLES = ["ADMIN", "RECEPTION", "DENTIST", "ASSISTANT", "PATIENT"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "patients.read",
  "patients.write_demographics",
  "clinical.read",
  "clinical.write",
  "clinical.approve_plan",
  "agenda.read.all",
  "agenda.read.own",
  "agenda.write",
  "finance.read",
  "finance.write",
  "finance.analytics.read",
  "billing.issue",
  "documents.read",
  "documents.write",
  "documents.sign",
  "lab.read",
  "lab.write",
  "settings.manage",
  "users.manage",
  "audit.read",
  "analysis.read",
  "marketing.read",
  "marketing.manage",
  "alerts.read",
  "alerts.manage",
  "communications.read",
  "communications.manage",
  "attribution.manage",
  "billing.settings.manage",
  "prescription.read",
  "prescription.draft.write",
  "prescription.sign",
  "prescription.cancel",
  "prescription.settings.write",
  "prescription.audit.read",
  "patient.self",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export interface ActorContext {
  role: Role;
  permissions: readonly Permission[];
  staffId?: string;
  patientIds?: readonly string[];
}

export type RoutePermission = Permission | "agenda.read";

export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  ADMIN: PERMISSIONS,
  RECEPTION: [
    "patients.read",
    "patients.write_demographics",
    "agenda.read.all",
    "agenda.write",
    "finance.read",
    "finance.write",
    "documents.read",
    "documents.write",
    "lab.read",
    "lab.write",
    "prescription.read",
    "prescription.draft.write",
  ],
  DENTIST: [
    "patients.read",
    "clinical.read",
    "clinical.write",
    "clinical.approve_plan",
    "agenda.read.own",
    "agenda.write",
    "finance.read",
    "finance.write",
    "documents.read",
    "documents.write",
    "documents.sign",
    "lab.read",
    "lab.write",
    "prescription.read",
    "prescription.draft.write",
    "prescription.sign",
    "prescription.cancel",
    "prescription.audit.read",
  ],
  ASSISTANT: [
    "patients.read",
    "clinical.read",
    "agenda.read.own",
    "agenda.write",
    "documents.read",
    "lab.read",
    "lab.write",
    "prescription.read",
  ],
  PATIENT: ["patient.self", "documents.read", "documents.sign"],
};

export const ROUTE_PERMISSIONS: Readonly<Record<string, RoutePermission>> = {
  "/app/patients": "patients.read",
  "/app/agenda": "agenda.read",
  "/app/finance": "finance.read",
  "/app/laboratory": "lab.read",
  "/app/prescriptions": "prescription.read",
  "/app/documents": "documents.read",
  "/app/communications": "communications.read",
  "/app/analysis": "analysis.read",
  "/app/campaigns": "marketing.read",
  "/app/alerts": "alerts.read",
  "/app/settings": "settings.manage",
  "/app/admin": "users.manage",
};

export function permissionsForRole(role: Role): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}

export function normalizeRole(input: string): Role {
  const key = input.trim().toUpperCase();
  if (key === "SECRETARY" || key === "SECRETARIA" || key === "OPERATIONAL") {
    return "RECEPTION";
  }
  if (ROLES.includes(key as Role)) return key as Role;
  throw new Error(`Unknown role: ${input}`);
}

export function can(actor: ActorContext, permission: RoutePermission): boolean {
  if (permission === "agenda.read") {
    return (
      actor.permissions.includes("agenda.read.all") || actor.permissions.includes("agenda.read.own")
    );
  }
  return actor.permissions.includes(permission);
}

export function canAccessAppointment(
  actor: ActorContext,
  appointment: { staffId: string },
): boolean {
  if (actor.permissions.includes("agenda.read.all")) return true;
  return (
    actor.permissions.includes("agenda.read.own") &&
    Boolean(actor.staffId) &&
    actor.staffId === appointment.staffId
  );
}

export function canAccessPatient(actor: ActorContext, patientId: string): boolean {
  if (actor.role !== "PATIENT") {
    return (
      actor.permissions.includes("patients.read") || actor.permissions.includes("clinical.read")
    );
  }
  return actor.patientIds?.includes(patientId) ?? false;
}

export function requiredPermissionForRoute(pathname: string): RoutePermission | null {
  const normalized = pathname.split("?")[0]?.replace(/\/$/, "") || "/";
  const matches = Object.entries(ROUTE_PERMISSIONS)
    .filter(([route]) => normalized === route || normalized.startsWith(`${route}/`))
    .sort(([left], [right]) => right.length - left.length);
  return matches[0]?.[1] ?? null;
}

export type StaffRouteAccessDecision =
  | { kind: "allow" }
  | { kind: "unauthenticated" }
  | { kind: "forbidden"; required: RoutePermission | "staff" };

export function decideStaffRouteAccess(
  actor: ActorContext | null,
  pathname: string,
): StaffRouteAccessDecision {
  if (!actor) return { kind: "unauthenticated" };
  if (actor.role === "PATIENT") {
    return { kind: "forbidden", required: "staff" };
  }

  const required = requiredPermissionForRoute(pathname);
  if (!required) return { kind: "allow" };
  return can(actor, required) ? { kind: "allow" } : { kind: "forbidden", required };
}
