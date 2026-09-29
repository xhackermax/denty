import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const repo = read("src/server/denty-supabase/agenda-repository.ts");
const routes = read("src/server/denty-supabase/route-handler.ts");
const core = read("src/shared/api/resources/core.ts");
const agenda = read("src/shared/api/resources/agenda.ts");
const settings = read("src/features/parity/modules/settings-module.tsx");
const attendance = read("src/features/parity/modules/attendance-module.tsx");
const portal = read("src/features/portal/patient-portal.tsx");
const page = read("src/features/agenda/agenda-page.tsx");
const analysis = read("src/features/parity/modules/analysis-module.tsx");
for (const pattern of [
  /async listAbsences\(/,
  /async withdrawWaitlist\(/,
  /async fulfillWaitlist\(/,
])
  assert.match(repo, pattern);
assert.match(
  routes,
  /parts\[1\]\s*===\s*"attendance"[\s\S]*parts\[2\]\s*===\s*"absences"[\s\S]*method\s*===\s*"GET"/,
);
assert.match(routes, /parts\[2\]\s*===\s*"waitlist"[\s\S]*method\s*===\s*"DELETE"/);
assert.match(routes, /parts\[4\]\s*===\s*"fulfill"/);
assert.match(core, /listAbsences:/);
assert.match(agenda, /withdraw:/);
assert.match(agenda, /fulfill:/);
assert.match(settings, /agenda\.settings\.get/);
assert.match(settings, /agenda\.settings\.update/);
assert.match(settings, /Separación entre visitas/);
assert.match(attendance, /attendance\.listAbsences/);
assert.match(attendance, /attendance\.createAbsence/);
assert.match(portal, /agenda\.waitlist\.list/);
assert.match(portal, /agenda\.waitlist\.create/);
assert.match(portal, /agenda\.waitlist\.withdraw/);
assert.match(
  page,
  /rescheduledFromId:\s*source\.id/,
  "No-show rebooking must preserve source appointment",
);
assert.match(page, /Reagendar/, "No-show must expose a rebooking action");
assert.match(analysis, /agenda\.waitTimeMetrics/, "Analysis must use canonical wait-time RPC");
assert.match(analysis, /Espera media/);
assert.match(analysis, /Tiempo en sillón/);
console.log("Stage 7 operational workflows/UI contract: OK");
