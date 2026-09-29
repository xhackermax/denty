import fs from "node:fs";
import assert from "node:assert/strict";

const sql = fs.readFileSync(
  "supabase/migrations/20260928120000_stage12_prescriptions_voice.sql",
  "utf8",
);
const route = fs.readFileSync("src/server/denty-supabase/route-handler.ts", "utf8");

assert.match(
  sql,
  /create policy prescription_evidence_insert[\s\S]*exists\s*\(\s*select 1 from public\.prescriptions[\s\S]*status\s*=\s*'READY'/i,
  "Signature uploads must be tied to an existing READY prescription in the same clinic",
);
assert.match(
  sql,
  /create policy prescription_evidence_delete_orphan[\s\S]*for delete[\s\S]*not exists\s*\(\s*select 1 from public\.prescription_signatures/i,
  "Storage needs a narrowly-scoped orphan cleanup policy that cannot delete recorded evidence",
);
assert.match(
  route,
  /uploadPrescriptionSignature[\s\S]*try\s*\{[\s\S]*recordSignature[\s\S]*catch[\s\S]*remove\(PRESCRIPTION_EVIDENCE_BUCKET/i,
  "Route must clean an uploaded orphan if the signature RPC fails",
);
assert.match(
  sql,
  /record_prescription_signature[\s\S]*exists\s*\(\s*select 1 from storage\.objects[\s\S]*bucket_id='prescription-evidence'[\s\S]*name=p_storage_path/i,
  "Signature RPC must reject metadata that does not point to an uploaded Storage object",
);

assert.ok(
  sql.includes("SIGNER_MUST_MATCH_PRESCRIBER"),
  "Signature RPC must require the authenticated signer staff to match the configured prescriber",
);
assert.match(
  sql,
  /issue_prescription[\s\S]*signer_staff_id=v_row\.prescriber_staff_id/i,
  "Issuance must require evidence signed by the configured prescriber",
);

console.log("Stage 12 prescription evidence consistency contract PASS");
