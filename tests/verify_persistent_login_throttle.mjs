import fs from 'node:fs';import assert from 'node:assert/strict';
const throttle=fs.existsSync('apps/api/src/auth/login-throttle.ts')?fs.readFileSync('apps/api/src/auth/login-throttle.ts','utf8'):'';
const routes=fs.readFileSync('apps/api/src/auth/routes.ts','utf8');
const prod=fs.readFileSync('apps/api/src/config/production.ts','utf8');
const checks=[
 ['login throttle persists attempts through prisma.loginAttempt', /prisma\.loginAttempt/.test(throttle)],
 ['login fingerprints use keyed HMAC not plaintext identifiers', /createHmac/.test(throttle) && /DENTY_AUTH_PEPPER/.test(throttle)],
 ['throttle counts failures in a rolling time window', /occurredAt/.test(throttle) && /success:\s*false/.test(throttle) && /(15\s*\*\s*60|15\*60)/.test(throttle)],
 ['successful login resets effective failure window', /success:\s*true/.test(throttle) && /lastSuccess/.test(throttle)],
 ['password and PIN login use shared persistent throttle', /assertLoginRate/.test(routes) && /recordLoginAttempt/.test(routes) && !/const failures=new Map/.test(routes)],
 ['production requires auth hashing pepper', /DENTY_AUTH_PEPPER/.test(prod) && /minSecret/.test(prod)],
];
let passed=0;for(const [n,ok] of checks){if(ok){console.log(`PASS ${n}`);passed++}else console.error(`FAIL ${n}`)}console.log(`${passed}/${checks.length} checks passed`);assert.equal(passed,checks.length);
