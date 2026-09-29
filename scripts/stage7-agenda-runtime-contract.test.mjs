import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoPath = path.join(root, "src/server/denty-supabase/agenda-repository.ts");
assert.ok(fs.existsSync(repoPath), "AgendaRepository must exist");
const repo = fs.readFileSync(repoPath, "utf8");
const routes = fs.readFileSync(
  path.join(root, "src/server/denty-supabase/route-handler.ts"),
  "utf8",
);
const contracts = fs.readFileSync(path.join(root, "src/shared/api/contracts.ts"), "utf8");
const schemas = fs.readFileSync(path.join(root, "src/shared/api/schemas/agenda.ts"), "utf8");
const resources = fs.readFileSync(path.join(root, "src/shared/api/resources/agenda.ts"), "utf8");
for (const pattern of [
  /async listAppointments\(/,
  /async createAppointment\(/,
  /async updateAppointment\(/,
  /async transitionAppointment\(/,
  /async getContext\(/,
  /async availability\(/,
  /async createBlock\(/,
  /async listWaitlist\(/,
  /async createWaitlist\(/,
  /async getSettings\(/,
  /async setSettings\(/,
  /async createAbsence\(/,
  /async cancelAbsence\(/,
  /async waitTimeMetrics\(/,
  /async listAppointmentRequests\(/,
  /async createAppointmentRequest\(/,
  /async cancelAppointmentRequest\(/,
  /async scheduleAppointmentRequest\(/,
])
  assert.match(repo, pattern, `AgendaRepository missing ${pattern}`);
for (const pattern of [
  /locallyHandled[\s\S]*?"users"[\s\S]*?"patients"[\s\S]*?"appointments"[\s\S]*?"agenda"[\s\S]*?"attendance"[\s\S]*?"analytics"/,
  /parts\[1\]\s*===\s*["']appointments["'][\s\S]*?method\s*===\s*["']GET["']/,
  /parts\[1\]\s*===\s*["']appointments["'][\s\S]*?method\s*===\s*["']POST["']/,
  /arrive:\s*["']ARRIVED["']/,
  /waiting:\s*["']WAITING["']/,
  /["']no-show["']:\s*["']NO_SHOW["']/,
  /parts\[1\]\s*===\s*["']agenda["'][\s\S]*?parts\[2\]\s*===\s*["']context["']/,
  /parts\[2\]\s*===\s*["']availability["']/,
  /parts\[2\]\s*===\s*["']waitlist["']/,
  /parts\[2\]\s*===\s*["']settings["']/,
  /parts\[1\]\s*===\s*["']attendance["'][\s\S]*?parts\[2\]\s*===\s*["']absences["']/,
  /parts\[1\]\s*===\s*["']analytics["'][\s\S]*?parts\[2\]\s*===\s*["']wait-times["']/,
  /parts\[2\]\s*===\s*["']appointment-requests["']/,
  /parts\[1\]\s*===\s*["']patient["'][\s\S]*?parts\[3\]\s*===\s*["']appointment-requests["']/,
])
  assert.match(routes, pattern, `Route handler missing ${pattern}`);
assert.match(contracts, /"WAITING"/);
assert.match(contracts, /"RUNNING_LATE"/);
const createAppointmentBlock =
  contracts.match(/export const createAppointmentSchema = z\.object\(\{([\s\S]*?)\n\}\);/)?.[1] ??
  "";
assert.match(
  createAppointmentBlock,
  /rescheduledFromId:/,
  "CreateAppointment input must support a no-show reschedule source",
);
assert.match(
  repo,
  /p_rescheduled_from_id:/,
  "AgendaRepository must pass reschedule source into booking RPC",
);
assert.match(
  repo,
  /rpc(?:<[^\n]+>)?\("create_agenda_block"/,
  "Agenda blocks must use the transactional RPC",
);
assert.match(
  repo,
  /rpc(?:<[^\n]+>)?\("withdraw_waitlist_request"/,
  "Waitlist withdrawal must use the controlled RPC",
);
assert.match(
  repo,
  /rpc(?:<[^\n]+>)?\("fulfill_waitlist_request"/,
  "Waitlist fulfillment must use the controlled RPC",
);
assert.match(schemas, /agendaSettingsSchema/);
assert.match(schemas, /waitTimeMetricsSchema/);
assert.match(resources, /settings:\s*\{/);
assert.match(resources, /waitTimeMetrics/);
console.log("Stage 7 agenda runtime/API contract: OK");
