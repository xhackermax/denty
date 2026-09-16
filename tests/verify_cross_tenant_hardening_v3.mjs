import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const docRoutes=read('apps/api/src/modules/documents/routes.ts');
const docService=read('apps/api/src/modules/documents/service.ts');
const od=read('apps/api/src/modules/odontogram/service.ts');
const lab=read('apps/api/src/modules/laboratory/service.ts');
const labRoutes=read('apps/api/src/modules/laboratory/routes.ts');
const bill=read('apps/api/src/modules/billing/service.ts');
const checks=[
 ['document file uses root-confined reader',/readDocumentPdf/.test(docRoutes)&&/resolve\(.+DENTY_DOCUMENT_DIR/.test(docService)],
 ['attendance site is tenant scoped',/site\.findFirst\([^\n]*clinicId:actor\.clinicId/.test(docService)],
 ['document patient is tenant validated before create',/patient\.findFirstOrThrow\([^\n]*clinicId:actor\.clinicId/.test(docService)],
 ['odontogram refuses patient from another clinic',/patient\.findFirstOrThrow\([^\n]*clinicId:actor\.clinicId/.test(od)],
 ['odontogram batch refuses foreign entity ids',/DENTAL_ENTITY_SCOPE_MISMATCH/.test(od)],
 ['laboratory create validates all tenant references',/validateLabReferences/.test(lab)&&/clinicId:actor\.clinicId/.test(lab)],
 ['laboratory rework route enforces lab.write',/rework[^\n]+can\(actor,"lab\.write"\)/.test(labRoutes)],
 ['billing draft validates tenant references',/validateInvoiceReferences/.test(bill)&&/clinicId:actor\.clinicId/.test(bill)],
];
let failed=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}if(failed)process.exit(1);console.log(`${checks.length}/${checks.length} checks passed`);
