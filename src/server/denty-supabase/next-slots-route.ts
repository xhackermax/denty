import { dayPartWindow, nextSlotsNotBefore, parseDayPart } from "@/domain/agenda/next-slot";
import { nextSlotsSchema } from "@/shared/api/schemas/agenda";

import type { SupabaseRestClient } from "../supabase/rest-client";

interface Identity {
  actor: { role: string; clinicId: string };
  restClient: SupabaseRestClient;
}

const DEFAULT_DURATION = 30;
const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 12;
// Two months covers a full holiday period without making the query scan forever.
const HORIZON_DAYS = 60;

function integerParam(value: string | null, fallback: number, min: number, max: number) {
  if (value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export async function handleNextSlotsRoute(
  request: Request,
  identity: Identity | null,
  headers: HeadersInit = {},
  now: () => number = Date.now,
): Promise<Response> {
  const reply = (status: number, body: unknown) => Response.json(body, { status, headers });
  const fail = (status: number, code: string, message: string) =>
    reply(status, { error: { code, message } });
  if (!identity) return fail(401, "UNAUTHENTICATED", "No hay sesión activa.");
  if (identity.actor.role === "PATIENT")
    return fail(403, "FORBIDDEN", "La búsqueda de huecos es solo para el equipo.");
  if (request.method !== "GET") return fail(405, "METHOD_NOT_ALLOWED", "Usa GET.");

  const params = new URL(request.url).searchParams;
  const part = parseDayPart(params.get("part"));
  if (part === undefined) return fail(400, "INVALID_PART", "Indica AM (mañana) o PM (tarde).");
  const durationMin = integerParam(params.get("durationMin"), DEFAULT_DURATION, 5, 720);
  if (durationMin === null)
    return fail(400, "INVALID_DURATION", "La duración debe estar entre 5 y 720 minutos.");
  const limit = integerParam(params.get("limit"), DEFAULT_LIMIT, 1, MAX_LIMIT);
  if (limit === null) return fail(400, "INVALID_LIMIT", `Pide entre 1 y ${MAX_LIMIT} huecos.`);
  const from = params.get("from") ?? undefined;
  let notBefore: string;
  try {
    notBefore = nextSlotsNotBefore(now(), from);
  } catch {
    return fail(400, "INVALID_DATE", "La fecha debe tener el formato AAAA-MM-DD.");
  }

  const { fromMinute, toMinute } = dayPartWindow(part);
  const result = await identity.restClient.rpc<{ durationMin: number; slots: unknown[] }>(
    "agenda_next_slots",
    {
      p_clinic_id: identity.actor.clinicId,
      p_not_before: notBefore,
      p_from_minute: fromMinute,
      p_to_minute: toMinute,
      p_duration_min: durationMin,
      p_staff_id: params.get("staffId") || null,
      p_site_id: params.get("siteId") || null,
      p_limit: limit,
      p_horizon_days: HORIZON_DAYS,
    },
  );
  return reply(200, nextSlotsSchema.parse({ part, ...result }));
}
