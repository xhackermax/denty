import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { defaultDb, createPatient, ensureOdontogram } from '../logic.js';

assert.ok(existsSync('./voice-router.js'), 'voice-router.js must exist');
const { parseVoiceCommand, validateStructuredCommand, executeVoiceCommand } = await import('../voice-router.js');

let passed = 0;
function test(name, fn){
  try { fn(); passed++; console.log(`✓ ${name}`); }
  catch (err) { console.error(`✗ ${name}`); console.error(err.stack||err); process.exitCode=1; }
}

function fresh(){
  const db=defaultDb();
  const ana=createPatient(db,{first_name:'Ana',last_name:'Pérez',phone:'600111222',ficha:'A-1'});
  const juan=createPatient(db,{first_name:'Juan',last_name:'García',phone:'600333444',ficha:'J-1'});
  return {db,ana,juan};
}

test('structured command validation rejects unknown intents',()=>{
  assert.equal(validateStructuredCommand({intent:'database.destroy',slots:{}}).ok,false);
  assert.equal(validateStructuredCommand({intent:'navigation.open',confidence:.9,slots:{target:'agenda'}}).ok,true);
});

test('patient select and create commands are parsed and executed',()=>{
  const {db,ana}=fresh();
  const select=parseVoiceCommand('Denty abre a Ana Pérez');
  assert.equal(select.intent,'patient.select');
  const selected=executeVoiceCommand(db,select,{patientId:null,now:'2026-09-15'});
  assert.equal(selected.patient.id,ana.id);

  const create=parseVoiceCommand('crea paciente Marta López teléfono 611 222 333');
  assert.equal(create.intent,'patient.create');
  const created=executeVoiceCommand(db,create,{now:'2026-09-15'});
  assert.equal(created.patient.first_name,'Marta');
  assert.equal(created.patient.last_name,'López');
  assert.equal(created.patient.phone,'611222333');
});

test('odontogram differentiates performed indicated and repeat states',()=>{
  const {db,ana}=fresh();
  const indicated=parseVoiceCommand('hay que hacer endodoncia 22');
  const performed=parseVoiceCommand('endodoncia realizada 23');
  const repeatPost=parseVoiceCommand('repetir perno 14');
  assert.deepEqual([indicated.slots.status,performed.slots.status,repeatPost.slots.status],['endo_indicated','endo','post_bad']);
  executeVoiceCommand(db,indicated,{patientId:ana.id});
  executeVoiceCommand(db,performed,{patientId:ana.id});
  executeVoiceCommand(db,repeatPost,{patientId:ana.id});
  const od=ensureOdontogram(db,ana.id);
  assert.equal(od['22'].status,'endo_indicated');
  assert.equal(od['23'].status,'endo');
  assert.equal(od['14'].status,'post_bad');
});

test('odontogram supports caries surfaces and bad crowns',()=>{
  const {db,ana}=fresh();
  const caries=parseVoiceCommand('caries distal del 36');
  const crown=parseVoiceCommand('corona 46 en mal estado');
  executeVoiceCommand(db,caries,{patientId:ana.id});
  executeVoiceCommand(db,crown,{patientId:ana.id});
  const od=ensureOdontogram(db,ana.id);
  assert.equal(od['36'].surfaces.D,'caries');
  assert.equal(od['46'].status,'crown_bad');
});

test('periodontal voice updates mobility and probing depth',()=>{
  const {db,ana}=fresh();
  const cmd=parseVoiceCommand('36 movilidad 2 y bolsa 6 distal');
  assert.equal(cmd.intent,'periodontal.update');
  executeVoiceCommand(db,cmd,{patientId:ana.id});
  const rec=ensureOdontogram(db,ana.id)['36'];
  assert.equal(rec.periodontal.mobility,'2');
  assert.equal(rec.periodontal.depths.dl,'6');
});

test('appointment parses patient relative date time duration and treatment',()=>{
  const {db,ana}=fresh();
  const cmd=parseVoiceCommand('cita a Ana Pérez mañana a las 10:30 durante 60 minutos para endodoncia 22',{now:'2026-09-15'});
  assert.equal(cmd.intent,'appointment.create');
  const res=executeVoiceCommand(db,cmd,{now:'2026-09-15'});
  assert.equal(res.appointment.patient_id,ana.id);
  assert.equal(res.appointment.date,'2026-09-16');
  assert.equal(res.appointment.start_time,'10:30');
  assert.equal(res.appointment.end_time,'11:30');
  assert.match(res.appointment.title,/endodoncia/i);
});

test('comments and allergy alerts write to the active patient',()=>{
  const {db,ana}=fresh();
  executeVoiceCommand(db,parseVoiceCommand('añade comentario dolor al morder desde hace tres días'),{patientId:ana.id});
  executeVoiceCommand(db,parseVoiceCommand('añade alergia a penicilina'),{patientId:ana.id});
  assert.match(db.comments.at(-1).text,/dolor al morder/i);
  assert.match(db.clinicalAlerts.at(-1).text,/penicilina/i);
});

test('budget uses catalog pricing instead of hard-coded voice price',()=>{
  const {db,ana}=fresh();
  const cmd=parseVoiceCommand('haz presupuesto de implante 46');
  const res=executeVoiceCommand(db,cmd,{patientId:ana.id});
  assert.equal(res.budget.tooth,'46');
  assert.ok(res.budget.total>0,'catalog treatment should provide a price');
  assert.ok(res.budget.procedure_id,'budget should retain catalog procedure');
});

test('card payment command resolves patient but delegates to terminal checkout',()=>{
  const {db,ana}=fresh();
  const cmd=parseVoiceCommand('cobra 100 euros en tarjeta a Ana Pérez');
  const before=db.payments.length;
  const res=executeVoiceCommand(db,cmd,{});
  assert.equal(res.patient.id,ana.id);
  assert.equal(res.terminal_required,true);
  assert.equal(res.payment_request.amount,100);
  assert.equal(res.payment_request.method,'tarjeta');
  assert.equal(db.payments.length,before);
});

test('cash payment command remains an immediate settled manual payment',()=>{
  const {db,ana}=fresh();
  const cmd=parseVoiceCommand('cobra 80 euros en efectivo a Ana Pérez');
  const res=executeVoiceCommand(db,cmd,{});
  assert.equal(res.payment.patient_id,ana.id);
  assert.equal(res.payment.status,'paid');
  assert.equal(res.payment.provider,'voice_manual');
});

test('laboratory receive command creates a received work item',()=>{
  const {db,ana}=fresh();
  const cmd=parseVoiceCommand('recibe trabajo del laboratorio de Ana Pérez corona 11');
  const res=executeVoiceCommand(db,cmd,{});
  assert.equal(res.work.patient_id,ana.id);
  assert.equal(res.work.status,'recibido');
  assert.match(res.work.title,/corona 11/i);
});

test('navigation commands never mutate clinical data',()=>{
  const {db}=fresh();
  const before=JSON.stringify(db);
  const cmd=parseVoiceCommand('abre agenda');
  const res=executeVoiceCommand(db,cmd,{});
  assert.equal(res.navigation.target,'agenda');
  assert.equal(JSON.stringify(db),before);
});

console.log(`${passed}/12 voice router checks passed`);
if(process.exitCode) process.exit(process.exitCode);
