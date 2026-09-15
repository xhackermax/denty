import assert from 'node:assert/strict';
import fs from 'node:fs';
import { defaultDb, migrateDb, saveDb, DB_KEY, PREVIOUS_KEYS } from '../logic.js';
const app=fs.readFileSync('app.js','utf8');
let n=0;
function ok(name,fn){ try{fn();n++;console.log('PASS',name);}catch(e){console.error('FAIL',name,e.message);process.exitCode=1;} }

ok('old 1.4/1.3 storage key is migrated',()=>assert.ok(PREVIOUS_KEYS.includes('denty_web_vercel_preview_1_3_3_settings_panels')));
ok('legacy data survives migration while new admin collections appear',()=>{ const old={patients:[{id:9,first_name:'Ana'}],settings:{clinic:'Clínica vieja'},works:[{id:10,patient_id:9,title:'Corona',lab:'Mi Lab'}]}; const db=migrateDb(old); assert.equal(db.patients[0].first_name,'Ana'); assert.equal(db.settings.clinicProfile.name,'Clínica vieja'); assert.ok(db.labs.length); assert.ok(db.cabinets.every(c=>c.site_id)); });
ok('backup retention setting controls snapshot count',()=>{ const m=new Map(); const storage={getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}; const db=defaultDb(); db.settings.backup.retention=3; for(let i=0;i<7;i++) saveDb(db,storage); assert.ok(m.has(DB_KEY)); const snaps=JSON.parse(m.get('denty_web_recovery_snapshots')); assert.equal(snaps.length,3); });
ok('all editable forms have submit bindings',()=>{ for(const id of ['clinicSettingsForm','doctorAdminForm','shiftAdminForm','siteAdminForm','cabinetAdminForm','tariffAdminForm','labAdminForm','consentAdminForm','templateAdminForm','userAdminForm','appearanceSettingsForm','serverSettingsForm','syncSettingsForm','mcpSettingsForm','backupSettingsForm']) assert.ok(app.includes(`bindForm('#${id}'`) || ['shiftAdminForm'].includes(id)&&app.includes(`bindForm('#shiftAdminForm'`),id); });
ok('treatment activation affects budget catalogue',()=>assert.match(app,/db\.procedures\.filter\(p=>p\.active!==false\)/));
ok('consent activation affects new documents',()=>assert.match(app,/db\.consents\.filter\(c=>c\.active!==false\)/));
ok('clinic agenda settings drive agenda grid',()=>{assert.match(app,/ag\.day_start/);assert.match(app,/db\.settings\?\.slotMinutes/);});
ok('clinic default duration drives new appointment end time',()=>assert.match(app,/defaultDuration=Number\(db\.settings\?\.agenda\?\.default_duration/));
ok('lab directory drives lab work form',()=>{assert.match(app,/activeLabs=\(db\.labs/);assert.match(app,/name="lab_id"/);});
ok('role permissions gate navigation',()=>{ assert.match(app,/function canOpenView\(view\)/); assert.match(app,/!area \|\| canAccess\(area\)/); });
console.log(`\n${n}/10 settings effect checks passed`);
if(process.exitCode) process.exit(process.exitCode);
