import { expect, test, vi } from "vitest";
import { SupabaseAuthClient } from "../auth-client";

test("password updates work with Denty's validated HttpOnly access token without an SDK storage session", async () => {
  const fetchImpl = vi.fn<typeof fetch>(async () =>
    Response.json({ id: "user", email: "staff@denty.test" }),
  );
  const client = new SupabaseAuthClient(
    { url: "https://supabase.test", publishableKey: "public-key" },
    fetchImpl,
  );
  const accessToken = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, sub: "user" })).toString("base64url")}.c2lnbmF0dXJl`;
  await client.updatePassword(accessToken, "new-password-123", "refresh-token");
  const update = fetchImpl.mock.calls.find(([, init]) => init?.method === "PUT");
  expect(update).toBeDefined();
  expect(String(update?.[0])).toBe("https://supabase.test/auth/v1/user");
  expect(new Headers(update?.[1]?.headers).get("authorization")).toBe(`Bearer ${accessToken}`);
});
