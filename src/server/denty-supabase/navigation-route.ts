import { sanitizePinned } from "@/domain/navigation";
import { navigationLayoutSchema, type NavigationLayouts } from "@/shared/api/schemas/navigation";

import { SupabaseRestError, type SupabaseRestClient } from "../supabase/rest-client";

interface Identity {
  actor: { role: string; clinicId: string; userId: string };
  restClient: SupabaseRestClient;
}

// Postgres/PostgREST codes for a column, table or function that does not exist yet.
const MISSING_SCHEMA_CODES = new Set([
  "42703",
  "42P01",
  "42883",
  "PGRST202",
  "PGRST204",
  "PGRST205",
]);

function isMissingSchema(caught: unknown): boolean {
  if (!(caught instanceof SupabaseRestError)) return false;
  const code = (caught.details as { code?: unknown } | null)?.code;
  return typeof code === "string" && MISSING_SCHEMA_CODES.has(code);
}

const layoutOf = (value: unknown) => {
  const pinned = sanitizePinned((value as { pinned?: unknown } | null)?.pinned);
  return pinned ? { pinned } : null;
};

async function readLayouts(identity: Identity): Promise<NavigationLayouts> {
  const { restClient: client, actor } = identity;
  try {
    const [clinicRows, userRows] = await Promise.all([
      client.select<{ navigation_layout: unknown }>("clinic_settings", {
        select: "navigation_layout",
        clinic_id: `eq.${actor.clinicId}`,
        limit: 1,
      }),
      client.select<{ layout: unknown }>("member_navigation_layouts", {
        select: "layout",
        clinic_id: `eq.${actor.clinicId}`,
        profile_id: `eq.${actor.userId}`,
        limit: 1,
      }),
    ]);
    return {
      available: true,
      clinic: layoutOf(clinicRows[0]?.navigation_layout),
      user: layoutOf(userRows[0]?.layout),
    };
  } catch (caught) {
    // Before the migration runs the menu must still work with the built-in order.
    if (isMissingSchema(caught)) return { available: false, clinic: null, user: null };
    throw caught;
  }
}

export async function handleNavigationRoute(
  request: Request,
  parts: readonly string[],
  identity: Identity | null,
  headers: HeadersInit = {},
): Promise<Response> {
  const reply = (status: number, body: unknown) => Response.json(body, { status, headers });
  const fail = (status: number, code: string, message: string, details?: unknown) =>
    reply(status, { error: { code, message, details } });
  if (!identity) return fail(401, "UNAUTHENTICATED", "No hay sesión activa.");
  if (identity.actor.role === "PATIENT")
    return fail(403, "FORBIDDEN", "El menú de la clínica es solo para el equipo.");

  const scope = parts[3];
  if (parts.length === 3 && request.method === "GET")
    return reply(200, await readLayouts(identity));
  if (parts.length !== 4 || request.method !== "PUT" || (scope !== "me" && scope !== "clinic"))
    return fail(404, "NOT_FOUND", "Ruta no encontrada.");
  if (scope === "clinic" && identity.actor.role !== "ADMIN")
    return fail(403, "FORBIDDEN", "Solo administración puede fijar el menú de la clínica.");

  const parsed = navigationLayoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return fail(400, "INVALID_PAYLOAD", "El orden del menú no es válido.", parsed.error.flatten());
  const layout = parsed.data.pinned ? { pinned: parsed.data.pinned } : null;
  try {
    await identity.restClient.rpc(
      scope === "clinic" ? "set_clinic_navigation_layout" : "set_my_navigation_layout",
      { p_clinic_id: identity.actor.clinicId, p_layout: layout },
    );
  } catch (caught) {
    if (isMissingSchema(caught))
      return fail(
        503,
        "NAVIGATION_LAYOUT_UNAVAILABLE",
        "La personalización del menú aún no está activada en la base de datos.",
      );
    throw caught;
  }
  return reply(200, await readLayouts(identity));
}
