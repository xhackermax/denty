import fs from 'node:fs';
const routes=fs.readFileSync('apps/api/src/modules/voice/routes.ts','utf8');
const service=fs.readFileSync('apps/api/src/modules/voice/service.ts','utf8');
const token=fs.existsSync('apps/api/src/modules/voice/plan-token.ts')?fs.readFileSync('apps/api/src/modules/voice/plan-token.ts','utf8'):'';
const ui=fs.readFileSync('apps/web/src/features/voice/VoiceCommandBar.tsx','utf8');
const prod=fs.readFileSync('apps/api/src/config/production.ts','utf8');
const checks=[
 ['preview returns server signed plan token',/planToken/.test(routes)&&/issueVoicePlanToken/.test(routes)],
 ['execute consumes planToken instead of replanning text',/planToken/.test(routes)&&/executeVoicePlan/.test(service)],
 ['plan token is HMAC signed and expires',/createHmac/.test(token)&&/expiresAt/.test(token)&&/timingSafeEqual/.test(token)],
 ['plan token binds clinic and user',/clinicId/.test(token)&&/userId/.test(token)],
 ['native UI stores and submits plan token',/planToken/.test(ui)&&/JSON\.stringify\(\{planToken/.test(ui)],
 ['production validates voice plan secret',/DENTY_VOICE_PLAN_SECRET/.test(prod)],
];
let failed=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}if(failed)process.exit(1);console.log(`${checks.length}/${checks.length} checks passed`);
