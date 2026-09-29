import assert from "node:assert/strict";
import fs from "node:fs";
const routes = fs.readFileSync("src/app/api/denty/[...path]/payment-routes.ts", "utf8");
assert.doesNotMatch(routes, /body\.connectedAccountId/);
assert.doesNotMatch(routes, /searchParams\.get\("connectedAccountId"\)/);
assert.match(routes, /STRIPE_CONNECTED_ACCOUNT_ID/);
const sum = fs.readFileSync("src/app/api/denty/card-terminal/_sumup.ts", "utf8");
assert.doesNotMatch(sum, /NEXT_PUBLIC_(STRIPE|SUMUP)/);
console.log("provider adapters contract: OK");
