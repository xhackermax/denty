import { z } from "zod";

import { createPatientSchema, updatePatientSchema } from "@/shared/api";
import { odontogramBatchSchema } from "@/shared/api/schemas/clinical";
import { getServerEnv } from "@/shared/config/env";

import { PatientRepository } from "./patient-repository";
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

function configuredRepository(): PatientRepository | null {
  const env = getServerEnv();
  const url = firstCleanEnvValue(
    "SUPABASE_URL",
    env.SUPABASE_URL,
    env.SUPABASE_SECRET_KEY,
    env.SUPABASE_PUBLISHABLE_KEY,
    env.NEXT_PUBLIC_SUPABASE_URL,
  );
  const key = firstCleanEnvValue(
    "SUPABASE_SERVICE_ROLE_KEY",
    env.SUPABASE_SERVICE_ROLE_KEY,
    readAssignment("SUPABASE_SECRET_KEY", env.SUPABASE_SECRET_KEY),
    readAssignment("SUPABASE_SECRET_KEY", env.SUPABASE_PUBLISHABLE_KEY),
    readAssignment("SUPABASE_PUBLISHABLE_KEY", env.SUPABASE_PUBLISHABLE_KEY),
    readAssignment("SUPABASE_PUBLISHABLE_KEY", env.SUPABASE_SECRET_KEY),
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  if (!url || !key) return null;
  return new PatientRepository(new SupabaseRestClient({ url, key }), env.DENTY_DEFAULT_CLINIC_ID);
}

function readAssignment(name: string, value: string | undefined): string | undefined {
  if (!value?.includes("=")) return value;
  const line = value
    .split(/\r?\n/)
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return line?.slice(name.length + 1).trim();
}

function firstCleanEnvValue(name: string, ...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const resolved = readAssignment(name, value)?.trim();
    if (!resolved || resolved.includes("\n") || resolved.includes("\r")) continue;
    if (resolved === "API Keys") continue;
    return resolved;
  }
  return undefined;
}

function segments(pathname: string): string[] {
  return pathname.split("/").filter(Boolean);
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
  const repo = configuredRepository();
  if (!repo) return null;

  try {
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
