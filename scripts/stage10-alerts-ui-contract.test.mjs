import fs from "node:fs";
import assert from "node:assert/strict";

const ui = fs.readFileSync("src/features/parity/modules/alerts-module.tsx", "utf8");
const bridge = fs.readFileSync("src/shared/query/realtime-bridge.tsx", "utf8");

assert.match(
  ui,
  /engagement\.alerts\.snooze/,
  "alerts UI must expose snooze through canonical API",
);
assert.match(
  ui,
  /engagement\.alerts\.assign/,
  "alerts UI must expose assignment through canonical API",
);
assert.match(ui, /admin\.users\.list\(\)/, "assignment UI must use canonical clinic users");
assert.match(
  bridge,
  /appointments:[^\n]*dentyQueryKeys\.alerts\.root/,
  "appointment changes must invalidate derived alerts",
);
assert.match(
  bridge,
  /lab_works:[^\n]*dentyQueryKeys\.alerts\.root/,
  "lab work changes must invalidate derived alerts",
);

console.log("stage10 alerts UI contract: PASS");
