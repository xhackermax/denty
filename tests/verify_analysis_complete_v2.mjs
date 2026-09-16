import assert from 'node:assert/strict';
import fs from 'node:fs';

const metricsPath='apps/api/src/modules/analytics/metrics.ts';
assert.equal(fs.existsSync(metricsPath),true,'analytics metrics module must exist');
const {computeAnalyticsStats,groupTreatmentProfitability}=await import(`../${metricsPath}`);

const events=[
 {id:'t1',type:'treatment.completed',category:'implant',clinicalPlanItemId:'cp1',revenueCents:100000,costCents:30000,lossCents:0,quantity:1,metadataJson:{standardCostItems:[{category:'material',lineCostCents:18000},{category:'laboratory',lineCostCents:12000}]}},
 {id:'l1',type:'lab.cost_recorded',category:'implant',clinicalPlanItemId:'cp1',revenueCents:0,costCents:15000,lossCents:0,quantity:1},
 {id:'r1',type:'treatment.rework',category:'implant',clinicalPlanItemId:'cp1',revenueCents:0,costCents:7000,lossCents:0,quantity:1},
 {id:'p1',type:'purchase.recorded',category:'materials',revenueCents:0,costCents:50000,lossCents:0,quantity:1},
 {id:'n1',type:'appointment.no_show',category:'appointment',revenueCents:0,costCents:0,lossCents:9000,quantity:1},
 {id:'i1',type:'invoice.issued',revenueCents:100000,costCents:0,lossCents:0,quantity:1},
 {id:'pay1',type:'payment.received',revenueCents:80000,costCents:0,lossCents:0,quantity:1},
];
const s=computeAnalyticsStats(events);
assert.equal(s.producedCents,100000);
assert.equal(s.invoicedCents,100000);
assert.equal(s.collectedCents,80000);
assert.equal(s.standardDirectCostCents,30000);
assert.equal(s.actualLabCostCents,15000);
assert.equal(s.reworkCostCents,7000);
assert.equal(s.purchaseSpendCents,50000);
assert.equal(s.lossCents,9000);
assert.equal(s.inefficiencyCostCents,16000,'inefficiency impact must include NPA loss plus rework cost');
assert.equal(s.directCostCents,40000,'actual lab must replace standard lab component, then add rework');
assert.equal(s.marginCents,51000,'margin must not subtract supplier purchases a second time');


const reworkEvents=[
 {type:'treatment.completed',category:'crown',clinicalPlanItemId:'orig',revenueCents:100000,costCents:30000,metadataJson:{standardCostItems:[{category:'material',lineCostCents:18000},{category:'laboratory',lineCostCents:12000}]}},
 {type:'lab.cost_recorded',clinicalPlanItemId:'orig',labWorkId:'lab-original',costCents:15000,metadataJson:{}},
 {type:'treatment.rework',clinicalPlanItemId:'orig',costCents:10000,metadataJson:{reworkItemId:'rework-item',standardCostItems:[{category:'material',lineCostCents:6000},{category:'laboratory',lineCostCents:4000}]}},
 {type:'lab.cost_recorded',clinicalPlanItemId:'rework-item',labWorkId:'lab-clinical-rework',costCents:5000,metadataJson:{}},
 {type:'treatment.rework',clinicalPlanItemId:'orig',costCents:0,metadataJson:{source:'lab',labReworkId:'lab-repeat'}},
 {type:'lab.cost_recorded',clinicalPlanItemId:'orig',labWorkId:'lab-repeat',costCents:3000,metadataJson:{reworkOfLabWorkId:'lab-original'}},
];
const reworkStats=computeAnalyticsStats(reworkEvents);
assert.equal(reworkStats.directCostCents,47000,'clinical rework lab must replace its standard lab and lab-only rework must not double count');
assert.equal(reworkStats.reworkCostCents,14000,'rework impact must include clinical rework plus lab-only repetition exactly once');

const grouped=groupTreatmentProfitability(events);
assert.equal(grouped.length,1);
assert.equal(grouped[0].name,'implant');
assert.equal(grouped[0].directCostCents,40000);
assert.equal(grouped[0].marginCents,60000,'treatment profitability excludes clinic-wide NPA loss not linked to the treatment');

const routes=fs.readFileSync('apps/api/src/modules/analytics/routes.ts','utf8');
assert.match(routes,/\/api\/analytics\/events/,'analytics must expose traceable event drill-down');
assert.match(routes,/\/api\/analytics\/treatments\/drilldown/,'analytics must expose treatment drill-down');
assert.doesNotMatch(routes,/server\.post\("\/api\/analytics\/no-show-loss"/,'manual no-show loss endpoint must not allow client-supplied economic loss');
const labService=fs.readFileSync('apps/api/src/modules/laboratory/service.ts','utf8');
assert.match(labService,/reworkOfLabWorkId/,'received lab rework cost must be identifiable as rework');
assert.match(labService,/specialtyForTreatmentCode/,'lab costs linked to clinical items must carry specialty for filtered margins');
assert.match(labService,/type:"treatment\.rework"[\s\S]*?costCents:0/,'lab repetition analytics must defer cost to actual received laboratory cost');
const appt=fs.readFileSync('apps/api/src/modules/appointments/service.ts','utf8');
assert.match(appt,/resolveHistoricalMarginCentsPerMinute/,'NPA opportunity loss must use historical margin, not only a fixed env value');
const schema=fs.readFileSync('packages/db/prisma/schema.prisma','utf8');
assert.match(schema,/dedupeKey\s+String\?/,'analytics events must support idempotency keys');
assert.match(schema,/@@unique\(\[clinicId, dedupeKey\]\)/,'analytics idempotency key must be unique per clinic');
const ui=fs.readFileSync('apps/web/src/app/app/analysis/page.tsx','utf8');
assert.match(ui,/Costes directos/,'UI must distinguish direct clinical costs');
assert.match(ui,/Gasto proveedores/,'UI must distinguish supplier spend');
assert.match(ui,/inefficiencyCostCents/,'UI must surface rework cost together with other operational losses');
assert.match(ui,/Trazabilidad/,'UI must expose drill-down traceability');
assert.match(ui,/Puente de margen/,'UI must visualize how production becomes clinical margin');
assert.match(ui,/MarginBridge/,'UI must render a margin bridge chart');
console.log('PASS analysis complete v2');
