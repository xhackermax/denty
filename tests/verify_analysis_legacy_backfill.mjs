import assert from 'node:assert/strict';
import fs from 'node:fs';
const {computeAnalyticsStats}=await import('../apps/api/src/modules/analytics/metrics.ts');
const source=fs.readFileSync('packages/db/src/import/legacy.ts','utf8');
assert.match(source,/analyticsEvent\.upsert/,'legacy import must backfill analytics events idempotently');
assert.match(source,/type:\s*"treatment\.completed"/,'completed legacy treatments must backfill production');
assert.match(source,/type:\s*"payment\.received"/,'legacy settled payments must backfill collections');
assert.match(source,/type:\s*"appointment\.no_show"/,'legacy no-shows must be retained as countable analytics events');
assert.match(source,/unvaluedHistorical:\s*true/,'legacy no-show monetary loss must be explicitly unvalued rather than invented');
assert.match(source,/costCents:\s*0/,'legacy treatment backfill must not invent historical direct costs');
assert.match(source,/completed_at\?\?|completedAt/,'legacy production must use an evidenced completion timestamp');
console.log('PASS analysis legacy backfill');

const historical=computeAnalyticsStats([{type:'treatment.completed',revenueCents:95000,costCents:0,metadataJson:{historicalCostUnavailable:true}}]);
assert.equal(historical.producedCents,95000,'historical production remains visible');
assert.equal(historical.marginCents,0,'unknown historical cost must not be treated as zero-cost profit');
assert.equal(historical.marginCoveragePercent,0,'margin coverage must expose unavailable historical costs');
assert.equal(historical.marginIsComplete,false,'historical margin must be flagged incomplete');
console.log('PASS analysis legacy margin coverage');

const ui=fs.readFileSync('apps/web/src/app/app/analysis/page.tsx','utf8');
assert.match(ui,/Costes históricos incompletos/,'Analysis must warn when imported historical costs are incomplete');
assert.match(ui,/marginCoveragePercent/,'Analysis must expose cost coverage percentage');
assert.match(ui,/summary\.marginCents/,'margin bridge must use the validated margin metric instead of recomputing false profit');
const routes=fs.readFileSync('apps/api/src/modules/analytics/routes.ts','utf8');
assert.match(routes,/marginIsComplete/,'year comparison must suppress margin delta when cost coverage is incomplete');
