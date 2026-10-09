import { z } from "zod";

import { appendRefreshedTokenCookies } from "@/server/auth/auth-session";
import { resolveRequestIdentity } from "@/server/denty-supabase/route-handler";
import { CV_ARCHIVE_BUCKET, StorageRepository } from "@/server/storage/storage-repository";
import { SupabaseRestError } from "@/server/supabase/rest-client";
import { resolveSupabasePublicCredentials } from "@/server/supabase/credentials";
import { getServerEnv } from "@/shared/config/env";

interface CandidateCvRow {
  id: string;
  clinic_id: string;
  candidate_name: string;
  target_position: string | null;
  notes: string | null;
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
  storage_path: string;
  checksum: string;
  created_at: string;
}

const idSchema = z.string().uuid();
const uploadSchema = z.object({
  candidateName: z.string().trim().min(2).max(160),
  targetPosition: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(1000).optional(),
});

function failure(status: number, message: string, headers: Headers) {
  return Response.json({ error: { message } }, { status, headers });
}

function toView(row: CandidateCvRow) {
  return {
    id: row.id,
    candidateName: row.candidate_name,
    targetPosition: row.target_position,
    notes: row.notes,
    fileName: row.file_name,
    fileSizeBytes: row.file_size_bytes,
    checksum: row.checksum,
    createdAt: row.created_at,
  };
}

async function handle(request: Request): Promise<Response> {
  const headers = new Headers({ "cache-control": "private, no-store" });
  if (request.method !== "GET" && request.headers.get("origin") !== new URL(request.url).origin) {
    return failure(403, "Origen no permitido.", headers);
  }
  try {
    const identity = await resolveRequestIdentity(request);
    if (!identity) return failure(401, "Debes iniciar sesión.", headers);
    if (identity.refreshedSession) {
      appendRefreshedTokenCookies(headers, identity.refreshedSession, identity.appSessionId, {
        secure: new URL(request.url).protocol === "https:",
      });
    }
    // Also enforced independently by PostgreSQL and Storage RLS.
    if (identity.actor.role === "PATIENT" || !identity.actor.permissions.includes("users.manage")) {
      return failure(403, "Solo administración puede acceder al archivo de currículums.", headers);
    }

    const { clinicId, userId } = identity.actor;
    const credentials = resolveSupabasePublicCredentials(getServerEnv());
    if (!credentials) return failure(503, "Supabase Storage no está configurado.", headers);
    const storage = new StorageRepository({
      url: credentials.url,
      key: credentials.key,
      accessToken: identity.accessToken,
    });
    const url = new URL(request.url);

    if (request.method === "GET") {
      const requestedId = url.searchParams.get("id");
      if (requestedId) {
        const id = idSchema.safeParse(requestedId);
        if (!id.success) return failure(400, "Identificador no válido.", headers);
        const rows = await identity.restClient.select<CandidateCvRow>("cv_candidate_archive", {
          select: "*", clinic_id: "eq." + clinicId, id: "eq." + id.data, limit: 1,
        });
        const candidate = rows[0];
        if (!candidate) return failure(404, "Currículum no encontrado.", headers);
        const blob = await storage.download(CV_ARCHIVE_BUCKET, candidate.storage_path);
        headers.set("content-type", "application/pdf");
        headers.set("x-content-type-options", "nosniff");
        headers.set("content-disposition",
          "attachment; filename*=UTF-8''" + encodeURIComponent(candidate.file_name));
        return new Response(blob, { status: 200, headers });
      }
      const rows = await identity.restClient.select<CandidateCvRow>("cv_candidate_archive", {
        select: "*", clinic_id: "eq." + clinicId, order: "created_at.desc", limit: 1000,
      });
      return Response.json({ items: rows.map(toView) }, { headers });
    }

    if (request.method === "POST") {
      const form = await request.formData();
      const fields = uploadSchema.safeParse({
        candidateName: form.get("candidateName"),
        targetPosition: form.get("targetPosition") ?? undefined,
        notes: form.get("notes") ?? undefined,
      });
      const file = form.get("file");
      if (!fields.success || !(file instanceof File)) {
        return failure(400, "Indica el nombre del candidato y adjunta un PDF.", headers);
      }
      if (file.size < 1 || file.size > 4 * 1024 * 1024) {
        return failure(413, "El PDF debe tener un tamaño máximo de 4 MB.", headers);
      }
      if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) {
        return failure(400, "Únicamente se aceptan archivos PDF.", headers);
      }
      const bytes = new Uint8Array(await file.slice(0, 5).arrayBuffer());
      if (bytes.length !== 5 || bytes[0] !== 37 || bytes[1] !== 80 ||
          bytes[2] !== 68 || bytes[3] !== 70 || bytes[4] !== 45) {
        return failure(400, "El archivo no tiene una cabecera PDF válida.", headers);
      }
      const saved = await storage.uploadCandidateCv(clinicId, file);
      try {
        const row = await identity.restClient.insert<CandidateCvRow>("cv_candidate_archive", {
          clinic_id: clinicId,
          candidate_name: fields.data.candidateName,
          target_position: fields.data.targetPosition || null,
          notes: fields.data.notes || null,
          file_name: file.name.slice(0, 255),
          mime_type: "application/pdf",
          file_size_bytes: saved.sizeBytes,
          storage_path: saved.path,
          checksum: saved.checksum,
          created_by: userId,
        });
        return Response.json(toView(row), { status: 201, headers });
      } catch (caught) {
        await storage.remove(CV_ARCHIVE_BUCKET, saved.path).catch(() => undefined);
        throw caught;
      }
    }

    if (request.method === "DELETE") {
      const body: unknown = await request.json().catch(() => null);
      const id = idSchema.safeParse(
        body && typeof body === "object" && "id" in body ? body.id : undefined,
      );
      if (!id.success) return failure(400, "Identificador no válido.", headers);
      const rows = await identity.restClient.select<CandidateCvRow>("cv_candidate_archive", {
        select: "*", clinic_id: "eq." + clinicId, id: "eq." + id.data, limit: 1,
      });
      const candidate = rows[0];
      if (!candidate) return failure(404, "Currículum no encontrado.", headers);
      await identity.restClient.delete("cv_candidate_archive", {
        id: "eq." + id.data, clinic_id: "eq." + clinicId,
      });
      try {
        await storage.remove(CV_ARCHIVE_BUCKET, candidate.storage_path);
      } catch {
        return failure(503,
          "Se ha retirado el currículum del índice, pero falta limpiar el PDF de Storage.",
          headers);
      }
      return Response.json({ ok: true }, { headers });
    }
    return failure(405, "Método no permitido.", headers);
  } catch (caught) {
    if (caught instanceof SupabaseRestError) {
      return failure(caught.status === 404 ? 404 : 502,
        "No se pudo completar la operación en el archivo de currículums.", headers);
    }
    return failure(503, "No se pudo acceder al archivo de currículums.", headers);
  }
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
