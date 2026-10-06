import { initialPatientPassword } from "@/domain/patient-credentials";
import {
  normalizeRole,
  permissionsForRole,
  type Permission,
  type Role,
} from "@/domain/permissions";

import type { SupabaseAuthClient } from "../supabase/auth-client";
import type { SupabaseRestClient } from "../supabase/rest-client";

const APP_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface ProfileRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  active: boolean;
}

interface ClinicMemberRow {
  id: string;
  clinic_id: string;
  profile_id: string;
  role: string;
  active: boolean;
  is_default?: boolean | null;
}

interface PatientAccountRow {
  id: string;
  clinic_id: string;
  patient_id: string;
  profile_id: string;
  active: boolean;
  is_default?: boolean | null;
}

interface PatientIdentityRow {
  id: string;
  clinic_id: string;
  record_number: string;
  first_name: string;
  last_name: string;
  dni: string | null;
  email: string | null;
  archived_at: string | null;
}

interface UserPermissionRow {
  permission: Permission;
  allowed: boolean;
}

interface StaffMemberRow {
  id: string;
  clinic_id: string;
  profile_id: string | null;
  display_name: string;
  role: string;
  active: boolean;
}

interface AppSessionRow {
  id: string;
  profile_id: string;
  clinic_id: string;
  auth_session_id: string | null;
  device_label: string;
  user_agent: string | null;
  last_seen_at: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
}

export interface AuthenticatedActor {
  userId: string;
  clinicId: string;
  displayName: string;
  role: Role;
  permissions: Permission[];
  staffId?: string | undefined;
  patientIds?: string[] | undefined;
}

export interface AuthSessionView {
  id: string;
  device: string;
  lastSeenAt: string;
  expiresAt: string;
  current: boolean;
  revoked: boolean;
}

export class ClinicSelectionRequiredError extends Error {
  constructor(readonly clinics: string[]) {
    super("La cuenta pertenece a varias clínicas y necesita una clínica predeterminada.");
  }
}

export class IdentityConfigurationError extends Error {}

export class AuthRepository {
  constructor(
    private readonly client: SupabaseRestClient,
    private readonly options: {
      adminClient?: SupabaseRestClient | undefined;
      authClient?: SupabaseAuthClient | undefined;
    } = {},
  ) {}

  async resolveActor(
    userId: string,
    options: { appSessionId?: string | undefined; requestedClinicId?: string | undefined } = {},
  ): Promise<AuthenticatedActor | null> {
    const profile = await this.getProfile(userId);
    if (!profile?.active) return null;

    const sessionClinicId = options.appSessionId
      ? await this.getActiveSessionClinic(userId, options.appSessionId)
      : null;
    if (options.appSessionId && !sessionClinicId) return null;
    const requestedClinicId = options.requestedClinicId ?? sessionClinicId ?? undefined;

    const memberships = await this.client.select<ClinicMemberRow>("clinic_members", {
      select: "id,clinic_id,profile_id,role,active,is_default",
      profile_id: `eq.${userId}`,
      active: "eq.true",
    });
    const staffMemberships = memberships.filter((row) => normalizeRole(row.role) !== "PATIENT");

    const patientAccounts = await this.client.select<PatientAccountRow>("patient_accounts", {
      select: "id,clinic_id,patient_id,profile_id,active,is_default",
      profile_id: `eq.${userId}`,
      active: "eq.true",
    });

    if (staffMemberships.length > 0) {
      const membership = chooseRecord(staffMemberships, requestedClinicId);
      if (!membership) return null;
      const role = normalizeRole(membership.role);
      const permissions = await this.resolvePermissions(role, membership.id);
      const staffId = await this.resolveStaffId(userId, membership.clinic_id, role);
      return {
        userId,
        clinicId: membership.clinic_id,
        displayName: displayName(profile),
        role,
        permissions,
        ...(staffId ? { staffId } : {}),
      };
    }

    if (patientAccounts.length > 0) {
      const selected = chooseRecord(patientAccounts, requestedClinicId);
      if (!selected) return null;
      const patientIds = patientAccounts
        .filter((row) => row.clinic_id === selected.clinic_id)
        .map((row) => row.patient_id);
      return {
        userId,
        clinicId: selected.clinic_id,
        displayName: displayName(profile),
        role: "PATIENT",
        permissions: permissionsForRole("PATIENT"),
        patientIds,
      };
    }

    return null;
  }

