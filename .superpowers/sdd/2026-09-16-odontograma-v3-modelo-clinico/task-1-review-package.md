# Review package Task 1

Base: 81cae294efb845c0c09be61e63d023f381fb814d
Head: c9d6967d00c5b2d2b383cb88fcd61bbb8e258210

## Commits
c9d6967 Add odontogram v3 entity core

## Stat
 apps/legacy-preview/logic.js         | 75 ++++++++++++++++++++++++++++++++++++
 tests/verify_odontogram_v3_model.mjs | 56 +++++++++++++++++++++++++++
 2 files changed, 131 insertions(+)

## Diff
diff --git a/apps/legacy-preview/logic.js b/apps/legacy-preview/logic.js
index bc146e3..245d1eb 100644
--- a/apps/legacy-preview/logic.js
+++ b/apps/legacy-preview/logic.js
@@ -190,20 +190,22 @@ export function defaultDb(){
       secretaria:['pacientes','agenda','finanzas']
     },
     currentUser:{id:11,role:'admin',name:'Administrador clinico'},
     security:{admin_pin_hash:'1234-preview', pin_enabled:true},
     cabinets:[
       {id:1,name:'Gabinete 1',active:true,site_id:1},
       {id:2,name:'Gabinete 2',active:true,site_id:1},
       {id:3,name:'Gabinete cirugia',active:true,site_id:2}
     ],
     odontograms: {},
+    odontogramEntities: {},
+    odontogramSnapshots: {},
     appointments: [],
     agendaBlocks: [],
     appointmentMoves: [],
     treatmentPlans: [],
     clinicalPlanItems: [],
     clinicalAlternativeGroups: [],
     employees,
     doctors: employees.filter(e=>String(e.role||'').includes('odont')).map(e=>({id:e.doctor_id||e.id,name:e.name,color:e.color,active:e.active,site_id:e.site_id})),
     sites,
     shifts,
@@ -278,20 +280,23 @@ export function migrateDb(input){
     agenda:{...base.settings.agenda, ...(incomingSettings.agenda||{})},
     server:{...base.settings.server, ...(incomingSettings.server||{})},
     sync:{...base.settings.sync, ...(incomingSettings.sync||{})},
     mcp:{...base.settings.mcp, ...(incomingSettings.mcp||{})},
     backup:{...base.settings.backup, ...(incomingSettings.backup||{})},
     payments:{...base.settings.payments, ...(incomingSettings.payments||{}), reader_by_site:{...base.settings.payments.reader_by_site,...((incomingSettings.payments||{}).reader_by_site||{})}},
     voice:{...base.settings.voice, ...(incomingSettings.voice||{})}
   };
   db.settings.clinic=db.settings.clinicProfile.name;
   db.odontograms = db.odontograms || {};
