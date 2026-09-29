import fs from "node:fs";
import assert from "node:assert/strict";
const sql = fs.readFileSync(
  "supabase/migrations/20260928101000_stage10_alerts_connected.sql",
  "utf8",
);
assert.match(
  sql,
  /condition_active boolean not null default true/i,
  "derived alert rows must track whether the source condition is currently active",
);
assert.match(
  sql,
  /condition_active=false/i,
  "clearing a derived condition must arm the row for a future recurrence",
);
assert.match(
  sql,
  /public\.alerts\.condition_active=false[\s\S]{0,180}'OPEN'/i,
  "a recurrence after a real clear must reopen the alert",
);
assert.match(
  sql,
  /condition_active=true/i,
  "an active recurrence must mark the source condition active again",
);
console.log("stage10 alerts recurrence contract: PASS");
