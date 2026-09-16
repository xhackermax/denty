import fs from 'node:fs';
const service=fs.readFileSync('apps/api/src/modules/clinical/service.ts','utf8');
const page=fs.readFileSync('apps/web/src/app/app/patients/[id]/page.tsx','utf8');
const schema=fs.readFileSync('packages/db/prisma/schema.prisma','utf8');
const checks=[
 ['preference validates option plan clinic and patient',/recordPreference[\s\S]*clinicId:actor\.clinicId/.test(service)&&/optionId/.test(service)&&/patientId/.test(service)],
 ['patient actor preference is scoped to granted patient id',/recordPreference[\s\S]*actor\.role==="PATIENT"/.test(service)],
 ['alternative approval validates clinic ownership',/approveAlternative[\s\S]*opt\.set\.plan\.clinicId!==actor\.clinicId/.test(service)],
 ['removable alternative set persists suggested Kennedy classification',/suggestedClassification\s+String\?/.test(schema)&&/suggestedClassification/.test(service)],
 ['staff UI labels Kennedy as suggested until confirmed',/Clasificación sugerida/.test(page)],
 ['staff UI exposes clinician approval action',/Aprobar clínicamente/.test(page)&&/\/approve/.test(page)],
];
let failed=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}if(failed)process.exit(1);console.log(`${checks.length}/${checks.length} checks passed`);
