import {
  restoreArgumentOverridesSchema,
  saveArgumentOverridesSchema,
  saveTreatmentComparisonSchema,
} from "@/shared/api/schemas/clinical-arguments";

import type { SupabaseRestClient } from "../supabase/rest-client";
import { ClinicalArgumentsRepository } from "./clinical-arguments-repository";

interface Identity {
  actor: { clinicId: string; permissions: readonly string[] };
  restClient: SupabaseRestClient;
}

export function isClinicalArgumentsRoute(parts: readonly string[]): boolean {
  return (
    parts[0] === "api" &&
    ((parts[1] === "admin" && parts[2] === "clinical-arguments") ||
      (parts[1] === "patients" && parts[3] === "treatment-comparisons" && parts.length === 4))
  );
}

/**
 * /api/admin/clinical-arguments[/restore|/history]: anyone with clinical access reads the
 * clinic's phrases (the picker needs them); only catalog managers change them.
 * /api/patients/:id/treatment-comparisons: clinical staff read the history; saving what the
 * patient was shown and decided needs clinical.write, like any other clinical record.
 */
export async function handleClinicalArgumentsRoute(
  request: Request,
  parts: readonly string[],
  identity: Identity | null,
  headers: HeadersInit = {},
): Promise<Response> {
  const reply = (status: number, body: unknown) => Response.json(body, { status, headers });
  const forbidden = (message: string) => reply(403, { error: { code: "FORBIDDEN", message } });
  if (!identity)
    return reply(401, { error: { code: "UNAUTHENTICATED", message: "Sesión requerida." } });
  const can = (permission: string) => identity.actor.permissions.includes(permission);
  const repo = new ClinicalArgumentsRepository(identity.restClient, identity.actor.clinicId);
  const method = request.method.toUpperCase();

  if (parts[1] === "patients") {
    const patientId = decodeURIComponent(parts[2] ?? "");
    if (method === "GET") {
      if (!can("clinical.read")) return forbidden("Acceso clínico requerido.");
      return reply(200, await repo.comparisons(patientId));
    }
    if (method === "POST") {
      if (!can("clinical.write"))
        return forbidden("Registrar la decisión del paciente requiere al odontólogo.");
      const input = saveTreatmentComparisonSchema.parse(await request.json());
      return reply(201, await repo.saveComparison(patientId, input));
    }
  } else {
    const action = parts[3];
    if (method === "GET" && parts.length <= 4) {
      if (!can("clinical.read") && !can("catalog.manage"))
        return forbidden("No tienes permiso para consultar el catálogo clínico.");
      if (!action) return reply(200, await repo.overrides());
      if (action === "history") {
        const entryId = new URL(request.url).searchParams.get("entryId") ?? "";
        return reply(200, await repo.history(entryId));
      }
    }
    if (!can("catalog.manage"))
      return forbidden("No tienes permiso para editar el catálogo clínico.");
    if (method === "PUT" && parts.length === 3) {
      const input = saveArgumentOverridesSchema.parse(await request.json());
      return reply(200, await repo.save(input.items));
    }
    if (method === "POST" && action === "restore" && parts.length === 4) {
      const input = restoreArgumentOverridesSchema.parse(await request.json());
      return reply(200, await repo.restore(input.phraseIds));
    }
  }
  return reply(404, { error: { code: "NOT_FOUND", message: "Ruta no encontrada." } });
}
