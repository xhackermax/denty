import assert from 'node:assert/strict';
import fs from 'node:fs';
const {specialtyForTreatmentCode,groupSpecialtyProfitability}=await import('../apps/api/src/modules/analytics/metrics.ts');
assert.equal(specialtyForTreatmentCode('implant'),'Implantología');
assert.equal(specialtyForTreatmentCode('implant_crown'),'Implantología');
assert.equal(specialtyForTreatmentCode('orthodontics'),'Ortodoncia');
assert.equal(specialtyForTreatmentCode('endodontics'),'Endodoncia');
assert.equal(specialtyForTreatmentCode('restoration'),'Conservadora');
const grouped=groupSpecialtyProfitability([
 {id:'a',type:'treatment.completed',category:'implant',revenueCents:95000,costCents:25000,lossCents:0,quantity:1},
 {id:'b',type:'treatment.completed',category:'implant_crown',revenueCents:50000,costCents:15000,lossCents:0,quantity:1},
 {id:'c',type:'treatment.completed',category:'orthodontics',revenueCents:200000,costCents:50000,lossCents:0,quantity:1},
]);
const impl=grouped.find(x=>x.name==='Implantología');
assert.equal(impl?.producedCents,145000);
assert.equal(impl?.marginCents,105000);
const routes=fs.readFileSync('apps/api/src/modules/analytics/routes.ts','utf8');
assert.match(routes,/\/api\/analytics\/specialties/);
const clinicalRoutes=fs.readFileSync('apps/api/src/modules/clinical/routes.ts','utf8');
assert.match(clinicalRoutes,/\/api\/clinical-plan\/items\/:id\/rework/);
const clinical=fs.readFileSync('apps/api/src/modules/clinical/service.ts','utf8');
assert.match(clinical,/source:\s*"rework"/);
assert.match(clinical,/type:\s*"treatment\.rework"/);
const patientUI=fs.readFileSync('apps/web/src/app/app/patients/[id]/page.tsx','utf8');
assert.match(patientUI,/Registrar retratamiento/);
const analysisUI=fs.readFileSync('apps/web/src/app/app/analysis/page.tsx','utf8');
assert.match(analysisUI,/Rentabilidad por especialidad/);
console.log('PASS analysis clinical rework + specialties');
