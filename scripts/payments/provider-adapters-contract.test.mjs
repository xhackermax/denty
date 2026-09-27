import assert from 'node:assert/strict';import fs from 'node:fs';
const routes=fs.readFileSync('src/app/api/denty/[...path]/route.ts','utf8');
assert.doesNotMatch(routes,/body\.connectedAccountId/);assert.doesNotMatch(routes,/searchParams\.get\("connectedAccountId"\)/);assert.match(routes,/STRIPE_CONNECTED_ACCOUNT_ID/);
for(const f of ['src/app/api/denty/card-terminal/_sumup.ts']){const s=fs.readFileSync(f,'utf8');assert.doesNotMatch(s,/NEXT_PUBLIC_(STRIPE|SUMUP)/)}
console.log('provider adapters contract: OK');
