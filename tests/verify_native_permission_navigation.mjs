import fs from 'fs';let p=0,f=0;const ok=(v,m)=>{(v?p++:f++);console[v?'log':'error'](v?'PASS':'FAIL',m)};
const shell=fs.readFileSync('apps/web/src/components/native/AppShell.tsx','utf8');
const docs=fs.readFileSync('apps/web/src/app/app/documents/page.tsx','utf8');
ok(shell.includes('permission')||shell.includes('permissions'),'native navigation filters by server-delivered permissions');
ok(shell.includes('finance.read'),'finance tool is permission-gated');
ok(shell.includes('lab.read'),'laboratory tool is permission-gated');
ok(shell.includes('settings.manage'),'settings tool is admin/settings permission-gated');
ok(docs.includes('documents.write')&&docs.includes('settings.manage'),'document mutation controls respect permissions in UI');
console.log(`\n${p} passed, ${f} failed`);if(f)process.exit(1);