  async createAppSession(input: {
    actor: AuthenticatedActor;
    authSessionId?: string | null | undefined;
    deviceLabel?: string | undefined;
    userAgent?: string | null | undefined;
  }): Promise<AppSessionRow> {
    return this.client.insert<AppSessionRow>("app_sessions", {
      profile_id: input.actor.userId,
      clinic_id: input.actor.clinicId,
      auth_session_id: input.authSessionId ?? null,
      device_label: cleanDeviceLabel(input.deviceLabel),
      user_agent: input.userAgent?.slice(0, 500) ?? null,
      expires_at: new Date(Date.now() + APP_SESSION_TTL_MS).toISOString(),
    });
  }

  async touchAppSession(userId: string, appSessionId: string): Promise<void> {
    const now = new Date();
    await this.client.patchMany(
      "app_sessions",
      {
        id: `eq.${appSessionId}`,
        profile_id: `eq.${userId}`,
        revoked_at: "is.null",
        // A request authenticated just before expiry must not extend a session that has since
        // expired: sliding renewal applies only to sessions that are still valid.
        expires_at: `gt.${now.toISOString()}`,
      },
      {
        last_seen_at: now.toISOString(),
        expires_at: new Date(now.getTime() + APP_SESSION_TTL_MS).toISOString(),
      },
    );
  }

  async listSessions(
    userId: string,
    currentSessionId: string,
  ): Promise<{ items: AuthSessionView[] }> {
    const rows = await this.client.select<AppSessionRow>("app_sessions", {
      select:
        "id,profile_id,clinic_id,auth_session_id,device_label,user_agent,last_seen_at,expires_at,revoked_at,created_at",
      profile_id: `eq.${userId}`,
      order: "last_seen_at.desc",
    });
    return {
      items: rows.map((row) => ({
        id: row.id,
        device: row.device_label,
        lastSeenAt: row.last_seen_at,
        expiresAt: row.expires_at,
        current: row.id === currentSessionId,
        revoked: Boolean(row.revoked_at),
      })),
    };
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    await this.client.patchMany(
      "app_sessions",
      { id: `eq.${sessionId}`, profile_id: `eq.${userId}`, revoked_at: "is.null" },
      { revoked_at: new Date().toISOString() },
    );
  }

  async listUsers(clinicId: string) {
    // Patient profiles are not visible to staff through RLS, so the admin client
    // (always scoped by clinic_id below) reads both staff and patient accounts.
    const db = this.options.adminClient ?? this.client;
    const memberships = await db.select<ClinicMemberRow>("clinic_members", {
      select: "id,clinic_id,profile_id,role,active,is_default",
      clinic_id: `eq.${clinicId}`,
      order: "created_at.asc",
    });
    const patientAccounts = await db.select<PatientAccountRow>("patient_accounts", {
      select: "id,clinic_id,patient_id,profile_id,active,is_default",
      clinic_id: `eq.${clinicId}`,
    });
    const profileIds = [
      ...new Set([...memberships, ...patientAccounts].map((row) => row.profile_id)),
    ];
    if (profileIds.length === 0) return { items: [] };
    const profiles = await db.select<ProfileRow>("profiles", {
      select: "id,first_name,last_name,email,active",
      id: `in.(${profileIds.join(",")})`,
    });
    const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
    const staffIds = new Set(memberships.map((row) => row.profile_id));
    return {
      items: [
        ...memberships.map((membership) => {
          const profile = profileMap.get(membership.profile_id);
          return {
            id: membership.profile_id,
            displayName: profile ? displayName(profile) : "Usuario",
            email: profile?.email ?? undefined,
            role: normalizeRole(membership.role),
            active: membership.active && (profile?.active ?? true),
          };
        }),
        ...patientAccounts
          .filter((account) => !staffIds.has(account.profile_id))
          .map((account) => {
            const profile = profileMap.get(account.profile_id);
            return {
              id: account.profile_id,
              displayName: profile ? displayName(profile) : "Paciente",
              email: profile?.email ?? undefined,
              role: "PATIENT" as Role,
              active: account.active && (profile?.active ?? true),
              patientId: account.patient_id,
            };
          }),
      ].sort((a, b) => a.displayName.localeCompare(b.displayName)),
    };
  }

