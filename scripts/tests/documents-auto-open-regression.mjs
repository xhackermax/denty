import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Stage 13: creating a consent document must open the signature dialog right away,
// and signing must go through the canonical multipart /api/documents/:id/sign route.
const moduleSource = readFileSync("src/features/parity/modules/documents-module.tsx", "utf8");
const resource = readFileSync("src/shared/api/resources/core.ts", "utf8");
const route = readFileSync("src/server/denty-supabase/route-handler.ts", "utf8");

assert.match(moduleSource, /export function postCreateAction\(/);
assert.match(moduleSource, /postCreateAction\(document\) === "sign"\) openSigning\(document\)/);
assert.match(moduleSource, /<SignaturePad/);
assert.match(moduleSource, /workflow"\) === "consents"/);
assert.match(resource, /`\/api\/documents\/\$\{encodeId\(id\)\}\/sign`/);
assert.match(resource, /new FormData\(\)/);
assert.match(route, /parts\[1\] === "documents" &&\s*parts\[3\] === "sign"/);
assert.match(route, /documents\.sign/);

console.log("documents auto-open + signature regression: OK");
