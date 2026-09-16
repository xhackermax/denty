import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const voice=read('apps/api/src/modules/voice/service.ts');
const appt=read('apps/api/src/modules/appointments/service.ts');
const bill=read('apps/api/src/modules/billing/service.ts');
const lab=read('apps/api/src/modules/laboratory/service.ts');
const clinical=read('apps/api/src/modules/clinical/service.ts');
const checks=[
 ['appointment service exposes transaction command',/export async function updateAppointmentTx/.test(appt)&&/updateAppointmentTx\(tx/.test(appt)],
 ['voice reuses appointment transaction command',/updateAppointmentTx/.test(voice)],
 ['payment service exposes transaction command',/export async function recordPaymentTx/.test(bill)&&/recordPaymentTx\(tx/.test(bill)],
 ['voice reuses payment transaction command',/recordPaymentTx/.test(voice)],
 ['lab service exposes transaction transition command',/export async function transitionLabWorkTx/.test(lab)&&/transitionLabWorkTx\(tx/.test(lab)],
 ['voice reuses lab transition command',/transitionLabWorkTx/.test(voice)],
 ['clinical service exposes transaction add-item command',/export async function addPlanItemTx/.test(clinical)&&/addPlanItemTx\(tx/.test(clinical)],
 ['voice reuses clinical add-item command',/addPlanItemTx/.test(voice)],
];
let failed=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}if(failed)process.exit(1);console.log(`${checks.length}/${checks.length} checks passed`);
