import { z } from "zod";
import { resolveRequestIdentity } from "@/server/denty-supabase/route-handler";
import { QualityRepository } from "@/server/denty-supabase/quality-repository";
import { SupabaseRestError } from "@/server/supabase/rest-client";
import { appendRefreshedTokenCookies } from "@/server/auth/auth-session";

const uuid = z.string().uuid();
const createIncident = z.object({
  patientId: uuid, appointmentId: uuid.nullish(), doctorId: uuid.nullish(),
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(5).max(5000),
  category: z.enum([
    "CLINICAL_COMPLICATION", "REPEATED_TREATMENT", "TECHNICAL",
    "LABORATORY", "PATIENT_COMPLAINT", "OTHER",
  ]),
  cause: z.enum(["UNDETERMINED", "CLINICAL", "MATERIAL", "LABORATORY", "PATIENT_RELATED", "OTHER"]),
  severity: z.enum(["LOW", "MODERATE", "HIGH", "CRITICAL"]),
  repeatTreatment: z.boolean(),
  costCents: z.number().int().min(0).max(100_000_000).default(0),
}).strict();
const editIncident = z.object({
  id: uuid,
  status: z.enum(["OPEN", "INVESTIGATING", "RESOLVED", "CLOSED"]),
  correctiveAction: z.string().max(5000),
}).strict();
const implantOutcome = z.object({
  tooth_position: z.string().trim().min(1).max(32),
  outcome: z.enum(["PLACED", "FAILED", "DEFERRED"]),
  system: z.string().max(120).nullish(),
  implant_model: z.string().max(120).nullish(),
  platform: z.string().max(120).nullish(),
  diameter_mm: z.number().positive().max(20).nullish(),
  length_mm: z.number().positive().max(40).nullish(),
  lot_number: z.string().max(100).nullish(),
  failure_kind: z.enum(["PLACEMENT_ATTEMPT", "PREVIOUSLY_PLACED"]).nullish(),
  reason: z.string().max(2000).nullish(),
  reassessment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  notes: z.string().max(2000).nullish(),
}).strict();
const finishClinicalVisit = z.object({
  appointmentId: uuid,
  expectedVersion: z.number().int().nonnegative(),
  markTreatmentCompleted: z.boolean(),
}).strict();
const finishImplants = z.object({
  appointmentId: uuid,
  expectedVersion: z.number().int().nonnegative(),
  outcomes: z.array(implantOutcome).min(1).max(20),
}).strict().superRefine((input, ctx) => {
  const teeth = input.outcomes.map(item => item.tooth_position.trim().toUpperCase());
  if (new Set(teeth).size !== teeth.length) {
    ctx.addIssue({ code: "custom", message: "Hay posiciones repetidas." });
  }
  for (const [index, item] of input.outcomes.entries()) {
    if (item.outcome === "PLACED" &&
        (!item.system?.trim() || !item.implant_model?.trim() ||
         !item.platform?.trim() || !item.diameter_mm || !item.length_mm)) {
      ctx.addIssue({ code: "custom", path: ["outcomes", index],
        message: "Faltan sistema, modelo, plataforma o dimensiones." });
    }
    if (item.outcome !== "PLACED" && !item.reason?.trim()) {
      ctx.addIssue({ code: "custom", path: ["outcomes", index],
        message: "Debe indicarse el motivo clínico." });
    }
    if (item.outcome === "FAILED" && !item.failure_kind) {
      ctx.addIssue({ code: "custom", path: ["outcomes", index],
        message: "Falta distinguir el tipo de fracaso." });
    }
  }
});
const dateQuery = z.object({
  start: z.string().datetime({ offset: true }),
  end: z.string().datetime({ offset: true }),
  siteId: uuid.optional(),
}).refine(v => Date.parse(v.start) < Date.parse(v.end), "Rango inválido")
  .refine(v => Date.parse(v.end) - Date.parse(v.start) < 367 * 86400_000,
    "El periodo no puede superar un año.");

function response(status: number, body: unknown, headers?: Headers) {
  const output = headers ?? new Headers();
  output.set("cache-control", "private, no-store");
  return Response.json(body, { status, headers: output });
}
function fail(status: number, message: string, headers?: Headers) {
  return response(status, { error: { message } }, headers);
}

