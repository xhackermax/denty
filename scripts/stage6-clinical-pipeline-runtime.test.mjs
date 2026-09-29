import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = fs.readFileSync(
  new URL("../src/domain/clinical-pipeline.ts", import.meta.url),
  "utf8",
);
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const commonJsModule = { exports: {} };
const context = vm.createContext({ module: commonJsModule, exports: commonJsModule.exports });
new vm.Script(js, { filename: "clinical-pipeline.js" }).runInContext(context);
const { clinicalPipelineState } = commonJsModule.exports;

const signedOutdated = clinicalPipelineState({
  odontogramVersion: 5,
  plan: { version: 7, sourceOdontogramVersion: 5 },
  budget: { id: "budget-signed", status: "SIGNED", sourcePlanVersion: 6 },
});
assert.equal(signedOutdated.budgetOutdated, true);
assert.equal(
  signedOutdated.budgetRevisionRequired,
  true,
  "A signed budget must be immutable: a changed plan requires a new budget revision",
);

const signedCurrent = clinicalPipelineState({
  odontogramVersion: 5,
  plan: { version: 7, sourceOdontogramVersion: 5 },
  budget: { id: "budget-signed", status: "SIGNED", sourcePlanVersion: 7 },
});
assert.equal(signedCurrent.budgetOutdated, false);
assert.equal(signedCurrent.budgetRevisionRequired, false);

console.log("Stage 6 clinical pipeline runtime contract OK");
