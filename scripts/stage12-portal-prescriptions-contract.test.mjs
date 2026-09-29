import fs from "node:fs";
import assert from "node:assert/strict";

const portal = fs.readFileSync("src/features/portal/patient-portal.tsx", "utf8");
assert.ok(
  portal.includes("data.prescriptions"),
  "Patient portal must render real prescriptions from its projection",
);
assert.ok(
  portal.includes("prescriptions.pdf"),
  "Patient portal must download prescription PDF through canonical API",
);
assert.ok(portal.includes("Recetas"), "Patient portal must expose a prescriptions section");

const sql = fs.readFileSync(
  "supabase/migrations/20260928120000_stage12_prescriptions_voice.sql",
  "utf8",
);
assert.match(
  sql,
  /prescriptions_read[\s\S]*is_patient_owner\(patient_id\)[\s\S]*status\s+in\s*\('ISSUED'/i,
  "Patient RLS must hide prescription drafts and unsigned states",
);

const repo = fs.readFileSync("src/server/denty-supabase/patient-repository.ts", "utf8");
assert.match(
  repo,
  /select<PrescriptionProjectionRow>\("prescriptions"/,
  "Patient projection must query prescription rows",
);
assert.match(
  repo,
  /patient_id:\s*`eq\.\$\{patientId\}`/,
  "Patient projection prescription query must be patient scoped",
);

console.log("Stage 12 portal prescriptions contract PASS");
