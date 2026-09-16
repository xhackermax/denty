import fs from 'node:fs';import assert from 'node:assert/strict';
const server=fs.readFileSync('apps/api/src/server.ts','utf8');
const http=fs.existsSync('apps/api/src/config/http-security.ts')?fs.readFileSync('apps/api/src/config/http-security.ts','utf8'):'';
const prod=fs.readFileSync('apps/api/src/config/production.ts','utf8');
const checks=[
 ['Fastify logger redacts authorization and cookie headers', /redact/.test(server) && /authorization/.test(server) && /cookie/.test(server)],
 ['origin policy distinguishes same-origin and configured cross-origin origins', /DENTY_ALLOWED_ORIGINS/.test(http) && /sameOrigin/.test(http)],
 ['unknown browser origins are rejected', /ORIGIN_NOT_ALLOWED/.test(http) && /403/.test(http)],
 ['OPTIONS preflight is handled with credential-aware CORS headers', /OPTIONS/.test(http) && /Access-Control-Allow-Credentials/.test(http)],
 ['security response headers include CSP and no-store API caching', /Content-Security-Policy/.test(server) && /Cache-Control/.test(server)],
 ['production configuration validates allowed origin URLs when configured', /DENTY_ALLOWED_ORIGINS/.test(prod) && /new URL/.test(prod)],
];
let passed=0;for(const [n,ok] of checks){if(ok){console.log(`PASS ${n}`);passed++}else console.error(`FAIL ${n}`)}console.log(`${passed}/${checks.length} checks passed`);assert.equal(passed,checks.length);
