import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const config = readFileSync(resolve("next.config.ts"), "utf8");
const worksheet = readFileSync(resolve("public/cephalometry-lateral.html"), "utf8");
const embed = readFileSync(resolve("src/features/odontogram/cephalometry-editor.tsx"), "utf8");

assert.match(worksheet, /<svg id="ceph"/);
assert.match(worksheet, /denty:ceph:ready/);
assert.match(worksheet, /denty:ceph:hydrate/);
assert.match(embed, /src="\/cephalometry-lateral\.html"/);
assert.match(config, /source: "\/cephalometry-lateral\.html"/);
assert.match(config, /CEPHALOMETRY_CONTENT_SECURITY_POLICY/);
assert.match(config, /"frame-ancestors 'self'"/);
assert.match(config, /"X-Frame-Options", value: "SAMEORIGIN"/);
assert.match(config, /"X-Frame-Options", value: "DENY"/);
console.log("PASS: the worksheet exists, is embedded correctly and has a same-origin-only frame policy.");
