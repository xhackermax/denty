import assert from "node:assert/strict";
import fs from "node:fs";

// Stage 13 — gate final de integración. Guards the fixes found while rebuilding the
// database from zero and wiring the consent → budget signature pipeline end to end.
const read = (path) => fs.readFileSync(path, "utf8");

const migrationPath = "supabase/migrations/20260929130000_stage13_integration_gate.sql";
assert.ok(fs.existsSync(migrationPath), "Stage 13 migration is required");
const sql = read(migrationPath);
assert.match(sql, /create or replace function private\.seed_clinic_defaults/);
assert.match(sql, /create trigger clinics_seed_defaults\s+after insert on public\.clinics/);
assert.match(sql, /select private\.seed_clinic_defaults\(c\.id\) from public\.clinics c/);
assert.match(sql, /create or replace function public\.sign_clinical_document/);
assert.match(sql, /private\.is_clinic_staff\(v_doc\.clinic_id\)/);
assert.match(sql, /SIGNATURE_OBJECT_MISSING/);
assert.match(sql, /revoke all on function public\.sign_clinical_document[^;]*from public, anon/);
assert.match(sql, /denty clinic members receive broadcasts/);
assert.match(sql, /drop function if exists public\.is_clinic_staff\(uuid\)/);
assert.match(sql, /_fkx/);

// Fresh-install ordering fixes.
const payments113 = read("supabase/migrations/20260927113000_payment_methods_and_terminals.sql");
assert.doesNotMatch(payments113, /^alter table public\.payment_attempts/m);
const payments210 = read("supabase/migrations/20260927210000_payment_providers.sql");
assert.match(
  payments210,
  /alter table public\.payment_attempts add column if not exists terminal_id/,
);
const p1 = read("supabase/migrations/20260927143000_roadmap_p1_clinical_operations.sql");
assert.ok(
  p1.indexOf("create or replace function public.is_clinic_staff") <
    p1.indexOf("public.is_clinic_staff(clinic_id)"),
  "P1 helpers must exist before the policies that use them",
);
const stage5 = read("supabase/migrations/20260928050000_stage5_storage_documents_backups.sql");
assert.ok(
  stage5.indexOf("add column if not exists photo_storage_path") <
    stage5.indexOf("p.photo_storage_path = name"),
  "photo_storage_path must exist before the Storage policy that reads it",
);
const stage9 = read("supabase/migrations/20260928090000_stage9_canonical_analytics.sql");
assert.doesNotMatch(stage9, /'\) month,/, "reserved-word alias must use AS");

// Canonical document signature: multipart client → route → repository → RPC.
const resource = read("src/shared/api/resources/core.ts");
assert.match(resource, /\/api\/documents\/\$\{encodeId\(id\)\}\/sign/);
assert.match(resource, /client\.upload\(/);
const route = read("src/server/denty-supabase/route-handler.ts");
assert.match(route, /requireActorPermission\(identity, "documents\.sign"\)/);
assert.match(route, /signDocumentMetadataSchema\.parse/);
const repo = read("src/server/documents/document-repository.ts");
assert.match(repo, /rpc<DocumentRow>\("sign_clinical_document"/);
assert.match(repo, /storage\.remove\(CLINICAL_DOCUMENTS_BUCKET, stored\.path\)/);

// Budget signature is reachable from the UI.
const syncCard = read("src/shared/clinical/clinical-sync-card.tsx");
assert.match(syncCard, /useSignBudgetMutation/);
assert.match(syncCard, /pendingConsentCount > 0/);

// No hardcoded login alias may come back.
const authClient = read("src/server/supabase/auth-client.ts");
assert.doesNotMatch(authClient, /denty\.local/);
assert.doesNotMatch(authClient, /=== "admin"/);

// Render-loop guard: array props must not be defaulted to fresh literals in effects.
for (const file of [
  "src/features/odontogram/pediatric-panel.tsx",
]) {
  const source = read(file);
  assert.doesNotMatch(
    source,
    /^\s+(initialEntities|readings) = \[\],$/m,
    `${file}: unstable default`,
  );
}

// Deno edge functions are type-checked by Supabase, not by the Next.js tsconfig.
const tsconfig = read("tsconfig.json");
assert.match(tsconfig, /"supabase\/functions"/);

console.log("Stage 13 integration gate: OK");
