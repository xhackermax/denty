import { z } from "zod";

import {
  archivePatientSchema,
  createDocumentSchema,
  createPatientSchema,
  restorePatientSchema,
  updatePatientSchema,
} from "@/shared/api";
import {
  createUserSchema,
  resetUserPasswordSchema,
  treatmentCatalogCreateSchema,
  treatmentCatalogUpdateSchema,
  updateUserSchema,
} from "@/shared/api/schemas/admin";
import {
  createOdontogramSnapshotSchema,
  createPlanItemSchema,
  odontogramBatchSchema,
  periodontalExamInputSchema,
  periodontalMeasurementSchema,
} from "@/shared/api/schemas/clinical";
import { finalizeBudgetSignatureInputSchema } from "@/shared/api/schemas/billing";
import { getServerEnv } from "@/shared/config/env";

import {
  AuthRepository,
  ClinicSelectionRequiredError,
  IdentityConfigurationError,
  type AuthenticatedActor,
} from "../auth/auth-repository";
import {
  appendAuthSessionCookies,
  appendClearedAuthCookies,
  appendRefreshedTokenCookies,
  decodeJwtSessionId,
  readAuthCookies,
} from "../auth/auth-session";
import { PatientRepository } from "./patient-repository";
import { ClinicalRepository } from "./clinical-repository";
import { DocumentRepository } from "../documents/document-repository";
import { readSupabaseBackupStatus } from "../security/backup-status";
import { PATIENT_PHOTOS_BUCKET, StorageRepository } from "../storage/storage-repository";
import { SupabaseAuthClient, SupabaseAuthError, type SupabaseAuthSession } from "../supabase/auth-client";
import {
  resolveSupabaseAdminCredentials,
  resolveSupabaseAuthCredentials,
  resolveSupabasePublicCredentials,
} from "../supabase/credentials";
import { SupabaseRestClient, SupabaseRestError } from "../supabase/rest-client";

function json(status: number, body: unknown, headers?: Headers): Response {
  const responseHeaders = headers ?? new Headers();
  responseHeaders.set("cache-control", "private, no-store");
  return Response.json(body, { status, headers: responseHeaders });
}

function error(status: number, code: string, message: string, details?: unknown): Response {
  return json(status, { error: { code, message, details } });
}

function segments(pathname: string): string[] {
  return pathname.split("/").filter(Boolean);
}

function requireAdmin(actor: AuthenticatedActor | null): Response | null {
  if (!actor) return error(401, "UNAUTHENTICATED", "No hay sesión activa.");
  if (actor.role !== "ADMIN" || !actor.permissions.includes("users.manage")) {
    return error(403, "FORBIDDEN", "Solo el administrador puede gestionar usuarios.");
  }
  return null;
}

async function parseJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  return schema.parse(await request.json());
}

interface RequestIdentity {
  actor: AuthenticatedActor;
  accessToken: string;
  appSessionId: string;
  restClient: SupabaseRestClient;
  authClient: SupabaseAuthClient;
  authRepository: AuthRepository;
  refreshedSession?: SupabaseAuthSession | undefined;
}

function secureCookies(request: Request): boolean {
  const env = getServerEnv();
  return env.NODE_ENV === "production" || new URL(request.url).protocol === "https:";
}

function makeAuthClient(): SupabaseAuthClient | null {
  const credentials = resolveSupabaseAuthCredentials(getServerEnv());
  return credentials ? new SupabaseAuthClient(credentials) : null;
}

function makeAdminRestClient(): SupabaseRestClient | null {
  const credentials = resolveSupabaseAdminCredentials(getServerEnv());
  return credentials ? new SupabaseRestClient(credentials) : null;
}

