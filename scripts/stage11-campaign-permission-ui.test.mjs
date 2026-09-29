import fs from "node:fs";
import assert from "node:assert/strict";
const ui = fs.readFileSync("src/features/parity/modules/campaigns-module.tsx", "utf8");
assert.ok(ui.includes("useActiveTenant"), "campaign UI must read effective permissions");
assert.ok(
  ui.includes("marketing.manage"),
  "campaign mutations must be hidden/disabled without marketing.manage",
);
assert.ok(ui.includes("canManageCampaigns"), "campaign UI must have an explicit manage gate");
console.log("Stage 11 campaign permission UI contract PASS");
