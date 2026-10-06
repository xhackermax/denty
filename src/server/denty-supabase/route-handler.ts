import { handlePerioDraftsRoute } from "./perio-drafts-route";
import { handleDiagnosesRoute } from "./diagnoses-route";
import { handleNavigationRoute } from "./navigation-route";
import { handleNextSlotsRoute } from "./next-slots-route";
import { ExportRepository } from "./export-repository";
import { exportFile } from "./export-file";
import { z } from "zod";
import { withoutUndefined, type WithoutUndefined } from "@/shared/lib/without-undefined";

// Deployment trigger: v2
import {
  archivePatientSchema,
  createAppointmentSchema,
  createDocumentSchema,
  createLabWorkSchema,
  createPatientSchema,
  labTransitionSchema,
  restorePatientSchema,
  updateAppointmentSchema,
  updatePatientSchema,
  recordPaymentSchema,
  signDocumentMetadataSchema,
} from "@/shared/api";
import {
  createUserSchema,
  resetUserPasswordSchema,
  addPaymentTerminalSchema,
  saveSiteSchema,
  saveStaffMemberSchema,
  testTerminalProviderSchema,
  updatePaymentTerminalSchema,
  setStaffScheduleSchema,
  treatmentCatalogCreateSchema,
  treatmentCatalogUpdateSchema,
  updateUserSchema,
} from "@/shared/api/schemas/admin";
import {
  createOdontogramSnapshotSchema,
  clinicalEncounterInputSchema,
  createPlanItemSchema,
  planItemPriceSchema,
  odontogramBatchSchema,
  createScopedBudgetSchema,
  periodontalExamInputSchema,
  periodontalMeasurementSchema,
} from "@/shared/api/schemas/clinical";
import {
  accountingExportQuerySchema,
  allocatePaymentSchema,
  createInvoiceDraftSchema,
  createInvoiceSeriesSchema,
  deleteDraftBudgetQuerySchema,
  finalizeBudgetSignatureInputSchema,
  rectifyInvoiceSchema,
  updateDraftBudgetSchema,
  updateBillingSettingsSchema,
} from "@/shared/api/schemas/billing";
import { analyticsQuerySchema } from "@/shared/api/schemas/analytics";
import {
  createAgendaBlockSchema,
  createWaitlistEntrySchema,
  scheduleAppointmentRequestSchema,
  updateAgendaSettingsSchema,
} from "@/shared/api/schemas/agenda";
import {
  allocateSupplierPaymentSchema,
  attendanceCorrectionSchema,
  createAbsenceSchema,
  createLaboratorySchema,
  createTaskSchema,
  reorderTasksSchema,
  recordSupplierInvoiceSchema,
  recordSupplierPaymentSchema,
  updateLaboratorySchema,
  upsertLaboratoryPriceSchema,
  updateTaskSchema,
} from "@/shared/api/schemas/core";
import { patientAppointmentRequestInputSchema } from "@/shared/api/schemas/portal";
import {
  cancelPrescriptionSchema,
  createPrescriptionSchema,
  prescriptionClinicSettingsInputSchema,
  prescriptionPrescriberInputSchema,
  signPrescriptionMetadataSchema,
  updatePrescriptionSchema,
} from "@/shared/api/schemas/prescriptions";
import {
  assignAlertSchema,
  campaignBudgetSchema,
  campaignStatusSchema,
  createCommunicationSchema,
  createMarketingCampaignSchema,
  createPatientAttributionTouchSchema,
  setCommunicationConsentSchema,
  snoozeAlertSchema,
  updateMarketingCampaignSchema,
} from "@/shared/api/schemas/engagement";
import {
  createPrivacyRequestSchema,
  updatePrivacyRequestSchema,
} from "@/shared/api/schemas/security";
import { getServerEnv } from "@/shared/config/env";
import {
  AuthRepository,
  ClinicSelectionRequiredError,
  IdentityConfigurationError,
  type AuthenticatedActor,
} from "../auth/auth-repository";
import { getDevMockPatients, getDevMockPatient } from "./dev-fixtures";
import {
  appendAuthSessionCookies,
  appendClearedAuthCookies,
  appendRefreshedTokenCookies,
  decodeJwtSessionId,
  readAuthCookies,
} from "../auth/auth-session";
import { PatientRepository } from "./patient-repository";
import { AgendaRepository } from "./agenda-repository";
import { ClinicalRepository } from "./clinical-repository";
import { FinanceRepository } from "./finance-repository";
import { AnalyticsRepository } from "./analytics-repository";
import { LaboratoryRepository } from "./laboratory-repository";
import { AlertsRepository } from "./alerts-repository";
import { StaffPrivacyRepository } from "./staff-privacy-repository";
import { EngagementRepository } from "./engagement-repository";
import { TaskRepository, mapTaskRpcError } from "./task-repository";
import { PrescriptionRepository } from "./prescription-repository";
import { buildPrescriptionPdf } from "./prescription-pdf";
import { buildInvoicePdf } from "./invoice-pdf";
import { DocumentRepository } from "../documents/document-repository";
import { readSupabaseBackupStatus } from "../security/backup-status";
import {
  LAB_ATTACHMENTS_BUCKET,
  PATIENT_PHOTOS_BUCKET,
  PRESCRIPTION_EVIDENCE_BUCKET,
  StorageRepository,
} from "../storage/storage-repository";
import {
  SupabaseAuthClient,
  SupabaseAuthError,
  type SupabaseAuthSession,
} from "../supabase/auth-client";
import {
  resolveSupabaseAdminCredentials,
  resolveSupabaseAuthCredentials,
  resolveSupabasePublicCredentials,
} from "../supabase/credentials";
import { SupabaseRestClient, SupabaseRestError } from "../supabase/rest-client";
import { TerminalProviderError, testProviderConnection } from "../payments/terminal-providers";
import { PaymentTerminalRepository } from "./payment-terminal-repository";
function json(status: number, body: unknown, headers?: Headers): Response {
  const responseHeaders = headers ?? new Headers();
  responseHeaders.set("cache-control", "private, no-store");
  return Response.json(body, { status, headers: responseHeaders });
}
function error(status: number, code: string, message: string, details?: unknown): Response {
  return json(status, { error: { code, message, details } });
}
function budgetMutationError(status: string): Response {
  switch (status) {
    case "not_found":
      return error(404, "BUDGET_NOT_FOUND", "No se encontró el presupuesto de este paciente.");
    case "version_conflict":
      return error(409, "BUDGET_VERSION_CONFLICT", "El presupuesto cambió. Actualiza la ficha.");
    case "not_editable":
      return error(
        409,
        "BUDGET_NOT_EDITABLE",
        "Solo se pueden editar o eliminar presupuestos en borrador.",
      );
    case "linked":
      return error(
        409,
        "BUDGET_ALREADY_LINKED",
        "Este presupuesto tiene firma o movimientos asociados y no se puede modificar.",
      );
    case "invalid_items":
      return error(400, "BUDGET_ITEMS_INVALID", "Revisa los importes del presupuesto.");
    case "forbidden":
      return error(403, "FORBIDDEN", "No tienes permiso para modificar este presupuesto.");
    default:
      return error(409, "BUDGET_MUTATION_FAILED", "No se pudo modificar el presupuesto.");
  }
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
async function parseJson<T>(request: Request, schema: z.ZodType<T>): Promise<WithoutUndefined<T>> {
  return withoutUndefined(schema.parse(await request.json()));
}
export interface RequestIdentity {
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
/**
 * Staff sign in with email or phone; patients may also use their record number
 * ("número de ficha"), which is resolved to their portal account email(s).
 */
async function signInWithIdentifier(
  authClient: SupabaseAuthClient,
  identifier: string,
  password: string,
) {
  const adminClient = identifier.includes("@") ? null : makeAdminRestClient();
  const emails = adminClient
    ? await new AuthRepository(adminClient, { adminClient, authClient }).patientLoginEmails(
        identifier,
      )
    : [];
  if (emails.length === 0) return authClient.signInWithPassword(identifier, password);
  let failure: unknown;
  for (const email of emails) {
    try {
      return await authClient.signInWithPassword(email, password);
    } catch (caught) {
      if (!(caught instanceof SupabaseAuthError)) throw caught;
      failure = caught;
    }
  }
  throw failure;
}

export async function resolveRequestIdentity(request: Request): Promise<RequestIdentity | null> {
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
function agendaRepository(identity: RequestIdentity): AgendaRepository {
  return new AgendaRepository(identity.restClient, identity.actor.clinicId);
}
export function financeRepository(identity: RequestIdentity): FinanceRepository {
  return new FinanceRepository(identity.restClient, identity.actor.clinicId);
}
function analyticsRepository(identity: RequestIdentity): AnalyticsRepository {
  return new AnalyticsRepository(identity.restClient, identity.actor.clinicId);
}
function laboratoryRepository(identity: RequestIdentity): LaboratoryRepository {
  return new LaboratoryRepository(identity.restClient, identity.actor.clinicId);
}
function alertsRepository(identity: RequestIdentity): AlertsRepository {
  return new AlertsRepository(identity.restClient, identity.actor.clinicId);
}
function staffPrivacyRepository(identity: RequestIdentity): StaffPrivacyRepository {
  return new StaffPrivacyRepository(
    identity.restClient,
    identity.actor.clinicId,
    identity.actor.userId,
  );
}
function engagementRepository(identity: RequestIdentity): EngagementRepository {
  return new EngagementRepository(identity.restClient, identity.actor.clinicId);
}
function taskRepository(identity: RequestIdentity): TaskRepository {
  return new TaskRepository(identity.restClient, identity.actor.clinicId);
}
function prescriptionRepository(identity: RequestIdentity): PrescriptionRepository {
  return new PrescriptionRepository(identity.restClient, identity.actor.clinicId);
}
function requireActorPermission(identity: RequestIdentity, permission: string): Response | null {
  return identity.actor.permissions.includes(permission as never)
    ? null
    : error(403, "FORBIDDEN", `Falta el permiso ${permission}.`);
}
function storageRepository(identity: RequestIdentity): StorageRepository {
  const credentials = resolveSupabasePublicCredentials(getServerEnv());
  if (!credentials) throw new IdentityConfigurationError("Supabase público no está configurado.");
  return new StorageRepository({
    url: credentials.url,
    key: credentials.key,
    accessToken: identity.accessToken,
  });
}
function documentRepository(identity: RequestIdentity): DocumentRepository {
  return new DocumentRepository(
    identity.restClient,
    storageRepository(identity),
    identity.actor.clinicId,
  );
}
// Every /api/<section> dispatched below must be listed: unlisted sections fall through to
// 501 SUPABASE_ROUTE_NOT_IMPLEMENTED before reaching their branch.
export const LOCALLY_HANDLED_SECTIONS: ReadonlySet<string> = new Set([
  "api",
  "users",
  "patients",
  "patient",
  "documents",
  "document-templates",
  "security",
  "admin",
  "budgets",
  "appointments",
  "agenda",
  "attendance",
  "analytics",
  "invoices",
  "invoice-series",
  "payments",
  "accounting",
  "lab-works",
  "laboratories",
  "laboratory-price-list",
  "suppliers",
  "supplier-invoices",
  "supplier-payments",
  "tasks",
  "prescriptions",
  "prescription-settings",
  "payment-terminals",
  "clinical-plan",
  "navigation",
]);

export async function handleSupabaseDentyRoute(
  request: Request,
  backendPath: string,
): Promise<Response | null> {
  const parts = segments(backendPath);
  const method = request.method.toUpperCase();
  const env = getServerEnv();
  const authClient = makeAuthClient();

  // Development-only: provide mock data for patients endpoint when Supabase is not configured
  if (!authClient && env.NODE_ENV !== "production") {
    if (parts.length === 2 && parts[0] === "api" && parts[1] === "patients" && method === "GET") {
      const url = new URL(request.url);
      const includeArchived = url.searchParams.get("includeArchived") === "true";
      const search = url.searchParams.get("search");
      const pageParam = url.searchParams.get("page");
      const pageSizeParam = url.searchParams.get("pageSize");
      const result = getDevMockPatients({
        includeArchived,
        ...(search ? { search } : {}),
        ...(pageParam ? { page: Number(pageParam) } : {}),
        ...(pageSizeParam ? { pageSize: Number(pageSizeParam) } : {}),
      });
      return json(200, result);
    }
    if (parts.length === 3 && parts[0] === "api" && parts[1] === "patients" && method === "GET") {
      const patientId = decodeURIComponent(parts[2] ?? "");
      const patient = getDevMockPatient(patientId);
      if (patient) return json(200, patient);
      return error(404, "PATIENT_NOT_FOUND", "Ficha no encontrada.");
    }
  }

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
        const session = await signInWithIdentifier(
          authClient,
          payload.identifier,
          payload.password,
        );
        const publicCredentials = resolveSupabasePublicCredentials(env);
        if (!publicCredentials)
          return error(503, "SUPABASE_PUBLIC_KEY_REQUIRED", "Falta la clave pública de Supabase.");
        const restClient = new SupabaseRestClient({
          url: publicCredentials.url,
          key: publicCredentials.key,
          accessToken: session.accessToken,
        });
        const auth = new AuthRepository(restClient);
        const actor = await auth.resolveActor(session.user.id, {
          requestedClinicId: payload.clinicId,
        });
        if (!actor) {
          await authClient.signOut(session.accessToken).catch(() => undefined);
          return error(
            403,
            "IDENTITY_NOT_LINKED",
            "La cuenta no está vinculada a una clínica o paciente activo.",
          );
        }
        const appSession = await auth.createAppSession({
          actor,
          authSessionId: decodeJwtSessionId(session.accessToken),
          deviceLabel: payload.deviceLabel,
          userAgent: request.headers.get("user-agent"),
        });
        const headers = new Headers({ "cache-control": "private, no-store" });
        appendAuthSessionCookies(headers, session, appSession.id, {
          secure: secureCookies(request),
        });
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
          await identity.authRepository
            .revokeSession(identity.actor.userId, identity.appSessionId)
            .catch(() => undefined);
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
        if (!identifier)
          return error(
            400,
            "AUTH_IDENTIFIER_MISSING",
            "La cuenta no tiene email o teléfono de acceso.",
          );
        try {
          await identity.authClient.signInWithPassword(identifier, payload.currentPassword);
        } catch (caught) {
          // Not a session failure: answering 401 here would sign the user out.
          if (caught instanceof SupabaseAuthError)
            return error(400, "CURRENT_PASSWORD_INVALID", "La contraseña actual no es correcta.");
          throw caught;
        }
        const refreshToken =
          identity.refreshedSession?.refreshToken ?? readAuthCookies(request).refreshToken;
        if (!refreshToken) return error(401, "UNAUTHENTICATED", "No hay sesión activa.");
        await identity.authClient.updatePassword(
          identity.accessToken,
          payload.newPassword,
          refreshToken,
        );
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
    if (
      parts.length === 3 &&
      parts[0] === "api" &&
      parts[1] === "auth" &&
      parts[2] === "sessions"
    ) {
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
    const locallyHandled = parts[0] === "api" && LOCALLY_HANDLED_SECTIONS.has(parts[1] ?? "");
    if (!locallyHandled) return null;
    const identity = await resolveRequestIdentity(request);
    if (!identity) return error(401, "UNAUTHENTICATED", "No hay sesión activa.");
    const headers = responseHeadersForIdentity(request, identity);
    const repo = patientRepository(identity);
    const clinical = clinicalRepository(identity);
    const agenda = agendaRepository(identity);
    const finance = financeRepository(identity);
    const analytics = analyticsRepository(identity);
    const laboratory = laboratoryRepository(identity);
    const alerts = alertsRepository(identity);
    const staffPrivacy = staffPrivacyRepository(identity);
    const engagement = engagementRepository(identity);
    const tasks = taskRepository(identity);
    const prescriptions = prescriptionRepository(identity);
    // Stage 11: staff attendance, privacy, engagement, attribution and persistent tasks.
    if (
      parts.length === 3 &&
      parts[0] === "api" &&
      parts[1] === "attendance" &&
      parts[2] === "me" &&
      method === "GET"
    ) {
      const date =
        new URL(request.url).searchParams.get("date") ??
        new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
      return json(200, await staffPrivacy.attendanceMe(date), headers);
    }
    if (
      parts.length === 3 &&
      parts[0] === "api" &&
      parts[1] === "attendance" &&
      parts[2] === "punch" &&
      method === "POST"
    ) {
      if (identity.actor.role === "PATIENT")
        return error(403, "FORBIDDEN", "Los pacientes no pueden fichar como personal.");
      return json(201, await staffPrivacy.clock(), headers);
    }
    if (
      parts.length === 3 &&
      parts[0] === "api" &&
      parts[1] === "attendance" &&
      parts[2] === "daily" &&
      method === "GET"
    ) {
      if (identity.actor.role === "PATIENT")
        return error(403, "FORBIDDEN", "Los pacientes no pueden consultar fichajes de personal.");
      const date =
        new URL(request.url).searchParams.get("date") ??
        new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
      return json(200, await staffPrivacy.daily(date), headers);
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "attendance" &&
      parts[2] === "punches" &&
      method === "PATCH"
    ) {
      const d = requireActorPermission(identity, "settings.manage");
      if (d) return d;
      const payload = await parseJson(request, attendanceCorrectionSchema);
      return json(
        200,
        await staffPrivacy.correctPunch(
          decodeURIComponent(parts[3] ?? ""),
          payload.occurredAt,
          payload.reason,
        ),
        headers,
      );
    }
    if (
      parts.length === 3 &&
      parts[0] === "api" &&
      parts[1] === "security" &&
      parts[2] === "privacy-requests"
    ) {
      if (method === "GET") {
        const d = requireActorPermission(identity, "settings.manage");
        if (d) return d;
        return json(200, await staffPrivacy.listPrivacy(), headers);
      }
      if (method === "POST") {
        const d = requireActorPermission(identity, "settings.manage");
        if (d) return d;
        return json(
          201,
          await staffPrivacy.createPrivacy(await parseJson(request, createPrivacyRequestSchema)),
          headers,
        );
      }
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "security" &&
      parts[2] === "privacy-requests" &&
      method === "PATCH"
    ) {
      const d = requireActorPermission(identity, "settings.manage");
      if (d) return d;
      return json(
        200,
        await staffPrivacy.updatePrivacy(
          decodeURIComponent(parts[3] ?? ""),
          await parseJson(request, updatePrivacyRequestSchema),
        ),
        headers,
      );
    }
    if (
      parts.length === 3 &&
      parts[0] === "api" &&
      parts[1] === "admin" &&
      parts[2] === "communications" &&
      method === "GET"
    ) {
      const d = requireActorPermission(identity, "communications.read");
      if (d) return d;
      return json(200, await engagement.listCommunications(), headers);
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "admin" &&
      parts[2] === "communications" &&
      parts[3] === "templates" &&
      method === "GET"
    ) {
      const d = requireActorPermission(identity, "communications.read");
      if (d) return d;
      return json(
        200,
        {
          items: [
            { key: "APPOINTMENT_REMINDER", label: "Recordatorio de cita" },
            { key: "APPOINTMENT_CHANGE", label: "Cambio de cita" },
            { key: "PAYMENT_REMINDER", label: "Recordatorio de pago" },
            { key: "DOCUMENT_AVAILABLE", label: "Documento disponible" },
            { key: "ADMINISTRATIVE", label: "Administrativa" },
            { key: "MARKETING", label: "Marketing" },
          ],
        },
        headers,
      );
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "patients" &&
      parts[3] === "communications"
    ) {
      const patientId = decodeURIComponent(parts[2] ?? "");
      if (method === "GET") {
        const d = requireActorPermission(identity, "communications.read");
        if (d) return d;
        return json(200, await engagement.listCommunications(patientId), headers);
      }
      if (method === "POST") {
        const d = requireActorPermission(identity, "communications.manage");
        if (d) return d;
        return json(
          201,
          await engagement.createCommunication(
            patientId,
            await parseJson(request, createCommunicationSchema),
          ),
          headers,
        );
      }
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "patients" &&
      parts[3] === "communication-consents"
    ) {
      const patientId = decodeURIComponent(parts[2] ?? "");
      if (method === "GET") {
        const d = requireActorPermission(identity, "communications.read");
        if (d) return d;
        return json(200, await engagement.listConsents(patientId), headers);
      }
      if (method === "PUT") {
        const d = requireActorPermission(identity, "communications.manage");
        if (d) return d;
        return json(
          200,
          await engagement.setConsent(
            patientId,
            await parseJson(request, setCommunicationConsentSchema),
          ),
          headers,
        );
      }
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "patients" &&
      parts[3] === "attribution-touchpoints" &&
      method === "POST"
    ) {
      const d = requireActorPermission(identity, "attribution.manage");
      if (d) return d;
      return json(
        201,
        await engagement.attributePatient(
          decodeURIComponent(parts[2] ?? ""),
          await parseJson(request, createPatientAttributionTouchSchema),
        ),
        headers,
      );
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "admin" &&
      parts[2] === "marketing" &&
      parts[3] === "connections" &&
      method === "GET"
    ) {
      const d = requireActorPermission(identity, "marketing.read");
      if (d) return d;
      return json(200, engagement.connections(), headers);
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "admin" &&
      parts[2] === "marketing" &&
      parts[3] === "campaigns"
    ) {
      if (method === "GET") {
        const d = requireActorPermission(identity, "marketing.read");
        if (d) return d;
        return json(
          200,
          await engagement.listCampaigns(
            new URL(request.url).searchParams.get("provider") ?? undefined,
          ),
          headers,
        );
      }
      if (method === "POST") {
        const d = requireActorPermission(identity, "marketing.manage");
        if (d) return d;
        return json(
          201,
          await engagement.createCampaign(await parseJson(request, createMarketingCampaignSchema)),
          headers,
        );
      }
    }
    if (
      parts.length === 6 &&
      parts[0] === "api" &&
      parts[1] === "admin" &&
      parts[2] === "marketing" &&
      parts[3] === "campaigns" &&
      method === "PATCH"
    ) {
      const d = requireActorPermission(identity, "marketing.manage");
      if (d) return d;
      return json(
        200,
        await engagement.updateCampaign(
          decodeURIComponent(parts[5] ?? ""),
          await parseJson(request, updateMarketingCampaignSchema),
          decodeURIComponent(parts[4] ?? ""),
        ),
        headers,
      );
    }
    if (
      parts.length === 7 &&
      parts[0] === "api" &&
      parts[1] === "admin" &&
      parts[2] === "marketing" &&
      parts[3] === "campaigns" &&
      method === "POST"
    ) {
      const d = requireActorPermission(identity, "marketing.manage");
      if (d) return d;
      const campaignId = decodeURIComponent(parts[5] ?? "");
      if (parts[6] === "status") {
        const payload = await parseJson(request, campaignStatusSchema);
        return json(
          200,
          await engagement.updateCampaign(
            campaignId,
            { status: payload.status },
            decodeURIComponent(parts[4] ?? ""),
          ),
          headers,
        );
      }
      if (parts[6] === "budget") {
        const payload = await parseJson(request, campaignBudgetSchema);
        return json(
          200,
          await engagement.updateCampaign(
            campaignId,
            { dailyBudgetCents: payload.dailyBudgetCents },
            decodeURIComponent(parts[4] ?? ""),
          ),
          headers,
        );
      }
    }
    if (
      parts.length === 3 &&
      parts[0] === "api" &&
      parts[1] === "tasks" &&
      parts[2] === "assignees" &&
      method === "GET"
    ) {
      if (identity.actor.role === "PATIENT")
        return error(403, "FORBIDDEN", "El portal no gestiona tareas internas.");
      const team = await tasks.assignees();
      return json(200, { ...team, currentStaffId: identity.actor.staffId ?? null }, headers);
    }
    if (parts.length === 2 && parts[0] === "api" && parts[1] === "tasks") {
      if (identity.actor.role === "PATIENT")
        return error(403, "FORBIDDEN", "El portal no gestiona tareas internas.");
      if (method === "GET") return json(200, await tasks.list(), headers);
      if (method === "POST")
        return json(201, await tasks.create(await parseJson(request, createTaskSchema)), headers);
    }
    if (
      parts.length === 3 &&
      parts[0] === "api" &&
      parts[1] === "tasks" &&
      parts[2] === "reorder" &&
      method === "POST"
    ) {
      if (identity.actor.role === "PATIENT")
        return error(403, "FORBIDDEN", "El portal no gestiona tareas internas.");
      const payload = await parseJson(request, reorderTasksSchema);
      try {
        return json(200, await tasks.reorder(payload.orderedIds), headers);
      } catch (caught) {
        const mapped = mapTaskRpcError(caught);
        if (mapped) return error(mapped.status, mapped.code, mapped.message);
        throw caught;
      }
    }
    if (parts.length === 3 && parts[0] === "api" && parts[1] === "tasks" && method === "PATCH") {
      if (identity.actor.role === "PATIENT")
        return error(403, "FORBIDDEN", "El portal no gestiona tareas internas.");
      const taskId = decodeURIComponent(parts[2] ?? "");
      const payload = await parseJson(request, updateTaskSchema);
      const { status } = payload;
      const isLegacyStatusUpdate =
        status !== undefined &&
        payload.title === undefined &&
        payload.priority === undefined &&
        payload.durationMin === undefined &&
        payload.archived === undefined &&
        payload.scheduledOn === undefined &&
        payload.dueAt !== null;
      try {
        // Legacy {status, expectedVersion} callers keep hitting update_task_status.
        const updated = isLegacyStatusUpdate
          ? await tasks.updateStatus(taskId, {
              status,
              ...(payload.expectedVersion !== undefined && {
                expectedVersion: payload.expectedVersion,
              }),
              ...(payload.assigneeStaffId !== undefined && {
                assigneeStaffId: payload.assigneeStaffId,
              }),
              ...(payload.dueAt ? { dueAt: payload.dueAt } : {}),
            })
          : await tasks.update(taskId, payload);
        return json(200, updated, headers);
      } catch (caught) {
        const mapped = mapTaskRpcError(caught);
        if (mapped) return error(mapped.status, mapped.code, mapped.message);
        throw caught;
      }
    }
    // Stage 12: prescriptions are canonical Supabase records with immutable signature evidence.
    if (
      parts.length === 2 &&
      parts[0] === "api" &&
      parts[1] === "prescription-settings" &&
      method === "GET"
    ) {
      if (identity.actor.role === "PATIENT")
        return error(403, "FORBIDDEN", "El portal no gestiona la configuración de recetas.");
      const d = requireActorPermission(identity, "prescription.read");
      if (d) return d;
      return json(200, await prescriptions.settings(), headers);
    }
    if (
      parts.length === 3 &&
      parts[0] === "api" &&
      parts[1] === "prescription-settings" &&
      parts[2] === "clinic" &&
      method === "PUT"
    ) {
      const d = requireActorPermission(identity, "prescription.settings.write");
      if (d) return d;
      return json(
        200,
        await prescriptions.updateClinicSettings(
          await parseJson(request, prescriptionClinicSettingsInputSchema),
        ),
        headers,
      );
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "prescription-settings" &&
      parts[2] === "prescribers" &&
      method === "PUT"
    ) {
      const d = requireActorPermission(identity, "prescription.settings.write");
      if (d) return d;
      return json(
        200,
        await prescriptions.updatePrescriber(
          decodeURIComponent(parts[3] ?? ""),
          await parseJson(request, prescriptionPrescriberInputSchema),
        ),
        headers,
      );
    }
    if (parts.length === 2 && parts[0] === "api" && parts[1] === "prescriptions") {
      if (method === "GET") {
        if (identity.actor.role !== "PATIENT") {
          const d = requireActorPermission(identity, "prescription.read");
          if (d) return d;
        }
        const patientId = new URL(request.url).searchParams.get("patientId") ?? undefined;
        return json(200, await prescriptions.list(patientId), headers);
      }
      if (method === "POST") {
        const d = requireActorPermission(identity, "prescription.draft.write");
        if (d) return d;
        return json(
          201,
          await prescriptions.create(await parseJson(request, createPrescriptionSchema)),
          headers,
        );
      }
    }
    if (parts.length === 3 && parts[0] === "api" && parts[1] === "prescriptions") {
      const prescriptionId = decodeURIComponent(parts[2] ?? "");
      if (method === "GET") {
        if (identity.actor.role !== "PATIENT") {
          const d = requireActorPermission(identity, "prescription.read");
          if (d) return d;
        }
        return json(200, await prescriptions.get(prescriptionId), headers);
      }
      if (method === "PATCH") {
        const d = requireActorPermission(identity, "prescription.draft.write");
        if (d) return d;
        return json(
          200,
          await prescriptions.update(
            prescriptionId,
            await parseJson(request, updatePrescriptionSchema),
          ),
          headers,
        );
      }
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "prescriptions" &&
      parts[3] === "validate" &&
      method === "POST"
    ) {
      const d = requireActorPermission(identity, "prescription.sign");
      if (d) return d;
      return json(200, await prescriptions.validate(decodeURIComponent(parts[2] ?? "")), headers);
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "prescriptions" &&
      parts[3] === "sign" &&
      method === "POST"
    ) {
      const d = requireActorPermission(identity, "prescription.sign");
      if (d) return d;
      const prescriptionId = decodeURIComponent(parts[2] ?? "");
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File))
        return error(400, "SIGNATURE_FILE_REQUIRED", "Adjunta una firma PNG o JPEG válida.");
      let evidence: Record<string, unknown> | undefined;
      const evidenceRaw = form.get("evidence");
      if (typeof evidenceRaw === "string" && evidenceRaw.trim()) {
        const parsedEvidence = JSON.parse(evidenceRaw) as unknown;
        if (
          !parsedEvidence ||
          typeof parsedEvidence !== "object" ||
          Array.isArray(parsedEvidence)
        ) {
          return error(400, "INVALID_SIGNATURE_EVIDENCE", "La evidencia de firma no es válida.");
        }
        evidence = parsedEvidence as Record<string, unknown>;
      }
      const payload = signPrescriptionMetadataSchema.parse({
        signerName: form.get("signerName"),
        ...(evidence ? { evidence } : {}),
      });
      const storage = storageRepository(identity);
      const stored = await storage.uploadPrescriptionSignature(
        identity.actor.clinicId,
        prescriptionId,
        file,
      );
      try {
        await prescriptions.recordSignature({
          prescriptionId,
          signerName: payload.signerName,
          storagePath: stored.path,
          checksum: stored.checksum,
          mimeType: stored.mimeType,
          sizeBytes: stored.sizeBytes,
          evidence: {
            ...payload.evidence,
            source: "DENTY_SIGNATURE_PAD",
            signedFromSessionId: identity.appSessionId,
          },
        });
      } catch (signatureError) {
        try {
          await storage.remove(PRESCRIPTION_EVIDENCE_BUCKET, stored.path);
        } catch {
          // If the RPC committed before the network failed, RLS protects recorded evidence from deletion.
        }
        throw signatureError;
      }
      return json(200, await prescriptions.get(prescriptionId), headers);
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "prescriptions" &&
      parts[3] === "issue" &&
      method === "POST"
    ) {
      const d = requireActorPermission(identity, "prescription.sign");
      if (d) return d;
      return json(200, await prescriptions.issue(decodeURIComponent(parts[2] ?? "")), headers);
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "prescriptions" &&
      parts[3] === "cancel" &&
      method === "POST"
    ) {
      const d = requireActorPermission(identity, "prescription.cancel");
      if (d) return d;
      const payload = await parseJson(request, cancelPrescriptionSchema);
      return json(
        200,
        await prescriptions.cancel(decodeURIComponent(parts[2] ?? ""), payload.reason),
        headers,
      );
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "prescriptions" &&
      parts[3] === "history" &&
      method === "GET"
    ) {
      const d = requireActorPermission(identity, "prescription.audit.read");
      if (d) return d;
      return json(200, await prescriptions.history(decodeURIComponent(parts[2] ?? "")), headers);
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "prescriptions" &&
      parts[3] === "pdf" &&
      method === "GET"
    ) {
      if (identity.actor.role !== "PATIENT") {
        const d = requireActorPermission(identity, "prescription.read");
        if (d) return d;
      }
      const prescription = await prescriptions.get(decodeURIComponent(parts[2] ?? ""));
      return new Response(new Uint8Array(buildPrescriptionPdf(prescription)), {
        status: 200,
        headers: {
          ...Object.fromEntries(headers.entries()),
          "content-type": "application/pdf",
          "content-disposition": `inline; filename="receta-${prescription.id}.pdf"`,
        },
      });
    }
    // Stage 10: laboratory master, clinical works, attachments and supplier ledger share one canonical source.
    if (parts.length === 2 && parts[0] === "api" && parts[1] === "laboratories") {
      if (method === "GET") {
        const d = requireActorPermission(identity, "lab.read");
        if (d) return d;
        return json(200, await laboratory.listLaboratories(), headers);
      }
      if (method === "POST") {
        const d = requireActorPermission(identity, "lab.write");
        if (d) return d;
        return json(
          201,
          await laboratory.createLaboratory(await parseJson(request, createLaboratorySchema)),
          headers,
        );
      }
    }
    if (
      parts.length === 3 &&
      parts[0] === "api" &&
      parts[1] === "laboratories" &&
      parts[2] === "balances" &&
      method === "GET"
    ) {
      const d =
        requireActorPermission(identity, "lab.read") ??
        requireActorPermission(identity, "finance.read");
      if (d) return d;
      return json(200, await laboratory.listBalances(), headers);
    }
    if (
      parts.length === 3 &&
      parts[0] === "api" &&
      parts[1] === "laboratories" &&
      method === "PATCH"
    ) {
      const d = requireActorPermission(identity, "lab.write");
      if (d) return d;
      return json(
        200,
        await laboratory.updateLaboratory(
          decodeURIComponent(parts[2] ?? ""),
          await parseJson(request, updateLaboratorySchema),
        ),
        headers,
      );
    }
    if (parts.length === 2 && parts[0] === "api" && parts[1] === "laboratory-price-list") {
      if (identity.actor.role !== "ADMIN") {
        return error(
          403,
          "FORBIDDEN",
          "Solo administracion puede configurar precios de laboratorio.",
        );
      }
      if (method === "GET") {
        const d = requireActorPermission(identity, "lab.read");
        if (d) return d;
        return json(200, await laboratory.listPriceList(), headers);
      }
      if (method === "POST") {
        const d = requireActorPermission(identity, "lab.write");
        if (d) return d;
        return json(
          201,
          await laboratory.upsertPriceListItem(
            await parseJson(request, upsertLaboratoryPriceSchema),
          ),
          headers,
        );
      }
    }
    if (parts.length === 2 && parts[0] === "api" && parts[1] === "lab-works") {
      if (method === "GET") {
        const d = requireActorPermission(identity, "lab.read");
        if (d) return d;
        return json(200, await laboratory.listWorks(), headers);
      }
      if (method === "POST") {
        const d = requireActorPermission(identity, "lab.write");
        if (d) return d;
        const payload = await parseJson(request, createLabWorkSchema);
        return json(
          201,
          await laboratory.createWork(
            withoutUndefined({
              patientId: payload.patientId,
              laboratoryId: payload.laboratoryId ?? payload.labId,
              clinicalPlanItemId: payload.clinicalPlanItemId,
              appointmentId: payload.appointmentId,
              dentalEntityId: payload.dentalEntityId,
              siteId: payload.siteId,
              title: payload.title,
              category: payload.category,
              toothOrZone: payload.toothOrZone,
              etaAt: payload.etaAt,
              costCents: payload.costCents,
              notes: payload.notes,
            }),
          ),
          headers,
        );
      }
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "lab-works" &&
      parts[3] === "transition" &&
      method === "POST"
    ) {
      const d = requireActorPermission(identity, "lab.write");
      if (d) return d;
      const payload = await parseJson(request, labTransitionSchema);
      return json(
        200,
        await laboratory.transitionWork(
          decodeURIComponent(parts[2] ?? ""),
          payload.expectedVersion,
          payload.status,
          payload.note,
        ),
        headers,
      );
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "lab-works" &&
      parts[3] === "rework" &&
      method === "POST"
    ) {
      const d = requireActorPermission(identity, "lab.write");
      if (d) return d;
      const payload = await parseJson(
        request,
        z
          .object({
            reason: z.string().min(1),
            etaAt: z.string().optional(),
            costCents: z.number().int().nonnegative().optional(),
          })
          .strict(),
      );
      return json(
        200,
        await laboratory.createRework(decodeURIComponent(parts[2] ?? ""), payload),
        headers,
      );
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "lab-works" &&
      parts[3] === "agenda-warning" &&
      method === "GET"
    ) {
      const d = requireActorPermission(identity, "lab.read");
      if (d) return d;
      return json(200, await laboratory.agendaWarning(decodeURIComponent(parts[2] ?? "")), headers);
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "lab-works" &&
      parts[3] === "attachments" &&
      method === "POST"
    ) {
      const d = requireActorPermission(identity, "lab.write");
      if (d) return d;
      const workId = decodeURIComponent(parts[2] ?? "");
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File))
        return error(400, "LAB_ATTACHMENT_REQUIRED", "Adjunta un archivo válido.");
      const work = await laboratory.getWork(workId);
      if (!work) return error(404, "LAB_WORK_NOT_FOUND", "Trabajo de laboratorio no encontrado.");
      const storage = storageRepository(identity);
      const stored = await storage.uploadLabAttachment(identity.actor.clinicId, workId, file);
      try {
        return json(201, await laboratory.registerAttachment(workId, stored, file.name), headers);
      } catch (caught) {
        await storage.remove(LAB_ATTACHMENTS_BUCKET, stored.path).catch(() => undefined);
        throw caught;
      }
    }
    if (
      parts.length === 5 &&
      parts[0] === "api" &&
      parts[1] === "lab-works" &&
      parts[3] === "attachments" &&
      method === "GET"
    ) {
      const d = requireActorPermission(identity, "lab.read");
      if (d) return d;
      const attachment = await laboratory.attachment(
        decodeURIComponent(parts[2] ?? ""),
        decodeURIComponent(parts[4] ?? ""),
      );
      if (!attachment) return error(404, "LAB_ATTACHMENT_NOT_FOUND", "Adjunto no encontrado.");
      const blob = await storageRepository(identity).download(
        LAB_ATTACHMENTS_BUCKET,
        attachment.storage_path,
      );
      return new Response(blob, {
        status: 200,
        headers: {
          ...Object.fromEntries(headers.entries()),
          "content-type": attachment.mime_type,
          "content-disposition": `attachment; filename="${attachment.file_name.replaceAll('"', "")}"`,
        },
      });
    }
    if (parts.length === 2 && parts[0] === "api" && parts[1] === "suppliers" && method === "GET") {
      const d =
        requireActorPermission(identity, "lab.read") ??
        requireActorPermission(identity, "finance.read");
      if (d) return d;
      return json(200, await laboratory.suppliersAnalytics(), headers);
    }
    if (parts.length === 2 && parts[0] === "api" && parts[1] === "supplier-invoices") {
      if (method === "GET") {
        const d =
          requireActorPermission(identity, "lab.read") ??
          requireActorPermission(identity, "finance.read");
        if (d) return d;
        return json(200, await laboratory.listSupplierInvoices(), headers);
      }
      if (method === "POST") {
        const d =
          requireActorPermission(identity, "lab.write") ??
          requireActorPermission(identity, "finance.write");
        if (d) return d;
        const payload = await parseJson(request, recordSupplierInvoiceSchema);
        return json(201, await laboratory.recordSupplierInvoice(payload), headers);
      }
    }
    if (parts.length === 2 && parts[0] === "api" && parts[1] === "supplier-payments") {
      if (method === "GET") {
        const d =
          requireActorPermission(identity, "lab.read") ??
          requireActorPermission(identity, "finance.read");
        if (d) return d;
        return json(200, await laboratory.listSupplierPayments(), headers);
      }
      if (method === "POST") {
        const d =
          requireActorPermission(identity, "lab.write") ??
          requireActorPermission(identity, "finance.write");
        if (d) return d;
        const payload = await parseJson(request, recordSupplierPaymentSchema);
        return json(201, await laboratory.recordSupplierPayment(payload), headers);
      }
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "supplier-payments" &&
      parts[3] === "allocate" &&
      method === "POST"
    ) {
      const d =
        requireActorPermission(identity, "lab.write") ??
        requireActorPermission(identity, "finance.write");
      if (d) return d;
      const payload = await parseJson(request, allocateSupplierPaymentSchema);
      return json(
        201,
        await laboratory.allocateSupplierPayment(
          decodeURIComponent(parts[2] ?? ""),
          payload.invoiceId,
          payload.amountCents,
        ),
        headers,
      );
    }
    if (
      parts.length === 3 &&
      parts[0] === "api" &&
      parts[1] === "analytics" &&
      parts[2] === "purchases" &&
      method === "GET"
    ) {
      const d =
        requireActorPermission(identity, "lab.read") ??
        requireActorPermission(identity, "finance.read");
      if (d) return d;
      const params = new URL(request.url).searchParams;
      const query = analyticsQuerySchema.parse(Object.fromEntries(params.entries()));
      return json(
        200,
        await laboratory.purchasesAnalytics(query.start, query.end, query.siteId),
        headers,
      );
    }
    // Stage 8: billing, payments, allocations and fiscal records share one canonical ledger.
    if (parts.length === 2 && parts[0] === "api" && parts[1] === "budgets" && method === "GET") {
      const denied = requireActorPermission(identity, "finance.read");
      if (denied) return denied;
      return json(200, await finance.listBudgets(), headers);
    }
    if (parts.length === 3 && parts[0] === "api" && parts[1] === "budgets") {
      if (
        !identity.actor.permissions.includes("clinical.write") &&
        !identity.actor.permissions.includes("finance.write")
      ) {
        return error(403, "FORBIDDEN", "No tienes permiso para modificar presupuestos clínicos.");
      }
      const budgetId = decodeURIComponent(parts[2] ?? "");
      if (method === "PATCH") {
        const payload = await parseJson(request, updateDraftBudgetSchema);
        const result = await clinical.updateDraftBudget(payload.patientId, budgetId, payload);
        if (result.status !== "updated") return budgetMutationError(result.status);
        return json(200, { budget: result.budget }, headers);
      }
      if (method === "DELETE") {
        const params = new URL(request.url).searchParams;
        const parsed = deleteDraftBudgetQuerySchema.safeParse({
          patientId: params.get("patientId"),
          expectedVersion: params.get("expectedVersion"),
        });
        if (!parsed.success)
          return error(400, "VALIDATION_ERROR", "La versión del presupuesto no es válida.");
        const result = await clinical.deleteDraftBudget(
          parsed.data.patientId,
          budgetId,
          parsed.data.expectedVersion,
        );
        if (result.status !== "deleted") return budgetMutationError(result.status);
        return json(200, { deleted: true }, headers);
      }
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "budgets" &&
      parts[3] === "invoice-draft" &&
      method === "POST"
    ) {
      const denied = requireActorPermission(identity, "finance.write");
      if (denied) return denied;
      const body = await parseJson(request, z.object({ seriesId: z.string().uuid().optional() }));
      let seriesId = body.seriesId;
      if (!seriesId) seriesId = (await finance.listInvoiceSeries()).items.find((x) => x.active)?.id;
      if (!seriesId)
        return error(409, "INVOICE_SERIES_REQUIRED", "Configura una serie de facturación.");
      return json(
        201,
        await finance.createInvoiceFromBudget(decodeURIComponent(parts[2] ?? ""), seriesId),
        headers,
      );
    }
    if (parts.length === 2 && parts[0] === "api" && parts[1] === "invoice-series") {
      if (method === "GET") {
        const d = requireActorPermission(identity, "finance.read");
        if (d) return d;
        return json(200, await finance.listInvoiceSeries(), headers);
      }
      if (method === "POST") {
        const d = requireActorPermission(identity, "billing.settings.manage");
        if (d) return d;
        return json(
          201,
          await finance.createInvoiceSeries(await parseJson(request, createInvoiceSeriesSchema)),
          headers,
        );
      }
    }
    if (parts.length === 2 && parts[0] === "api" && parts[1] === "invoices") {
      if (method === "GET") {
        const d = requireActorPermission(identity, "finance.read");
        if (d) return d;
        return json(200, await finance.listInvoices(), headers);
      }
      if (method === "POST") {
        const d = requireActorPermission(identity, "finance.write");
        if (d) return d;
        return json(
          201,
          await finance.createInvoice(await parseJson(request, createInvoiceDraftSchema)),
          headers,
        );
      }
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "invoices" &&
      parts[3] === "issue" &&
      method === "POST"
    ) {
      const d = requireActorPermission(identity, "billing.issue");
      if (d) return d;
      return json(200, await finance.issueInvoice(decodeURIComponent(parts[2] ?? "")), headers);
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "invoices" &&
      parts[3] === "rectify" &&
      method === "POST"
    ) {
      const d = requireActorPermission(identity, "billing.issue");
      if (d) return d;
      return json(
        201,
        await finance.rectifyInvoice(
          decodeURIComponent(parts[2] ?? ""),
          await parseJson(request, rectifyInvoiceSchema),
        ),
        headers,
      );
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "invoices" &&
      parts[3] === "pdf" &&
      method === "GET"
    ) {
      const d = requireActorPermission(identity, "finance.read");
      if (d) return d;
      const inv = await finance.getInvoice(decodeURIComponent(parts[2] ?? ""));
      if (!inv) return error(404, "INVOICE_NOT_FOUND", "Factura no encontrada.");
      return new Response(new Uint8Array(buildInvoicePdf(inv)), {
        status: 200,
        headers: {
          ...Object.fromEntries(headers.entries()),
          "content-type": "application/pdf",
          "content-disposition": `inline; filename="factura-${inv.fullNumber ?? inv.id}.pdf"`,
        },
      });
    }
    if (
      parts.length === 5 &&
      parts[0] === "api" &&
      parts[1] === "invoices" &&
      parts[3] === "verifactu" &&
      parts[4] === "submit" &&
      method === "POST"
    ) {
      const d = requireActorPermission(identity, "billing.issue");
      if (d) return d;
      return json(202, await finance.queueVerifactu(decodeURIComponent(parts[2] ?? "")), headers);
    }
    if (
      parts.length === 3 &&
      parts[0] === "api" &&
      parts[1] === "admin" &&
      parts[2] === "billing-settings"
    ) {
      if (method === "GET") {
        const d = requireActorPermission(identity, "finance.read");
        if (d) return d;
        return json(200, await finance.getBillingSettings(), headers);
      }
      if (method === "PUT") {
        const d = requireActorPermission(identity, "billing.settings.manage");
        if (d) return d;
        return json(
          200,
          await finance.updateBillingSettings(
            await parseJson(request, updateBillingSettingsSchema),
          ),
          headers,
        );
      }
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "admin" &&
      parts[2] === "verifactu" &&
      parts[3] === "status" &&
      method === "GET"
    ) {
      const d = requireActorPermission(identity, "finance.read");
      if (d) return d;
      return json(200, await finance.getVerifactuStatus(), headers);
    }
    if (parts.length === 2 && parts[0] === "api" && parts[1] === "payments") {
      if (method === "GET") {
        const d = requireActorPermission(identity, "finance.read");
        if (d) return d;
        return json(200, await finance.listPayments(), headers);
      }
      if (method === "POST") {
        const d = requireActorPermission(identity, "finance.write");
        if (d) return d;
        return json(
          201,
          await finance.recordPayment(await parseJson(request, recordPaymentSchema)),
          headers,
        );
      }
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "payments" &&
      parts[3] === "allocate" &&
      method === "POST"
    ) {
      const d = requireActorPermission(identity, "finance.write");
      if (d) return d;
      const x = await parseJson(request, allocatePaymentSchema);
      return json(
        201,
        await finance.allocatePayment(
          decodeURIComponent(parts[2] ?? ""),
          x.invoiceId,
          x.amountCents,
        ),
        headers,
      );
    }
    if (
      parts.length === 3 &&
      parts[0] === "api" &&
      parts[1] === "accounting" &&
      parts[2] === "export.csv" &&
      method === "GET"
    ) {
      const d = requireActorPermission(identity, "finance.read");
      if (d) return d;
      const u = new URL(request.url);
      const q = accountingExportQuerySchema.parse({
        start: u.searchParams.get("start") ?? undefined,
        end: u.searchParams.get("end") ?? undefined,
      });
      const csv = await finance.accountingCsv(q.start, q.end);
      return new Response(csv, {
        status: 200,
        headers: {
          ...Object.fromEntries(headers.entries()),
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": "attachment; filename=contabilidad-denty.csv",
        },
      });
    }
    // Stage 7: appointments are transactional and cannot bypass the canonical RPC boundary.
    if (parts.length === 2 && parts[0] === "api" && parts[1] === "appointments") {
      if (method === "GET") {
        const params = new URL(request.url).searchParams;
        return json(
          200,
          await agenda.listAppointments(
            params.get("date") ?? undefined,
            params.get("siteId") ?? undefined,
          ),
          headers,
        );
      }
      if (method === "POST") {
        if (identity.actor.role === "PATIENT")
          return error(403, "FORBIDDEN", "El portal no puede crear citas directamente.");
        const payload = await parseJson(request, createAppointmentSchema);
        return json(201, await agenda.createAppointment(payload), headers);
      }
    }
    if (
      parts.length === 3 &&
      parts[0] === "api" &&
      parts[1] === "appointments" &&
      method === "PATCH"
    ) {
      if (identity.actor.role === "PATIENT")
        return error(403, "FORBIDDEN", "El portal no puede editar citas directamente.");
      const payload = await parseJson(request, updateAppointmentSchema);
      const result = await agenda.updateAppointment(decodeURIComponent(parts[2] ?? ""), payload);
      if ("conflict" in result) {
        return error(409, "APPOINTMENT_VERSION_CONFLICT", "La cita cambió antes de guardarse.", {
          currentVersion: result.currentVersion,
        });
      }
      return json(200, result, headers);
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "appointments" &&
      method === "POST"
    ) {
      if (identity.actor.role === "PATIENT")
        return error(403, "FORBIDDEN", "El portal no puede cambiar el estado clínico de una cita.");
      const transitionByPath = {
        arrive: "ARRIVED",
        waiting: "WAITING",
        chair: "IN_CHAIR",
        "no-show": "NO_SHOW",
        complete: "COMPLETED",
        cancel: "CANCELLED",
        "running-late": "RUNNING_LATE",
        "confirm-waiting-room": "WAITING",
      } as const;
      const transition = transitionByPath[parts[3] as keyof typeof transitionByPath];
      if (transition) {
        const payload = await parseJson(
          request,
          z.object({
            expectedVersion: z.number().int().positive(),
            reason: z.string().max(500).optional(),
          }),
        );
        const result = await agenda.transitionAppointment(
          decodeURIComponent(parts[2] ?? ""),
          payload.expectedVersion,
          transition,
          payload.reason,
        );
        if ("conflict" in result) {
          return error(
            409,
            "APPOINTMENT_VERSION_CONFLICT",
            "La cita cambió antes de actualizar su estado.",
            { currentVersion: result.currentVersion },
          );
        }
        return json(200, result, headers);
      }
    }
    if (
      parts.length === 3 &&
      parts[0] === "api" &&
      parts[1] === "agenda" &&
      parts[2] === "appointment-requests" &&
      method === "GET"
    ) {
      if (identity.actor.role === "PATIENT")
        return error(403, "FORBIDDEN", "El portal solo puede consultar sus propias solicitudes.");
      return json(200, await agenda.listAppointmentRequests(), headers);
    }
    if (
      parts.length === 5 &&
      parts[0] === "api" &&
      parts[1] === "agenda" &&
      parts[2] === "appointment-requests" &&
      parts[4] === "schedule" &&
      method === "POST"
    ) {
      if (identity.actor.role === "PATIENT")
        return error(403, "FORBIDDEN", "Solo el equipo puede programar solicitudes.");
      const payload = await parseJson(request, scheduleAppointmentRequestSchema);
      return json(
        200,
        await agenda.scheduleAppointmentRequest(decodeURIComponent(parts[3] ?? ""), payload),
        headers,
      );
    }
    if (
      parts.length === 5 &&
      parts[0] === "api" &&
      parts[1] === "agenda" &&
      parts[2] === "appointment-requests" &&
      parts[4] === "cancel" &&
      method === "POST"
    ) {
      if (identity.actor.role === "PATIENT")
        return error(403, "FORBIDDEN", "Usa el portal para cancelar tu solicitud.");
      return json(
        200,
        await agenda.cancelAppointmentRequest(decodeURIComponent(parts[3] ?? "")),
        headers,
      );
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "patient" &&
      parts[3] === "appointment-requests"
    ) {
      const patientId = decodeURIComponent(parts[2] ?? "");
      if (
        identity.actor.role === "PATIENT" &&
        !(identity.actor.patientIds ?? []).includes(patientId)
      ) {
        return error(403, "FORBIDDEN", "No puedes gestionar solicitudes de otro paciente.");
      }
      if (method === "GET")
        return json(200, await agenda.listAppointmentRequests(patientId), headers);
      if (method === "POST") {
        const payload = await parseJson(request, patientAppointmentRequestInputSchema);
        return json(201, await agenda.createAppointmentRequest(patientId, payload.note), headers);
      }
    }
    if (
      parts.length === 3 &&
      parts[0] === "api" &&
      parts[1] === "agenda" &&
      parts[2] === "month-summary" &&
      method === "GET"
    ) {
      if (identity.actor.role === "PATIENT")
        return error(403, "FORBIDDEN", "El resumen de agenda es solo para el equipo.");
      const url = new URL(request.url);
      const month = url.searchParams.get("month") ?? "";
      if (!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(month))
        return error(400, "INVALID_MONTH", "Indica el mes con el formato AAAA-MM.");
      const siteId = url.searchParams.get("siteId") ?? undefined;
      return json(200, await agenda.monthSummary(month, siteId), headers);
    }
    if (
      parts.length === 3 &&
      parts[0] === "api" &&
      parts[1] === "agenda" &&
      parts[2] === "context" &&
      method === "GET"
    ) {
      return json(
        200,
        await agenda.getContext({
          role: identity.actor.role,
          ...(identity.actor.staffId ? { staffId: identity.actor.staffId } : {}),
        }),
        headers,
      );
    }
    if (
      parts.length === 3 &&
      parts[0] === "api" &&
      parts[1] === "agenda" &&
      parts[2] === "availability" &&
      method === "GET"
    ) {
      const params = new URL(request.url).searchParams;
      const date = params.get("date");
      if (!date) return error(400, "DATE_REQUIRED", "Indica el día para consultar disponibilidad.");
      const durationRaw = params.get("durationMin");
      const durationMin = durationRaw ? Number(durationRaw) : undefined;
      if (
        durationMin !== undefined &&
        (!Number.isInteger(durationMin) || durationMin <= 0 || durationMin > 720)
      ) {
        return error(
          400,
          "INVALID_DURATION",
          "La duración debe ser un número entero entre 1 y 720 minutos.",
        );
      }
      const staffId = params.get("staffId") ?? undefined;
      const siteId = params.get("siteId") ?? undefined;
      return json(
        200,
        await agenda.availability({
          date,
          ...(staffId ? { staffId } : {}),
          ...(siteId ? { siteId } : {}),
          ...(durationMin !== undefined ? { durationMin } : {}),
        }),
        headers,
      );
    }
    if (
      parts.length === 3 &&
      parts[0] === "api" &&
      parts[1] === "agenda" &&
      parts[2] === "waitlist"
    ) {
      if (method === "GET") {
        return json(
          200,
          await agenda.listWaitlist(
            identity.actor.role === "PATIENT" ? identity.actor.patientIds : undefined,
          ),
          headers,
        );
      }
      if (method === "POST") {
        const payload = await parseJson(request, createWaitlistEntrySchema);
        if (
          identity.actor.role === "PATIENT" &&
          !(identity.actor.patientIds ?? []).includes(payload.patientId)
        ) {
          return error(403, "FORBIDDEN", "No puedes añadir otro paciente a la lista de espera.");
        }
        return json(201, await agenda.createWaitlist(payload), headers);
      }
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "agenda" &&
      parts[2] === "waitlist" &&
      method === "DELETE"
    ) {
      return json(200, await agenda.withdrawWaitlist(decodeURIComponent(parts[3] ?? "")), headers);
    }
    if (
      parts.length === 5 &&
      parts[0] === "api" &&
      parts[1] === "agenda" &&
      parts[2] === "waitlist" &&
      parts[4] === "fulfill" &&
      method === "POST"
    ) {
      if (identity.actor.role === "PATIENT")
        return error(403, "FORBIDDEN", "Solo el equipo puede marcar una solicitud como atendida.");
      const payload = await parseJson(
        request,
        z.object({ appointmentId: z.string().min(1).optional() }),
      );
      return json(
        200,
        await agenda.fulfillWaitlist(decodeURIComponent(parts[3] ?? ""), payload.appointmentId),
        headers,
      );
    }
    if (
      parts.length === 3 &&
      parts[0] === "api" &&
      parts[1] === "agenda" &&
      parts[2] === "blocks" &&
      method === "GET"
    ) {
      if (identity.actor.role === "PATIENT")
        return error(403, "FORBIDDEN", "El portal no puede ver los bloqueos de la agenda.");
      const params = new URL(request.url).searchParams;
      const date = params.get("date");
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
        return error(400, "DATE_REQUIRED", "Indica la fecha de la agenda.");
      return json(200, await agenda.listBlocks(date, params.get("siteId") ?? undefined), headers);
    }
    if (
      parts.length === 3 &&
      parts[0] === "api" &&
      parts[1] === "agenda" &&
      parts[2] === "blocks" &&
      method === "POST"
    ) {
      if (identity.actor.role === "PATIENT")
        return error(403, "FORBIDDEN", "El portal no puede bloquear la agenda clínica.");
      const payload = await parseJson(request, createAgendaBlockSchema);
      return json(201, await agenda.createBlock(payload), headers);
    }
    if (
      parts.length === 3 &&
      parts[0] === "api" &&
      parts[1] === "agenda" &&
      parts[2] === "settings"
    ) {
      const params = new URL(request.url).searchParams;
      if (method === "GET")
        return json(
          200,
          await agenda.getSettings(params.get("staffId") ?? identity.actor.staffId ?? undefined),
          headers,
        );
      if (method === "PUT") {
        if (identity.actor.role !== "ADMIN")
          return error(
            403,
            "FORBIDDEN",
            "Solo administración puede cambiar los ajustes de agenda.",
          );
        const payload = await parseJson(request, updateAgendaSettingsSchema);
        return json(
          200,
          await agenda.setSettings(payload.defaultPlanVisitGapDays, payload.staffId),
          headers,
        );
      }
    }
    if (
      parts.length === 3 &&
      parts[0] === "api" &&
      parts[1] === "attendance" &&
      parts[2] === "absences"
    ) {
      if (method === "GET") {
        if (identity.actor.role === "PATIENT")
          return error(403, "FORBIDDEN", "El portal no puede consultar ausencias internas.");
        return json(200, await agenda.listAbsences(), headers);
      }
      if (method === "POST") {
        if (identity.actor.role !== "ADMIN")
          return error(403, "FORBIDDEN", "Solo administración puede registrar ausencias.");
        const payload = await parseJson(request, createAbsenceSchema);
        return json(201, await agenda.createAbsence(payload), headers);
      }
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "attendance" &&
      parts[2] === "absences" &&
      method === "DELETE"
    ) {
      if (identity.actor.role !== "ADMIN")
        return error(403, "FORBIDDEN", "Solo administración puede cancelar ausencias.");
      await agenda.cancelAbsence(decodeURIComponent(parts[3] ?? ""));
      return json(200, { ok: true }, headers);
    }
    if (
      parts.length === 3 &&
      parts[0] === "api" &&
      parts[1] === "analytics" &&
      parts[2] === "kpi-definitions" &&
      method === "GET"
    ) {
      const denied = requireActorPermission(identity, "finance.read");
      if (denied) return denied;
      return json(200, await analytics.kpiDefinitions(), headers);
    }
    if (
      parts.length === 3 &&
      parts[0] === "api" &&
      parts[1] === "analytics" &&
      method === "GET" &&
      ["summary", "treatments", "doctors", "monthly", "profitability", "specialties"].includes(
        parts[2] ?? "",
      )
    ) {
      const denied = requireActorPermission(identity, "finance.read");
      if (denied) return denied;
      const params = new URL(request.url).searchParams;
      const query = analyticsQuerySchema.parse(Object.fromEntries(params.entries()));
      if (parts[2] === "summary") return json(200, await analytics.summary(query), headers);
      if (parts[2] === "treatments") return json(200, await analytics.treatments(query), headers);
      if (parts[2] === "doctors") return json(200, await analytics.doctors(query), headers);
      if (parts[2] === "monthly") return json(200, await analytics.monthly(query), headers);
      if (parts[2] === "profitability")
        return json(200, await analytics.profitability(query), headers);
      return json(200, await analytics.specialties(query), headers);
    }
    if (
      parts.length === 3 &&
      parts[0] === "api" &&
      parts[1] === "analytics" &&
      parts[2] === "wait-times" &&
      method === "GET"
    ) {
      if (identity.actor.role === "PATIENT")
        return error(403, "FORBIDDEN", "El portal no puede consultar métricas internas.");
      const params = new URL(request.url).searchParams;
      const from = params.get("from");
      const to = params.get("to");
      if (!from || !to) return error(400, "RANGE_REQUIRED", "Indica el intervalo de las métricas.");
      const siteId = params.get("siteId") ?? undefined;
      const staffId = params.get("staffId") ?? undefined;
      return json(
        200,
        await agenda.waitTimeMetrics({
          from,
          to,
          ...(siteId ? { siteId } : {}),
          ...(staffId ? { staffId } : {}),
        }),
        headers,
      );
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "budgets" &&
      parts[3] === "sign" &&
      method === "POST"
    ) {
      if (identity.actor.role === "PATIENT")
        return error(403, "FORBIDDEN", "El portal no puede firmar presupuestos clínicos.");
      if (
        !identity.actor.permissions.includes("clinical.write") &&
        !identity.actor.permissions.includes("finance.write")
      ) {
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
    // Stage 10: canonical persistent alert ledger. Derived laboratory alerts are refreshed by the RPC.
    if (
      parts.length === 3 &&
      parts[0] === "api" &&
      parts[1] === "admin" &&
      parts[2] === "alerts" &&
      method === "GET"
    ) {
      const denied = requireActorPermission(identity, "alerts.read");
      if (denied) return denied;
      return json(200, await alerts.list(), headers);
    }
    if (
      parts.length === 5 &&
      parts[0] === "api" &&
      parts[1] === "admin" &&
      parts[2] === "alerts" &&
      method === "POST"
    ) {
      const denied = requireActorPermission(identity, "alerts.manage");
      if (denied) return denied;
      const alertId = decodeURIComponent(parts[3] ?? "");
      if (parts[4] === "resolve") return json(200, await alerts.resolveAlert(alertId), headers);
      if (parts[4] === "review") return json(200, await alerts.reviewAlert(alertId), headers);
      if (parts[4] === "snooze") {
        const payload = await parseJson(request, snoozeAlertSchema);
        return json(200, await alerts.snoozeAlert(alertId, payload.until), headers);
      }
      if (parts[4] === "assign") {
        const payload = await parseJson(request, assignAlertSchema);
        return json(200, await alerts.assignAlert(alertId, payload.userId), headers);
      }
    }
    // Connected card terminals. Reception lists them to charge; admins set them up.
    if (parts[0] === "api" && parts[1] === "payment-terminals" && parts.length === 2) {
      if (method !== "GET") return error(405, "METHOD_NOT_ALLOWED", "Método no permitido.");
      const denied = requireActorPermission(identity, "finance.write");
      if (denied) return denied;
      const terminals = new PaymentTerminalRepository(identity.restClient, identity.actor.clinicId);
      return json(200, { items: await terminals.listForCharging() }, headers);
    }
    if (parts[0] === "api" && parts[1] === "admin" && parts[2] === "payment-terminals") {
      const denied = requireActorPermission(identity, "settings.manage");
      if (denied) return denied;
      const terminals = new PaymentTerminalRepository(identity.restClient, identity.actor.clinicId);
      if (parts.length === 3 && method === "GET")
        return json(200, await terminals.overview(), headers);
      if (parts.length === 3 && method === "POST") {
        const payload = await parseJson(request, addPaymentTerminalSchema);
        await terminals.add(payload);
        return json(201, await terminals.overview(), headers);
      }
      if (parts.length === 4 && parts[3] === "test" && method === "POST") {
        const payload = await parseJson(request, testTerminalProviderSchema);
        return json(200, await testProviderConnection(payload.provider), headers);
      }
      const id = decodeURIComponent(parts[3] ?? "");
      if (parts.length === 4 && method === "PATCH") {
        const payload = await parseJson(request, updatePaymentTerminalSchema);
        return json(200, await terminals.update(id, payload), headers);
      }
      if (parts.length === 4 && method === "DELETE")
        return json(200, await terminals.remove(id), headers);
    }
    // Sites, their doctors and the weekly rota (which site each doctor works at each day).
    if (
      parts[0] === "api" &&
      parts[1] === "admin" &&
      (parts[2] === "sites" || parts[2] === "staff")
    ) {
      const denied = requireActorPermission(identity, "settings.manage");
      if (denied) return denied;
      const id = parts[3] ? decodeURIComponent(parts[3]) : null;
      if (parts[2] === "sites" && parts.length === 3 && method === "GET")
        return json(200, await agenda.getSitesOverview(), headers);
      if (parts[2] === "sites" && parts.length === 3 && method === "POST") {
        const payload = await parseJson(request, saveSiteSchema);
        return json(201, await agenda.saveSite(null, payload), headers);
      }
      if (parts[2] === "sites" && parts.length === 4 && method === "PATCH" && id) {
        const payload = await parseJson(request, saveSiteSchema);
        return json(200, await agenda.saveSite(id, payload), headers);
      }
      if (parts[2] === "staff" && parts.length === 3 && method === "POST") {
        const payload = await parseJson(request, saveStaffMemberSchema);
        return json(201, await agenda.saveStaffMember(null, payload), headers);
      }
      if (parts[2] === "staff" && parts.length === 4 && method === "PATCH" && id) {
        const payload = await parseJson(request, saveStaffMemberSchema);
        return json(200, await agenda.saveStaffMember(id, payload), headers);
      }
      if (
        parts[2] === "staff" &&
        parts.length === 5 &&
        parts[4] === "schedule" &&
        method === "PUT" &&
        id
      ) {
        const payload = await parseJson(request, setStaffScheduleSchema);
        return json(200, await agenda.setStaffSchedule(id, payload.entries), headers);
      }
    }
    // Stage 6 canonical treatment catalog. Only actors with catalog.manage may mutate it.
    if (
      parts.length === 3 &&
      parts[0] === "api" &&
      parts[1] === "admin" &&
      parts[2] === "treatment-catalog"
    ) {
      if (method === "GET") {
        if (
          !identity.actor.permissions.includes("clinical.read") &&
          !identity.actor.permissions.includes("catalog.manage")
        ) {
          return error(403, "FORBIDDEN", "No tienes permiso para consultar el catálogo clínico.");
        }
        return json(200, await clinical.listTreatmentCatalog(), headers);
      }
      if (method === "POST") {
        if (!identity.actor.permissions.includes("catalog.manage"))
          return error(403, "FORBIDDEN", "No tienes permiso para editar el catálogo clínico.");
        const payload = await parseJson(request, treatmentCatalogCreateSchema);
        return json(201, await clinical.createTreatmentCatalogItem(payload), headers);
      }
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "admin" &&
      parts[2] === "treatment-catalog" &&
      method === "PATCH"
    ) {
      if (!identity.actor.permissions.includes("catalog.manage"))
        return error(403, "FORBIDDEN", "No tienes permiso para editar el catálogo clínico.");
      const payload = await parseJson(request, treatmentCatalogUpdateSchema);
      return json(
        200,
        await clinical.updateTreatmentCatalogItem(decodeURIComponent(parts[3] ?? ""), payload),
        headers,
      );
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "admin" &&
      parts[2] === "export" &&
      method === "GET"
    ) {
      const denied = requireActorPermission(identity, "users.manage");
      if (denied) return denied;
      const exports = new ExportRepository(identity.restClient, identity.actor.clinicId);
      const entity = parts[3];
      if (entity === "overview") return json(200, await exports.overview(), headers);
      if (entity !== "patients" && entity !== "appointments" && entity !== "treatments")
        return error(400, "INVALID_ENTITY", "La entidad no es válida");
      const format = new URL(request.url).searchParams.get("format") ?? "csv";
      if (format !== "csv" && format !== "xlsx")
        return error(400, "INVALID_FORMAT", "El formato debe ser CSV o Excel");
      const body = await exportFile(await exports.table(entity), format);
      const responseHeaders = responseHeadersForIdentity(request, identity);
      responseHeaders.set(
        "content-type",
        format === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "text/csv; charset=utf-8",
      );
      responseHeaders.set("content-disposition", `attachment; filename="${entity}.${format}"`);
      responseHeaders.set("cache-control", "private, no-store");
      responseHeaders.set("x-content-type-options", "nosniff");
      return new Response(body, { status: 200, headers: responseHeaders });
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "patients" &&
      parts[3] === "patient-photo" &&
      method === "POST"
    ) {
      if (identity.actor.role === "PATIENT")
        return error(403, "FORBIDDEN", "El portal no puede modificar la foto clínica.");
      const patientId = decodeURIComponent(parts[2] ?? "");
      const patient = await repo.getPatient(patientId);
      if (!patient) return error(404, "PATIENT_NOT_FOUND", "Ficha no encontrada.");
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File))
        return error(400, "FILE_REQUIRED", "Selecciona una imagen válida.");
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
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "patients" &&
      parts[3] === "photo" &&
      method === "GET"
    ) {
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
        if (identity.actor.role === "PATIENT")
          return error(403, "FORBIDDEN", "El portal no puede crear documentos clínicos.");
        const payload = await parseJson(request, createDocumentSchema);
        return json(201, await documents.create(payload), headers);
      }
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "documents" &&
      parts[3] === "file"
    ) {
      const documents = documentRepository(identity);
      const documentId = decodeURIComponent(parts[2] ?? "");
      if (method === "POST") {
        if (identity.actor.role === "PATIENT")
          return error(403, "FORBIDDEN", "El portal no puede reemplazar archivos clínicos.");
        const form = await request.formData();
        const file = form.get("file");
        if (!(file instanceof File))
          return error(400, "FILE_REQUIRED", "Selecciona un archivo válido.");
        return json(200, await documents.uploadFile(documentId, file), headers);
      }
      if (method === "GET") {
        const downloaded = await documents.downloadFile(documentId);
        const responseHeaders = responseHeadersForIdentity(request, identity);
        responseHeaders.set("content-type", downloaded.mimeType);
        responseHeaders.set(
          "content-disposition",
          `attachment; filename*=UTF-8''${encodeURIComponent(downloaded.fileName)}`,
        );
        responseHeaders.set("content-length", String(downloaded.blob.size));
        return new Response(downloaded.blob, { status: 200, headers: responseHeaders });
      }
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "documents" &&
      parts[3] === "sign" &&
      method === "POST"
    ) {
      // Stage 13: consents are signed in the clinic (tablet/firma manuscrita) by staff.
      if (identity.actor.role === "PATIENT")
        return error(403, "FORBIDDEN", "La firma de documentos se realiza en la clínica.");
      const denied = requireActorPermission(identity, "documents.sign");
      if (denied) return denied;
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File))
        return error(400, "SIGNATURE_FILE_REQUIRED", "Adjunta una firma PNG o JPEG válida.");
      const payload = signDocumentMetadataSchema.parse({ signerName: form.get("signerName") });
      return json(
        200,
        await documentRepository(identity).sign(decodeURIComponent(parts[2] ?? ""), {
          signerName: payload.signerName,
          file,
        }),
        headers,
      );
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "documents" &&
      parts[3] === "finalize" &&
      method === "POST"
    ) {
      if (identity.actor.role === "PATIENT")
        return error(403, "FORBIDDEN", "El portal no puede finalizar documentos clínicos.");
      return json(
        200,
        await documentRepository(identity).finalize(decodeURIComponent(parts[2] ?? "")),
        headers,
      );
    }
    if (
      parts.length === 2 &&
      parts[0] === "api" &&
      parts[1] === "document-templates" &&
      method === "GET"
    ) {
      // Older versions stay readable so signed documents print the exact text signed.
      const includeInactive = new URL(request.url).searchParams.get("includeInactive") === "true";
      const rows = await identity.restClient.select<Record<string, unknown>>("document_templates", {
        select: "*",
        clinic_id: `eq.${identity.actor.clinicId}`,
        ...(includeInactive ? {} : { active: "eq.true" }),
        order: "created_at.desc",
      });
      return json(200, { items: rows }, headers);
    }
    if (
      parts.length === 3 &&
      parts[0] === "api" &&
      parts[1] === "security" &&
      parts[2] === "backups" &&
      method === "GET"
    ) {
      if (identity.actor.role !== "ADMIN")
        return error(403, "FORBIDDEN", "Solo administración puede consultar el estado de backups.");
      return json(
        200,
        await readSupabaseBackupStatus(
          withoutUndefined({
            projectRef: env.SUPABASE_PROJECT_REF,
            supabaseUrl: env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL,
            accessToken: env.SUPABASE_MANAGEMENT_ACCESS_TOKEN,
          }),
        ),
        headers,
      );
    }
    if (
      parts.length === 3 &&
      parts[0] === "api" &&
      parts[1] === "security" &&
      parts[2] === "sessions" &&
      method === "GET"
    ) {
      return json(
        200,
        await identity.authRepository.listSessions(identity.actor.userId, identity.appSessionId),
        headers,
      );
    }
    if (parts.length === 2 && parts[0] === "api" && parts[1] === "users") {
      const adminError = requireAdmin(identity.actor);
      if (adminError) return adminError;
      const adminClient = makeAdminRestClient();
      const configurationMessage =
        "Configura SUPABASE_SECRET_KEY (o SUPABASE_SERVICE_ROLE_KEY) solo en el servidor de Vercel, con la clave del mismo proyecto que SUPABASE_URL, y vuelve a desplegar para crear accesos y restablecer contraseñas.";
      const auth = new AuthRepository(identity.restClient, {
        ...(adminClient ? { adminClient } : {}),
        authClient,
      });
      if (method === "GET")
        return json(
          200,
          {
            ...(await auth.listUsers(identity.actor.clinicId)),
            administration: {
              configured: Boolean(adminClient),
              message: adminClient ? null : configurationMessage,
            },
          },
          headers,
        );
      if (method === "POST") {
        if (!adminClient) return error(503, "ADMIN_CREDENTIALS_REQUIRED", configurationMessage);
        const payload = await parseJson(request, createUserSchema);
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
      if (!adminClient)
        return error(
          503,
          "ADMIN_CREDENTIALS_REQUIRED",
          "Falta la credencial administrativa de Supabase.",
        );
      const auth = new AuthRepository(identity.restClient, { adminClient, authClient });
      const payload = await parseJson(request, updateUserSchema);
      return json(
        200,
        await auth.updateUser(identity.actor.clinicId, decodeURIComponent(parts[2] ?? ""), payload),
        headers,
      );
    }
    if (parts.length === 3 && parts[0] === "api" && parts[1] === "users" && method === "DELETE") {
      const adminError = requireAdmin(identity.actor);
      if (adminError) return adminError;
      const adminClient = makeAdminRestClient();
      if (!adminClient)
        return error(
          503,
          "ADMIN_CREDENTIALS_REQUIRED",
          "Falta la credencial administrativa de Supabase.",
        );
      const auth = new AuthRepository(identity.restClient, { adminClient, authClient });
      return json(
        200,
        await auth.deleteUser(identity.actor.clinicId, decodeURIComponent(parts[2] ?? "")),
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
      if (!adminClient)
        return error(
          503,
          "ADMIN_CREDENTIALS_REQUIRED",
          "Falta la credencial administrativa de Supabase.",
        );
      const auth = new AuthRepository(identity.restClient, { adminClient, authClient });
      const payload = await parseJson(request, resetUserPasswordSchema);
      return json(
        200,
        await auth.resetUserPassword(
          identity.actor.clinicId,
          decodeURIComponent(parts[2] ?? ""),
          payload,
        ),
        headers,
      );
    }
    if (parts.length === 2 && parts[0] === "api" && parts[1] === "patients") {
      if (method === "GET") {
        const url = new URL(request.url);
        const includeArchived = url.searchParams.get("includeArchived") === "true";
        const search = url.searchParams.get("search");
        const pageParam = url.searchParams.get("page");
        const pageSizeParam = url.searchParams.get("pageSize");
        return json(
          200,
          await repo.listPatients({
            includeArchived,
            ...(search ? { search } : {}),
            ...(pageParam ? { page: Number(pageParam) } : {}),
            ...(pageSizeParam ? { pageSize: Number(pageSizeParam) } : {}),
          }),
          headers,
        );
      }
      if (method === "POST") {
        if (identity.actor.role === "PATIENT")
          return error(403, "FORBIDDEN", "El portal no puede crear pacientes.");
        const payload = await parseJson(request, createPatientSchema);
        return json(201, await repo.createPatient(payload), headers);
      }
    }
    if (parts.length === 3 && parts[0] === "api" && parts[1] === "patients") {
      const patientId = decodeURIComponent(parts[2] ?? "");
      if (method === "GET") {
        const patient = await repo.getPatient(patientId);
        return patient
          ? json(200, patient, headers)
          : error(404, "PATIENT_NOT_FOUND", "Ficha no encontrada.");
      }
      if (method === "PATCH") {
        if (identity.actor.role === "PATIENT")
          return error(403, "FORBIDDEN", "El portal no puede editar la ficha clínica.");
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
      if (identity.actor.role === "PATIENT")
        return error(403, "FORBIDDEN", "El portal no puede archivar fichas.");
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
      if (identity.actor.role === "PATIENT")
        return error(403, "FORBIDDEN", "El portal no puede restaurar fichas.");
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
      return projection
        ? json(200, projection, headers)
        : error(404, "PATIENT_NOT_FOUND", "Ficha no encontrada.");
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
      return odontogram
        ? json(200, odontogram, headers)
        : error(404, "PATIENT_NOT_FOUND", "Ficha no encontrada.");
    }
    if (
      parts.length === 5 &&
      parts[0] === "api" &&
      parts[1] === "patients" &&
      parts[3] === "odontogram" &&
      parts[4] === "batch" &&
      method === "POST"
    ) {
      if (identity.actor.role === "PATIENT")
        return error(403, "FORBIDDEN", "El portal no puede modificar el odontograma.");
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
    if (
      parts.length === 5 &&
      parts[0] === "api" &&
      parts[1] === "patients" &&
      parts[3] === "odontogram" &&
      parts[4] === "periodontal" &&
      method === "POST"
    ) {
      if (identity.actor.role === "PATIENT")
        return error(403, "FORBIDDEN", "El portal no puede modificar periodoncia.");
      const patientId = decodeURIComponent(parts[2] ?? "");
      const payload = await parseJson(request, periodontalMeasurementSchema);
      return json(201, await clinical.savePeriodontalMeasurement(patientId, payload), headers);
    }
    if (
      parts.length === 5 &&
      parts[0] === "api" &&
      parts[1] === "patients" &&
      parts[3] === "odontogram" &&
      parts[4] === "snapshots"
    ) {
      const patientId = decodeURIComponent(parts[2] ?? "");
      if (method === "GET") return json(200, await clinical.listSnapshots(patientId), headers);
      if (method === "POST") {
        if (identity.actor.role === "PATIENT")
          return error(403, "FORBIDDEN", "El portal no puede crear snapshots clínicos.");
        const payload = await parseJson(request, createOdontogramSnapshotSchema);
        return json(201, await clinical.createSnapshot(patientId, payload), headers);
      }
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "patients" &&
      parts[3] === "consent-requirements" &&
      method === "GET"
    ) {
      return json(
        200,
        await clinical.listConsentRequirements(decodeURIComponent(parts[2] ?? "")),
        headers,
      );
    }
    if (
      parts.length === 3 &&
      parts[0] === "api" &&
      parts[1] === "agenda" &&
      parts[2] === "next-slots"
    )
      return await handleNextSlotsRoute(request, identity, headers);
    if (parts[0] === "api" && parts[1] === "navigation" && parts[2] === "layout")
      return await handleNavigationRoute(request, parts, identity, headers);
    if (parts[0] === "api" && parts[1] === "patients" && parts[3] === "perio-draft")
      return await handlePerioDraftsRoute(request, parts, identity, headers);
    if (parts[0] === "api" && parts[1] === "patients" && parts[3] === "diagnoses") {
      return await handleDiagnosesRoute(request, parts, identity, headers);
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "patients" &&
      parts[3] === "clinical-workflow" &&
      method === "GET"
    ) {
      return json(
        200,
        await clinical.getClinicalWorkflow(decodeURIComponent(parts[2] ?? "")),
        headers,
      );
    }
    if (
      parts.length === 5 &&
      parts[0] === "api" &&
      parts[1] === "patients" &&
      parts[3] === "clinical-workflow" &&
      parts[4] === "encounters" &&
      method === "POST"
    ) {
      if (identity.actor.role === "PATIENT")
        return error(403, "FORBIDDEN", "El portal no puede modificar la historia clínica.");
      const patientId = decodeURIComponent(parts[2] ?? "");
      const payload = await parseJson(request, clinicalEncounterInputSchema);
      return json(201, await clinical.createEncounter(patientId, payload), headers);
    }
    if (
      parts.length === 5 &&
      parts[0] === "api" &&
      parts[1] === "patients" &&
      parts[3] === "clinical-workflow" &&
      parts[4] === "periodontal-exams" &&
      method === "POST"
    ) {
      if (identity.actor.role === "PATIENT")
        return error(403, "FORBIDDEN", "El portal no puede modificar periodoncia.");
      const patientId = decodeURIComponent(parts[2] ?? "");
      const payload = await parseJson(request, periodontalExamInputSchema);
      return json(201, await clinical.createPeriodontalExam(patientId, payload), headers);
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "patients" &&
      parts[3] === "clinical-sync" &&
      method === "GET"
    ) {
      return json(200, await clinical.getClinicalSync(decodeURIComponent(parts[2] ?? "")), headers);
    }
    if (
      parts.length === 5 &&
      parts[0] === "api" &&
      parts[1] === "patients" &&
      parts[3] === "clinical-sync" &&
      parts[4] === "plan" &&
      method === "POST"
    ) {
      if (identity.actor.role === "PATIENT")
        return error(403, "FORBIDDEN", "El portal no puede sincronizar el plan clínico.");
      return json(
        200,
        await clinical.syncPlanFromOdontogram(decodeURIComponent(parts[2] ?? "")),
        headers,
      );
    }
    if (
      parts.length === 5 &&
      parts[0] === "api" &&
      parts[1] === "clinical-plan" &&
      parts[2] === "items" &&
      parts[4] === "price" &&
      method === "POST"
    ) {
      if (identity.actor.role === "PATIENT")
        return error(403, "FORBIDDEN", "El portal no puede cambiar precios del plan.");
      const payload = await parseJson(request, planItemPriceSchema);
      return json(
        200,
        await clinical.setPlanItemPrice(decodeURIComponent(parts[3] ?? ""), payload.priceCents),
        headers,
      );
    }
    if (
      parts.length === 5 &&
      parts[0] === "api" &&
      parts[1] === "patients" &&
      parts[3] === "clinical-sync" &&
      parts[4] === "budget" &&
      method === "POST"
    ) {
      if (identity.actor.role === "PATIENT")
        return error(403, "FORBIDDEN", "El portal no puede sincronizar presupuestos.");
      return json(
        200,
        await clinical.syncBudgetFromPlan(decodeURIComponent(parts[2] ?? "")),
        headers,
      );
    }
    if (
      parts.length === 5 &&
      parts[0] === "api" &&
      parts[1] === "patients" &&
      parts[3] === "clinical-sync" &&
      parts[4] === "budgets" &&
      method === "POST"
    ) {
      if (identity.actor.role === "PATIENT")
        return error(403, "FORBIDDEN", "El portal no puede crear presupuestos.");
      const payload = await parseJson(request, createScopedBudgetSchema);
      return json(
        201,
        await clinical.createBudgetFromPlanItems(decodeURIComponent(parts[2] ?? ""), payload),
        headers,
      );
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "patients" &&
      parts[3] === "budgets" &&
      method === "GET"
    ) {
      if (
        !identity.actor.permissions.includes("clinical.read") &&
        !identity.actor.permissions.includes("finance.read")
      ) {
        return error(403, "FORBIDDEN", "No tienes permiso para consultar presupuestos.");
      }
      const patientId = decodeURIComponent(parts[2] ?? "");
      return json(200, await clinical.listPatientBudgets(patientId), headers);
    }
    if (
      parts.length === 4 &&
      parts[0] === "api" &&
      parts[1] === "patients" &&
      parts[3] === "clinical-plan" &&
      method === "GET"
    ) {
      const patientId = decodeURIComponent(parts[2] ?? "");
      const plan = await clinical.getClinicalPlan(patientId);
      return plan
        ? json(200, plan, headers)
        : error(404, "CLINICAL_PLAN_NOT_FOUND", "El paciente todavía no tiene un plan clínico.");
    }
    if (
      parts.length === 5 &&
      parts[0] === "api" &&
      parts[1] === "patients" &&
      parts[3] === "clinical-plan" &&
      parts[4] === "items" &&
      method === "POST"
    ) {
      if (identity.actor.role === "PATIENT")
        return error(403, "FORBIDDEN", "El portal no puede modificar el plan clínico.");
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
      return error(
        400,
        "INVALID_PAYLOAD",
        "Los datos enviados no cumplen el contrato.",
        caught.flatten(),
      );
    }
    if (caught instanceof SupabaseAuthError) {
      const status = caught.status === 400 || caught.status === 401 ? 401 : caught.status;
      return error(status, "SUPABASE_AUTH_ERROR", caught.message, caught.details);
    }
    if (caught instanceof TerminalProviderError) {
      return error(caught.status, "TERMINAL_PROVIDER_ERROR", caught.message);
    }
    if (caught instanceof SupabaseRestError) {
      return error(
        caught.message.includes("TOOTH_UNAVAILABLE")
          ? 422
          : caught.status >= 400 && caught.status < 600
            ? caught.status
            : 502,
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