async function resolveRequestIdentity(request: Request): Promise<RequestIdentity | null> {
  const env = getServerEnv();
  const publicCredentials = resolveSupabasePublicCredentials(env);
  const authCredentials = resolveSupabaseAuthCredentials(env);
  if (!publicCredentials || !authCredentials) return null;

  const cookies = readAuthCookies(request);
  if (!cookies.appSessionId || (!cookies.accessToken && !cookies.refreshToken)) return null;

  const authClient = new SupabaseAuthClient(authCredentials);
  let accessToken = cookies.accessToken;
  let refreshedSession: SupabaseAuthSession | undefined;
  let user;

  try {
    if (!accessToken) throw new SupabaseAuthError("Access token ausente.", 401, null);
    user = await authClient.getUser(accessToken);
  } catch (caught) {
    if (!(caught instanceof SupabaseAuthError) || caught.status !== 401 || !cookies.refreshToken) {
      return null;
    }
    try {
      refreshedSession = await authClient.refreshSession(cookies.refreshToken);
      accessToken = refreshedSession.accessToken;
      user = refreshedSession.user;
    } catch {
      return null;
    }
  }

  if (!accessToken || !user?.id) return null;
  const restClient = new SupabaseRestClient({
    url: publicCredentials.url,
    key: publicCredentials.key,
    accessToken,
  });
  const authRepository = new AuthRepository(restClient);
  const actor = await authRepository.resolveActor(user.id, { appSessionId: cookies.appSessionId });
  if (!actor) return null;

  return {
    actor,
    accessToken,
    appSessionId: cookies.appSessionId,
    restClient,
    authClient,
    authRepository,
    refreshedSession,
  };
}

function responseHeadersForIdentity(request: Request, identity: RequestIdentity | null): Headers {
  const headers = new Headers({ "cache-control": "private, no-store" });
  if (identity?.refreshedSession) {
    appendRefreshedTokenCookies(headers, identity.refreshedSession, identity.appSessionId, {
      secure: secureCookies(request),
    });
  }
  return headers;
}

function patientRepository(identity: RequestIdentity): PatientRepository {
  return new PatientRepository(identity.restClient, undefined, {
    clinicId: identity.actor.clinicId,
    allowedPatientIds: identity.actor.role === "PATIENT" ? identity.actor.patientIds : undefined,
  });
}

function clinicalRepository(identity: RequestIdentity): ClinicalRepository {
  return new ClinicalRepository(identity.restClient, identity.actor.clinicId);
}

function storageRepository(identity: RequestIdentity): StorageRepository {
  const credentials = resolveSupabasePublicCredentials(getServerEnv());
  if (!credentials) throw new IdentityConfigurationError("Supabase público no está configurado.");
  return new StorageRepository({ url: credentials.url, key: credentials.key, accessToken: identity.accessToken });
}

function documentRepository(identity: RequestIdentity): DocumentRepository {
  return new DocumentRepository(identity.restClient, storageRepository(identity), identity.actor.clinicId);
}

