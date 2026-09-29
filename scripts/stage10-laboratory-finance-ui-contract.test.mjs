import fs from "node:fs";
import assert from "node:assert/strict";

const ui = fs.readFileSync("src/features/parity/modules/laboratory-module.tsx", "utf8");
assert.ok(ui.includes("useActiveTenant"), "laboratory UI must read tenant permissions");
assert.ok(
  ui.includes('permissions.includes("finance.read")'),
  "laboratory UI must gate supplier finance visibility",
);
assert.ok(
  ui.includes('permissions.includes("finance.write")'),
  "laboratory UI must gate supplier finance mutations",
);
assert.ok(
  ui.includes("{canWriteFinance ? ("),
  "supplier invoice/payment forms must be hidden without finance.write",
);
assert.ok(
  ui.includes("useLaboratoryBalancesQuery(canReadFinance)"),
  "balances query must not run without finance.read",
);
assert.ok(
  ui.includes("useSupplierInvoicesQuery(canReadFinance)"),
  "supplier invoice query must not run without finance.read",
);
assert.ok(
  ui.includes("{canReadFinance ? ("),
  "supplier finance sections must be hidden without finance.read",
);
console.log("stage10 laboratory finance UI contract: PASS");
