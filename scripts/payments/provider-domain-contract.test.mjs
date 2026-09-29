import assert from "node:assert/strict";
const m = await import("../../src/domain/money.ts");
assert.equal(m.normalizePaymentStatus("COMPLETED"), "succeeded");
assert.equal(m.normalizePaymentStatus("PENDING"), "processing");
assert.equal(m.canTransitionPayment("created", "processing"), true);
assert.equal(m.canTransitionPayment("processing", "succeeded"), true);
assert.equal(m.canTransitionPayment("succeeded", "processing"), false);
assert.throws(() => m.assertPaymentTransition("succeeded", "processing"));
console.log("provider domain contract: OK");
