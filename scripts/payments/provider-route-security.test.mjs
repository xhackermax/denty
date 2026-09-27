import assert from 'node:assert/strict'; import fs from 'node:fs';
const routes=fs.readFileSync('src/app/api/denty/[...path]/route.ts','utf8');
for(const token of ['/payments/manual','/payments/sumup/checkout','/payments/stripe/terminal']) assert.ok(routes.includes(token), `${token} route missing`);
assert.match(routes,/const actor = await requireFinanceSession\(request\)/);
assert.match(routes,/bodyClinicId !== actorClinicId/);
assert.doesNotMatch(routes,/body\.connectedAccountId/);
console.log('provider route security: OK');
