import fs from "node:fs";
import assert from "node:assert/strict";
const routes = fs.readFileSync("src/app/api/denty/[...path]/payment-routes.ts", "utf8");
for (const t of [
  "createOrGetPaymentAttempt",
  "markPaymentAttempt",
  "postSucceededPayment",
  "idempotencyKey",
  "ledgerPaymentId",
])
  assert.ok(routes.includes(t), `payment route missing ${t}`);
assert.match(routes, /\w+\.ledgerPaymentId/);
assert.match(routes, /providerStatus\s*===\s*["']succeeded["']/);
const schema = fs.readFileSync("src/shared/api/contracts.ts", "utf8");
assert.ok(schema.includes("idempotencyKey"));
assert.ok(schema.includes("invoiceId"));
for (const [f, msg] of [
  ["src/app/api/denty/payments/manual/route.ts", "manual"],
  ["src/app/api/denty/payments/stripe/terminal/route.ts", "stripe"],
])
  assert.ok(
    fs.readFileSync(f, "utf8").includes("maybeHandlePaymentProviderRequest"),
    `${msg} static route must delegate`,
  );
assert.ok(
  fs
    .readFileSync("src/app/api/denty/card-terminal/checkout/route.ts", "utf8")
    .includes("LEGACY_TERMINAL_CHECKOUT_RETIRED"),
);
console.log("stage8-payment-provider-ledger-contract: PASS");
