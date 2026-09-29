import assert from "node:assert/strict";
import { readSupabaseBackupStatus } from "../src/server/security/backup-status.ts";

const missing = await readSupabaseBackupStatus({});
assert.equal(missing.provider, "SUPABASE_MANAGED");
assert.equal(missing.configured, false);
assert.equal(missing.backups.length, 0);

const calls = [];
const configured = await readSupabaseBackupStatus({
  projectRef: "project-ref",
  accessToken: "management-token",
  fetchImpl: async (url, init) => {
    calls.push({
      url: String(url),
      authorization: new Headers(init?.headers).get("authorization"),
    });
    return Response.json({
      pitr_enabled: true,
      physical_backups: [
        {
          id: "backup-1",
          created_at: "2026-09-28T06:00:00Z",
          status: "COMPLETED",
          type: "PHYSICAL",
        },
      ],
    });
  },
});
assert.equal(configured.configured, true);
assert.equal(configured.pitrEnabled, true);
assert.equal(configured.backups[0]?.id, "backup-1");
assert.equal(configured.backups[0]?.type, "PHYSICAL");
assert.equal(calls[0]?.authorization, "Bearer management-token");
assert.match(calls[0]?.url ?? "", /projects\/project-ref\/database\/backups$/);

console.log("stage5-backup-status-runtime: ok");
