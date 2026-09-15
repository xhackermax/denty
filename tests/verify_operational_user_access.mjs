import assert from 'node:assert/strict';
import fs from 'node:fs';
import { defaultDb, migrateDb } from '../apps/legacy-preview/logic.js';

const app = fs.readFileSync('./apps/legacy-preview/app.js', 'utf8');
let passed = 0, total = 0;
function check(name, fn){
  total++;
  try{ fn(); passed++; console.log('PASS', name); }
  catch(err){ console.error('FAIL', name, '-', err.message); process.exitCode = 1; }
}

const fresh = defaultDb();
const dentistAccess = fresh.rolePermissions.dentist || [];
const receptionAccess = fresh.rolePermissions.reception || [];

check('operational dentist can work with patients agenda clinic and finances', () => {
  for(const area of ['pacientes','agenda','clinica','finanzas']){
    assert.ok(dentistAccess.includes(area), `dentist missing ${area}`);
  }
});
check('operational dentist cannot edit admin settings', () => {
  assert.ok(!dentistAccess.includes('ajustes'));
  assert.ok(!dentistAccess.includes('copias'));
});
check('reception keeps daily access and basic financial work without admin settings', () => {
  for(const area of ['pacientes','agenda','finanzas']){
    assert.ok(receptionAccess.includes(area), `reception missing ${area}`);
  }
  assert.ok(!receptionAccess.includes('ajustes'));
});
check('migrations upgrade legacy permissions for operational finance access', () => {
  const migrated = migrateDb({rolePermissions:{admin:['ajustes'], dentist:['pacientes','agenda','clinica'], reception:['pacientes','agenda','cobros_basicos']}});
  assert.ok(migrated.rolePermissions.dentist.includes('finanzas'));
  assert.ok(migrated.rolePermissions.reception.includes('finanzas'));
  assert.ok(!migrated.rolePermissions.dentist.includes('ajustes'));
});
check('user portal applies a non admin active account', () => {
  assert.match(app, /function applyPortalRole/);
  assert.match(app, /selectedPortal==='user'/);
  assert.match(app, /role!=='admin'/);
  assert.match(app, /currentUser/);
});
check('admin-only views are blocked for operational user portal', () => {
  assert.match(app, /ADMIN_ONLY_VIEWS/);
  assert.match(app, /isAdminOnlyView/);
  assert.match(app, /Solo administrador/);
});
check('settings renderer has an access guard', () => {
  assert.match(app, /renderRestrictedAccess/);
  assert.match(app, /renderSettings\(\)\{\s*if\(!canAccess\('ajustes'\)\)/);
});

console.log(`\n${passed}/${total} passed`);
if(process.exitCode) process.exit(process.exitCode);
