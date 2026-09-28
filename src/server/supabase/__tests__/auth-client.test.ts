import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  refreshSession: vi.fn(),
  getUser: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  adminCreateUser: vi.fn(),
  adminUpdateUserById: vi.fn(),
  adminDeleteUser: vi.fn(),
  adminSignOut: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));

import { SupabaseAuthClient } from "../auth-client";

const credentials = {
  url: "https://example.supabase.co",
  publishableKey: "publishable-test-key",
  serviceRoleKey: "service-role-test-key",
};

function clientFor(key: string) {
  const isAdmin = key === credentials.serviceRoleKey;
  return {
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      refreshSession: mocks.refreshSession,
      getUser: mocks.getUser,
      resetPasswordForEmail: mocks.resetPasswordForEmail,
      updateUser: mocks.updateUser,
      admin: isAdmin
        ? {
            createUser: mocks.adminCreateUser,
            updateUserById: mocks.adminUpdateUserById,
            deleteUser: mocks.adminDeleteUser,
            signOut: mocks.adminSignOut,
          }
        : undefined,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createClient.mockImplementation((_url: string, key: string) => clientFor(key));
});

describe("SupabaseAuthClient", () => {
  test("uses the official publishable client for password sign-in", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: {
        session: {
          access_token: "access-token",
          refresh_token: "refresh-token",
          expires_in: 3600,
          expires_at: 4102444800,
          token_type: "bearer",
        },
        user: { id: "00000000-0000-0000-0000-000000000001", email: "staff@clinic.es", user_metadata: {}, app_metadata: {} },
      },
      error: null,
    });
    const client = new SupabaseAuthClient(credentials, vi.fn());

    const session = await client.signInWithPassword("STAFF@CLINIC.ES", "secure-password");

    expect(session.user.email).toBe("staff@clinic.es");
    expect(mocks.createClient).toHaveBeenCalledWith(
      credentials.url,
      credentials.publishableKey,
      expect.objectContaining({ auth: expect.objectContaining({ persistSession: false }) }),
    );
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "staff@clinic.es",
      password: "secure-password",
    });
  });

  test("keeps privileged user creation on the service-role client", async () => {
    mocks.adminCreateUser.mockResolvedValue({
      data: { user: { id: "00000000-0000-0000-0000-000000000002", email: "new@clinic.es", user_metadata: {}, app_metadata: {} } },
      error: null,
    });
    const client = new SupabaseAuthClient(credentials, vi.fn());

    await client.adminCreateUser({
      email: "NEW@CLINIC.ES",
      password: "another-secure-password",
      displayName: "Nueva Persona",
    });

    expect(mocks.createClient).toHaveBeenCalledWith(
      credentials.url,
      credentials.serviceRoleKey,
      expect.any(Object),
    );
    expect(mocks.adminCreateUser).toHaveBeenCalledWith({
      email: "new@clinic.es",
      password: "another-secure-password",
      email_confirm: true,
      user_metadata: { display_name: "Nueva Persona" },
    });
  });

  test("revokes only the current Supabase session on device logout", async () => {
    mocks.adminSignOut.mockResolvedValue({ error: null });
    const client = new SupabaseAuthClient(credentials, vi.fn());

    await client.signOut("access-token");

    expect(mocks.adminSignOut).toHaveBeenCalledWith("access-token", "local");
  });
});
