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

function refreshedRequest(request: NextRequest, response: Response): NextResponse {
  const cookies = new Map(
    (request.headers.get("cookie") ?? "")
      .split(";")
      .map((part) => {
        const index = part.indexOf("=");
        return [part.slice(0, index).trim(), part.slice(index + 1)] as const;
      })
      .filter(([name]) => Boolean(name)),
  );
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(";")[0] ?? "";
    const index = pair.indexOf("=");
    if (index > 0) cookies.set(pair.slice(0, index), pair.slice(index + 1));
  }
  const headers = new Headers(request.headers);
  headers.set("cookie", [...cookies].map(([name, value]) => `${name}=${value}`).join("; "));
  return NextResponse.next({ request: { headers } });
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

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return unavailableResponse();
  }
  const session = sessionResponseSchema.safeParse(payload);
  if (!session.success) return unavailableResponse();

  const actor = actorFromSession(session.data);
  let result: NextResponse;
  if (request.nextUrl.pathname.startsWith("/patient/")) {
    const patientId = request.nextUrl.pathname.split("/")[2];
    result =
      patientId && canAccessPatient(actor, patientId)
        ? refreshedRequest(request, response)
        : forbiddenRedirect(request);
    return carrySessionCookies(result, response);
  }

  const pathname = request.nextUrl.pathname;
  const decision = decideStaffRouteAccess(
    actor,
    pathname.startsWith("/admin/") ? `/app${pathname}` : pathname,
  );
  if (decision.kind === "allow") result = refreshedRequest(request, response);
  else if (decision.kind === "unauthenticated") result = loginRedirect(request);
  else result = forbiddenRedirect(request);
  return carrySessionCookies(result, response);
}

export const config = {
  matcher: ["/app/:path*", "/patient/:path*", "/admin/:path*"],
};
