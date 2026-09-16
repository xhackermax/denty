# Review package Task 3

Base: 5377a74098e2884a18418417189ffc9ad10f2eaa
Head: 0367aaff8ade067dbd60373c2304153d6c4f7dd5

## Commits
0367aaf Route voice commands to odontogram v3 entities

## Stat
 apps/legacy-preview/voice-router.js  | 70 +++++++++++++++++++++++++++++++++++-
 tests/verify_odontogram_v3_voice.mjs | 37 +++++++++++++++++++
 2 files changed, 106 insertions(+), 1 deletion(-)

## Diff
diff --git a/apps/legacy-preview/voice-router.js b/apps/legacy-preview/voice-router.js
index b31791d..43a2c56 100644
--- a/apps/legacy-preview/voice-router.js
+++ b/apps/legacy-preview/voice-router.js
@@ -1,25 +1,29 @@
 import {
   FDI_ALL,
   addMinutes,
+  createOdontogramEntity,
   createPatient,
   ensureOdontogram,
+  expandFdiRange,
   id,
   normalizeText,
+  odontogramEntityToClinicalItems,
   patientFullName,
   setToothLegendState,
   stripWakeRaw,
+  syncLegacyOdontogramFromEntities,
   today
 } from './logic.js';
 
 export const VOICE_INTENTS = Object.freeze([
-  'patient.select','patient.create','odontogram.set','odontogram.batch','periodontal.update',
+  'patient.select','patient.create','odontogram.set','odontogram.batch','odontogram.entity.create','periodontal.update',
   'appointment.create','comment.add','alert.add','budget.create','payment.record','lab.receive',
   'task.create','navigation.open'
 ]);
 
 const ALLOWED_INTENTS = new Set(VOICE_INTENTS);
 const ALLOWED_TOOTH_STATES = new Set([
   'healthy','missing','extraction','caries','filling','filling_bad','filling_pending','crown','crown_bad','crown_pending',
   'endo','endo_bad','endo_indicated','post','post_bad','post_pending','implant','implant_review','implant_indicated',
   'prosthesis','prosthesis_bad','prosthesis_pending','removable','removable_bad','removable_pending'
 ]);
