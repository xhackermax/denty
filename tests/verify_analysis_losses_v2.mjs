import assert from 'node:assert/strict';
import fs from 'node:fs';
const {calculateInvoice}=await import('../packages/domain/src/billing/index.ts');
assert.equal(calculateInvoice([{quantity:1,unitPriceCents:-10000}],{allowNegative:true}).totalCents,-10000,'rectifying invoices must preserve negative totals');
assert.equal(calculateInvoice([{quantity:1,unitPriceCents:-10000}]).totalCents,0,'normal invoice calculations must not allow negative totals');
const portal=fs.readFileSync('apps/api/src/modules/portal/service.ts','utf8');
assert.match(portal,/discount\.applied/,'accepted discounts must feed analytics losses');
assert.match(portal,/dedupeKey:`discount\.applied:/,'discount loss must be idempotent');
const billing=fs.readFileSync('apps/api/src/modules/billing/service.ts','utf8');
assert.match(billing,/allowNegative/,'rectifying invoice draft must opt in to negative totals');
assert.match(billing,/type:"refund\.recorded"|type:"invoice\.rectified"/,'rectifications must feed analytics');
console.log('PASS analysis losses v2');

const routes=fs.readFileSync('apps/api/src/modules/analytics/routes.ts','utf8');
assert.match(routes,/impactCents/,'loss grouping must expose total economic impact including rework cost');
const ui=fs.readFileSync('apps/web/src/app/app/analysis/page.tsx','utf8');
assert.match(ui,/valueKey="impactCents"/,'loss chart must plot economic impact rather than only lossCents');
