import fs from "node:fs";
import assert from "node:assert/strict";

const flow = fs.readFileSync("src/features/budgets/budget-signature-flow.tsx", "utf8");
const pipeline = fs.readFileSync("src/shared/clinical/clinical-pipeline-card.tsx", "utf8");
const progress = fs.readFileSync("src/domain/clinical-pipeline-progress.ts", "utf8");

const financeModule = fs.readFileSync("src/features/parity/modules/finance-module.tsx", "utf8");
assert.doesNotMatch(financeModule, /recordNumber:\s*patient\.recordNumber,/);
assert.doesNotMatch(financeModule, /dni:\s*patient\.dni,/);
assert.match(financeModule, /recordNumber:\s*patient\.recordNumber \?\? null,/);
assert.match(financeModule, /dni:\s*patient\.dni \?\? null,/);

assert.match(flow, /Firmar y generar PDF/);
assert.match(flow, /api\.documents\.create/);
assert.match(flow, /api\.documents\.finalize/);
assert.match(flow, /api\.documents\.sign/);
assert.match(flow, /api\.documents\.download/);
assert.match(flow, /respondToBudget/);
assert.match(flow, /SignaturePad/);
assert.match(pipeline, /key: "signature", label: "Firma"/);
assert.match(pipeline, /formatEUR\(sync\.budget\?\.totalCents/);
assert.match(progress, /completed\.add\("signature"\)/);
assert.match(progress, /completed\.has\("signature"\)/);
assert.match(progress, /action=sign/);
console.log("Budget signature flow regression OK");
