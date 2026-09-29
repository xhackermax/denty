import fs from "node:fs";
import assert from "node:assert/strict";
const contracts = fs.readFileSync("src/shared/api/contracts.ts", "utf8");
const repo = fs.readFileSync("src/server/denty-supabase/laboratory-repository.ts", "utf8");
const ui = fs.readFileSync("src/features/parity/modules/laboratory-module.tsx", "utf8");
assert.ok(
  contracts.includes("statusEvents:"),
  "lab work contract must expose persisted status timeline",
);
assert.ok(contracts.includes("reworks:"), "lab work contract must expose persisted reworks");
assert.ok(repo.includes('"lab_work_status_events"'), "repository must load status events");
assert.ok(repo.includes('"lab_reworks"'), "repository must load reworks");
assert.ok(ui.includes("work.statusEvents"), "UI must render persisted lab timeline");
assert.ok(ui.includes("work.reworks"), "UI must render persisted rework history");
console.log("stage10 laboratory timeline contract: PASS");
