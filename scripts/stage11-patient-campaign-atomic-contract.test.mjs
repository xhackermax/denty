import fs from "node:fs";
import assert from "node:assert/strict";
const sql = fs
  .readFileSync("supabase/migrations/20260928111000_stage11_engagement_outbox.sql", "utf8")
  .toLowerCase();
assert.ok(
  sql.includes("declared_campaign_id"),
  "patients must persist selected campaign in the same patient write",
);
assert.match(
  sql,
  /patients_stage11_declared_attribution[\s\S]{0,300}declared_campaign_id/i,
  "declared attribution trigger must react to campaign changes",
);
const contracts = fs.readFileSync("src/shared/api/contracts.ts", "utf8");
assert.ok(
  contracts.includes("declaredCampaignId"),
  "create-patient contract must carry declared campaign",
);
const repo = fs.readFileSync("src/server/denty-supabase/patient-repository.ts", "utf8");
assert.ok(
  repo.includes("declared_campaign_id: payload.declaredCampaignId"),
  "patient insert must write campaign atomically",
);
const ui = fs.readFileSync("src/features/patients/patients-page.tsx", "utf8");
assert.ok(
  ui.includes("declaredCampaignId: admissionCampaignId"),
  "admission UI must include selected campaign in create payload",
);
assert.ok(
  !ui.includes("engagement.marketing.attributePatient(created.id"),
  "admission must not depend on a second attribution request",
);
console.log("Stage 11 atomic patient campaign attribution contract PASS");
