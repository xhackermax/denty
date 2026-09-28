import fs from 'node:fs';
const must=['src/domain/fiscal/verifactu-chain.ts','src/domain/finance/reconciliation.ts','src/domain/ai/radiographic-review.ts','src/domain/reception/kiosk-checkin.ts','src/domain/prescriptions/provider-contract.ts','supabase/migrations/20260927190000_roadmap_p3_p4_platform.sql'];
for(const f of must) if(!fs.existsSync(f)) throw new Error(`P3 missing: ${f}`);
console.log('Denty roadmap P3 structural verification: OK');
