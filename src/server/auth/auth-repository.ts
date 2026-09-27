import crypto from "node:crypto";

import { permissionsForRole, type Permission, type Role } from "@/domain/permissions";

import { SupabaseRestError, type SupabaseRestClient } from "../supabase/rest-client";

const BOOTSTRAP_CLINIC_ID = "00000000-0000-4000-8000-000000000001";

interface DentyUserRow {
  id: string;
  clinic_id: string;
  username: string;
  display_name: string;
  role: Role;
  password_hash: string;
  permissions: Permission[] | null;
  active: boolean;
  patient_id: string | null;
}

interface ClinicRow {
  id: string;
}

interface PatientLoginRow {
  id: string;
  clinic_id: string;
  record_number: string | null;
  first_name: string;
  last_name: string;
  dni: string | null;
}

export interface AuthenticatedActor {
  userId: string;
  clinicId: string;
  displayName: string;
  role: Role;
  permissions: Permission[];
  patientIds?: string[] | undefined;
}

export class AuthRepository {
  constructor(private readonly client: SupabaseRestClient) {}

  async login(identifier: string, password: string): Promise<AuthenticatedActor | null> {
    const normalizedIdentifier = normalizeIdentifier(identifier);
    const hasUsers = await this.hasAnyLocalUser();
    if (!hasUsers && normalizedIdentifier === "admin" && password === "admin") {
      return this.bootstrapAdmin();
    }

    const user = await this.findUser(normalizedIdentifier);
    if (user?.active && verifyPassword(password, user.password_hash)) {
      return {
        userId: user.id,
        clinicId: user.clinic_id,
        displayName: user.display_name,
        role: user.role,
        permissions: user.permissions ?? permissionsForRole(user.role),
        ...(user.patient_id ? { patientIds: [user.patient_id] } : {}),
      };
    }

    const patient = await this.findPatientForPortalLogin(identifier, password);
    if (!patient) return null;
    return {
      userId: `patient:${patient.id}`,
      clinicId: patient.clinic_id,
      displayName: `${patient.first_name} ${patient.last_name}`.trim(),
      role: "PATIENT",
      permissions: permissionsForRole("PATIENT"),
      patientIds: [patient.id],
    };
  }

  async listUsers(clinicId: string) {
    const rows = await this.client.select<DentyUserRow>("denty_users", {
      select: "id,display_name,role,active,username",
      clinic_id: `eq.${clinicId}`,
      order: "display_name.asc",
    });
    return {
      items: rows.map((row) => ({
        id: row.id,
        displayName: row.display_name,
        role: row.role,
        active: row.active,
        username: row.username,
      })),
    };
  }

  async createUser(input: {
    clinicId: string;
    username: string;
    displayName: string;
    role: Role;
    password: string;
    permissions?: Permission[] | undefined;
  }) {
    const permissions = input.permissions ?? permissionsForRole(input.role);
    const row = await this.client.insert<DentyUserRow>("denty_users", {
      clinic_id: input.clinicId,
      username: normalizeIdentifier(input.username),
      display_name: input.displayName,
      role: input.role,
      password_hash: hashPassword(input.password),
      permissions,
      active: true,
      patient_id: null,
    });
    return {
      id: row.id,
      displayName: row.display_name,
      role: row.role,
      active: row.active,
      username: row.username,
    };
  }

  private async hasAnyLocalUser() {
    try {
      const rows = await this.client.select<DentyUserRow>("denty_users", {
        select: "id",
        limit: 1,
      });
      return rows.length > 0;
    } catch (caught) {
      if (isMissingDentyUsersTable(caught)) return false;
      throw caught;
    }
  }

  private async bootstrapAdmin(): Promise<AuthenticatedActor> {
    const clinic = await this.resolveBootstrapClinic();
    const permissions = permissionsForRole("ADMIN");
    let user: DentyUserRow | null = null;
    try {
      user = await this.client.insert<DentyUserRow>("denty_users", {
        clinic_id: clinic.id,
        username: "admin",
        display_name: "Administrador",
        role: "ADMIN",
        password_hash: hashPassword("admin"),
        permissions,
        active: true,
        patient_id: null,
      });
    } catch (caught) {
      if (!isMissingDentyUsersTable(caught)) throw caught;
    }

    return {
      userId: user?.id ?? "bootstrap-admin",
      clinicId: clinic.id,
      displayName: user?.display_name ?? "Administrador",
      role: user?.role ?? "ADMIN",
      permissions: user?.permissions ?? permissions,
    };
  }

  private async resolveBootstrapClinic(): Promise<ClinicRow> {
    try {
      const rows = await this.client.select<ClinicRow>("clinics", {
        select: "id",
        id: `eq.${BOOTSTRAP_CLINIC_ID}`,
        limit: 1,
      });
      const existing = rows[0];
      if (existing) return existing;
      return await this.client.insert<ClinicRow>("clinics", {
        id: BOOTSTRAP_CLINIC_ID,
        name: "Denty",
      });
    } catch (caught) {
      if (!isSupabasePermissionDenied(caught)) throw caught;
      return { id: BOOTSTRAP_CLINIC_ID };
    }
  }

  private async findUser(username: string): Promise<DentyUserRow | null> {
    const rows = await this.client.select<DentyUserRow>("denty_users", {
      select: "*",
      username: `eq.${username}`,
      active: "eq.true",
      limit: 1,
    });
    return rows[0] ?? null;
  }

  private async findPatientForPortalLogin(
    recordNumber: string,
    dni: string,
  ): Promise<PatientLoginRow | null> {
    const rows = await this.client.select<PatientLoginRow>("patients", {
      select: "id,clinic_id,record_number,first_name,last_name,dni",
      record_number: `eq.${recordNumber.trim()}`,
      dni: `eq.${dni.trim()}`,
      archived_at: "is.null",
      limit: 1,
    });
    return rows[0] ?? null;
  }
}

function isMissingDentyUsersTable(error: unknown): boolean {
  if (!(error instanceof SupabaseRestError)) return false;
  if (error.status !== 404) return false;
  return JSON.stringify(error.details).includes("denty_users");
}

function isSupabasePermissionDenied(error: unknown): boolean {
  if (!(error instanceof SupabaseRestError)) return false;
  if (error.status !== 401 && error.status !== 403) return false;
  const details = JSON.stringify(error.details).toLowerCase();
  return details.includes("row-level security") || details.includes('"42501"');
}

function normalizeIdentifier(value: string) {
  return value.trim().toLowerCase();
}

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const digest = crypto.pbkdf2Sync(password, salt, 120_000, 32, "sha256").toString("base64url");
  return `pbkdf2_sha256$120000$${salt}$${digest}`;
}

function verifyPassword(password: string, stored: string) {
  const [scheme, iterationsRaw, salt, digest] = stored.split("$");
  if (scheme !== "pbkdf2_sha256" || !iterationsRaw || !salt || !digest) return false;
  const iterations = Number(iterationsRaw);
  if (!Number.isInteger(iterations) || iterations < 10_000) return false;
  const candidate = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("base64url");
  return safeEqual(candidate, digest);
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}
