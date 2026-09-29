import { NextResponse, type NextRequest } from "next/server";

import { canAccessPatient, decideStaffRouteAccess, type ActorContext } from "@/domain/permissions";
import { sessionResponseSchema } from "@/shared/api/contracts";

const SESSION_PATH = "/api/auth/session";
const SESSION_TIMEOUT_MS = 4_000;

function loginRedirect(request: NextRequest): NextResponse {
  const target = new URL("/login", request.url);
  target.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(target);
}

function unavailableResponse(): Response {
  return new Response("Denty no está disponible para validar la sesión.", {
    status: 503,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "private, no-store" },
  });
}

function forbiddenRedirect(request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL("/forbidden", request.url));
}

function actorFromSession(session: ReturnType<typeof sessionResponseSchema.parse>): ActorContext {
  const actor: ActorContext = {
    role: session.actor.role,
    permissions: session.actor.permissions,
  };
  if (session.actor.staffId !== undefined) actor.staffId = session.actor.staffId;
  if (session.actor.patientIds !== undefined) actor.patientIds = session.actor.patientIds;
  return actor;
}

function carrySessionCookies(target: NextResponse, source: Response): NextResponse {
  const headers = source.headers as Headers & { getSetCookie?: () => string[] };
  const setCookies = headers.getSetCookie?.() ?? [];
  if (setCookies.length > 0) {
    for (const cookie of setCookies) target.headers.append("set-cookie", cookie);
  } else {
    const header = source.headers.get("set-cookie");
    if (header) target.headers.append("set-cookie", header);
  }
  target.headers.set("cache-control", "private, no-store");
  return target;
}

export async function proxy(request: NextRequest): Promise<Response> {
  const headers = new Headers({ accept: "application/json" });
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);

  let response: Response;
  try {
    // Session validation always happens on the same application origin. This prevents
    // an external API endpoint from becoming a second identity authority.
    response = await fetch(new URL(SESSION_PATH, request.url), {
      headers,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(SESSION_TIMEOUT_MS),
    });
  } catch {
    return unavailableResponse();
  }

  if (response.status === 401) return loginRedirect(request);
  if (!response.ok) return unavailableResponse();

  const session = sessionResponseSchema.safeParse(await response.json());
  if (!session.success) return unavailableResponse();

  const actor = actorFromSession(session.data);
  let result: NextResponse;
  if (request.nextUrl.pathname.startsWith("/patient/")) {
    const patientId = request.nextUrl.pathname.split("/")[2];
    result =
      patientId && canAccessPatient(actor, patientId)
        ? NextResponse.next()
        : forbiddenRedirect(request);
    return carrySessionCookies(result, response);
  }

  const decision = decideStaffRouteAccess(actor, request.nextUrl.pathname);
  if (decision.kind === "allow") result = NextResponse.next();
  else if (decision.kind === "unauthenticated") result = loginRedirect(request);
  else result = forbiddenRedirect(request);
  return carrySessionCookies(result, response);
}

export const config = {
  matcher: ["/app/:path*", "/patient/:path*"],
};
