import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { DB_KEY, PREVIOUS_KEYS, defaultDb, migrateDb, createTreatmentPlan, treatmentPlanHierarchy, schedulePlanStepToAgenda, createConsentDocument, signDocument } from './logic.js';
const root = new URL('.', import.meta.url);
const app = readFileSync(new URL('./app.js', root), 'utf8');
const html = readFileSync(new URL('./index.html', root), 'utf8');
let pass=0,total=0; function test(name,fn){total++;try{fn();console.log('✓',name);pass++;}catch(e){console.error('✗',name,'\n ',e.stack||e);process.exitCode=1;}}

test('version 0.7 migrates from 0.6.3 and has treatment plan storage',()=>{
  assert.equal(DB_KEY,'denty_web_vercel_preview_0_7_treatment_plans_consents');
  assert.ok(PREVIOUS_KEYS.includes('denty_web_vercel_preview_0_6_3_split_perio'));
  const db=migrateDb({});
  assert.equal(db.version,'0.7');
  assert.ok(Array.isArray(db.treatmentPlans));
});

test('treatment plans sort by hierarchy priority deadline and order',()=>{
  const db=defaultDb(); db.patients.push({id:1,first_name:'Juan',last_name:'Pérez'});
  const a=createTreatmentPlan(db,{patient_id:1,title:'Estética',priority:'media',deadline:'2026-11-01',steps:[{title:'Mockup',phase:'estética',order:1,duration:30}]});
  const b=createTreatmentPlan(db,{patient_id:1,title:'Dolor 36',priority:'urgente',deadline:'2026-10-01',steps:[{title:'Endodoncia 36',phase:'urgencia',order:1,duration:60}]});
  const h=treatmentPlanHierarchy(db,1);
  assert.equal(h[0].id,b.id);
  assert.equal(h[1].id,a.id);
});

test('plan step schedules a detailed appointment with reason',()=>{
  const db=defaultDb(); db.patients.push({id:1,first_name:'Ana',last_name:'López'});
  const plan=createTreatmentPlan(db,{patient_id:1,title:'Implante 46',priority:'alta',deadline:'2026-10-20',steps:[{title:'CBCT y planificación',phase:'diagnóstico',order:1,duration:30,reason:'Planificar implante 46',detail:'Revisar CBCT y presupuesto'}]});
  const appt=schedulePlanStepToAgenda(db,{plan_id:plan.id,step_id:plan.steps[0].id,date:'2026-09-15',start_time:'10:00',employee_id:db.employees[0].id});
  assert.equal(appt.reason,'Planificar implante 46');
  assert.equal(appt.detail,'Revisar CBCT y presupuesto');
  assert.equal(appt.plan_id,plan.id);
  assert.equal(plan.steps[0].status,'agendada');
});

test('consents are detailed and digitally signed with evidentiary fields',()=>{
  const db=defaultDb(); db.patients.push({id:1,first_name:'Ana',last_name:'López'});
  assert.ok(db.consents[0].text.includes('Beneficios'));
  assert.ok(db.consents[0].text.includes('Alternativas'));
  assert.ok(db.consents[0].text.includes('Firma'));
  const doc=createConsentDocument(db,{patient_id:1,consent_id:db.consents[0].id});
  signDocument(db,doc.id,{signature_data:'data:image/png;base64,abc',signer_name:'Ana López',accepted:true,device_info:'Chrome Android'});
  assert.equal(doc.status,'firmado');
  assert.equal(doc.accepted,true);
  assert.ok(doc.hash);
  assert.ok(doc.signature_audit.device_info.includes('Chrome'));
});

test('UI exposes planning tab, plan modal, detailed appointments and signature acceptance',()=>{
  assert.ok(app.includes('planificacion'));
  assert.ok(app.includes('renderPlanningTab'));
  assert.ok(app.includes('openTreatmentPlanModal'));
  assert.ok(app.includes('data-schedule-step'));
  assert.ok(app.includes('Motivo de visita'));
  assert.ok(app.includes('Detalle clínico de la cita'));
  assert.ok(app.includes('He leído y acepto'));
  assert.ok(html.includes('Denty Web Preview 0.7'));
});
console.log(`${pass}/${total} tests passed`);
