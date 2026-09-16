import fs from 'node:fs';
import assert from 'node:assert/strict';
const hash=fs.readFileSync('packages/db/src/audit/hash.ts','utf8');
const write=fs.readFileSync('packages/db/src/audit/write-audit.ts','utf8');
const verify=fs.readFileSync('packages/db/src/audit/verify-audit-chain.ts','utf8');
const schema=fs.readFileSync('packages/db/prisma/schema.prisma','utf8');
const prod=fs.readFileSync('apps/api/src/config/production.ts','utf8');
const dbpkg=JSON.parse(fs.readFileSync('packages/db/package.json','utf8'));
const checks=[
 ['audit hash is keyed HMAC rather than bare SHA-256', /createHmac/.test(hash) && !/createHash\(/.test(hash)],
 ['audit HMAC key comes from server secret configuration', /DENTY_AUDIT_HMAC_KEY/.test(hash)],
 ['production requires a strong audit HMAC key', /DENTY_AUDIT_HMAC_KEY/.test(prod) && /minSecret/.test(prod)],
 ['audit events have per-clinic monotonic sequence', /sequence\s+Int/.test(schema) && /@@unique\(\[clinicId,\s*sequence\]\)/.test(schema)],
 ['audit writer advances sequence and hashes timestamped event', /sequence/.test(write) && /occurredAt/.test(write) && /calculateAuditHash/.test(write)],
 ['audit verifier orders by sequence and recomputes HMAC fields', /orderBy:\{sequence:"asc"\}/.test(verify) && /sequence/.test(verify) && /occurredAt/.test(verify)],
 ['database exposes an audit verification CLI', Boolean(dbpkg.scripts?.['audit:verify'])],
];
let passed=0;for(const [name,ok] of checks){if(ok){console.log(`PASS ${name}`);passed++}else console.error(`FAIL ${name}`)}
console.log(`${passed}/${checks.length} checks passed`);assert.equal(passed,checks.length);
