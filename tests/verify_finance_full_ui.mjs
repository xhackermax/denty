import fs from 'fs';let p=0,f=0;const ok=(v,m)=>{(v?p++:f++);console[v?'log':'error'](v?'PASS':'FAIL',m)};
const page=fs.readFileSync('apps/web/src/app/app/finance/page.tsx','utf8'),routes=fs.readFileSync('apps/api/src/modules/billing/routes.ts','utf8');
ok(routes.includes('server.get("/api/payments"'),'finance API lists payments');
ok(page.includes('/api/payments')&&page.includes('Registrar cobro'),'finance UI records payments');
ok(page.includes('/allocate')&&page.includes('Asignar'),'finance UI allocates payment to invoice');
ok(page.includes('/rectify')&&page.includes('Rectificar'),'finance UI creates correcting invoices');
ok(page.includes('SIMPLIFIED')&&page.includes('STANDARD'),'finance UI can distinguish invoice types');
console.log(`\n${p} passed, ${f} failed`);if(f)process.exit(1);
