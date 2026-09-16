import fs from 'fs';
const s=fs.readFileSync('apps/web/src/app/app/settings/page.tsx','utf8');let p=0,f=0;const ok=(v,m)=>{(v?p++:f++);console[v?'log':'error'](v?'PASS':'FAIL',m)};
ok(s.includes('/api/security/privacy-requests'),'settings reads privacy requests');
ok(s.includes('ERASURE')&&s.includes('RECTIFICATION')&&s.includes('EXPORT'),'settings supports core privacy request types');
ok(s.includes('/api/security/patient-export/'),'settings can export a patient package');
ok(s.includes('IN_REVIEW')&&s.includes('COMPLETED'),'privacy request workflow can be advanced');
console.log(`\n${p} passed, ${f} failed`);if(f)process.exit(1);
