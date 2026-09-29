import assert from "node:assert/strict";
import fs from "node:fs";
const router = fs.readFileSync("src/app/api/denty/[...path]/route.ts", "utf8");
const routes = fs.readFileSync("src/app/api/denty/[...path]/payment-routes.ts", "utf8");
assert.ok(router.includes("maybeHandlePaymentProviderRequest"));
for (const t of ["/payments/manual", "/payments/sumup/checkout", "/payments/stripe/terminal"])
  assert.ok(routes.includes(t), `${t} route missing`);
assert.match(routes, /requireFinanceSession\(request\)/);
assert.match(routes, /body\.clinicId|b\.clinicId/);
assert.doesNotMatch(routes, /body\.connectedAccountId/);
console.log("provider route security: OK");
