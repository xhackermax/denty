import fs from "node:fs";
import assert from "node:assert/strict";

const sql = fs.readFileSync(
  "supabase/migrations/20260928120000_stage12_prescriptions_voice.sql",
  "utf8",
);
assert.match(
  sql,
  /record_prescription_signature[\s\S]*set status='SIGNING'/i,
  "Signing must move READY prescription to SIGNING",
);
assert.match(
  sql,
  /issue_prescription[\s\S]*status<>'SIGNING'/i,
  "Issue must require signed SIGNING state",
);

const data = fs.readFileSync("src/features/parity/modules/prescriptions-data.ts", "utf8");
assert.ok(data.includes("useUpdatePrescriptionMutation"), "Prescription update mutation missing");
assert.ok(data.includes("useSignPrescriptionMutation"), "Prescription sign mutation missing");
assert.ok(
  data.includes(".prescriptions.sign("),
  "Signature mutation must call canonical prescription API",
);

const ui = fs.readFileSync("src/features/parity/modules/prescriptions-module.tsx", "utf8");
for (const token of [
  "SignaturePad",
  "Principio activo",
  "Dosis",
  "Frecuencia",
  "Duración",
  "Firmar receta",
]) {
  assert.ok(ui.includes(token), `Prescription editor missing ${token}`);
}
assert.match(
  ui,
  /prescription\.status === "SIGNING"[\s\S]{0,500}issue\.mutate/i,
  "Issue action must only be exposed after signature",
);

console.log("Stage 12 prescription UI contract PASS");
