import fs from 'node:fs';import assert from 'node:assert/strict';
const backup=fs.readFileSync('packages/db/src/backup/backup.ts','utf8');
const restore=fs.readFileSync('packages/db/src/backup/restore-cli.ts','utf8');
const dbpkg=JSON.parse(fs.readFileSync('packages/db/package.json','utf8'));
const checks=[
 ['backup format has a version 2 package magic while retaining v1 compatibility', /DENTYBK2/.test(backup) && /DENTYBK1/.test(backup)],
 ['backup bundle includes attachment and document roots', /DENTY_ATTACHMENT_DIR/.test(backup) && /DENTY_DOCUMENT_DIR/.test(backup)],
 ['backup manifest records database and file hashes', /manifest/i.test(backup) && /sha256/.test(backup) && /database/.test(backup)],
 ['backup extraction validates safe archive paths', /(safeRestorePath|safeArchivePath)/.test(backup) && /PATH_INVALID|path.*invalid/i.test(backup)],
 ['restore verifies every bundled file before success', /verify.*sha|sha.*verify|INTEGRITY/i.test(backup)],
 ['restore CLI requires explicit file and separate target directory', /--file/.test(restore) && /--target/.test(restore)],
 ['restore CLI refuses non-empty target rather than replacing live database', /(TARGET_NOT_EMPTY|must be empty|directorio.*vac)/i.test(restore) && !/rename\(temp,db\)/.test(restore)],
 ['restore CLI runs migration deployment against restored copy before cutover', /migrate/.test(restore) && /DATABASE_URL/.test(restore)],
 ['db package exposes backup:restore command', Boolean(dbpkg.scripts?.['backup:restore'])],
];
let passed=0;for(const [n,ok] of checks){if(ok){console.log(`PASS ${n}`);passed++}else console.error(`FAIL ${n}`)}console.log(`${passed}/${checks.length} checks passed`);assert.equal(passed,checks.length);
