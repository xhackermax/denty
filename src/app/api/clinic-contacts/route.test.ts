import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { authenticatedHeaders, withAuthenticatedStaff } from "@/test/supabase-auth-fixture";
import { POST } from "./route";
beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "https://supabase.test");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "test-key");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
const call = (parameters: Record<string, unknown>, headers: Record<string, string> = {}) =>
  POST(
    new Request("https://denty.test/api/clinic-contacts", {
      method: "POST",
      headers: { origin: "https://denty.test", "content-type": "application/json", ...headers },
      body: JSON.stringify({ operation: "list_clinic_contacts", parameters }),
    }),
  );
test("anonymous contact access returns 401", async () => {
  expect((await call({})).status).toBe(401);
});
test("cross-origin mutations fail before authentication", async () => {
  expect((await call({}, { origin: "https://evil.test" })).status).toBe(403);
});
test("cannot list another clinic's contacts", async () => {
  vi.stubGlobal(
    "fetch",
    withAuthenticatedStaff(
      async () => {
        throw new Error("RPC must not run");
      },
      { clinicId: "clinic" },
    ),
  );
  expect((await call({ p_clinic_id: "other" }, authenticatedHeaders())).status).toBe(403);
});
test("authenticated contacts use the user's token and selected clinic", async () => {
  vi.stubGlobal(
    "fetch",
    withAuthenticatedStaff(
      async (_input, init) => {
        expect(new Headers(init?.headers).get("authorization")).toBe("Bearer test-access-token");
        expect(JSON.parse(String(init?.body)).p_clinic_id).toBe("clinic");
        return Response.json([{ id: "contact" }]);
      },
      { clinicId: "clinic" },
    ),
  );
  const response = await call({ p_clinic_id: "clinic" }, authenticatedHeaders());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([{ id: "contact" }]);
});

test("reception cannot create a contact, even by calling the API directly", async () => {
  vi.stubGlobal(
    "fetch",
    withAuthenticatedStaff(
      async () => {
        throw new Error("An unauthorized write reached Supabase");
      },
      { clinicId: "clinic", role: "RECEPTION" },
    ),
  );
  const response = await POST(
    new Request("https://denty.test/api/clinic-contacts", {
      method: "POST",
      headers: {
        origin: "https://denty.test",
        "content-type": "application/json",
        ...authenticatedHeaders(),
      },
      body: JSON.stringify({
        operation: "create_clinic_contact",
        parameters: { p_clinic_id: "clinic", p_name: "Proveedor", p_category: "Servicios" },
      }),
    }),
  );
  expect(response.status).toBe(403);
});
