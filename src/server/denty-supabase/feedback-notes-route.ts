import { z } from "zod";

import {
  feedbackNoteInputSchema,
  feedbackNoteSchema,
  feedbackNoteStatusInputSchema,
  type FeedbackNote,
} from "@/shared/api/schemas/feedback-notes";

import { SupabaseRestError, type SupabaseRestClient } from "../supabase/rest-client";

interface Identity {
  actor: { clinicId: string; role: string };
  restClient: SupabaseRestClient;
}

interface FeedbackNoteRow {
  id: string;
  kind: string;
  message: string;
  page_path: string | null;
  status: string;
  author_id: string | null;
  author_name: string;
  created_at: string;
  updated_at: string;
}

const COLUMNS = "id,kind,message,page_path,status,author_id,author_name,created_at,updated_at";

function toNote(row: FeedbackNoteRow): FeedbackNote {
  return feedbackNoteSchema.parse({
    id: row.id,
    kind: row.kind,
    message: row.message,
    pagePath: row.page_path,
    status: row.status,
    authorId: row.author_id,
    authorName: row.author_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function isFeedbackNotesRoute(parts: readonly string[]): boolean {
  return parts[0] === "api" && parts[1] === "feedback-notes";
}

/**
 * /api/feedback-notes — the feedback inbox. Any staff role reads and writes notes;
 * only admins change their status. The database checks the same rules again.
 */
export async function handleFeedbackNotesRoute(
  request: Request,
  parts: readonly string[],
  identity: Identity | null,
  headers: HeadersInit = {},
): Promise<Response> {
  const reply = (status: number, body: unknown) => Response.json(body, { status, headers });
  const fail = (status: number, code: string, message: string, details?: unknown) =>
    reply(status, { error: { code, message, details } });
  if (!identity) return fail(401, "UNAUTHENTICATED", "Sesión requerida.");
  if (identity.actor.role === "PATIENT")
    return fail(403, "FORBIDDEN", "El buzón es solo para el equipo de la clínica.");

  const client = identity.restClient;
  const clinicId = identity.actor.clinicId;
  const method = request.method.toUpperCase();
  const noteId = decodeURIComponent(parts[2] ?? "");

  try {
    if (parts.length === 2 && method === "GET") {
      const rows = await client.select<FeedbackNoteRow>("feedback_notes", {
        select: COLUMNS,
        clinic_id: `eq.${clinicId}`,
        order: "created_at.desc",
        limit: 200,
      });
      return reply(200, rows.map(toNote));
    }
    if (parts.length === 2 && method === "POST") {
      const input = feedbackNoteInputSchema.parse(await request.json());
      const row = await client.rpc<FeedbackNoteRow>("create_feedback_note", {
        p_clinic_id: clinicId,
        p_kind: input.kind,
        p_message: input.message,
        p_page_path: input.pagePath,
      });
      return reply(201, toNote(row));
    }
    if (parts.length === 4 && parts[3] === "status" && method === "POST") {
      if (identity.actor.role !== "ADMIN")
        return fail(403, "FORBIDDEN", "Solo un administrador puede cambiar el estado.");
      const input = feedbackNoteStatusInputSchema.parse(await request.json());
      const row = await client.rpc<FeedbackNoteRow>("update_feedback_note_status", {
        p_note_id: noteId,
        p_status: input.status,
      });
      return reply(200, toNote(row));
    }
  } catch (caught) {
    if (caught instanceof z.ZodError)
      return fail(400, "INVALID_PAYLOAD", "Revisa la nota.", caught.flatten());
    if (caught instanceof SyntaxError) return fail(400, "INVALID_PAYLOAD", "Revisa la nota.");
    if (caught instanceof SupabaseRestError) {
      const message = (caught.details as { message?: unknown } | null)?.message;
      if (message === "FORBIDDEN")
        return fail(403, "FORBIDDEN", "No tienes permiso para esta acción.");
      if (message === "FEEDBACK_NOTE_NOT_FOUND")
        return fail(404, "FEEDBACK_NOTE_NOT_FOUND", "No se encontró la nota.");
      return fail(
        caught.status >= 400 && caught.status < 600 ? caught.status : 502,
        "SUPABASE_ERROR",
        "No se pudo guardar la nota.",
      );
    }
    throw caught;
  }
  return fail(404, "NOT_FOUND", "Ruta no encontrada.");
}
