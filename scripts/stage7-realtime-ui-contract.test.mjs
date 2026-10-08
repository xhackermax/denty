import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const realtime = read("src/shared/query/realtime-bridge.tsx");
const data = read("src/features/agenda/agenda-data.ts");
const page = read("src/features/agenda/agenda-page.tsx");
const core = read("src/shared/api/resources/core.ts");
const domain = read("src/domain/agenda/index.ts");
for (const table of [
  "appointment_status_events",
  "staff_absences",
  "patient_waitlist_requests",
  "appointment_requests",
  "clinic_settings",
  "staff_settings",
]) {
  assert.match(realtime, new RegExp(`${table}:`), `Realtime invalidation missing ${table}`);
}
assert.match(
  page,
  /statuses:\s*\["ARRIVED",\s*"WAITING"\]/,
  "Reception pipeline must keep legacy WAITING rows grouped with arrived patients",
);
assert.match(
  page,
  /status\s*===\s*"ARRIVED"\s*\|\|\s*status\s*===\s*"WAITING"\)\s*return\s*"IN_CHAIR"/,
  "Arrived and legacy waiting patients must advance directly to chair",
);
assert.match(
  page,
  /contextQuery\.data\?\.settings\?\.defaultPlanVisitGapDays/,
  "Visit gap must hydrate from persisted settings",
);
assert.match(domain, /"WAITING"/, "Domain agenda status must include WAITING");
assert.match(domain, /"RUNNING_LATE"/, "Domain agenda status must include RUNNING_LATE");
console.log("Stage 7 realtime/reception UI contract: OK");
