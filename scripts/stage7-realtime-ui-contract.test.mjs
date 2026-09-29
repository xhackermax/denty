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
assert.match(core, /waiting:\s*\(id:/, "Browser API must expose waiting transition");
assert.match(data, /waiting:\s*useMutation/, "Agenda data must expose waiting mutation");
assert.match(
  page,
  /statuses:\s*\["ARRIVED",\s*"WAITING"\]/,
  "Reception pipeline must include explicit WAITING state",
);
assert.match(
  page,
  /status\s*===\s*"ARRIVED"\)\s*return\s*"WAITING"/,
  "ARRIVED must advance to WAITING",
);
assert.match(
  page,
  /status\s*===\s*"WAITING"\)\s*return\s*"IN_CHAIR"/,
  "WAITING must advance to chair",
);
assert.match(
  page,
  /contextQuery\.data\?\.settings\?\.defaultPlanVisitGapDays/,
  "Visit gap must hydrate from persisted settings",
);
assert.match(domain, /"WAITING"/, "Domain agenda status must include WAITING");
assert.match(domain, /"RUNNING_LATE"/, "Domain agenda status must include RUNNING_LATE");
console.log("Stage 7 realtime/reception UI contract: OK");