async function handle(request: Request) {
  if (request.method !== "GET") {
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin)
      return fail(403, "Origen de solicitud no permitido.");
  }
  const identity = await resolveRequestIdentity(request);
  if (!identity) return fail(401, "Sesión no válida.");
  const headers = new Headers();
  if (identity.refreshedSession) {
    appendRefreshedTokenCookies(headers, identity.refreshedSession, identity.appSessionId, {
      secure: new URL(request.url).protocol === "https:",
    });
  }
  const { role, permissions, clinicId } = identity.actor;
  if (role === "PATIENT") return fail(403, "Acceso reservado al personal.", headers);
  const quality = new QualityRepository(identity.restClient, clinicId);
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  try {
    if (request.method === "GET") {
      if (kind === "doctors") {
        if (!permissions.includes("finance.read")) return fail(403, "Sin permiso de análisis.", headers);
        const query = dateQuery.parse({
          start: url.searchParams.get("start"),
          end: url.searchParams.get("end"),
          ...(url.searchParams.get("siteId") ? { siteId: url.searchParams.get("siteId") } : {}),
        });
        return response(200, await quality.scorecards(query.start, query.end, query.siteId), headers);
      }
      if (!permissions.includes("clinical.read"))
        return fail(403, "Sin permiso de lectura clínica.", headers);
      if (kind === "incidents") {
        const patientId = url.searchParams.get("patientId") ?? undefined;
        const doctorId = url.searchParams.get("doctorId") ?? undefined;
        const status = url.searchParams.get("status") ?? undefined;
        if (patientId) uuid.parse(patientId);
        if (doctorId) uuid.parse(doctorId);
        if (status) z.enum(["OPEN", "INVESTIGATING", "RESOLVED", "CLOSED"]).parse(status);
        return response(200, await quality.incidents(patientId, doctorId, status), headers);
      }
      if (kind === "patient-appointments") {
        const patientId = uuid.parse(url.searchParams.get("patientId"));
        return response(200, await quality.patientAppointments(patientId), headers);
      }
      if (kind === "patients")
        return response(200, { items: await quality.patients(url.searchParams.get("search") ?? "") }, headers);
      if (kind === "staff") return response(200, { items: await quality.doctors() }, headers);
      return fail(404, "Recurso no encontrado.", headers);
    }
    if (request.method === "POST" && kind === "visit-finalize") {
      const payload = finishClinicalVisit.parse(await request.json());
      const appointment = await identity.restClient.rpc<Record<string, unknown>>(
        "denty_complete_clinical_visit", {
          p_appointment_id: payload.appointmentId,
          p_expected_version: payload.expectedVersion,
          p_mark_treatment_completed: payload.markTreatmentCompleted,
        });
      if (appointment.conflict === true)
        return fail(409, "La cita ha cambiado. Actualiza la agenda.", headers);
      return response(200, { appointment }, headers);
    }
    if (request.method === "POST" && kind === "implant-finalize") {
      const payload = finishImplants.parse(await request.json());
      const appointment = await identity.restClient.rpc<Record<string, unknown>>(
        "denty_complete_implant_appointment", {
          p_appointment_id: payload.appointmentId,
          p_expected_version: payload.expectedVersion,
          p_outcomes: payload.outcomes,
        });
      if (appointment.conflict === true) return fail(409, "La cita ha cambiado. Actualiza la agenda.", headers);
      return response(200, { appointment }, headers);
    }
    if (!permissions.includes("clinical.write"))
      return fail(403, "Sin permiso para modificar incidencias.", headers);
    if (request.method === "POST" && kind === "incidents") {
      const input = createIncident.parse(await request.json());
      return response(201, await quality.createIncident({ ...input, appointmentId: input.appointmentId ?? null, doctorId: input.doctorId ?? null }), headers);
    }
    if (request.method === "PATCH" && kind === "incidents") {
      const input = editIncident.parse(await request.json());
      return response(200, await quality.updateIncident(input.id, input.status, input.correctiveAction), headers);
    }
    return fail(404, "Operación no encontrada.", headers);
  } catch (caught) {
    if (caught instanceof z.ZodError) return fail(400, "Comprueba los datos introducidos.", headers);
    if (caught instanceof SupabaseRestError) return fail(
      caught.status >= 400 && caught.status < 500 ? caught.status : 502,
      "No se pudo completar la operación en Supabase.", headers);
    return fail(409, caught instanceof Error ? caught.message : "Operación no completada.", headers);
  }
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