export async function handleSupabaseDentyRoute(
  request: Request,
  backendPath: string,
): Promise<Response | null> {
  const parts = segments(backendPath);
  const method = request.method.toUpperCase();
  const env = getServerEnv();
  const authClient = makeAuthClient();
  if (!authClient) return null;

  try {
    if (parts.length === 3 && parts[0] === "api" && parts[1] === "auth") {
      if (parts[2] === "pin-login") {
        return error(
          410,
          "PIN_LOGIN_RETIRED",
          "El acceso por PIN local se retiró. Usa Supabase Auth con email o teléfono.",
        );
      }

      if (parts[2] === "login" && method === "POST") {
        const payload = await parseJson(
          request,
          z.object({
            identifier: z.string().min(1),
            password: z.string().min(1),
            deviceLabel: z.string().max(120).optional(),
            clinicId: z.string().uuid().optional(),
          }),
        );
        const session = await authClient.signInWithPassword(payload.identifier, payload.password);
        const publicCredentials = resolveSupabasePublicCredentials(env);
        if (!publicCredentials) return error(503, "SUPABASE_PUBLIC_KEY_REQUIRED", "Falta la clave pública de Supabase.");
        const restClient = new SupabaseRestClient({
          url: publicCredentials.url,
          key: publicCredentials.key,
          accessToken: session.accessToken,
        });
        const auth = new AuthRepository(restClient);
        const actor = await auth.resolveActor(session.user.id, { requestedClinicId: payload.clinicId });
        if (!actor) {
          await authClient.signOut(session.accessToken).catch(() => undefined);
          return error(403, "IDENTITY_NOT_LINKED", "La cuenta no está vinculada a una clínica o paciente activo.");
        }
        const appSession = await auth.createAppSession({
          actor,
          authSessionId: decodeJwtSessionId(session.accessToken),
          deviceLabel: payload.deviceLabel,
          userAgent: request.headers.get("user-agent"),
        });
        const headers = new Headers({ "cache-control": "private, no-store" });
        appendAuthSessionCookies(headers, session, appSession.id, { secure: secureCookies(request) });
        return json(
          200,
          { user: { id: actor.userId, displayName: actor.displayName, role: actor.role } },
          headers,
        );
      }

      if (parts[2] === "session" && method === "GET") {
        const identity = await resolveRequestIdentity(request);
        if (!identity) return error(401, "UNAUTHENTICATED", "No hay sesión activa.");
        await identity.authRepository.touchAppSession(identity.actor.userId, identity.appSessionId);
        const headers = responseHeadersForIdentity(request, identity);
        return json(
          200,
          {
            actor: {
              userId: identity.actor.userId,
              clinicId: identity.actor.clinicId,
              role: identity.actor.role,
              permissions: identity.actor.permissions,
              sessionId: identity.appSessionId,
              ...(identity.actor.staffId ? { staffId: identity.actor.staffId } : {}),
              ...(identity.actor.patientIds ? { patientIds: identity.actor.patientIds } : {}),
            },
            permissions: identity.actor.permissions,
          },
          headers,
        );
      }

      if (parts[2] === "logout" && method === "POST") {
        const identity = await resolveRequestIdentity(request);
        if (identity) {
          await identity.authRepository.revokeSession(identity.actor.userId, identity.appSessionId).catch(() => undefined);
          await identity.authClient.signOut(identity.accessToken).catch(() => undefined);
        }
        const headers = new Headers({ "cache-control": "private, no-store" });
        appendClearedAuthCookies(headers, { secure: secureCookies(request) });
        return json(200, { ok: true }, headers);
      }

      if (parts[2] === "request-password-reset" && method === "POST") {
        const payload = await parseJson(request, z.object({ identifier: z.string().email() }));
        await authClient.requestPasswordReset(payload.identifier);
        return json(200, { ok: true });
      }

      if (parts[2] === "change-password" && method === "POST") {
        const identity = await resolveRequestIdentity(request);
        if (!identity) return error(401, "UNAUTHENTICATED", "No hay sesión activa.");
        const payload = await parseJson(
          request,
          z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8) }),
        );
        const currentUser = await identity.authClient.getUser(identity.accessToken);
        const identifier = currentUser.email ?? currentUser.phone;
        if (!identifier) return error(400, "AUTH_IDENTIFIER_MISSING", "La cuenta no tiene email o teléfono de acceso.");
        await identity.authClient.signInWithPassword(identifier, payload.currentPassword);
        await identity.authClient.updatePassword(identity.accessToken, payload.newPassword);
        return json(200, { ok: true }, responseHeadersForIdentity(request, identity));
      }

      if (parts[2] === "reset-password" && method === "POST") {
        return error(
          410,
          "PASSWORD_RECOVERY_LINK_REQUIRED",
          "La recuperación ya no acepta tokens manuales. Usa el enlace seguro enviado por Supabase Auth.",
        );
      }
    }

    if (parts.length === 3 && parts[0] === "api" && parts[1] === "auth" && parts[2] === "sessions") {
      const identity = await resolveRequestIdentity(request);
      if (!identity) return error(401, "UNAUTHENTICATED", "No hay sesión activa.");
      if (method === "GET") {
        return json(
          200,
          await identity.authRepository.listSessions(identity.actor.userId, identity.appSessionId),
          responseHeadersForIdentity(request, identity),
        );
      }
    }

    if (
      parts.length === 5 &&
      parts[0] === "api" &&
      parts[1] === "auth" &&
      parts[2] === "sessions" &&
      parts[4] === "revoke" &&
      method === "POST"
    ) {
      const identity = await resolveRequestIdentity(request);
      if (!identity) return error(401, "UNAUTHENTICATED", "No hay sesión activa.");
      const sessionId = decodeURIComponent(parts[3] ?? "");
      if (sessionId === identity.appSessionId) {
        return error(400, "CURRENT_SESSION", "Cierra la sesión actual desde Salir.");
      }
      await identity.authRepository.revokeSession(identity.actor.userId, sessionId);
      return json(200, { ok: true }, responseHeadersForIdentity(request, identity));
    }

    if (parts[0] === "api" && parts[1] === "auth") {
      return error(404, "AUTH_ROUTE_NOT_FOUND", "La ruta de autenticación no existe.");
    }

    const locallyHandled =
      parts[0] === "api" && ["users", "patients", "patient", "documents", "document-templates", "security", "admin", "budgets"].includes(parts[1] ?? "");
    if (!locallyHandled) return null;

    const identity = await resolveRequestIdentity(request);
    if (!identity) return error(401, "UNAUTHENTICATED", "No hay sesión activa.");
    const headers = responseHeadersForIdentity(request, identity);
    const repo = patientRepository(identity);
    const clinical = clinicalRepository(identity);


    if (parts.length === 4 && parts[0] === "api" && parts[1] === "budgets" && parts[3] === "sign" && method === "POST") {
      if (identity.actor.role === "PATIENT") return error(403, "FORBIDDEN", "El portal no puede firmar presupuestos clínicos.");
      if (!identity.actor.permissions.includes("clinical.write") && !identity.actor.permissions.includes("finance.write")) {
        return error(403, "FORBIDDEN", "No tienes permiso para firmar presupuestos clínicos.");
      }
      const budgetId = decodeURIComponent(parts[2] ?? "");
      const payload = await parseJson(request, finalizeBudgetSignatureInputSchema);
      const result = await clinical.finalizeBudgetSignature(budgetId, payload);
      if ("conflict" in result) {
        return error(409, "BUDGET_VERSION_CONFLICT", "El presupuesto cambió antes de firmarse.", {
          currentVersion: result.currentVersion,
        });
      }
      return json(200, result, headers);
    }

    // Stage 6 canonical treatment catalog. Only actors with catalog.manage may mutate it.
    if (parts.length === 3 && parts[0] === "api" && parts[1] === "admin" && parts[2] === "treatment-catalog") {
      if (method === "GET") {
        if (!identity.actor.permissions.includes("clinical.read") && !identity.actor.permissions.includes("catalog.manage")) {
          return error(403, "FORBIDDEN", "No tienes permiso para consultar el catálogo clínico.");
        }
        return json(200, await clinical.listTreatmentCatalog(), headers);
      }
      if (method === "POST") {
        if (!identity.actor.permissions.includes("catalog.manage")) return error(403, "FORBIDDEN", "No tienes permiso para editar el catálogo clínico.");
        const payload = await parseJson(request, treatmentCatalogCreateSchema);
        return json(201, await clinical.createTreatmentCatalogItem(payload), headers);
      }
    }

    if (parts.length === 4 && parts[0] === "api" && parts[1] === "admin" && parts[2] === "treatment-catalog" && method === "PATCH") {
      if (!identity.actor.permissions.includes("catalog.manage")) return error(403, "FORBIDDEN", "No tienes permiso para editar el catálogo clínico.");
      const payload = await parseJson(request, treatmentCatalogUpdateSchema);
      return json(200, await clinical.updateTreatmentCatalogItem(decodeURIComponent(parts[3] ?? ""), payload), headers);
    }

    if (parts.length === 4 && parts[0] === "api" && parts[1] === "patients" && parts[3] === "patient-photo" && method === "POST") {
      if (identity.actor.role === "PATIENT") return error(403, "FORBIDDEN", "El portal no puede modificar la foto clínica.");
      const patientId = decodeURIComponent(parts[2] ?? "");
      const patient = await repo.getPatient(patientId);
      if (!patient) return error(404, "PATIENT_NOT_FOUND", "Ficha no encontrada.");
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return error(400, "FILE_REQUIRED", "Selecciona una imagen válida.");
      const storage = storageRepository(identity);
      const previous = await repo.getPatientPhotoStorage(patientId);
      const stored = await storage.uploadPatientPhoto(identity.actor.clinicId, patientId, file);
      try {
        const updated = await repo.setPatientPhoto(patientId, stored);
        if (previous?.path && previous.path !== stored.path) {
          await storage.remove(PATIENT_PHOTOS_BUCKET, previous.path).catch(() => undefined);
        }
        return json(200, updated, headers);
      } catch (caught) {
        await storage.remove(PATIENT_PHOTOS_BUCKET, stored.path).catch(() => undefined);
        throw caught;
      }
    }

    if (parts.length === 4 && parts[0] === "api" && parts[1] === "patients" && parts[3] === "photo" && method === "GET") {
      const patientId = decodeURIComponent(parts[2] ?? "");
      const stored = await repo.getPatientPhotoStorage(patientId);
      if (!stored) return error(404, "PHOTO_NOT_FOUND", "El paciente no tiene foto almacenada.");
      const blob = await storageRepository(identity).download(PATIENT_PHOTOS_BUCKET, stored.path);
      const responseHeaders = responseHeadersForIdentity(request, identity);
      responseHeaders.set("content-type", stored.mimeType || blob.type || "image/jpeg");
      responseHeaders.set("content-length", String(blob.size));
      return new Response(blob, { status: 200, headers: responseHeaders });
    }

    if (parts.length === 2 && parts[0] === "api" && parts[1] === "documents") {
      const documents = documentRepository(identity);
      if (method === "GET") {
        const patientId = new URL(request.url).searchParams.get("patientId") ?? undefined;
        return json(200, await documents.list(patientId), headers);
      }
      if (method === "POST") {
        if (identity.actor.role === "PATIENT") return error(403, "FORBIDDEN", "El portal no puede crear documentos clínicos.");
        const payload = await parseJson(request, createDocumentSchema);
        return json(201, await documents.create(payload), headers);
      }
    }

    if (parts.length === 4 && parts[0] === "api" && parts[1] === "documents" && parts[3] === "file") {
      const documents = documentRepository(identity);
      const documentId = decodeURIComponent(parts[2] ?? "");
      if (method === "POST") {
        if (identity.actor.role === "PATIENT") return error(403, "FORBIDDEN", "El portal no puede reemplazar archivos clínicos.");
        const form = await request.formData();
        const file = form.get("file");
        if (!(file instanceof File)) return error(400, "FILE_REQUIRED", "Selecciona un archivo válido.");
        return json(200, await documents.uploadFile(documentId, file), headers);
      }
      if (method === "GET") {
        const downloaded = await documents.downloadFile(documentId);
        const responseHeaders = responseHeadersForIdentity(request, identity);
        responseHeaders.set("content-type", downloaded.mimeType);
        responseHeaders.set("content-disposition", `attachment; filename*=UTF-8''${encodeURIComponent(downloaded.fileName)}`);
        responseHeaders.set("content-length", String(downloaded.blob.size));
        return new Response(downloaded.blob, { status: 200, headers: responseHeaders });
      }
    }

    if (parts.length === 4 && parts[0] === "api" && parts[1] === "documents" && parts[3] === "finalize" && method === "POST") {
      if (identity.actor.role === "PATIENT") return error(403, "FORBIDDEN", "El portal no puede finalizar documentos clínicos.");
      return json(200, await documentRepository(identity).finalize(decodeURIComponent(parts[2] ?? "")), headers);
    }

    if (parts.length === 2 && parts[0] === "api" && parts[1] === "document-templates" && method === "GET") {
      const rows = await identity.restClient.select<Record<string, unknown>>("document_templates", {
        select: "*", clinic_id: `eq.${identity.actor.clinicId}`, active: "eq.true", order: "created_at.desc",
      });
      return json(200, { items: rows }, headers);
    }

    if (parts.length === 3 && parts[0] === "api" && parts[1] === "security" && parts[2] === "backups" && method === "GET") {
      if (identity.actor.role !== "ADMIN") return error(403, "FORBIDDEN", "Solo administración puede consultar el estado de backups.");
      return json(200, await readSupabaseBackupStatus({
        projectRef: env.SUPABASE_PROJECT_REF,
        accessToken: env.SUPABASE_MANAGEMENT_ACCESS_TOKEN,
      }), headers);
    }

    if (parts.length === 3 && parts[0] === "api" && parts[1] === "security" && parts[2] === "sessions" && method === "GET") {
      return json(200, await identity.authRepository.listSessions(identity.actor.userId, identity.appSessionId), headers);
    }

    if (parts.length === 2 && parts[0] === "api" && parts[1] === "users") {
      const adminError = requireAdmin(identity.actor);
      if (adminError) return adminError;
      const adminClient = makeAdminRestClient();
      if (!adminClient) return error(503, "ADMIN_CREDENTIALS_REQUIRED", "Falta la credencial administrativa de Supabase.");
      const auth = new AuthRepository(identity.restClient, { adminClient, authClient });
      if (method === "GET") return json(200, await auth.listUsers(identity.actor.clinicId), headers);
      if (method === "POST") {
        const payload = await parseJson(request, createUserSchema);
        if (!payload.email) return error(400, "EMAIL_REQUIRED", "El email es obligatorio para Supabase Auth.");
        if (!payload.password) return error(400, "PASSWORD_REQUIRED", "La contraseña es obligatoria.");
        return json(
          201,
          await auth.createUser({
            clinicId: identity.actor.clinicId,
            email: payload.email,
            displayName: payload.displayName,
            role: payload.role,
            password: payload.password,
            staffId: payload.staffId,
            patientId: payload.patientId,
          }),
          headers,
        );
      }
    }

    if (parts.length === 3 && parts[0] === "api" && parts[1] === "users" && method === "PATCH") {
      const adminError = requireAdmin(identity.actor);
      if (adminError) return adminError;
      const adminClient = makeAdminRestClient();
      if (!adminClient) return error(503, "ADMIN_CREDENTIALS_REQUIRED", "Falta la credencial administrativa de Supabase.");
      const auth = new AuthRepository(identity.restClient, { adminClient, authClient });
      const payload = await parseJson(request, updateUserSchema);
      return json(
        200,
        await auth.updateUser(identity.actor.clinicId, decodeURIComponent(parts[2] ?? ""), payload),
        headers,
      );
    }

    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "users" &&
      parts[3] === "reset-password" &&
      method === "POST"
    ) {
      const adminError = requireAdmin(identity.actor);
      if (adminError) return adminError;
      const adminClient = makeAdminRestClient();
      if (!adminClient) return error(503, "ADMIN_CREDENTIALS_REQUIRED", "Falta la credencial administrativa de Supabase.");
      const auth = new AuthRepository(identity.restClient, { adminClient, authClient });
      const payload = await parseJson(request, resetUserPasswordSchema);
      await auth.resetUserPassword(decodeURIComponent(parts[2] ?? ""), payload.password);
      return json(200, { ok: true }, headers);
    }

    if (parts.length === 2 && parts[0] === "api" && parts[1] === "patients") {
      if (method === "GET") {
        const includeArchived = new URL(request.url).searchParams.get("includeArchived") === "true";
        return json(200, await repo.listPatients({ includeArchived }), headers);
      }
      if (method === "POST") {
        if (identity.actor.role === "PATIENT") return error(403, "FORBIDDEN", "El portal no puede crear pacientes.");
        const payload = await parseJson(request, createPatientSchema);
        return json(201, await repo.createPatient(payload), headers);
      }
    }

    if (parts.length === 3 && parts[0] === "api" && parts[1] === "patients") {
      const patientId = decodeURIComponent(parts[2] ?? "");
      if (method === "GET") {
        const patient = await repo.getPatient(patientId);
        return patient ? json(200, patient, headers) : error(404, "PATIENT_NOT_FOUND", "Ficha no encontrada.");
      }
      if (method === "PATCH") {
        if (identity.actor.role === "PATIENT") return error(403, "FORBIDDEN", "El portal no puede editar la ficha clínica.");
        const payload = await parseJson(request, updatePatientSchema);
        return json(200, await repo.updatePatient(patientId, payload), headers);
      }
    }

    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "patients" &&
      parts[3] === "archive" &&
      method === "POST"
    ) {
      if (identity.actor.role === "PATIENT") return error(403, "FORBIDDEN", "El portal no puede archivar fichas.");
      const patientId = decodeURIComponent(parts[2] ?? "");
      const payload = await parseJson(request, archivePatientSchema);
      return json(200, await repo.archivePatient(patientId, payload), headers);
    }

    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "patients" &&
      parts[3] === "restore" &&
      method === "POST"
    ) {
      if (identity.actor.role === "PATIENT") return error(403, "FORBIDDEN", "El portal no puede restaurar fichas.");
      const patientId = decodeURIComponent(parts[2] ?? "");
      const payload = await parseJson(request, restorePatientSchema);
      return json(200, await repo.restorePatient(patientId, payload), headers);
    }

    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "patient" &&
      parts[3] === "projection" &&
      method === "GET"
    ) {
      const patientId = decodeURIComponent(parts[2] ?? "");
      const projection = await repo.getProjection(patientId);
      return projection ? json(200, projection, headers) : error(404, "PATIENT_NOT_FOUND", "Ficha no encontrada.");
    }

    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "patients" &&
      parts[3] === "odontogram" &&
      method === "GET"
    ) {
      const patientId = decodeURIComponent(parts[2] ?? "");
      const odontogram = await repo.getOdontogram(patientId);
      return odontogram ? json(200, odontogram, headers) : error(404, "PATIENT_NOT_FOUND", "Ficha no encontrada.");
    }

    if (
      parts.length === 5 &&
      parts[0] === "api" &&
      parts[1] === "patients" &&
      parts[3] === "odontogram" &&
      parts[4] === "batch" &&
      method === "POST"
    ) {
      if (identity.actor.role === "PATIENT") return error(403, "FORBIDDEN", "El portal no puede modificar el odontograma.");
      const patientId = decodeURIComponent(parts[2] ?? "");
      const payload = await parseJson(request, odontogramBatchSchema);
      const result = await repo.saveOdontogramBatch(patientId, payload);
      if (!result) return error(404, "PATIENT_NOT_FOUND", "Ficha no encontrada.");
      if ("conflict" in result) {
        return error(409, "ODONTOGRAM_VERSION_CONFLICT", "Recarga la ficha antes de guardar.", {
          currentVersion: result.currentVersion,
        });
      }
      return json(200, result, headers);
    }

    if (parts.length === 5 && parts[0] === "api" && parts[1] === "patients" && parts[3] === "odontogram" && parts[4] === "periodontal" && method === "POST") {
      if (identity.actor.role === "PATIENT") return error(403, "FORBIDDEN", "El portal no puede modificar periodoncia.");
      const patientId = decodeURIComponent(parts[2] ?? "");
      const payload = await parseJson(request, periodontalMeasurementSchema);
      return json(201, await clinical.savePeriodontalMeasurement(patientId, payload), headers);
    }

    if (parts.length === 5 && parts[0] === "api" && parts[1] === "patients" && parts[3] === "odontogram" && parts[4] === "snapshots") {
      const patientId = decodeURIComponent(parts[2] ?? "");
      if (method === "GET") return json(200, await clinical.listSnapshots(patientId), headers);
      if (method === "POST") {
        if (identity.actor.role === "PATIENT") return error(403, "FORBIDDEN", "El portal no puede crear snapshots clínicos.");
        const payload = await parseJson(request, createOdontogramSnapshotSchema);
        return json(201, await clinical.createSnapshot(patientId, payload), headers);
      }
    }


    if (parts.length === 4 && parts[0] === "api" && parts[1] === "patients" && parts[3] === "consent-requirements" && method === "GET") {
      return json(200, await clinical.listConsentRequirements(decodeURIComponent(parts[2] ?? "")), headers);
    }

    if (parts.length === 4 && parts[0] === "api" && parts[1] === "patients" && parts[3] === "clinical-workflow" && method === "GET") {
      return json(200, await clinical.getClinicalWorkflow(decodeURIComponent(parts[2] ?? "")), headers);
    }

    if (parts.length === 5 && parts[0] === "api" && parts[1] === "patients" && parts[3] === "clinical-workflow" && parts[4] === "periodontal-exams" && method === "POST") {
      if (identity.actor.role === "PATIENT") return error(403, "FORBIDDEN", "El portal no puede modificar periodoncia.");
      const patientId = decodeURIComponent(parts[2] ?? "");
      const payload = await parseJson(request, periodontalExamInputSchema);
      return json(201, await clinical.createPeriodontalExam(patientId, payload), headers);
    }

    if (parts.length === 4 && parts[0] === "api" && parts[1] === "patients" && parts[3] === "clinical-sync" && method === "GET") {
      return json(200, await clinical.getClinicalSync(decodeURIComponent(parts[2] ?? "")), headers);
    }

    if (parts.length === 5 && parts[0] === "api" && parts[1] === "patients" && parts[3] === "clinical-sync" && parts[4] === "plan" && method === "POST") {
      if (identity.actor.role === "PATIENT") return error(403, "FORBIDDEN", "El portal no puede sincronizar el plan clínico.");
      return json(200, await clinical.syncPlanFromOdontogram(decodeURIComponent(parts[2] ?? "")), headers);
    }

    if (parts.length === 5 && parts[0] === "api" && parts[1] === "patients" && parts[3] === "clinical-sync" && parts[4] === "budget" && method === "POST") {
      if (identity.actor.role === "PATIENT") return error(403, "FORBIDDEN", "El portal no puede sincronizar presupuestos.");
      return json(200, await clinical.syncBudgetFromPlan(decodeURIComponent(parts[2] ?? "")), headers);
    }

    if (parts.length === 4 && parts[0] === "api" && parts[1] === "patients" && parts[3] === "clinical-plan" && method === "GET") {
      const patientId = decodeURIComponent(parts[2] ?? "");
      const plan = await clinical.getClinicalPlan(patientId);
      return plan ? json(200, plan, headers) : error(404, "CLINICAL_PLAN_NOT_FOUND", "El paciente todavía no tiene un plan clínico.");
    }

    if (parts.length === 5 && parts[0] === "api" && parts[1] === "patients" && parts[3] === "clinical-plan" && parts[4] === "items" && method === "POST") {
      if (identity.actor.role === "PATIENT") return error(403, "FORBIDDEN", "El portal no puede modificar el plan clínico.");
      const patientId = decodeURIComponent(parts[2] ?? "");
      const payload = await parseJson(request, createPlanItemSchema);
      return json(201, await clinical.addClinicalPlanItem(patientId, payload), headers);
    }
  } catch (caught) {
    if (caught instanceof ClinicSelectionRequiredError) {
      return error(409, "CLINIC_SELECTION_REQUIRED", caught.message, { clinics: caught.clinics });
    }
    if (caught instanceof IdentityConfigurationError) {
      return error(409, "IDENTITY_CONFIGURATION", caught.message);
    }
    if (caught instanceof z.ZodError) {
      return error(400, "INVALID_PAYLOAD", "Los datos enviados no cumplen el contrato.", caught.flatten());
    }
    if (caught instanceof SupabaseAuthError) {
      const status = caught.status === 400 || caught.status === 401 ? 401 : caught.status;
      return error(status, "SUPABASE_AUTH_ERROR", caught.message, caught.details);
    }
    if (caught instanceof SupabaseRestError) {
      return error(
        caught.status >= 400 && caught.status < 600 ? caught.status : 502,
        "SUPABASE_ERROR",
        caught.message,
        caught.details,
      );
    }
    return error(500, "SUPABASE_ROUTE_ERROR", "No se pudo completar la operación.", {
      message: caught instanceof Error ? caught.message : String(caught),
    });
  }

  return null;
}
