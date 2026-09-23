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
  return new Response("Denty API no está disponible para validar la sesión.", {
    status: 503,
    headers: { "content-type": "text/plain; charset=utf-8" },
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
  if (session.actor.patientIds !== undefined) {
    actor.patientIds = session.actor.patientIds;
  }
  return actor;
}

export async function proxy(request: NextRequest): Promise<Response> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    return NextResponse.next();
  }

  const apiUrl = process.env.DENTY_API_URL;
  if (!apiUrl) return unavailableResponse();

  const headers = new Headers({ accept: "application/json" });
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);

  let response: Response;
  try {
    response = await fetch(new URL(SESSION_PATH, `${apiUrl.replace(/\/$/, "")}/`), {
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
  if (request.nextUrl.pathname.startsWith("/patient/")) {
    const patientId = request.nextUrl.pathname.split("/")[2];
    return patientId && canAccessPatient(actor, patientId)
      ? NextResponse.next()
      : forbiddenRedirect(request);
  }

  const decision = decideStaffRouteAccess(actor, request.nextUrl.pathname);
  if (decision.kind === "allow") return NextResponse.next();
  if (decision.kind === "unauthenticated") return loginRedirect(request);
  return forbiddenRedirect(request);
}

export const config = {
  matcher: ["/app/:path*", "/patient/:path*"],
};
