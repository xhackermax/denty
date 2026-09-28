import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const moduleSource = readFileSync("src/features/parity/modules/documents-module.tsx", "utf8");
const flowSource = readFileSync("src/features/parity/modules/documents-create-flow.ts", "utf8");

assert.match(moduleSource, /createDocumentRow\(/);
assert.match(moduleSource, /postCreateAction\(document\)/);
assert.match(moduleSource, /openSigning\(document\)/);
assert.match(moduleSource, /openDocumentPreview\(document\)/);
assert.doesNotMatch(moduleSource, /setDocuments[\s\S]{0,240}documents\.find/, "Post-create opening must not read stale React state");
assert.match(flowSource, /kind: "sign"/);
assert.match(flowSource, /kind: "preview"/);

console.log("documents auto-open regression: OK");
