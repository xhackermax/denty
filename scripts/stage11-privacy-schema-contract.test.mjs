import fs from "node:fs";
import assert from "node:assert/strict";
const schema = fs.readFileSync("src/shared/api/schemas/security.ts", "utf8");
assert.ok(schema.includes("dueAt:"), "privacy response schema must type its SLA due date");
assert.ok(
  schema.includes("resolutionDocumentId"),
  "privacy lifecycle must support attaching evidence/export document",
);
const repo = fs.readFileSync("src/server/denty-supabase/staff-privacy-repository.ts", "utf8");
assert.ok(
  repo.includes("resolutionDocumentId"),
  "privacy repository must pass resolution document to the transition RPC",
);
console.log("Stage 11 privacy evidence contract PASS");