  /**
   * Patients sign in with their record number ("número de ficha"). Supabase Auth
   * only knows emails and phones, so the record number is resolved server-side
   * to the email of every active portal account attached to it (record numbers
   * are unique per clinic, not globally). Returns [] when nothing matches.
   */
  async patientLoginEmails(recordNumber: string): Promise<string[]> {
    const { adminClient } = this.requireAdminDependencies();
    const value = recordNumber.trim();
    if (!value || value.length > 64 || /["(),]/.test(value)) return [];
    const variants = [...new Set([value, value.toUpperCase()])].map((item) => `"${item}"`);
    const patients = await adminClient.select<{ id: string }>("patients", {
      select: "id",
      record_number: `in.(${variants.join(",")})`,
      archived_at: "is.null",
      limit: 10,
    });
    if (patients.length === 0) return [];
    const accounts = await adminClient.select<PatientAccountRow>("patient_accounts", {
      select: "id,clinic_id,patient_id,profile_id,active,is_default",
      patient_id: `in.(${patients.map((row) => row.id).join(",")})`,
      active: "eq.true",
    });
    if (accounts.length === 0) return [];
    const profiles = await adminClient.select<ProfileRow>("profiles", {
      select: "id,first_name,last_name,email,active",
      id: `in.(${[...new Set(accounts.map((row) => row.profile_id))].join(",")})`,
      active: "eq.true",
    });
    return profiles.flatMap((profile) => (profile.email ? [profile.email] : []));
  }

  async createUser(input: {
    clinicId: string;
    email?: string | undefined;
    displayName?: string | undefined;
    role: Role;
    password?: string | undefined;
    staffId?: string | undefined;
    patientId?: string | undefined;
  }) {
    const admin = this.requireAdminDependencies();
    let email = input.email;
    let name = input.displayName;
    let password = input.password;
    let passwordFromDni = false;
    let patientRecordNumber: string | null = null;

    if (input.role === "PATIENT") {
      if (!input.patientId) {
        throw new IdentityConfigurationError(
          "patientId es obligatorio para una cuenta de paciente.",
        );
      }
      const patient = await this.getClinicPatient(
        admin.adminClient,
        input.clinicId,
        input.patientId,
      );
      patientRecordNumber = patient.record_number;
      const existing = await admin.adminClient.select<PatientAccountRow>("patient_accounts", {
        select: "id,clinic_id,patient_id,profile_id,active,is_default",
        clinic_id: `eq.${input.clinicId}`,
        patient_id: `eq.${patient.id}`,
        limit: 1,
      });
      if (existing[0]) {
        throw new IdentityConfigurationError(
          "Este paciente ya tiene cuenta. Usa «Restablecer contraseña» para darle acceso de nuevo.",
        );
      }
      // The record number is the patient's username; an email is only needed by
      // Supabase Auth, so patients without one get an internal, non-deliverable address.
      email ??= patient.email ?? internalPatientEmail(patient);
      name ??= `${patient.first_name} ${patient.last_name}`.trim();
      if (!password) {
        password = initialPatientPassword(patient.dni) ?? undefined;
        passwordFromDni = Boolean(password);
      }
      if (!password) {
        throw new IdentityConfigurationError(
          "El paciente no tiene un DNI/NIE válido en su ficha. Añádelo o indica una contraseña inicial.",
        );
      }
    }
    if (!email || !name || !password) {
      throw new IdentityConfigurationError("Faltan email, nombre o contraseña.");
    }

    const authUser = await admin.authClient.adminCreateUser({
      email,
      password,
      displayName: name,
      emailConfirm: true,
    });

    try {
      await ensureProfile(admin.adminClient, authUser.id, email, name);

      if (input.role === "PATIENT") {
        await admin.adminClient.insert<PatientAccountRow>("patient_accounts", {
          clinic_id: input.clinicId,
          patient_id: input.patientId as string,
          profile_id: authUser.id,
          active: true,
          is_default: true,
        });
      } else {
        await admin.adminClient.insert<ClinicMemberRow>("clinic_members", {
          clinic_id: input.clinicId,
          profile_id: authUser.id,
          role: input.role,
          staff_type: staffTypeForRole(input.role),
          active: true,
          is_default: true,
        });

        if (input.staffId) {
          await admin.adminClient.patchMany(
            "staff_members",
            { id: `eq.${input.staffId}`, clinic_id: `eq.${input.clinicId}` },
            { profile_id: authUser.id, role: input.role, active: true },
          );
        } else {
          await admin.adminClient.insert<StaffMemberRow>("staff_members", {
            clinic_id: input.clinicId,
            profile_id: authUser.id,
            display_name: name,
            role: input.role,
            active: true,
          });
        }
      }
    } catch (caught) {
      await admin.authClient.adminDeleteUser(authUser.id).catch(() => undefined);
      throw caught;
    }

    return {
      id: authUser.id,
      displayName: name,
      email: email.trim().toLowerCase(),
      role: input.role,
      active: true,
      ...(patientRecordNumber
        ? { patientId: input.patientId, recordNumber: patientRecordNumber, passwordFromDni }
        : {}),
    };
  }

  async updateUser(
    clinicId: string,
    userId: string,
    input: {
      displayName?: string | undefined;
      email?: string | undefined;
      role?: Role | undefined;
      active?: boolean | undefined;
    },
  ) {
    const admin = this.requireAdminDependencies();
    const memberships = await admin.adminClient.select<ClinicMemberRow>("clinic_members", {
      select: "id,clinic_id,profile_id,role,active,is_default",
      clinic_id: `eq.${clinicId}`,
      profile_id: `eq.${userId}`,
      limit: 1,
    });
    const membership = memberships[0];
    const patientAccounts = membership
      ? []
      : await admin.adminClient.select<PatientAccountRow>("patient_accounts", {
          select: "id,clinic_id,patient_id,profile_id,active,is_default",
          clinic_id: `eq.${clinicId}`,
          profile_id: `eq.${userId}`,
          limit: 1,
        });
    const patientAccount = patientAccounts[0];
    if (!membership && !patientAccount)
      throw new IdentityConfigurationError("El usuario no pertenece a esta clínica.");

    if (input.displayName || input.email) {
      const { firstName, lastName } = splitDisplayName(input.displayName ?? "");
      await admin.adminClient.patchMany(
        "profiles",
        { id: `eq.${userId}` },
        {
          ...(input.displayName ? { first_name: firstName, last_name: lastName } : {}),
          ...(input.email ? { email: input.email.trim().toLowerCase() } : {}),
        },
      );
      await admin.authClient.adminUpdateUser(userId, {
        ...(input.email ? { email: input.email.trim().toLowerCase() } : {}),
        ...(input.displayName ? { user_metadata: { display_name: input.displayName } } : {}),
      });
    }
    if (membership && (input.role || input.active !== undefined)) {
      await admin.adminClient.patchMany(
        "clinic_members",
        { id: `eq.${membership.id}` },
        {
          ...(input.role ? { role: input.role, staff_type: staffTypeForRole(input.role) } : {}),
          ...(input.active !== undefined ? { active: input.active } : {}),
        },
      );
      await admin.adminClient.patchMany(
        "staff_members",
        { clinic_id: `eq.${clinicId}`, profile_id: `eq.${userId}` },
        {
          ...(input.role ? { role: input.role } : {}),
          ...(input.active !== undefined ? { active: input.active } : {}),
        },
      );
    }
    if (patientAccount && input.active !== undefined) {
      await admin.adminClient.patchMany(
        "patient_accounts",
        { id: `eq.${patientAccount.id}` },
        { active: input.active },
      );
    }
    const profile = await this.getProfileWith(admin.adminClient, userId);
    return {
      id: userId,
      displayName: profile ? displayName(profile) : (input.displayName ?? "Usuario"),
      email: profile?.email ?? undefined,
      role: patientAccount ? ("PATIENT" as Role) : (input.role ?? normalizeRole(membership!.role)),
      active: input.active ?? membership?.active ?? patientAccount?.active ?? true,
    };
  }

  async deleteUser(
    clinicId: string,
    userId: string,
  ): Promise<{ ok: true; deletedAuthUser: boolean; role: Role }> {
    const { adminClient, authClient } = this.requireAdminDependencies();
    const [membership] = await adminClient.select<ClinicMemberRow>("clinic_members", {
      select: "id,clinic_id,profile_id,role,active,is_default",
      clinic_id: `eq.${clinicId}`,
      profile_id: `eq.${userId}`,
      limit: 1,
    });
    const [patientAccount] = membership
      ? []
      : await adminClient.select<PatientAccountRow>("patient_accounts", {
          select: "id,clinic_id,patient_id,profile_id,active,is_default",
          clinic_id: `eq.${clinicId}`,
          profile_id: `eq.${userId}`,
          limit: 1,
        });
    if (!membership && !patientAccount) {
      throw new IdentityConfigurationError("El usuario no pertenece a esta clínica.");
    }

    if (membership) {
      await adminClient.patchMany(
        "clinic_members",
        { id: `eq.${membership.id}` },
        { active: false },
      );
      await adminClient.patchMany(
        "staff_members",
        { clinic_id: `eq.${clinicId}`, profile_id: `eq.${userId}` },
        { active: false, profile_id: null },
      );
    }
    if (patientAccount) {
      await adminClient.patchMany(
        "patient_accounts",
        { id: `eq.${patientAccount.id}` },
        { active: false },
      );
    }
    await adminClient.patchMany("profiles", { id: `eq.${userId}` }, { active: false });
    await authClient.adminDeleteUser(userId);
    return {
      ok: true,
      deletedAuthUser: true,
      role: patientAccount ? ("PATIENT" as Role) : normalizeRole(membership!.role),
    };
  }

  /**
   * Admin password reset, limited to accounts of the admin's own clinic. Patient
   * accounts can go back to their DNI-based first-access password.
   */
  async resetUserPassword(
    clinicId: string,
    userId: string,
    input: { password?: string | undefined; useDni?: boolean | undefined },
  ): Promise<{ ok: true; usedDni: boolean }> {
    const { adminClient, authClient } = this.requireAdminDependencies();
    const [membership] = await adminClient.select<ClinicMemberRow>("clinic_members", {
      select: "id,clinic_id,profile_id,role,active,is_default",
      clinic_id: `eq.${clinicId}`,
      profile_id: `eq.${userId}`,
      limit: 1,
    });
    const [patientAccount] = membership
      ? []
      : await adminClient.select<PatientAccountRow>("patient_accounts", {
          select: "id,clinic_id,patient_id,profile_id,active,is_default",
          clinic_id: `eq.${clinicId}`,
          profile_id: `eq.${userId}`,
          limit: 1,
        });
    if (!membership && !patientAccount) {
      throw new IdentityConfigurationError("El usuario no pertenece a esta clínica.");
    }

    let password = input.password;
    if (input.useDni) {
      if (!patientAccount) {
        throw new IdentityConfigurationError(
          "Solo las cuentas de paciente pueden volver a la contraseña del DNI.",
        );
      }
      const patient = await this.getClinicPatient(adminClient, clinicId, patientAccount.patient_id);
      password = initialPatientPassword(patient.dni) ?? undefined;
      if (!password) {
        throw new IdentityConfigurationError(
          "El paciente no tiene un DNI/NIE válido en su ficha. Indica una contraseña manualmente.",
        );
      }
    }
    if (!password) throw new IdentityConfigurationError("Indica la contraseña nueva.");
    await authClient.adminUpdateUser(userId, { password });
    return { ok: true, usedDni: Boolean(input.useDni) };
  }

  private async getClinicPatient(
    client: SupabaseRestClient,
    clinicId: string,
    patientId: string,
  ): Promise<PatientIdentityRow> {
    const [patient] = await client.select<PatientIdentityRow>("patients", {
      select: "id,clinic_id,record_number,first_name,last_name,dni,email,archived_at",
      id: `eq.${patientId}`,
      clinic_id: `eq.${clinicId}`,
      limit: 1,
    });
    if (!patient) throw new IdentityConfigurationError("El paciente no pertenece a esta clínica.");
    return patient;
  }

  private async getProfile(userId: string): Promise<ProfileRow | null> {
    return this.getProfileWith(this.client, userId);
  }

  private async getProfileWith(
    client: SupabaseRestClient,
    userId: string,
  ): Promise<ProfileRow | null> {
    const rows = await client.select<ProfileRow>("profiles", {
      select: "id,first_name,last_name,email,active",
      id: `eq.${userId}`,
      limit: 1,
    });
    return rows[0] ?? null;
  }

  private async getActiveSessionClinic(userId: string, sessionId: string): Promise<string | null> {
    const rows = await this.client.select<AppSessionRow>("app_sessions", {
      select:
        "id,profile_id,clinic_id,auth_session_id,device_label,user_agent,last_seen_at,expires_at,revoked_at,created_at",
      id: `eq.${sessionId}`,
      profile_id: `eq.${userId}`,
      revoked_at: "is.null",
      limit: 1,
    });
    const row = rows[0];
    if (!row || new Date(row.expires_at).getTime() <= Date.now()) return null;
    return row.clinic_id;
  }

  private async resolvePermissions(role: Role, membershipId: string): Promise<Permission[]> {
    const permissions = new Set<Permission>(permissionsForRole(role));
    const rows = await this.client.select<UserPermissionRow>("user_permissions", {
      select: "permission,allowed",
      clinic_member_id: `eq.${membershipId}`,
    });
    for (const row of rows) {
      if (row.allowed) permissions.add(row.permission);
      else permissions.delete(row.permission);
    }
    return [...permissions];
  }

  private async resolveStaffId(
    userId: string,
    clinicId: string,
    role: Role,
  ): Promise<string | undefined> {
    const rows = await this.client.select<StaffMemberRow>("staff_members", {
      select: "id,clinic_id,profile_id,display_name,role,active",
      clinic_id: `eq.${clinicId}`,
      profile_id: `eq.${userId}`,
      active: "eq.true",
    });
    if (role === "DENTIST" && rows.length !== 1) {
      throw new IdentityConfigurationError(
        `Un DENTIST autenticado debe resolver exactamente un staff_member activo; encontrados: ${rows.length}.`,
      );
    }
    return rows[0]?.id;
  }

  private requireAdminDependencies(): {
    adminClient: SupabaseRestClient;
    authClient: SupabaseAuthClient;
  } {
    if (!this.options.adminClient || !this.options.authClient) {
      throw new IdentityConfigurationError("Faltan dependencias administrativas de Supabase Auth.");
    }
    return { adminClient: this.options.adminClient, authClient: this.options.authClient };
  }
}

function chooseRecord<T extends { clinic_id: string; is_default?: boolean | null }>(
  records: T[],
  requestedClinicId?: string,
): T | null {
  if (requestedClinicId) return records.find((row) => row.clinic_id === requestedClinicId) ?? null;
  if (records.length === 1) return records[0] ?? null;
  const defaults = records.filter((row) => row.is_default === true);
  if (defaults.length === 1) return defaults[0] ?? null;
  throw new ClinicSelectionRequiredError([...new Set(records.map((row) => row.clinic_id))]);
}

async function ensureProfile(
  client: SupabaseRestClient,
  userId: string,
  email: string,
  name: string,
): Promise<void> {
  const rows = await client.select<ProfileRow>("profiles", {
    select: "id",
    id: `eq.${userId}`,
    limit: 1,
  });
  const { firstName, lastName } = splitDisplayName(name);
  if (rows[0]) {
    await client.patchMany(
      "profiles",
      { id: `eq.${userId}` },
      {
        first_name: firstName,
        last_name: lastName,
        email: email.trim().toLowerCase(),
        active: true,
      },
    );
    return;
  }
  await client.insert<ProfileRow>("profiles", {
    id: userId,
    first_name: firstName,
    last_name: lastName,
    email: email.trim().toLowerCase(),
    active: true,
  });
}

function internalPatientEmail(patient: PatientIdentityRow): string {
  const slug = patient.record_number
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `paciente-${slug || "ficha"}-${patient.id.replace(/-/g, "").slice(0, 8)}@denty.local`;
}

function splitDisplayName(value: string): { firstName: string; lastName: string } {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  const firstName = parts.shift() ?? value.trim();
  return { firstName, lastName: parts.join(" ") };
}

function displayName(profile: ProfileRow): string {
  const full = `${profile.first_name} ${profile.last_name}`.trim();
  return full || profile.email || "Usuario";
}

function cleanDeviceLabel(value?: string): string {
  const normalized = value?.trim().slice(0, 120);
  return normalized || "Navegador";
}

function staffTypeForRole(role: Role): string | null {
  if (role === "DENTIST") return "DENTIST";
  if (role === "RECEPTION") return "SECRETARY";
  return null;
}
