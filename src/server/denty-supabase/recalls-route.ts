import { z } from "zod";

import {
  recallActionRequestSchema,
  recallAssignSchema,
  recallBulkSchema,
  recallCandidateFiltersSchema,
  recallListFiltersSchema,
  recallTemplateArchiveSchema,
  recallTemplateInputSchema,
  recallTemplateUpdateSchema,
} from "@/shared/api/schemas/recalls";

import { SupabaseRestError, type SupabaseRestClient } from "../supabase/rest-client";
import { RecallRepository } from "./recall-repository";

interface Identity {
  actor: { clinicId: string; permissions: readonly string[] };
  restClient: SupabaseRestClient;
}

export function isRecallsRoute(parts: readonly string[]): boolean {
  return parts[0] === "api" && parts[1] === "recalls";
}

// Rule violations raised by the recall RPCs, with the text reception sees.
const RULE_ERRORS: Record<string, [status: number, code: string, message: string]> = {
  FORBIDDEN: [403, "FORBIDDEN", "No tienes permiso para esta acción."],
  VERSION_CONFLICT: [
    409,
    "RECALL_VERSION_CONFLICT",
    "Otra persona lo ha cambiado. Actualiza la lista e inténtalo de nuevo.",
  ],
  RECALL_CODE_TAKEN: [409, "RECALL_CODE_TAKEN", "Ya existe un tipo de recall con ese código."],
  RECALL_CODE_LOCKED: [
    409,
    "RECALL_CODE_LOCKED",
    "El código no se puede cambiar porque ya hay pacientes asignados.",
  ],
  RECALL_ALREADY_ACTIVE: [
    409,
    "RECALL_ALREADY_ACTIVE",
    "El paciente ya tiene un recall abierto de este tipo.",
  ],
  RECALL_INVALID_TRANSITION: [
    409,
    "RECALL_INVALID_TRANSITION",
    "Esta acción no está disponible en el estado actual del recall.",
  ],
  RECALL_TEMPLATE_INACTIVE: [
    409,
    "RECALL_TEMPLATE_INACTIVE",
    "El tipo de recall está archivado o inactivo.",
  ],
  APPOINTMENT_NOT_ELIGIBLE: [
    422,
    "APPOINTMENT_NOT_ELIGIBLE",
    "La cita no es de este paciente o ya está cancelada o realizada.",
  ],
  RECALL_NOT_FOUND: [404, "RECALL_NOT_FOUND", "No se encontró el recall."],
  RECALL_TEMPLATE_NOT_FOUND: [
    404,
    "RECALL_TEMPLATE_NOT_FOUND",
    "No se encontró el tipo de recall.",
  ],
  INVALID_RECALL_DATE: [400, "INVALID_RECALL_DATE", "La fecha no es válida."],
  INVALID_REMINDER_OFFSETS: [400, "INVALID_REMINDER_OFFSETS", "Revisa los días de aviso."],
  TOO_MANY_PATIENTS: [400, "TOO_MANY_PATIENTS", "Asigna como máximo 500 pacientes a la vez."],
  TOO_MANY_RECALLS: [400, "TOO_MANY_RECALLS", "Selecciona como máximo 200 recalls a la vez."],
};

function databaseMessage(caught: SupabaseRestError): string {
  const details = caught.details as { message?: unknown; code?: unknown } | null;
  return typeof details?.message === "string" ? details.message : "";
}

/**
 * /api/recalls — the recall centre. Reading needs recalls.read; working the list
 * (contact, postpone, assign patients) recalls.manage; creating or changing recall
 * types recalls.templates.manage. The database checks the same permissions again.
 */
