import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { authenticatedHeaders, withAuthenticatedStaff } from "@/test/supabase-auth-fixture";
import { GET, POST } from "../route";
beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  vi.stubEnv("SUPABASE_SECRET_KEY", undefined);
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", undefined);
  vi.stubGlobal(
    "fetch",
    vi.fn(withAuthenticatedStaff(async () => Response.json([]), { clinicId: "clinic" })),
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
const context = { params: Promise.resolve({ path: ["api", "users"] }) };
test("an admin can list users and see missing account setup without a privileged key", async () => {
  const response = await GET(
    new Request("https://denty.test/api/denty/api/users", { headers: authenticatedHeaders() }),
    context,
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    items: expect.any(Array),
    administration: { configured: false, message: expect.stringContaining("SUPABASE_SECRET_KEY") },
  });
});
test("account creation still requires the server-only privileged key", async () => {
  const response = await POST(
    new Request("https://denty.test/api/denty/api/users", {
      method: "POST",
      headers: authenticatedHeaders({
        origin: "https://denty.test",
        "content-type": "application/json",
      }),
      body: JSON.stringify({ role: "PATIENT", patientId: "patient" }),
    }),
    context,
  );
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ error: { code: "ADMIN_CREDENTIALS_REQUIRED" } });
});
test("configuration and user listing remain restricted to clinic administrators", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      withAuthenticatedStaff(async () => Response.json([]), {
        clinicId: "clinic",
        role: "RECEPTION",
      }),
    ),
  );
  const response = await GET(
    new Request("https://denty.test/api/denty/api/users", { headers: authenticatedHeaders() }),
    context,
  );
  expect(response.status).toBe(403);
});