@@ -27,20 +31,30 @@ const NAV_TARGETS = new Set(['today','patients','patientDetail','agenda','odonto
 const METHODS = ['tarjeta','efectivo','transferencia','financiacion'];
 const WEEKDAYS = {lunes:0,martes:1,miercoles:2,jueves:3,viernes:4,sabado:5,domingo:6};
 
 function result(intent, slots={}, confidence=.9, extra={}){
   return {intent, confidence, source:'rules', slots, requires_confirmation:false, ...extra};
 }
 function unknown(text){ return result('unknown',{raw:String(text||'')},.1,{requires_confirmation:false}); }
 function cleanRaw(text){ return stripWakeRaw(String(text||'')).replace(/\s+/g,' ').trim(); }
 function ntext(text){ return normalizeText(cleanRaw(text)); }
 function extractTooth(text){ const m=String(text||'').match(/\b([1-4][1-8])\b/); return m?.[1]||null; }
+function extractAllTeeth(text){ return [...new Set([...String(text||'').matchAll(/\b([1-8][1-8])\b/g)].map(m=>m[1]))]; }
+function extractFdiRangeFromSpeech(text){
+  const m=String(text||'').match(/\b([1-4][1-8])\s*(?:a|al|hasta|-)\s*([1-4][1-8])\b/i);
+  return m ? (expandFdiRange(m[1],m[2])||[m[1],m[2]]) : [];
+}
+function archFromSpeech(text){
+  const n=ntext(text);
+  const upper=/superior|maxilar/.test(n), lower=/inferior|mandib/.test(n);
+  return upper&&lower?'both':upper?'upper':lower?'lower':'';
+}
 function extractSurface(text){
   const n=ntext(text);
   if(/\b(oclusal|oclus|o)\b/.test(n)) return 'O';
   if(/\b(incisal|incis|i)\b/.test(n)) return 'I';
   if(/\b(mesial|m)\b/.test(n)) return 'M';
   if(/\b(distal|d)\b/.test(n)) return 'D';
   if(/\b(vestibular|bucal|v)\b/.test(n)) return 'V';
   if(/\b(lingual|palatino|palatina|l|p)\b/.test(n)) return 'P';
   return '';
 }
@@ -99,20 +113,62 @@ function treatmentStatus(text, base){
   const good=/realizad|hech[ao]|correct[ao]|bien|colocad[ao]|terminad[ao]/.test(n);
   if(base==='endo') return bad?'endo_bad':pending&&!good?'endo_indicated':'endo';
   if(base==='post') return bad?'post_bad':pending&&!good?'post_pending':'post';
   if(base==='implant') return bad?'implant_review':pending&&!good?'implant_indicated':'implant';
   if(base==='filling') return bad?'filling_bad':pending&&!good?'filling_pending':'filling';
   if(base==='crown') return bad?'crown_bad':pending&&!good?'crown_pending':'crown';
   if(base==='prosthesis') return bad?'prosthesis_bad':pending&&!good?'prosthesis_pending':'prosthesis';
   if(base==='removable') return bad?'removable_bad':pending&&!good?'removable_pending':'removable';
   return base;
 }
+function bridgeEntityCommand(text){
+  const n=ntext(text);
+  if(!/puente|protesis fija/.test(n)) return null;
+  const range=extractFdiRangeFromSpeech(text), teeth=range.length?range:extractAllTeeth(text).filter(t=>/^[1-4][1-8]$/.test(t));
+  if(teeth.length<2) return null;
+  const afterPillars=(String(text).match(/pilares?\s+(.+?)(?:\s+y\s+ponticos|\s+ponticos|$)/i)||[])[1]||'';
+  const afterPontics=(String(text).match(/ponticos?\s+(.+)$/i)||[])[1]||'';
+  const pillars=extractAllTeeth(afterPillars);
+  const pontics=extractAllTeeth(afterPontics);
+  const components=teeth.map(tooth=>({tooth,role:pillars.includes(tooth)?'abutment':pontics.includes(tooth)?'pontic':'pontic',status:'planned'}));
+  if(!components.some(c=>c.role==='abutment')){ components[0].role='abutment'; components[components.length-1].role='abutment'; }
+  return result('odontogram.entity.create',{type:'bridge',teeth,components,status:'planned',metadata:{}},.94,{requires_confirmation:false});
+}
+function implantEntityCommand(text){
+  const n=ntext(text), tooth=extractTooth(text);
+  if(!tooth || !/implante/.test(n)) return null;
+  const placed=/colocad|realizad|hech/.test(n);
+  const components=[
+    {tooth,role:'implant',status:placed?'completed':'planned'},
+    {tooth,role:'abutment',status:/falta.*pilar|pilar.*pendiente/.test(n)?'planned':'planned'},
+    {tooth,role:'crown',status:/falta.*corona|corona.*pendiente/.test(n)?'planned':'planned'}
+  ];
+  return result('odontogram.entity.create',{type:'implant_restoration',teeth:[tooth],components,status:placed?'surgery_done':'planned',metadata:{}},.94);
+}
+function removableEntityCommand(text){
+  const n=ntext(text);
+  if(!/removible/.test(n)) return null;
+  return result('odontogram.entity.create',{type:'removable_prosthesis',teeth:extractAllTeeth(text),arch:archFromSpeech(text)||'upper',components:[{role:'base',status:'planned'}],status:'planned',metadata:{design:/parcial/.test(n)?'parcial':/completa/.test(n)?'completa':'removible'}},.92);
+}
+function orthodonticsEntityCommand(text){
+  const n=ntext(text);
+  if(!/ortodon|alineador|bracket/.test(n)) return null;
+  return result('odontogram.entity.create',{type:'orthodontics',teeth:extractAllTeeth(text),arch:archFromSpeech(text)||'both',components:[{role:/alineador/.test(n)?'aligner':'brackets',status:'planned'}],status:'planned',metadata:{appliance:/alineador/.test(n)?'alineadores':'brackets'}},.92);
+}
+function pediatricEntityCommand(text){
+  const n=ntext(text), teeth=extractAllTeeth(text).filter(t=>/^[5-8][1-8]$/.test(t));
+  if(!teeth.length || !/pulpotomia|pulpectomia|mantenedor|odontopedi/.test(n)) return null;
+  return result('odontogram.entity.create',{type:'pediatric',teeth,status:'planned',components:[{tooth:teeth[0],role:/pulpotomia/.test(n)?'pulpotomy':'pediatric_treatment',status:'planned'}],metadata:{treatment:/pulpotomia/.test(n)?'pulpotomia':'odontopediatria'}},.93);
+}
+function odontogramEntityCommand(text){
+  return bridgeEntityCommand(text)||implantEntityCommand(text)||removableEntityCommand(text)||orthodonticsEntityCommand(text)||pediatricEntityCommand(text);
+}
 function odontogramCommand(text){
   const n=ntext(text), tooth=extractTooth(text), surface=extractSurface(text);
   if(!tooth) return null;
   if(/caries/.test(n)) return result('odontogram.set',{tooth,surface:surface||'O',status:'caries'},.98);
   if(/\b(sano|saludable)\b/.test(n)) return result('odontogram.set',{tooth,status:'healthy'},.96);
   if(/\b(ausente|falta|perdido)\b/.test(n)) return result('odontogram.set',{tooth,status:'missing'},.96);
   if(/extracci|exodon/.test(n)) return result('odontogram.set',{tooth,status:'extraction'},.96);
   if(/endo|conducto/.test(n)) return result('odontogram.set',{tooth,status:treatmentStatus(text,'endo')},.96);
   if(/perno|munon/.test(n)) return result('odontogram.set',{tooth,status:treatmentStatus(text,'post')},.95);
   if(/implante/.test(n)) return result('odontogram.set',{tooth,status:treatmentStatus(text,'implant')},.94);
@@ -188,32 +244,38 @@ export function parseVoiceCommand(text, context={}){
     return result('lab.receive',{patient_query:extractPatientQuery(raw,'lab'),title:labTitle(raw),status:'recibido'},.92);
   }
   if(/\b(presupuesto|presupuesta|precio)\b/.test(n)){
     return result('budget.create',{tooth:extractTooth(raw),treatment:extractTreatment(raw),patient_query:''},.92);
   }
   if(/\b(cita|agenda|programa|citar)\b/.test(n)){
     const tooth=extractTooth(raw), treatment=extractTreatment(raw), date=resolveSpokenDate(raw,context.now||today()), start_time=extractTime(raw)||'10:00', duration_minutes=extractDuration(raw);
     return result('appointment.create',{patient_query:extractPatientQuery(raw,'appointment'),date,start_time,duration_minutes,treatment,tooth,title:treatment==='tratamiento'?'Cita dental':`${treatment}${tooth?' '+tooth:''}`},.91);
   }
 
+  const odEntity=odontogramEntityCommand(raw); if(odEntity) return odEntity;
   const perio=periodontalCommand(raw); if(perio) return perio;
   const od=odontogramCommand(raw); if(od) return od;
   return unknown(text);
 }
 
 export function validateStructuredCommand(command){
   if(!command||typeof command!=='object') return {ok:false,error:'command_not_object'};
   if(!ALLOWED_INTENTS.has(command.intent)) return {ok:false,error:'intent_not_allowed'};
   if(command.slots!=null && (typeof command.slots!=='object'||Array.isArray(command.slots))) return {ok:false,error:'slots_invalid'};
   const slots=command.slots||{};
   if(command.intent==='navigation.open'&&!NAV_TARGETS.has(slots.target)) return {ok:false,error:'navigation_target_invalid'};
   if(command.intent==='odontogram.set' && (!/^([1-4][1-8])$/.test(String(slots.tooth||'')) || !ALLOWED_TOOTH_STATES.has(slots.status))) return {ok:false,error:'odontogram_slots_invalid'};
+  if(command.intent==='odontogram.entity.create'){
+    const allowed=new Set(['bridge','implant_restoration','removable_prosthesis','orthodontics','pediatric','periodontal_chart']);
+    if(!allowed.has(slots.type)) return {ok:false,error:'odontogram_entity_type_invalid'};
+    if(slots.teeth!=null && !Array.isArray(slots.teeth)) return {ok:false,error:'odontogram_entity_teeth_invalid'};
+  }
   if(command.intent==='periodontal.update'&&!/^([1-4][1-8])$/.test(String(slots.tooth||''))) return {ok:false,error:'periodontal_tooth_invalid'};
   if(command.intent==='payment.record' && !(Number(slots.amount)>0)) return {ok:false,error:'payment_amount_invalid'};
   return {ok:true,command:{...command,confidence:Number.isFinite(Number(command.confidence))?Number(command.confidence):.5,source:command.source||'external',slots}};
 }
 
 function resolvePatient(db, query='', fallbackId=null){
   const patients=(db.patients||[]).filter(p=>!p.archived);
   if(query){
     const q=normalizeText(query);
     const exact=patients.find(p=>normalizeText(patientFullName(p))===q || normalizeText(p.ficha||'')===q);
@@ -264,20 +326,26 @@ export function executeVoiceCommand(db, command, context={}){
     return {handled:true,intent:cmd.intent,patient,message:`Paciente guardado: ${patientFullName(patient)}`};
   }
 
   const patient=resolvePatient(db,s.patient_query||'',s.patient_id??fallbackId);
   if(!patient) return needPatient();
 
   if(cmd.intent==='odontogram.set'){
     setToothLegendState(db,patient.id,String(s.tooth),s.status,s.surface||'');
     return {handled:true,intent:cmd.intent,patient,odontogram:{tooth:String(s.tooth),status:s.status,surface:s.surface||''},message:`Odontograma actualizado: ${s.tooth} ${s.status}${s.surface?' '+s.surface:''}`};
   }
+  if(cmd.intent==='odontogram.entity.create'){
+    const entity=createOdontogramEntity(db, patient.id, s);
+    syncLegacyOdontogramFromEntities(db, patient.id);
+    const createdClinicalItems=odontogramEntityToClinicalItems(db, patient.id, entity.id);
+    return {handled:true,intent:cmd.intent,patient,entity,createdClinicalItems,message:`Entidad odontologica creada: ${entity.type}`};
+  }
   if(cmd.intent==='periodontal.update'){
     const rec=ensureOdontogram(db,patient.id)[String(s.tooth)];
     if(s.mobility!=null) rec.periodontal.mobility=String(s.mobility);
     if(Number.isFinite(Number(s.depth_mm)) && Number(s.depth_mm)>=0) rec.periodontal.depths[perioSite(s.surface||'D')]=String(Number(s.depth_mm));
     return {handled:true,intent:cmd.intent,patient,periodontal:{tooth:String(s.tooth)},message:`Periodontal actualizado en ${s.tooth}`};
   }
   if(cmd.intent==='appointment.create'){
     db.appointments=db.appointments||[]; const start=s.start_time||'10:00', duration=Math.max(5,Math.min(360,Number(s.duration_minutes||40)));
     const appointment={id:id(db),patient_id:patient.id,employee_id:Number(s.employee_id||db.employees?.[0]?.id||1),cabinet_id:Number(s.cabinet_id||db.cabinets?.[0]?.id||1),date:s.date||context.now||today(),start_time:start,end_time:addMinutes(start,duration),duration_minutes:duration,title:s.title||'Cita dental',reason:s.title||'Cita dental',detail:s.detail||'',status:'programada',site:s.site||'',confirmed:false,source:`voice:${cmd.source}`,created_at:new Date().toISOString()};
     db.appointments.push(appointment); return {handled:true,intent:cmd.intent,patient,appointment,message:`Cita creada para ${patientFullName(patient)}: ${appointment.date} ${appointment.start_time}`};
diff --git a/tests/verify_odontogram_v3_voice.mjs b/tests/verify_odontogram_v3_voice.mjs
new file mode 100644
index 0000000..86bbd17
--- /dev/null
+++ b/tests/verify_odontogram_v3_voice.mjs
@@ -0,0 +1,37 @@
+import assert from 'node:assert/strict';
+import { defaultDb, odontogramEntitiesForPatient } from '../apps/legacy-preview/logic.js';
+import { parseVoiceCommand, validateStructuredCommand, executeVoiceCommand } from '../apps/legacy-preview/voice-router.js';
+
+const db = defaultDb();
+db.patients.push({ id: 1, first_name: 'Ana', last_name: 'Voz', archived: false });
+
+const bridgeCommand = parseVoiceCommand('puente de 13 a 16 con pilares 13 y 16 y ponticos 14 15');
+assert.equal(bridgeCommand.intent, 'odontogram.entity.create');
+assert.equal(bridgeCommand.slots.type, 'bridge');
+assert.deepEqual(bridgeCommand.slots.teeth, ['13','14','15','16']);
+assert.equal(validateStructuredCommand(bridgeCommand).ok, true);
+const bridgeResult = executeVoiceCommand(db, bridgeCommand, { patientId: 1 });
+assert.equal(bridgeResult.handled, true);
+assert.equal(odontogramEntitiesForPatient(db, 1, { type: 'bridge' }).length, 1);
+
+const implantCommand = parseVoiceCommand('implante 36 colocado falta pilar y corona');
+assert.equal(implantCommand.intent, 'odontogram.entity.create');
+assert.equal(implantCommand.slots.type, 'implant_restoration');
+const implantResult = executeVoiceCommand(db, implantCommand, { patientId: 1 });
+assert.equal(implantResult.entity.type, 'implant_restoration');
+assert.ok(implantResult.createdClinicalItems.length >= 3);
+
+const removableCommand = parseVoiceCommand('protesis removible superior parcial');
+assert.equal(removableCommand.intent, 'odontogram.entity.create');
+assert.equal(removableCommand.slots.type, 'removable_prosthesis');
+assert.equal(removableCommand.slots.arch, 'upper');
+
+const orthoCommand = parseVoiceCommand('ortodoncia con alineadores superior e inferior');
+assert.equal(orthoCommand.slots.type, 'orthodontics');
+assert.equal(orthoCommand.slots.arch, 'both');
+
+const pediatricCommand = parseVoiceCommand('pulpotomia 75');
+assert.equal(pediatricCommand.slots.type, 'pediatric');
+assert.deepEqual(pediatricCommand.slots.teeth, ['75']);
+
+console.log('verify_odontogram_v3_voice: OK');
