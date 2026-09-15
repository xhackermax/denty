import assert from 'node:assert/strict';
import fs from 'node:fs';
import { defaultDb, migrateDb } from '../logic.js';

const app=fs.readFileSync('./app.js','utf8');
const css=fs.readFileSync('./styles/styles.css','utf8');
let passed=0,total=0;
function check(name, fn){ total++; try{ fn(); passed++; console.log('PASS',name); }catch(err){ console.error('FAIL',name,'-',err.message); process.exitCode=1; } }

const fresh=defaultDb();
check('database has laboratories entity',()=>assert.ok(Array.isArray(fresh.labs) && fresh.labs.length>=1));
check('clinic profile is structured and editable',()=>assert.equal(typeof fresh.settings?.clinicProfile,'object'));
check('server sync mcp and backup settings exist',()=>{ assert.equal(typeof fresh.settings?.server,'object'); assert.equal(typeof fresh.settings?.sync,'object'); assert.equal(typeof fresh.settings?.mcp,'object'); assert.equal(typeof fresh.settings?.backup,'object'); });
check('migration preserves legacy clinic name',()=>{ const db=migrateDb({settings:{clinic:'Mi clínica'}}); assert.equal(db.settings.clinicProfile.name,'Mi clínica'); });
check('sites carry editable contact data',()=>{ const s=fresh.sites[0]; assert.ok('phone' in s && 'email' in s && 'active' in s); });
check('cabinets can be assigned to sites',()=>assert.ok(fresh.cabinets.every(c=>'site_id' in c)));
check('procedures have active state',()=>assert.ok(fresh.procedures.every(p=>'active' in p)));
check('settings is master-detail instead of static card dump',()=>{ assert.match(app,/settings-admin-layout/); assert.match(app,/data-settings-panel/); });
for(const id of ['clinicSettingsForm','doctorAdminForm','siteAdminForm','tariffAdminForm','labAdminForm','consentAdminForm','userAdminForm','appearanceSettingsForm','serverSettingsForm','syncSettingsForm','mcpSettingsForm','backupSettingsForm']){
  check(`settings exposes ${id}`,()=>assert.ok(app.includes(id)));
}
check('settings binds generic edit actions',()=>assert.match(app,/data-settings-edit/));
check('settings can switch the active user',()=>assert.ok(app.includes('currentUserForm')));
check('view navigation enforces configured role permissions',()=>assert.match(app,/VIEW_PERMISSION/));
check('settings binds create actions',()=>assert.match(app,/data-settings-new/));
check('settings writes audit trail',()=>assert.match(app,/settings\./));
check('work modal uses configured laboratory ids',()=>assert.match(app,/name="lab_id"/));
check('appointment uses configured default duration and sites',()=>{ assert.match(app,/default_duration/); assert.match(app,/name="site_id"/); });
check('appearance is applied to document',()=>assert.match(app,/applyAppearance/));
check('dark appearance CSS exists',()=>assert.match(css,/data-theme=["']dark["']/));
check('settings admin responsive CSS exists',()=>assert.match(css,/settings-admin-layout/));

console.log(`\n${passed}/${total} passed`);
if(process.exitCode) process.exit(process.exitCode);
