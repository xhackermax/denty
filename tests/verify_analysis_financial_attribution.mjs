import assert from 'node:assert/strict';
import fs from 'node:fs';
const {computeAnalyticsStats,sumAttributedFinancialsByStaff}=await import('../apps/api/src/modules/analytics/metrics.ts');
const all=[
 {type:'invoice.issued',invoiceId:'i1',revenueCents:100000},
 {type:'invoice.line_issued',invoiceId:'i1',staffId:'d1',category:'implant',specialty:'Implantología',revenueCents:100000},
 {type:'payment.received',paymentId:'p1',revenueCents:80000},
 {type:'payment.allocated',paymentId:'p1',staffId:'d1',category:'implant',specialty:'Implantología',revenueCents:80000},
];
assert.equal(computeAnalyticsStats(all).invoicedCents,100000,'aggregate invoice must not double count line attribution');
assert.equal(computeAnalyticsStats(all).collectedCents,80000,'aggregate payment must not double count allocation attribution');
assert.equal(computeAnalyticsStats(all.filter(e=>e.staffId==='d1')).invoicedCents,100000,'doctor-filtered analytics must use invoice lines');
assert.equal(computeAnalyticsStats(all.filter(e=>e.staffId==='d1')).collectedCents,80000,'doctor-filtered analytics must use allocations');
const attributed=sumAttributedFinancialsByStaff(all.filter(e=>e.specialty==='Implantología'));
assert.deepEqual(attributed.d1,{billedCents:100000,collectedCents:80000},'staff billing/collection must come from already-filtered attribution events');
const helper=fs.readFileSync('apps/api/src/modules/analytics/financial-attribution.ts','utf8');
assert.match(helper,/invoice\.line_issued/);
assert.match(helper,/payment\.allocated/);
const billing=fs.readFileSync('apps/api/src/modules/billing/service.ts','utf8');
assert.match(billing,/writeInvoiceLineAttribution/);
assert.match(billing,/writePaymentAllocationAttribution/);

assert.match(billing,/Rectificación:.*clinicalPlanItemId:l\.clinicalPlanItemId/s,'rectifying invoice lines must preserve clinical plan attribution');
const analyticsRoutes=fs.readFileSync('apps/api/src/modules/analytics/routes.ts','utf8');
assert.match(analyticsRoutes,/role:"DENTIST",id:q\.staffId\|\|undefined/,'doctor analytics must filter staff rows when staffId is selected');
assert.match(analyticsRoutes,/sumAttributedFinancialsByStaff\(events\)/,'doctor route must use filtered attribution events');
console.log('PASS analysis financial attribution');
