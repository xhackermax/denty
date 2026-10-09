import { z } from "zod";

import { appendRefreshedTokenCookies } from "@/server/auth/auth-session";
import { resolveRequestIdentity } from "@/server/denty-supabase/route-handler";
import { STAFF_DOCUMENTS_BUCKET, StorageRepository } from "@/server/storage/storage-repository";
import { SupabaseRestError } from "@/server/supabase/rest-client";
import { resolveSupabasePublicCredentials } from "@/server/supabase/credentials";
import { getServerEnv } from "@/shared/config/env";

type StaffDocumentType = "CV" | "CONTRACT";
interface StaffDocumentRow {
  id: string;
  clinic_id: string;
  staff_member_id: string;
  document_type: StaffDocumentType;
  title: string;
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
  storage_path: string;
  checksum: string;
  created_at: string;
}

const uuid = z.string().uuid();
const kind = z.enum(["CV", "CONTRACT"]);
const titleSchema = z.string().trim().min(1).max(200);

function failure(status: number, message: string, headers: Headers) {
  return Response.json({ error: { message } }, { status, headers });
}

function publicView(row: StaffDocumentRow) {
  return {
    id: row.id,
    staffMemberId: row.staff_member_id,
    type: row.document_type,
    title: row.title,
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileSizeBytes: row.file_size_bytes,
    checksum: row.checksum,
    createdAt: row.created_at,
  };
}

async function handle(request: Request) {
  const headers = new Headers({ "cache-control": "private, no-store" });
  if (request.method === "POST" && request.headers.get("origin") !== new URL(request.url).origin) {
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
    // Both the API and database/storage RLS must enforce this permission.
    if (identity.actor.role === "PATIENT" || !identity.actor.permissions.includes("users.manage")) {
      return failure(403, "Acceso reservado a administración.", headers);
    }
    const { clinicId, userId } = identity.actor;
    const url = new URL(request.url);
    const credentials = resolveSupabasePublicCredentials(getServerEnv());
    if (!credentials) return failure(503, "Almacenamiento no configurado.", headers);
    const storage = new StorageRepository({
      url: credentials.url, key: credentials.key, accessToken: identity.accessToken,
    });

    if (request.method === "GET") {
      const id = url.searchParams.get("id");
      if (id) {
        if (!uuid.safeParse(id).success) return failure(400, "Documento no válido.", headers);
        const found = await identity.restClient.select<StaffDocumentRow>("staff_documents", {
          select: "*", id: "eq." + id, clinic_id: "eq." + clinicId, limit: 1,
        });
        const document = found[0];
        if (!document) return failure(404, "Documento no encontrado.", headers);
        const blob = await storage.download(STAFF_DOCUMENTS_BUCKET, document.storage_path);
        headers.set("content-type", document.mime_type);
        headers.set("x-content-type-options", "nosniff");
        headers.set("content-disposition",
          "attachment; filename*=UTF-8''" + encodeURIComponent(document.file_name));
        return new Response(blob, { status: 200, headers });
      }
      const parsed = kind.safeParse(url.searchParams.get("type"));
      if (!parsed.success) return failure(400, "Tipo de archivo no válido.", headers);
      const rows = await identity.restClient.select<StaffDocumentRow>("staff_documents", {
        select: "*", clinic_id: "eq." + clinicId,
        document_type: "eq." + parsed.data, archived_at: "is.null",
        order: "created_at.desc", limit: 1000,
      });
      return Response.json({ items: rows.map(publicView) }, { headers });
    }

    if (request.method === "POST") {
      const form = await request.formData();
      const staffId = uuid.safeParse(form.get("staffMemberId"));
      const documentType = kind.safeParse(form.get("type"));
      const title = titleSchema.safeParse(form.get("title"));
      const file = form.get("file");
      if (!staffId.success || !documentType.success || !title.success || !(file instanceof File)) {
        return failure(400, "Selecciona un empleado, tipo, título y archivo.", headers);
      }
      if (file.size < 1 || file.size > 4 * 1024 * 1024) {
        return failure(413, "Archivo demasiado grande. Máximo 4 MB.", headers);
      }
      const staff = await identity.restClient.select<{ id: string }>("staff_members", {
        select: "id", id: "eq." + staffId.data, clinic_id: "eq." + clinicId, limit: 1,
      });
      if (!staff.length) return failure(404, "El empleado no pertenece a esta clínica.", headers);
      const stored = await storage.uploadStaffDocument(clinicId, staffId.data, file);
      try {
        const row = await identity.restClient.insert<StaffDocumentRow>("staff_documents", {
          clinic_id: clinicId,
          staff_member_id: staffId.data,
          document_type: documentType.data,
          title: title.data,
          file_name: file.name.slice(0, 255),
          mime_type: stored.mimeType,
          file_size_bytes: stored.sizeBytes,
          storage_path: stored.path,
          checksum: stored.checksum,
          created_by: userId,
        });
        return Response.json(publicView(row), { status: 201, headers });
      } catch (error) {
        await storage.remove(STAFF_DOCUMENTS_BUCKET, stored.path).catch(() => undefined);
        throw error;
      }
    }
    return failure(405, "Método no permitido.", headers);
  } catch (error) {
    if (error instanceof SupabaseRestError) {
      return failure(error.status === 404 ? 404 : 502, "No se pudo consultar el archivo laboral.", headers);
    }
    return failure(503, "No se pudo completar la operación de personal.", headers);
  }
}

export const GET = handle;
export const POST = handle;
