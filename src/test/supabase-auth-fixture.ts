/**
 * Test fixture for route handlers behind the Stage 1 Supabase Auth cutover.
 *
 * Route handlers resolve the actor from the Denty cookies → GoTrue `/auth/v1/user`
 * → profiles / app_sessions / clinic_members. Tests that exercise data routes
 * wrap their PostgREST mock with `withAuthenticatedStaff` and send
 * `authenticatedHeaders()` so the request reaches the real handler logic
 * instead of stopping at 401.
 */
import {
  DENTY_ACCESS_COOKIE,
  DENTY_APP_SESSION_COOKIE,
  DENTY_REFRESH_COOKIE,
} from "@/server/auth/auth-session";

export const TEST_AUTH = {
  userId: "00000000-0000-4000-8000-0000000000aa",
  appSessionId: "00000000-0000-4000-8000-0000000000bb",
  membershipId: "00000000-0000-4000-8000-0000000000cc",
  accessToken: "test-access-token",
  refreshToken: "test-refresh-token",
} as const;

type FetchInput = string | URL | Request;
type FetchMock = (input: FetchInput, init?: RequestInit) => Promise<Response>;

export function authenticatedHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    cookie: [
      `${DENTY_ACCESS_COOKIE}=${TEST_AUTH.accessToken}`,
      `${DENTY_REFRESH_COOKIE}=${TEST_AUTH.refreshToken}`,
      `${DENTY_APP_SESSION_COOKIE}=${TEST_AUTH.appSessionId}`,
    ].join("; "),
    ...extra,
  };
}

export function withAuthenticatedStaff(
  dataFetch: FetchMock,
  options: { clinicId: string; role?: "ADMIN" | "RECEPTION" | "DENTIST" | "ASSISTANT" },
): FetchMock {
  const role = options.role ?? "ADMIN";
  return async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    const path = url.pathname;

    if (path === "/auth/v1/user") {
      return Response.json({
        id: TEST_AUTH.userId,
        aud: "authenticated",
        role: "authenticated",
        email: "staff@denty.test",
        app_metadata: {},
        user_metadata: {},
        created_at: "2026-09-01T00:00:00Z",
      });
    }
    if (path === "/rest/v1/profiles" && method === "GET") {
      return Response.json([
        { id: TEST_AUTH.userId, first_name: "Staff", last_name: "Test", email: "staff@denty.test", active: true },
      ]);
    }
    if (path === "/rest/v1/app_sessions") {
      if (method !== "GET") return new Response(null, { status: 204 });
      return Response.json([
        {
          id: TEST_AUTH.appSessionId,
          profile_id: TEST_AUTH.userId,
          clinic_id: options.clinicId,
          auth_session_id: null,
          device_label: "vitest",
          user_agent: null,
          last_seen_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 86_400_000).toISOString(),
          revoked_at: null,
          created_at: new Date().toISOString(),
        },
      ]);
    }
    if (path === "/rest/v1/clinic_members" && method === "GET") {
      return Response.json([
        {
          id: TEST_AUTH.membershipId,
          clinic_id: options.clinicId,
          profile_id: TEST_AUTH.userId,
          role,
          active: true,
          is_default: true,
        },
      ]);
    }
    if (
      (path === "/rest/v1/patient_accounts" ||
        path === "/rest/v1/user_permissions" ||
        path === "/rest/v1/staff_members") &&
      method === "GET"
    ) {
      return Response.json([]);
    }
    return dataFetch(input, init);
  };
}