+  const current = input || {};
+  db.odontogramEntities = current.odontogramEntities && typeof current.odontogramEntities === 'object' && !Array.isArray(current.odontogramEntities) ? current.odontogramEntities : {};
+  db.odontogramSnapshots = current.odontogramSnapshots && typeof current.odontogramSnapshots === 'object' && !Array.isArray(current.odontogramSnapshots) ? current.odontogramSnapshots : {};
   db.patientPortal = (db.patientPortal && typeof db.patientPortal==='object' && !Array.isArray(db.patientPortal)) ? db.patientPortal : {};
   db.patients = db.patients.map(p => ({
     id: p.id, ficha: p.ficha || p.historia || '', first_name: p.first_name || p.firstName || p.nombre || '', last_name: p.last_name || p.lastName || p.apellidos || '', dni:p.dni||'', phone:p.phone||p.telefono||'', email:p.email||'', birth_date:p.birth_date||p.birthDate||'', archived:!!p.archived, created_at:p.created_at||p.createdAt||new Date().toISOString()
   })).filter(p=>p.id!=null);
   db.appointments = db.appointments.map(a => ({
     id:a.id, patient_id:Number(a.patient_id||a.patientId||0), employee_id:Number(a.employee_id||a.doctorId||1), cabinet_id:Number(a.cabinet_id||1), site_id:a.site_id??null, chain_id:a.chain_id||'', treatment_plan_id:a.treatment_plan_id??null, clinical_item_id:a.clinical_item_id??null, sequence_index:a.sequence_index??null, sequence_total:a.sequence_total??null, rescheduled_from_id:a.rescheduled_from_id??null, date:a.date||today(), start_time:a.start_time||a.time||'10:00', end_time:a.end_time||addMinutes(a.time||'10:00', Number(a.duration||40)), duration_minutes:Number(a.duration_minutes||a.duration||durationMinutes(a.start_time||a.time||'10:00', a.end_time||addMinutes(a.time||'10:00', Number(a.duration||40)))), status:a.status||'programada', title:a.title||'Cita dental', site:a.site||'', confirmed:!!(a.confirmed||a.status==='confirmada'), availability_status:a.availability_status||a.availability724?.level||'ok', availability_message:a.availability_message||'', arrived_at:a.arrived_at||a.check_in_at||a.checked_in_at||'', chair_at:a.chair_at||'', absent_at:a.absent_at||'', completed_at:a.completed_at||'', cancelled_at:a.cancelled_at||'', cancel_reason:a.cancel_reason||'', updated_at:a.updated_at||a.updatedAt||''
   })).filter(a=>a.id!=null);
   db.agendaBlocks = db.agendaBlocks.map((b,i)=>({id:b.id??(i+1),scope:b.scope||'employee',employee_id:b.employee_id??null,cabinet_id:b.cabinet_id??null,site_id:b.site_id??null,date:b.date||today(),start_time:b.start_time||'09:00',end_time:b.end_time||addMinutes(b.start_time||'09:00',Number(b.duration_minutes||60)),reason:b.reason||'Bloqueo',created_by:b.created_by||'',created_at:b.created_at||new Date().toISOString()}));
   db.appointmentMoves = db.appointmentMoves.map((m,i)=>({id:m.id??(i+1),type:m.type||'move',appointment_id:m.appointment_id??null,patient_id:m.patient_id??null,before:m.before||null,after:m.after||null,actor:m.actor||'system',reason:m.reason||'',created_at:m.created_at||new Date().toISOString()}));
   db.employees = seedByName(db.employees.map((e,i)=>({
@@ -493,20 +498,90 @@ export function setToothLegendState(db, patientId, tooth, code, surface=''){
     }
     const family=wholeToothStateFamily(code);
     const states=toothWholeStates(od[t]).filter(existing=>existing!=='healthy'&&existing!=='missing'&&wholeToothStateFamily(existing)!==family);
     states.push(code);
     od[t].whole_states=[...new Set(states)];
     od[t].status=code;
     return od[t];
   }
   throw new Error('Estado odontológico no válido');
 }
+const ODONTO_ENTITY_TYPES = new Set(['bridge','implant_restoration','removable_prosthesis','orthodontics','pediatric','periodontal_chart','snapshot']);
+const ODONTO_ENTITY_STATUS = new Set(['planned','provisional','active','review','failed','completed','surgery_done','uncovered','restored','delivered','adjustment','repair','try_in','retention','paused','monitor','baseline','active_disease','maintenance','stable']);
+
+function normalizeTeeth(input){
+  return [...new Set([...(Array.isArray(input)?input:String(input||'').split(/[,\s-]+/))].map(String).map(x=>x.trim()).filter(Boolean))];
+}
+function normalizeComponents(input){
+  return Array.isArray(input) ? input.map(c=>({ ...c, tooth:c.tooth!=null?String(c.tooth):'', role:String(c.role||c.type||'component'), status:String(c.status||'planned') })) : [];
+}
+function patientEntityBucket(db, patientId){
+  if(!db.odontogramEntities || typeof db.odontogramEntities!=='object' || Array.isArray(db.odontogramEntities)) db.odontogramEntities = {};
+  const key=String(Number(patientId)||patientId||'demo');
+  if(!Array.isArray(db.odontogramEntities[key])) db.odontogramEntities[key]=[];
+  return db.odontogramEntities[key];
+}
+export function ensureOdontogramV3(db, patientId){ return patientEntityBucket(db, patientId); }
+export function odontogramEntitiesForPatient(db, patientId, filters={}){
+  return patientEntityBucket(db, patientId).filter(e=>e.active!==false).filter(e=>!filters.type || e.type===filters.type);
+}
+export function createOdontogramEntity(db, patientId, input={}){
+  const type=String(input.type||'').trim();
+  if(!ODONTO_ENTITY_TYPES.has(type)) throw new Error('Tipo de entidad odontologica no valido');
+  const teeth=normalizeTeeth(input.teeth);
+  if(!teeth.length && !['removable_prosthesis','orthodontics','periodontal_chart'].includes(type)) throw new Error('Faltan dientes o zona');
+  const components=normalizeComponents(input.components);
+  if(type==='bridge'){
+    const abutments=components.filter(c=>c.role==='abutment');
+    if(teeth.length<2) throw new Error('Un puente necesita al menos dos dientes');
+    if(!abutments.length) throw new Error('Un puente necesita al menos un pilar');
+  }
+  const now=new Date().toISOString();
+  const entity={id:id(db),patient_id:Number(patientId)||patientId,type,status:ODONTO_ENTITY_STATUS.has(input.status)?input.status:'planned',teeth,arch:input.arch||'',components,metadata:{...(input.metadata||{})},source:input.source||'odontogram_v3',active:input.active!==false,created_at:now,updated_at:now};
+  patientEntityBucket(db, patientId).push(entity);
+  return entity;
+}
+export function updateOdontogramEntity(db, patientId, entityId, patch={}){
+  const entity=patientEntityBucket(db, patientId).find(e=>Number(e.id)===Number(entityId));
+  if(!entity) throw new Error('Entidad odontologica no encontrada');
+  if(patch.teeth) entity.teeth=normalizeTeeth(patch.teeth);
+  if(patch.components) entity.components=normalizeComponents(patch.components);
+  if(patch.status) entity.status=String(patch.status);
+  if(patch.arch!=null) entity.arch=String(patch.arch);
+  if(patch.metadata) entity.metadata={...(entity.metadata||{}),...(patch.metadata||{})};
+  entity.updated_at=new Date().toISOString();
+  return entity;
+}
+export function deactivateOdontogramEntity(db, patientId, entityId, reason=''){
+  const entity=patientEntityBucket(db, patientId).find(e=>Number(e.id)===Number(entityId));
+  if(!entity) throw new Error('Entidad odontologica no encontrada');
+  entity.active=false; entity.deactivated_at=new Date().toISOString(); entity.deactivated_reason=reason; entity.updated_at=entity.deactivated_at;
+  return entity;
+}
+function legacyCodeForEntity(entity){
+  if(entity.type==='bridge') return entity.status==='planned'?'prosthesis_pending':entity.status==='review'||entity.status==='failed'?'prosthesis_bad':'prosthesis';
+  if(entity.type==='implant_restoration') return entity.status==='planned'?'implant_indicated':entity.status==='review'||entity.status==='failed'?'implant_review':'implant';
+  if(entity.type==='removable_prosthesis') return entity.status==='planned'?'removable_pending':entity.status==='repair'||entity.status==='failed'?'removable_bad':'removable';
+  if(entity.type==='orthodontics') return 'prosthesis_pending';
+  if(entity.type==='pediatric') return entity.status==='completed'?'healthy':'filling_pending';
+  return '';
+}
+export function syncLegacyOdontogramFromEntities(db, patientId){
+  const od=ensureOdontogram(db, patientId);
+  for(const entity of odontogramEntitiesForPatient(db, patientId)){
+    const code=legacyCodeForEntity(entity);
+    if(!code) continue;
+    for(const tooth of entity.teeth||[]) if(od[String(tooth)]) setToothLegendState(db, patientId, String(tooth), code);
+  }
+  return od;
+}
+
 export function clearToothSurface(db, patientId, tooth, surface){
   const t=String(tooth), s=normalizeSurfaceForTooth(t, surface);
   const od=ensureOdontogram(db, patientId);
   if(od[t] && s) delete od[t].surfaces[s];
   return od[t];
 }
 
 export function toothStatusNext(current){ return STATUS_ORDER[(STATUS_ORDER.indexOf(current)+1) % STATUS_ORDER.length] || 'healthy'; }
 export function setToothPrimaryState(db, patientId, tooth, status){ return setToothLegendState(db,patientId,tooth,status); }
 export function setToothSurfaceState(db, patientId, tooth, surface, status){ if(!FDI_ALL.includes(String(tooth))) throw new Error('Diente FDI no válido'); const s=normalizeSurfaceForTooth(tooth, surface); if(!s) throw new Error('Superficie no válida'); const od=ensureOdontogram(db, patientId); od[String(tooth)].surfaces[s]=status; return od[String(tooth)]; }
diff --git a/tests/verify_odontogram_v3_model.mjs b/tests/verify_odontogram_v3_model.mjs
new file mode 100644
index 0000000..549f0e0
--- /dev/null
+++ b/tests/verify_odontogram_v3_model.mjs
@@ -0,0 +1,56 @@
+import assert from 'node:assert/strict';
+import {
+  defaultDb,
+  migrateDb,
+  ensureOdontogram,
+  ensureOdontogramV3,
+  createOdontogramEntity,
+  updateOdontogramEntity,
+  deactivateOdontogramEntity,
+  odontogramEntitiesForPatient,
+  syncLegacyOdontogramFromEntities,
+  toothWholeStates
+} from '../apps/legacy-preview/logic.js';
+
+const db = migrateDb(defaultDb());
+db.patients.push({ id: 1, first_name: 'Ana', last_name: 'Puente', archived: false });
+
+assert.ok(db.odontogramEntities && typeof db.odontogramEntities === 'object', 'migration creates odontogramEntities');
+assert.ok(db.odontogramSnapshots && typeof db.odontogramSnapshots === 'object', 'migration creates odontogramSnapshots');
+assert.deepEqual(ensureOdontogramV3(db, 1), []);
+
+const bridge = createOdontogramEntity(db, 1, {
+  type: 'bridge',
+  status: 'planned',
+  teeth: ['13', '14', '15', '16'],
+  components: [
+    { tooth: '13', role: 'abutment', status: 'planned' },
+    { tooth: '14', role: 'pontic', status: 'planned' },
+    { tooth: '15', role: 'pontic', status: 'planned' },
+    { tooth: '16', role: 'abutment', status: 'planned' }
+  ],
+  metadata: { material: 'zirconio' },
+  source: 'test'
+});
+
+assert.equal(bridge.type, 'bridge');
+assert.equal(bridge.teeth.join(','), '13,14,15,16');
+assert.equal(bridge.components.filter(x => x.role === 'abutment').length, 2);
+assert.equal(odontogramEntitiesForPatient(db, 1, { type: 'bridge' }).length, 1);
+
+const updated = updateOdontogramEntity(db, 1, bridge.id, { status: 'active', metadata: { material: 'metal-ceramica' } });
+assert.equal(updated.status, 'active');
+assert.equal(updated.metadata.material, 'metal-ceramica');
+
+syncLegacyOdontogramFromEntities(db, 1);
+const od = ensureOdontogram(db, 1);
+for (const tooth of ['13', '14', '15', '16']) {
+  assert.ok(toothWholeStates(od[tooth]).includes('prosthesis'), `tooth ${tooth} has legacy prosthesis`);
+}
+
+const inactive = deactivateOdontogramEntity(db, 1, bridge.id, 'duplicated');
+assert.equal(inactive.active, false);
+assert.equal(inactive.deactivated_reason, 'duplicated');
+assert.equal(odontogramEntitiesForPatient(db, 1).length, 0);
+
+console.log('verify_odontogram_v3_model: OK');
