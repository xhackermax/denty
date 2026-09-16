import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const voice=read('apps/api/src/modules/voice/service.ts');
const clinical=read('apps/api/src/modules/clinical/service.ts');
const appointments=read('apps/api/src/modules/appointments/service.ts');
const contracts=read('packages/contracts/src/appointments.ts');
const checks=[
 ['clinical exposes dependency transaction command',/export async function addDependencyTx/.test(clinical)],
 ['voice reuses dependency transaction command',/addDependencyTx\(tx/.test(voice)],
 ['clinical exposes budget sync transaction command',/export async function syncBudgetFromPlanTx/.test(clinical)],
 ['voice reuses budget sync transaction command',/syncBudgetFromPlanTx\(tx/.test(voice)],
 ['appointment create contract accepts optional clinical plan item',/clinicalPlanItemId:\s*z\.string\(\)\.min\(1\)\.optional\(\)/.test(contracts)],
 ['appointment tx persists clinical plan item',/clinicalPlanItemId:input\.clinicalPlanItemId/.test(appointments)],
 ['voice schedules via appointment transaction command',/createAppointmentTx\(tx/.test(voice)],
 ['voice no longer directly creates appointment',!/(?:tx\.)appointment\.create\(/.test(voice)],
 ['voice no longer directly creates budget item',!/(?:tx\.)budgetItem\.create\(/.test(voice)],
 ['voice no longer directly upserts dependency',!/(?:tx\.)clinicalPlanDependency\.upsert\(/.test(voice)],
];
let failed=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}
if(failed)process.exit(1);console.log(`${checks.length}/${checks.length} checks passed`);
