import fs from 'node:fs';
const must=['src/domain/sync/conflict-resolution.ts','src/domain/integrations/idempotency.ts','src/domain/interoperability/fhir-r5.ts','src/domain/communications/recall-campaign.ts'];
for(const f of must) if(!fs.existsSync(f)) throw new Error(`P4 missing: ${f}`);
console.log('Denty roadmap P4 structural verification: OK');
