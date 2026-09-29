import fs from "node:fs";
import assert from "node:assert/strict";
const analytics = fs.readFileSync("src/shared/api/resources/analytics.ts", "utf8");
const labData = fs.readFileSync("src/features/parity/modules/laboratory-data.ts", "utf8");
assert.ok(
  !analytics.includes("recordSupplierInvoice:"),
  "supplier invoice write must live under canonical laboratory resource",
);
assert.ok(
  !analytics.includes("createSupplierInvoiceSchema"),
  "analytics resource must not keep legacy supplier invoice mutation schema",
);
assert.ok(
  !labData.includes("analytics.suppliers"),
  "laboratory master must not be inferred from analytics suppliers",
);
console.log("stage10 no legacy supplier contract: PASS");