export async function handleRecallsRoute(
  request: Request,
  parts: readonly string[],
  identity: Identity | null,
  headers: HeadersInit = {},
): Promise<Response> {
  const reply = (status: number, body: unknown) => Response.json(body, { status, headers });
  const fail = (status: number, code: string, message: string, details?: unknown) =>
    reply(status, { error: { code, message, details } });
  if (!identity) return fail(401, "UNAUTHENTICATED", "Sesión requerida.");

  const can = (permission: string) => identity.actor.permissions.includes(permission);
  const forbidden = () => fail(403, "FORBIDDEN", "No tienes permiso para esta acción.");
  const repo = new RecallRepository(identity.restClient, identity.actor.clinicId);
  const method = request.method.toUpperCase();
  const [, , first, second, third] = parts.map((part) => decodeURIComponent(part));
  const body = async () => (await request.json()) as unknown;

  try {
    if (parts.length === 2 && method === "GET") {
      if (!can("recalls.read")) return forbidden();
      const query = Object.fromEntries(new URL(request.url).searchParams);
      return reply(200, await repo.list(recallListFiltersSchema.parse(query)));
    }
    if (first === "bulk" && parts.length === 3 && method === "POST") {
      if (!can("recalls.manage")) return forbidden();
      return reply(200, await repo.bulk(recallBulkSchema.parse(await body())));
    }
    if (first === "candidates" && parts.length === 3 && method === "POST") {
      if (!can("recalls.manage")) return forbidden();
      return reply(200, await repo.candidates(recallCandidateFiltersSchema.parse(await body())));
    }
    if (first === "templates") {
      if (parts.length === 3 && method === "GET") {
        if (!can("recalls.read")) return forbidden();
        const includeArchived = new URL(request.url).searchParams.get("includeArchived") === "true";
        return reply(200, await repo.templates(includeArchived));
      }
      if (parts.length === 3 && method === "POST") {
        if (!can("recalls.templates.manage")) return forbidden();
        return reply(201, await repo.createTemplate(recallTemplateInputSchema.parse(await body())));
      }
      if (second && parts.length === 4 && method === "PUT") {
        if (!can("recalls.templates.manage")) return forbidden();
        const input = recallTemplateUpdateSchema.parse(await body());
        return reply(
          200,
          await repo.updateTemplate(
            second,
            input.template,
            input.expectedVersion,
            input.recomputePending,
          ),
        );
      }
      if (second && third === "archive" && parts.length === 5 && method === "POST") {
        if (!can("recalls.templates.manage")) return forbidden();
        const input = recallTemplateArchiveSchema.parse(await body());
        return reply(200, await repo.archiveTemplate(second, input.archive, input.reason));
      }
      if (second && third === "assign" && parts.length === 5 && method === "POST") {
        if (!can("recalls.manage")) return forbidden();
        return reply(200, await repo.assign(second, recallAssignSchema.parse(await body())));
      }
    } else if (first) {
      if (second === "history" && parts.length === 4 && method === "GET") {
        if (!can("recalls.read")) return forbidden();
        return reply(200, await repo.history(first));
      }
      if (second === "actions" && parts.length === 4 && method === "POST") {
        if (!can("recalls.manage")) return forbidden();
        const { expectedVersion, ...action } = recallActionRequestSchema.parse(await body());
        return reply(200, await repo.apply(first, action, expectedVersion));
      }
    }
  } catch (caught) {
    if (caught instanceof z.ZodError) {
      return fail(400, "INVALID_PAYLOAD", "Revisa los datos del formulario.", caught.flatten());
    }
    if (caught instanceof SyntaxError) {
      return fail(400, "INVALID_PAYLOAD", "Revisa los datos del formulario.");
    }
    if (caught instanceof SupabaseRestError) {
      const rule = RULE_ERRORS[databaseMessage(caught)];
      if (rule) return fail(...rule);
      const details = caught.details as { code?: unknown } | null;
      if (details?.code === "23503") {
        return fail(400, "INVALID_REFERENCE", "La sede, el profesional o el paciente no existen.");
      }
      return fail(
        caught.status >= 400 && caught.status < 600 ? caught.status : 502,
        "SUPABASE_ERROR",
        "No se pudo completar la operación.",
      );
    }
    throw caught;
  }
  return fail(404, "NOT_FOUND", "Ruta no encontrada.");
}
