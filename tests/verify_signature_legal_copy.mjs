import fs from 'node:fs';
const staff=fs.readFileSync('apps/web/src/app/app/documents/page.tsx','utf8');
const patient=fs.readFileSync('apps/web/src/app/patient/[patientId]/page.tsx','utf8');
const checks=[
 ['staff UI labels built-in signature as simple electronic signature',/firma electrónica simple/i.test(staff)],
 ['staff UI does not claim qualified signature',!/firma electrónica cualificada/i.test(staff)],
 ['patient portal labels signing evidence accurately',/firma electrónica simple/i.test(patient)],
 ['patient portal does not claim qualified signature',!/firma electrónica cualificada/i.test(patient)],
];
let failed=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}if(failed)process.exit(1);console.log(`${checks.length}/${checks.length} checks passed`);
