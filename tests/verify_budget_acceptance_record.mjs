import fs from 'fs';let p=0,f=0;const ok=(v,m)=>{(v?p++:f++);console[v?'log':'error'](v?'PASS':'FAIL',m)};
const schema=fs.readFileSync('packages/db/prisma/schema.prisma','utf8'),svc=fs.readFileSync('apps/api/src/modules/portal/service.ts','utf8'),routes=fs.readFileSync('apps/api/src/modules/portal/routes.ts','utf8');
ok(schema.includes('model BudgetAcceptance'),'budget acceptance has immutable persistence model');
ok(schema.includes('termsVersion')&&schema.includes('acceptedItemIdsJson'),'acceptance records terms version and selected lines');
ok(schema.includes('ipHash')&&schema.includes('userAgentHash'),'acceptance stores request evidence hashes');
ok(svc.includes('budgetAcceptance.create'),'budget response writes immutable acceptance record');
ok(routes.includes('createHash')&&routes.includes('user-agent'),'route supplies hashed request evidence');
console.log(`\n${p} passed, ${f} failed`);if(f)process.exit(1);
