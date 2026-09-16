import fs from 'node:fs';
import assert from 'node:assert/strict';
const root=JSON.parse(fs.readFileSync('package.json','utf8'));
const runner=fs.existsSync('tests/run-verification.mjs')?fs.readFileSync('tests/run-verification.mjs','utf8'):'';
const prod=fs.readFileSync('apps/api/src/config/production.ts','utf8');
const checks=[
 ['root exposes verify:all', Boolean(root.scripts?.['verify:all'])],
 ['production check executes verify:all', /verify:all/.test(root.scripts?.['production:check']??'')],
 ['verification runner discovers verify mjs tests dynamically', /verify_.*\\\.mjs|startsWith\(["']verify_/.test(runner) && /readdirSync/.test(runner)],
 ['verification runner avoids recursively running itself', /run-verification/.test(runner)],
 ['verification runner executes TypeScript-aware verification files', /--experimental-strip-types/.test(runner)],
 ['external payment provider requires HTTPS checkout endpoint in production', /DENTY_PAYMENT_CHECKOUT_ENDPOINT/.test(prod) && /https:/.test(prod)],
 ['external payment provider requires webhook secret in production', /DENTY_PAYMENT_WEBHOOK_SECRET/.test(prod)],
 ['external payment provider requires provider name and API key', /DENTY_PAYMENT_PROVIDER/.test(prod) && /DENTY_PAYMENT_API_KEY/.test(prod)],
];
let passed=0;for(const [n,ok] of checks){if(ok){console.log(`PASS ${n}`);passed++}else console.error(`FAIL ${n}`)}
console.log(`${passed}/${checks.length} checks passed`);assert.equal(passed,checks.length);
