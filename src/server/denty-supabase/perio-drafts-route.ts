import {
  perioDraftInputSchema,
  finishPerioDraftSchema,
  perioDraftSchema,
} from "@/shared/api/schemas/perio-drafts";
import { reconcileExamMouth, examToSites, perioSummary } from "@/domain/periodontal/exam";
import { loadMouthState } from "./mouth-guard";
import { SupabaseRestError, type SupabaseRestClient } from "../supabase/rest-client";
interface Identity {
  actor: { role: string; clinicId: string };
  restClient: SupabaseRestClient;
}
export async function handlePerioDraftsRoute(
  request: Request,
  parts: readonly string[],
  identity: Identity | null,
  headers: HeadersInit = {},
) {
  const reply = (status: number, body: unknown) => Response.json(body, { status, headers });
  if (!identity)
    return reply(401, { error: { code: "UNAUTHENTICATED", message: "Sesión requerida." } });
  if (!["ADMIN", "DENTIST", "ASSISTANT"].includes(identity.actor.role))
    return reply(403, { error: { code: "FORBIDDEN", message: "Acceso clínico requerido." } });
  const client = identity.restClient,
    patientId = decodeURIComponent(parts[2] ?? "");
  const mouth = await loadMouthState(client, identity.actor.clinicId, patientId);
  if (parts.length === 4 && request.method === "GET") {
    const rows = await client.select<{ version: number; data: unknown; updated_at: string }>(
      "periodontal_drafts",
      {
        select: "version,data,updated_at",
        patient_id: `eq.${patientId}`,
        clinic_id: `eq.${identity.actor.clinicId}`,
        limit: 1,
      },
    );
    return reply(
      200,
      rows[0]
        ? perioDraftSchema.parse({
            version: rows[0].version,
            data: rows[0].data,
            updatedAt: rows[0].updated_at,
          })
        : null,
    );
  }
  if (request.method === "POST" && parts.length === 4) {
    const input = perioDraftInputSchema.parse(await request.json());
    // Persist only authoritative tooth-presence flags; measurements on absent teeth stay in the draft, never the exam.
    const data = { ...input.data, exam: reconcileExamMouth(input.data.exam, mouth) };
    const result = await client.rpc("save_periodontal_draft", {
      p_patient_id: patientId,
      p_expected_version: input.expectedVersion,
      p_data: data,
    });
    return reply(200, perioDraftSchema.parse(result));
  }
  if (request.method === "POST" && parts.length === 5 && parts[4] === "finish") {
    if (!["ADMIN", "DENTIST"].includes(identity.actor.role))
      return reply(403, {
        error: { code: "FORBIDDEN", message: "La finalización requiere al dentista." },
      });
    const input = finishPerioDraftSchema.parse(await request.json());
    const rows = await client.select<{ version: number; data: unknown }>("periodontal_drafts", {
      select: "version,data",
      patient_id: `eq.${patientId}`,
      clinic_id: `eq.${identity.actor.clinicId}`,
      limit: 1,
    });
    if (!rows[0] || rows[0].version !== input.expectedVersion)
      throw new SupabaseRestError("El borrador cambió. Recarga antes de continuar.", 409, {});
    const data = perioDraftInputSchema.shape.data.parse(rows[0].data),
      exam = reconcileExamMouth(data.exam, mouth),
      sites = examToSites(exam);
    if (!sites.length) throw new SupabaseRestError("Introduce al menos una medición.", 422, {});
    const result = await client.rpc("finish_periodontal_draft", {
      p_patient_id: patientId,
      p_expected_version: input.expectedVersion,
      p_exam: { sites, risk: perioSummary(exam), metadata: { perioExam: exam } },
    });
    return reply(201, result);
  }
  return reply(404, { error: { code: "NOT_FOUND", message: "Ruta no encontrada." } });
}
