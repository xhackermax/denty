import fs from "node:fs";
import assert from "node:assert/strict";
const ui = fs.readFileSync("src/features/parity/modules/laboratory-module.tsx", "utf8");
assert.ok(
  ui.includes("useLabReworkMutation"),
  "laboratory UI must expose persisted rework mutation",
);
assert.ok(ui.includes("Registrar repetición"), "laboratory UI must let staff register a rework");
assert.ok(ui.includes("rework.mutate"), "rework action must call server mutation");
console.log("stage10 laboratory rework UI contract: PASS");
