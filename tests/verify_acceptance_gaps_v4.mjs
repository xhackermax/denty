import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const docs=read('apps/api/src/modules/documents/service.ts');
const agenda=read('apps/api/src/modules/appointments/operations-routes.ts');
const voice=read('apps/api/src/modules/voice/service.ts');
const pkg=read('package.json');
const finance=read('apps/web/src/app/app/finance/page.tsx');
const signSection=docs.slice(docs.indexOf('export async function signDocument'),docs.indexOf('export async function deliverDocument'));
const checks=[
 ['second signature is rejected',!/\["FINAL","SIGNED"\]\.includes\(doc\.status\)/.test(signSection)&&/doc\.status!=="FINAL"/.test(signSection)],
 ['multi-visit scheduling does not invent one-day interval',!/gapDays\?\?0\)\|\|1/.test(agenda)&&/MULTI_VISIT_INTERVAL_REQUIRED/.test(agenda)],
 ['voice audit stores transcript digest instead of raw transcript',/transcriptDigest/.test(voice)&&!/after:\{raw:text/.test(voice)],
 ['AEAT revalidation gate is executable from production check',/aeat:revalidate/.test(pkg)&&/aeat:revalidate/.test(pkg.match(/"production:check"[^\n]+/)?.[0]??'')],
 ['finance UI exposes immutable issued invoice PDF',/\/pdf/.test(finance)&&/Ver PDF/.test(finance)],
];
let failed=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}if(failed)process.exit(1);console.log(`${checks.length}/${checks.length} checks passed`);
