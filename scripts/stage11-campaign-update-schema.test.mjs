import fs from "node:fs";
import assert from "node:assert/strict";
const schema = fs.readFileSync("src/shared/api/schemas/engagement.ts", "utf8");
const route = fs.readFileSync("src/server/denty-supabase/route-handler.ts", "utf8");
assert.ok(
  schema.includes("updateMarketingCampaignSchema"),
  "campaign PATCH must have a typed schema",
);
assert.ok(
  route.includes("parseJson(request, updateMarketingCampaignSchema)"),
  "campaign generic PATCH must validate payload before repository",
);
assert.ok(
  !route.includes("await request.json() as Record<string,unknown>"),
  "campaign PATCH must not bypass validation",
);
console.log("Stage 11 campaign update schema contract PASS");
