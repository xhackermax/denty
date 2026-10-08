import { z } from "zod";
import { resolveRequestIdentity } from "@/server/denty-supabase/route-handler";
import { appendRefreshedTokenCookies } from "@/server/auth/auth-session";
import { SupabaseRestError } from "@/server/supabase/rest-client";

const fields = {
  p_name: z.string().max(200).nullable().optional(),
  p_category: z.string().max(100).nullable().optional(),
  p_phones: z
    .array(
      z.union([
        z.string().max(50),
        z.object({
          number: z.string().max(50),
          type: z.enum(["mobile", "fixed", "other"]).optional(),
        }),
      ]),
    )
    .max(20)
    .nullable()
    .optional(),
  p_emails: z.array(z.email()).max(20).nullable().optional(),
  p_notes: z.string().max(10000).nullable().optional(),
  p_hours: z.string().max(500).nullable().optional(),
};
const schema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("list_clinic_contacts"),
    parameters: z
      .object({
        p_clinic_id: z.string().min(1),
        p_search: z.string().max(200).nullable().optional(),
        p_category: z.string().max(100).nullable().optional(),
        p_limit: z.number().int().min(1).max(1000).optional(),
        p_offset: z.number().int().min(0).optional(),
      })
      .strict(),
  }),
  z.object({
    operation: z.literal("create_clinic_contact"),
    parameters: z
      .object({
        ...fields,
        p_clinic_id: z.string().min(1),
        p_name: z.string().trim().min(1).max(200),
        p_category: z.string().trim().min(1).max(100),
      })
      .strict(),
  }),
  z.object({
    operation: z.literal("update_clinic_contact"),
    parameters: z
      .object({
        ...fields,
        p_contact_id: z.uuid(),
        p_expected_version: z.number().int().positive().nullable().optional(),
      })
      .strict(),
  }),
  z.object({
    operation: z.literal("delete_clinic_contact"),
    parameters: z.object({ p_contact_id: z.uuid() }).strict(),
  }),
]);

export async function POST(request: Request): Promise<Response> {
  const headers = new Headers({ "cache-control": "private, no-store" });
  const failure = (status: number, message: string) =>
    Response.json({ error: { message } }, { status, headers });
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return failure(403, "Origen no permitido.");
  try {
    const identity = await resolveRequestIdentity(request);
    if (!identity) return failure(401, "No hay sesión activa.");
    if (identity.refreshedSession)
      appendRefreshedTokenCookies(headers, identity.refreshedSession, identity.appSessionId, {
        secure: process.env.NODE_ENV === "production" || new URL(request.url).protocol === "https:",
      });
    if (identity.actor.role === "PATIENT")
      return failure(403, "Solo el personal puede acceder a contactos.");
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return failure(400, "JSON no válido.");
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return failure(400, "Parámetros de contacto no válidos.");
    const { operation, parameters } = parsed.data;
    if (operation !== "list_clinic_contacts" && identity.actor.role !== "ADMIN")
      return failure(403, "Solo administración puede modificar los contactos.");
    if ("p_clinic_id" in parameters && parameters.p_clinic_id !== identity.actor.clinicId)
      return failure(403, "La clínica no pertenece a la sesión.");
    if ("p_contact_id" in parameters) {
      const contacts = await identity.restClient.select("clinic_contacts", {
        select: "id",
        id: `eq.${parameters.p_contact_id}`,
        clinic_id: `eq.${identity.actor.clinicId}`,
        limit: 1,
      });
      if (!contacts.length) return failure(404, "Contacto no encontrado.");
    }
    const data = await identity.restClient.rpc(operation, parameters);
    return Response.json(data, { headers });
  } catch (error) {
    if (error instanceof SupabaseRestError)
      return failure(
        error.status === 409 ? 409 : 502,
        "No se pudo completar la operación de contactos.",
      );
    return failure(503, "No se pudo validar la sesión o conectar con Supabase.");
  }
}
