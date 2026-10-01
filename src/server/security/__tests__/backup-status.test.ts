import { expect, test, vi } from "vitest";
import { readSupabaseBackupStatus } from "../backup-status";
test("derives the project from its URL and normalizes real daily backups", async () => {
  const fetchImpl = vi.fn(async () =>
    Response.json({
      pitr_enabled: false,
      backups: [
        {
          id: 2,
          inserted_at: "2026-10-01T06:00:00Z",
          status: "COMPLETED",
          is_physical_backup: false,
        },
      ],
    }),
  );
  const status = await readSupabaseBackupStatus({
    supabaseUrl: "https://abcdefghijklmno.supabase.co",
    accessToken: " token ",
    fetchImpl,
  });
  expect(status).toMatchObject({
    configured: true,
    connected: true,
    projectRef: "abcdefghijklmno",
    pitrEnabled: false,
    backups: [{ id: "2", createdAt: "2026-10-01T06:00:00Z", type: "LOGICAL" }],
  });
  expect(fetchImpl).toHaveBeenCalledWith(
    "https://api.supabase.com/v1/projects/abcdefghijklmno/database/backups",
    expect.objectContaining({
      headers: expect.objectContaining({ authorization: "Bearer token" }),
    }),
  );
});
test("does not report a failed token as connected", async () => {
  const status = await readSupabaseBackupStatus({
    projectRef: "project-ref",
    accessToken: "token",
    fetchImpl: async () => Response.json({ message: "secret" }, { status: 401 }),
  });
  expect(status.connected).toBe(false);
  expect(status.message).toMatch(/token/i);
  expect(JSON.stringify(status)).not.toContain("secret");
});
test("network failures are actionable states rather than server errors", async () => {
  const status = await readSupabaseBackupStatus({
    projectRef: "project-ref",
    accessToken: "token",
    fetchImpl: async () => {
      throw new Error("secret bearer token");
    },
  });
  expect(status.connected).toBe(false);
  expect(status.message).toMatch(/conectar/i);
  expect(JSON.stringify(status)).not.toContain("secret bearer");
});
test("a malformed provider response is not a successful connection", async () => {
  const status = await readSupabaseBackupStatus({
    projectRef: "project-ref",
    accessToken: "token",
    fetchImpl: async () => new Response("not JSON"),
  });
  expect(status.connected).toBe(false);
  expect(status.message).toMatch(/respuesta/i);
});
test("missing token keeps the dashboard available and names the remaining setup", async () => {
  const status = await readSupabaseBackupStatus({
    supabaseUrl: "https://abcdefghijklmno.supabase.co",
  });
  expect(status).toMatchObject({
    configured: false,
    connected: false,
    projectRef: "abcdefghijklmno",
    dashboardUrl: "https://supabase.com/dashboard/project/abcdefghijklmno/database/backups",
  });
  expect(status.message).toContain("SUPABASE_MANAGEMENT_ACCESS_TOKEN");
});
test("explicit reference is required for a custom domain and mismatching projects never fetch", async () => {
  const fetchImpl = vi.fn();
  const custom = await readSupabaseBackupStatus({
    supabaseUrl: "https://database.example.com",
    accessToken: "token",
    fetchImpl,
  });
  expect(custom.configured).toBe(false);
  const mismatch = await readSupabaseBackupStatus({
    projectRef: "wrong-project",
    supabaseUrl: "https://abcdefghijklmno.supabase.co",
    accessToken: "token",
    fetchImpl,
  });
  expect(mismatch.connected).toBe(false);
  expect(mismatch.message).toMatch(/coincide/i);
  expect(fetchImpl).not.toHaveBeenCalled();
});

test("supports physical backups and excludes invalid rows without inventing PITR", async () => {
  const status = await readSupabaseBackupStatus({
    projectRef: "project-ref",
    accessToken: "token",
    fetchImpl: async () =>
      Response.json({
        physical_backups: [
          null,
          { name: "new", created_at: "2026-10-02T06:00:00Z", backup_type: "PHYSICAL" },
          { id: "old", created_at: "2026-10-01T06:00:00Z", is_physical_backup: true },
          { id: "unknown-date", created_at: "invalid" },
        ],
      }),
  });
  expect(status.connected).toBe(true);
  expect(status.pitrEnabled).toBeNull();
  expect(status.backups.map((row) => row.id)).toEqual(["new", "old", "unknown-date"]);
  expect(status.backups[1]?.type).toBe("PHYSICAL");
  expect(status.backups[2]?.createdAt).toBeNull();
});
test.each([null, {}, "unrecognized"])(
  "rejects an unrecognized provider payload: %j",
  async (payload) => {
    const status = await readSupabaseBackupStatus({
      projectRef: "project-ref",
      accessToken: "token",
      fetchImpl: async () => Response.json(payload),
    });
    expect(status.connected).toBe(false);
    expect(status.backups).toEqual([]);
    expect(status.message).toMatch(/respuesta/i);
  },
);
test("supports an empty legacy array without claiming PITR is enabled", async () => {
  const status = await readSupabaseBackupStatus({
    projectRef: "project-ref",
    accessToken: "token",
    fetchImpl: async () => Response.json([]),
  });
  expect(status.connected).toBe(true);
  expect(status.backups).toEqual([]);
  expect(status.pitrEnabled).toBeNull();
});
test("invalid project references and temporary provider errors do not expose provider bodies", async () => {
  const fetchImpl = vi.fn(async () => new Response("private provider details", { status: 503 }));
  const invalid = await readSupabaseBackupStatus({
    projectRef: "../unexpected",
    accessToken: "token",
    fetchImpl,
  });
  expect(invalid.configured).toBe(false);
  expect(invalid.dashboardUrl).toBeNull();
  expect(fetchImpl).not.toHaveBeenCalled();
  const failed = await readSupabaseBackupStatus({
    projectRef: "project-ref",
    accessToken: "token",
    fetchImpl,
  });
  expect(failed.message).toContain("503");
  expect(JSON.stringify(failed)).not.toContain("private provider details");
});
