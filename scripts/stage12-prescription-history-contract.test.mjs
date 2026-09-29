import fs from "node:fs";
import assert from "node:assert/strict";

const repo = fs.readFileSync("src/server/denty-supabase/prescription-repository.ts", "utf8");
assert.ok(
  repo.includes("async history("),
  "Prescription repository must expose immutable version history",
);
assert.ok(
  repo.includes('"prescription_versions"'),
  "Prescription history must come from persisted prescription_versions",
);
assert.ok(
  repo.includes('"prescription_signatures"'),
  "Prescription history must include persisted signature evidence metadata",
);

const schemas = fs.readFileSync("src/shared/api/schemas/prescriptions.ts", "utf8");
assert.ok(
  schemas.includes("prescriptionHistorySchema"),
  "Prescription history response schema missing",
);
const resources = fs.readFileSync("src/shared/api/resources/prescriptions.ts", "utf8");
assert.ok(resources.includes("history:"), "Prescription API resource must expose history");
assert.ok(resources.includes("/history`"), "Prescription history must use canonical API route");

const route = fs.readFileSync("src/server/denty-supabase/route-handler.ts", "utf8");
assert.ok(route.includes('parts[3] === "history"'), "Prescription history route missing");
assert.ok(
  route.includes('"prescription.audit.read"'),
  "History route must require audit permission",
);

const data = fs.readFileSync("src/features/parity/modules/prescriptions-data.ts", "utf8");
assert.ok(
  data.includes("useCancelPrescriptionMutation"),
  "Cancellation mutation must remain available",
);
assert.ok(data.includes("usePrescriptionHistoryQuery"), "Prescription history query missing");
const ui = fs.readFileSync("src/features/parity/modules/prescriptions-module.tsx", "utf8");
assert.ok(ui.includes("Cancelar receta"), "Prescription UI must expose cancellation");
assert.ok(ui.includes("Historial"), "Prescription UI must expose history");

console.log("Stage 12 prescription history contract PASS");
