import fs from "node:fs";
import assert from "node:assert/strict";

const attendance = fs.readFileSync("src/features/parity/modules/attendance-module.tsx", "utf8");
assert.ok(
  attendance.includes("getBrowserApi().attendance.punch()"),
  "Attendance UI must call persistent punch endpoint",
);
const campaigns = fs.readFileSync("src/features/parity/modules/campaigns-module.tsx", "utf8");
assert.ok(campaigns.includes("createCampaign"), "Campaign UI must create persistent campaigns");
assert.ok(
  campaigns.includes("attributedPatients") && campaigns.includes("collectedCents"),
  "Campaign UI must surface persisted attribution/revenue metrics",
);
const comms = fs.readFileSync("src/features/parity/modules/communications-module.tsx", "utf8");
assert.ok(
  comms.includes("communications.create"),
  "Communications UI must queue persistent message",
);
assert.ok(comms.includes("setConsent"), "Communications UI must persist consent/opt-out");
const settings = fs.readFileSync("src/features/parity/modules/settings-module.tsx", "utf8");
assert.ok(
  settings.includes("security.privacy.create"),
  "Settings must create persistent privacy requests",
);
assert.ok(
  settings.includes("security.privacy.update"),
  "Settings must transition privacy requests",
);
const patients = fs.readFileSync("src/features/patients/patients-page.tsx", "utf8");
assert.ok(
  patients.includes("declaredSource"),
  "Patient admission must capture declared acquisition source",
);
const realtime = fs.readFileSync("src/shared/query/realtime-bridge.tsx", "utf8");
for (const table of [
  "attendance_punches",
  "privacy_requests",
  "marketing_campaigns",
  "patient_attribution",
  "communication_messages",
  "communication_consents",
  "communication_outbox",
  "tasks",
])
  assert.ok(realtime.includes(`${table}:`), `Realtime invalidation missing ${table}`);
console.log("Stage 11 UI/Realtime contract PASS");
