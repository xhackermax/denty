import { z } from "zod";

import { createPatientSchema, updatePatientSchema } from "@/shared/api";
import { createUserSchema } from "@/shared/api/schemas/admin";
import { odontogramBatchSchema } from "@/shared/api/schemas/clinical";
import { getServerEnv } from "@/shared/config/env";

import { AuthRepository } from "../auth/auth-repository";
import {
  clearSessionCookie,
  createSessionCookie,
  readSessionFromRequest,
  type DentySessionActor,
} from "../auth/session-cookie";
import { PatientRepository } from "./patient-repository";
import { resolveSupabaseCredentials } from "../supabase/credentials";
import { SupabaseRestClient, SupabaseRestError } from "../supabase/rest-client";

function json(status: number, body: unknown): Response {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function error(status: number, code: string, message: string, details?: unknown): Response {
  return json(status, { error: { code, message, details } });
}

function configuredClient(): SupabaseRestClient | null {
  const env = getServerEnv();
  const credentials = resolveSupabaseCredentials(env);
  if (!credentials) return null;
  return new SupabaseRestClient(credentials);
}

function configuredRepository(request: Request): PatientRepository | null {
  const env = getServerEnv();
  const credentials = resolveSupabaseCredentials(env);
  if (!credentials) return null;
  const actor = readSessionFromRequest(request, {
    sessionSecret: env.DENTY_SESSION_SECRET,
    fallbackKey: credentials.key,
  });
  return new PatientRepository(new SupabaseRestClient(credentials), env.DENTY_DEFAULT_CLINIC_ID, {
    clinicId: actor?.clinicId,
    allowedPatientIds: actor?.role === "PATIENT" ? actor.patientIds : undefined,
  });
}

function segments(pathname: string): string[] {
  return pathname.split("/").filter(Boolean);
}

function requireAdmin(actor: DentySessionActor | null): Response | null {
  if (!actor) return error(401, "UNAUTHENTICATED", "No hay sesión activa.");
  if (actor.role !== "ADMIN" || !actor.permissions.includes("users.manage")) {
    return error(403, "FORBIDDEN", "Solo el administrador puede gestionar usuarios.");
  }
  return null;
}

async function parseJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const raw = await request.json();
  return schema.parse(raw);
}

export async function handleSupabaseDentyRoute(
  request: Request,
  backendPath: string,
): Promise<Response | null> {
  const parts = segments(backendPath);
  const method = request.method.toUpperCase();
  const env = getServerEnv();
  const client = configuredClient();
  if (!client) return null;
  const credentials = resolveSupabaseCredentials(env);
  const actor = credentials
    ? readSessionFromRequest(request, {
        sessionSecret: env.DENTY_SESSION_SECRET,
        fallbackKey: credentials.key,
      })
    : null;
  const repo = configuredRepository(request);
  if (!repo) return null;

  try {
    if (parts.length === 3 && parts[0] === "api" && parts[1] === "auth") {
      if (parts[2] === "login" && method === "POST") {
        const payload = await parseJson(request, z.object({
          identifier: z.string().min(1),
          password: z.string().min(1),
          deviceLabel: z.string().max(120).optional(),
        }));
        const auth = new AuthRepository(client);
        const loggedIn = await auth.login(payload.identifier, payload.password);
        if (!loggedIn) {
          return error(401, "INVALID_CREDENTIALS", "Usuario o contraseña incorrectos.");
        }
        const headers = new Headers({ "cache-control": "no-store" });
        headers.append(
          "set-cookie",
          createSessionCookie(
            {
              userId: loggedIn.userId,
              clinicId: loggedIn.clinicId,
              role: loggedIn.role,
              permissions: loggedIn.permissions,
              patientIds: loggedIn.patientIds,
            },
            { sessionSecret: env.DENTY_SESSION_SECRET, fallbackKey: credentials?.key },
          ),
        );
        return Response.json(
          { user: { id: loggedIn.userId, displayName: loggedIn.displayName, role: loggedIn.role } },
          { status: 200, headers },
        );
      }

      if (parts[2] === "session" && method === "GET") {
        if (!actor) return error(401, "UNAUTHENTICATED", "No hay sesión activa.");
        return json(200, { actor, permissions: actor.permissions });
      }

      if (parts[2] === "logout" && method === "POST") {
        const headers = new Headers({ "cache-control": "no-store" });
        headers.append("set-cookie", clearSessionCookie());
        return Response.json({ ok: true }, { status: 200, headers });
      }

      if (parts[2] === "request-password-reset" && method === "POST") {
        return json(200, { ok: true });
      }
    }

    if (parts.length === 2 && parts[0] === "api" && parts[1] === "users") {
      const adminError = requireAdmin(actor);
      if (adminError) return adminError;
      const adminActor = actor as DentySessionActor;
      const auth = new AuthRepository(client);
      if (method === "GET") return json(200, await auth.listUsers(adminActor.clinicId));
      if (method === "POST") {
        const payload = await parseJson(request, createUserSchema);
        if (!payload.username) {
          return error(400, "USERNAME_REQUIRED", "El usuario es obligatorio.");
        }
        if (!payload.password) {
          return error(400, "PASSWORD_REQUIRED", "La contraseña es obligatoria.");
        }
        return json(
          201,
          await auth.createUser({
            clinicId: adminActor.clinicId,
            username: payload.username,
            displayName: payload.displayName,
            role: payload.role,
            password: payload.password,
          }),
        );
      }
    }

    if (parts.length === 2 && parts[0] === "api" && parts[1] === "patients") {
      if (method === "GET") return json(200, await repo.listPatients());
      if (method === "POST") {
        const payload = await parseJson(request, createPatientSchema);
        return json(201, await repo.createPatient(payload));
      }
    }

    if (parts.length === 3 && parts[0] === "api" && parts[1] === "patients") {
      const patientId = decodeURIComponent(parts[2] ?? "");
      if (method === "GET") {
        const patient = await repo.getPatient(patientId);
        return patient ? json(200, patient) : error(404, "PATIENT_NOT_FOUND", "Ficha no encontrada.");
      }
      if (method === "PATCH") {
        const payload = await parseJson(request, updatePatientSchema);
        return json(200, await repo.updatePatient(patientId, payload));
      }
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
        ? json(200, projection)
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
        ? json(200, odontogram)
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
      const patientId = decodeURIComponent(parts[2] ?? "");
      const payload = await parseJson(request, odontogramBatchSchema);
      const result = await repo.saveOdontogramBatch(patientId, payload);
      if (!result) return error(404, "PATIENT_NOT_FOUND", "Ficha no encontrada.");
      if ("conflict" in result) {
        return error(409, "ODONTOGRAM_VERSION_CONFLICT", "Recarga la ficha antes de guardar.", {
          currentVersion: result.currentVersion,
        });
      }
      return json(200, result);
    }
  } catch (caught) {
    if (caught instanceof z.ZodError) {
      return error(400, "INVALID_PAYLOAD", "Los datos enviados no cumplen el contrato.", caught.flatten());
    }
    if (caught instanceof SupabaseRestError) {
      return error(caught.status >= 400 && caught.status < 600 ? caught.status : 502, "SUPABASE_ERROR", caught.message, caught.details);
    }
    return error(500, "SUPABASE_ROUTE_ERROR", "No se pudo completar la operacion.", {
      message: caught instanceof Error ? caught.message : String(caught),
    });
  }

  return null;
}
