import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  DB_KEY, PREVIOUS_KEYS, defaultDb, ensureOdontogram,
  createRecoverySnapshot, recoverDbFromSnapshots, safeSaveDb, validateStorageHealth,
  CLINICAL_PHASES, classifyTreatmentPriority, createTreatmentPlan, schedulePlanStep,
  CONSENT_DEFINITIONS, prepareConsentDocument, signConsentWithAudit,
  validatePatientImportRows, parseDentalCommand, applyDentalCommand
} from './logic.js';

const root = new URL('.', import.meta.url);
const html = readFileSync(new URL('./index.html', root), 'utf8');
const app = readFileSync(new URL('./app.js', root), 'utf8');
const css = readFileSync(new URL('./styles.css', root), 'utf8');
const readme = readFileSync(new URL('./README.md', root), 'utf8');
const manifest = readFileSync(new URL('./manifest.webmanifest', root), 'utf8');
const tests=[]; const test=(name,fn)=>tests.push([name,fn]);
function memoryStorage(){ const m=new Map(); return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>Array.from(m.keys())[i]??null,get length(){return m.size;}}; }
function firstPatientId(db){ return db.patients?.[0]?.id || 1; }

test('version 1.3 uses isolated key and migrates from 0.7',()=>{
  assert.equal(DB_KEY,'denty_web_vercel_preview_1_3_clinical_nlu');
  assert.ok(PREVIOUS_KEYS.includes('denty_web_vercel_preview_0_7_clinical_planning'));
  assert.equal(defaultDb().version,'1.3');
});

test('storage health and recovery snapshots work',()=>{
  const db=defaultDb(); const storage=memoryStorage();
  assert.equal(validateStorageHealth(storage).ok,true);
  const snap=createRecoverySnapshot(db,'test');
  assert.equal(snap.reason,'test');
  assert.ok(snap.payload_hash.length>=32);
  safeSaveDb(db,storage,'autosave');
  const snaps=JSON.parse(storage.getItem('denty_web_recovery_snapshots')||'[]');
  assert.ok(snaps.length>=1);
  assert.equal(recoverDbFromSnapshots(snaps).version,'1.3');
});

test('clinical planning creates hierarchy and schedules detailed appointments',()=>{
  const db=defaultDb(); const pid=firstPatientId(db);
  const plan=createTreatmentPlan(db,{patient_id:pid,type:'implante',title:'Implante 46',items:['periodoncia inicial','extracción 46','implante 46','corona sobre implante 46','mantenimiento']});
  assert.ok(plan.steps.length>=5);
  assert.ok(plan.steps[0].priority <= plan.steps.at(-1).priority);
  assert.ok(plan.steps.some(s=>s.phase.includes('Cirugía') || s.phase.includes('Implantes')));
  assert.equal(classifyTreatmentPriority('dolor infección absceso').level,1);
  const appt=schedulePlanStep(db,{patient_id:pid,plan_id:plan.id,step_id:plan.steps[0].id,date:'2026-09-15',start_time:'10:00',employee_id:db.employees?.[0]?.id});
  assert.equal(appt.plan_id,plan.id);
  assert.ok(appt.motive || appt.title);
  assert.ok(appt.detail_clinical.includes(plan.steps[0].title));
});

test('defined consents require acceptance and produce signed audit',()=>{
  const db=defaultDb(); const pid=firstPatientId(db);
  assert.ok(CONSENT_DEFINITIONS.implant.risks.length>=3);
  const doc=prepareConsentDocument(db,{patient_id:pid,consent_type:'implant',plan_id:777});
  assert.ok(doc.sections.risks.length>=3);
  assert.throws(()=>signConsentWithAudit(db,doc.id,{signature_data:'data:image/png;base64,abc',signer_name:'Paciente',accepted:false}),/aceptación/i);
  const signed=signConsentWithAudit(db,doc.id,{signature_data:'data:image/png;base64,abc',signer_name:'Paciente',accepted:true,user_agent:'test-agent'});
  assert.equal(signed.status,'firmado');
  assert.equal(signed.audit.accepted,true);
  assert.ok(signed.hash.length>=32);
});

test('safe import detects invalid rows and duplicates',()=>{
  const result=validatePatientImportRows([
    {first_name:'Ana',last_name:'Pérez',phone:'600111222',dni:'123'},
    {first_name:'Ana',last_name:'Pérez',phone:'600111222',dni:'123'},
    {first_name:'',last_name:'',phone:''}
  ]);
  assert.equal(result.validRows.length,1);
  assert.ok(result.duplicates.length>=1);
  assert.ok(result.errors.length>=1);
});

test('dental NLU parses and applies useful clinical commands',()=>{
  const db=defaultDb(); const pid=firstPatientId(db);
  let parsed=parseDentalCommand('pon caries en 36 oclusal',{patientId:pid});
  assert.equal(parsed.intent,'odontogram.mark_surface');
  assert.equal(parsed.slots.tooth,'36');
  assert.equal(parsed.slots.surface,'O');
  const applied=applyDentalCommand(db,'pon caries en 36 oclusal',{patientId:pid});
  assert.equal(applied.handled,true);
  assert.equal(ensureOdontogram(db,pid)['36'].surfaces.O,'caries');
  parsed=parseDentalCommand('36 movilidad 2 y bolsa 6 distal',{patientId:pid});
  assert.equal(parsed.intent,'periodontal.update');
  assert.equal(parsed.slots.depth_mm,6);
  assert.equal(parseDentalCommand('crea presupuesto de implante 46',{patientId:pid}).intent,'budget.create_from_treatment');
  assert.equal(parseDentalCommand('agenda endodoncia del 22 para el jueves',{patientId:pid}).intent,'agenda.schedule_treatment');
});

test('ui and docs expose the 1.3 modules and keep the APK logo',()=>{
  for(const text of ['Denty Web Preview 1.3','Recovery','NLU dental','Importación segura','Consentimientos definidos','Planificación clínica']) assert.ok((html+app+readme).includes(text), text);
  assert.ok(css.includes('roadmap13-grid'));
  assert.ok(manifest.includes('1.3'));
  const logo = new URL('./denty-logo.png', root);
  assert.ok(statSync(logo).size>100000);
  assert.equal(createHash('sha256').update(readFileSync(logo)).digest('hex'),'e4efa2a6e26e19b70c9d0418a429dba8bc9b8c1bda964843e861ac26aec6be83');
});
let passed=0;
for(const [name,fn] of tests){ try{ await fn(); console.log('✓',name); passed++; }catch(e){ console.error('✗',name,'\n ',e.stack||e.message); process.exitCode=1; } }
console.log(`${passed}/${tests.length} tests passed`);
