import fs from 'node:fs';
const read=(p)=>fs.readFileSync(new URL(`../../${p}`, import.meta.url),'utf8');
const domain=read('src/domain/money.ts');
const migration=read('supabase/migrations/20260927113000_payment_methods_and_terminals.sql');
const config=read('src/domain/money.ts');
const checks=[
 ['integration modes',domain.includes('"connected" | "semi_connected" | "manual"')],
 ['bank terminal provider',domain.includes('"bank_terminal"')],
 ['bizum method',domain.includes('"BIZUM"')],
 ['capability model',domain.includes('automatic_confirmation')&&domain.includes('send_amount')],
 ['one tap rule',domain.includes('supportsOneTapPayment')],
 ['multi method table',migration.includes('clinic_payment_methods')],
 ['terminal table',migration.includes('payment_terminals')],
 ['one default',migration.includes('clinic_payment_methods_one_default_idx')],
 ['RLS',migration.includes('enable row level security')],
 ['fast method selector',config.includes('fastPaymentMethod')],
];
const failed=checks.filter(([,ok])=>!ok); for(const [name,ok] of checks) console.log(`${ok?'PASS':'FAIL'} ${name}`);
if(failed.length) process.exit(1);
