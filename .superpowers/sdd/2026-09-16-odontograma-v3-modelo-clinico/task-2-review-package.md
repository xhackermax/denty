# Review package Task 2

Base: 019a26ac83b837165a40a3cb5e86ea1642828836
Head: 5377a74098e2884a18418417189ffc9ad10f2eaa

## Commits
5377a74 Connect odontogram v3 entities to clinical plan

## Stat
 apps/legacy-preview/logic.js                 | 37 ++++++++++++++++++++
 tests/verify_odontogram_v3_clinical_plan.mjs | 50 ++++++++++++++++++++++++++++
 2 files changed, 87 insertions(+)

## Diff
diff --git a/apps/legacy-preview/logic.js b/apps/legacy-preview/logic.js
index 8400277..2be6f28 100644
--- a/apps/legacy-preview/logic.js
+++ b/apps/legacy-preview/logic.js
@@ -941,20 +941,21 @@ export const CLINICAL_PHASES = Object.freeze({
 function normClinical(value){ return normalizeText(value||''); }
 export function canonicalClinicalTreatment(value){
   const n=normClinical(value);
   if(/reendo|retrat.*endo/.test(n)) return 'reendodoncia';
   if(/endo|conducto|nervio/.test(n)) return 'endodoncia';
   if(/extrac|exodon/.test(n)) return 'extraccion';
   if(/raspado|alisado|periodont|curetaje/.test(n)) return 'tratamiento periodontal';
   if(/limpieza|profilaxis|tartrect/.test(n)) return 'limpieza';
   if(/empaste|obtur|restaur|composite|resina/.test(n)) return 'restauracion';
   if(/perno|poste|munon/.test(n)) return 'perno';
+  if(/pilar.*implante|abutment/.test(n)) return 'pilar sobre implante';
   if(/corona.*implante/.test(n)) return 'corona sobre implante';
   if(/corona/.test(n)) return 'corona';
   if(/maryland/.test(n)) return 'puente maryland';
   if(/puente/.test(n)) return 'puente fijo';
   if(/remov|flexite|esquelet/.test(n)) return 'protesis removible';
   if(/implante/.test(n)) return 'implante';
   if(/alineador|ortodon/.test(n)) return 'ortodoncia';
   if(/provisional|essix/.test(n)) return 'provisional';
   return String(value||'').trim() || 'tratamiento';
 }
@@ -986,46 +987,82 @@ function clinicalPatientCopy(item={}){
     'protesis removible':['Reponer los dientes con una prótesis removible','Es una alternativa que se puede retirar y cuyo diseño depende del soporte dental, encías y mordida.'],
     ortodoncia:['Mover los dientes de forma planificada','La ortodoncia requiere una boca estable y controles periódicos para avanzar según la planificación.'],
     provisional:['Usar una solución provisional','Sirve como solución temporal mientras se completa o decide la rehabilitación definitiva.']
   };
   return map[t] || [item.title||`${t}${suffix}`, clinicalPriorityFor(item).reason];
 }
 function procedureMatchForClinical(db,treatment){
   const t=canonicalClinicalTreatment(treatment), ps=(db.procedures||[]).filter(x=>x.active!==false), by=(...terms)=>ps.find(p=>terms.some(term=>normClinical(p.name).includes(normClinical(term))));
   if(t==='corona') return by('corona sobre diente natural');
   if(t==='corona sobre implante') return by('corona definitiva sobre implante','corona sobre implante');
+  if(t==='pilar sobre implante') return by('pilar directo a implante','pilar');
   if(t==='puente fijo') return by('puente sobre dientes naturales');
   if(t==='protesis removible') return by('protesis parcial','flexite');
   if(t==='implante') return by('implante sin corona','planificacion implantologica');
   if(t==='ortodoncia') return by('alineadores');
   if(t==='provisional') return by('protesis provisional');
   return null;
 }
 function clinicalDependencyExplanation(before,after){
   const a=canonicalClinicalTreatment(before?.treatment), b=canonicalClinicalTreatment(after?.treatment);
   if((a==='endodoncia'||a==='reendodoncia')&&b==='perno') return 'El soporte del diente se prepara después de completar el tratamiento endodóntico.';
   if((a==='endodoncia'||a==='reendodoncia'||a==='perno'||a==='restauracion')&&b==='corona') return 'La corona definitiva se coloca después de estabilizar y reconstruir el diente.';
+  if(a==='implante'&&b==='pilar sobre implante') return 'El pilar se coloca despues del implante y de la fase clinica indicada.';
+  if(a==='pilar sobre implante'&&b==='corona sobre implante') return 'La corona sobre implante se coloca despues del pilar protesico.';
   if(a==='implante'&&b==='corona sobre implante') return 'La prótesis definitiva va después del implante y de la fase clínica que el profesional haya indicado.';
   if(a==='extraccion'&&b==='implante') return 'La reposición del diente se planifica después de la extracción y de reevaluar el sitio.';
   return `Este paso necesita que antes se complete “${before?.title||before?.treatment||'el paso anterior'}”.`;
 }
 export function createClinicalPlanItem(db,input={}){
   if(!input.patient_id) throw new Error('Falta paciente');
   db.clinicalPlanItems=Array.isArray(db.clinicalPlanItems)?db.clinicalPlanItems:[];
   const treatment=canonicalClinicalTreatment(input.treatment||input.title), tooth=String(input.tooth||''), surfaces=[...(input.surfaces||[])].map(String), sourceKey=input.source_key||'';
   if(sourceKey){ const existing=db.clinicalPlanItems.find(x=>Number(x.patient_id)===Number(input.patient_id)&&x.source_key===sourceKey&&x.active!==false&&x.status!=='cancelled'); if(existing) return existing; }
   const procedure=input.procedure_id?(db.procedures||[]).find(x=>Number(x.id)===Number(input.procedure_id)):procedureMatchForClinical(db,treatment);
   const seed={...input,treatment,clinical_cause:input.clinical_cause||'',source_text:input.source_text||'',service_id:procedure?.id||input.service_id||null,service_name:procedure?.name||input.service_name||'',price:Number(input.price??procedure?.price??0),duration:Number(input.duration??procedure?.duration??30)};
   const pr=clinicalPriorityFor(seed), [patientTitle,patientReason]=clinicalPatientCopy(seed), now=new Date().toISOString();
   const item={id:id(db),patient_id:Number(input.patient_id),tooth,surfaces,treatment,title:input.title||`${procedure?.name||treatment}${tooth?` · ${tooth}`:''}`,clinical_cause:seed.clinical_cause,source_text:seed.source_text,service_id:seed.service_id,service_name:seed.service_name,price:seed.price,visits:Number(input.visits||1),duration:seed.duration,status:input.status||'planned',active:input.active!==false,phase_key:pr.key,phase_rank:pr.rank,phase_label:pr.label,priority_reason:pr.reason,manual_depends_on:[...(input.depends_on||[])].map(Number),inferred_depends_on:[],depends_on:[...(input.depends_on||[])].map(Number),patient_title:input.patient_title||patientTitle,patient_reason:input.patient_reason||patientReason,clinician_note:input.clinician_note||'',source:input.source||'clinical_plan_web',source_key:sourceKey,alternative_group_id:input.alternative_group_id||null,alternative_option_id:input.alternative_option_id||null,created_at:now,updated_at:now};
   db.clinicalPlanItems.push(item); return item;
 }
+function entityClinicalSourceKey(entity, suffix){ return `odontogram_entity:${entity.id}:${suffix}`; }
+function createEntityPlanItem(db, entity, input, previous=null){
+  return createClinicalPlanItem(db,{patient_id:entity.patient_id,tooth:(input.tooth||entity.teeth?.[0]||''),treatment:input.treatment,title:input.title,source:'odontogram_entity',source_key:entityClinicalSourceKey(entity,input.key),depends_on:previous?[previous.id]:[],duration:input.duration||40,visits:input.visits||1,clinician_note:input.note||''});
+}
+export function odontogramEntityToClinicalItems(db, patientId, entityId){
+  const entity=patientEntityBucket(db, patientId).find(e=>Number(e.id)===Number(entityId)&&e.active!==false);
+  if(!entity) throw new Error('Entidad odontologica no encontrada');
+  const out=[];
+  let previous=null;
+  if(entity.type==='implant_restoration'){
+    const specs=[
+      {key:'implant',treatment:'implante',title:`Implante ${entity.teeth.join(', ')}`,duration:50},
+      {key:'abutment',treatment:'pilar sobre implante',title:`Pilar sobre implante ${entity.teeth.join(', ')}`,duration:25},
+      {key:'crown',treatment:'corona sobre implante',title:`Corona sobre implante ${entity.teeth.join(', ')}`,duration:40}
+    ];
+    for(const spec of specs){ previous=createEntityPlanItem(db,entity,spec,previous); out.push(previous); }
+  }else if(entity.type==='bridge'){
+    const abutments=(entity.components||[]).filter(c=>c.role==='abutment').map(c=>c.tooth).filter(Boolean);
+    const pontics=(entity.components||[]).filter(c=>c.role==='pontic').map(c=>c.tooth).filter(Boolean);
+    out.push(createEntityPlanItem(db,entity,{key:'bridge-prep',treatment:'puente fijo',title:`Preparacion de pilares ${abutments.join(', ')}`,duration:60,note:`Ponticos: ${pontics.join(', ')}`}));
+    out.push(createEntityPlanItem(db,entity,{key:'bridge-seat',treatment:'puente fijo',title:`Cementado de puente ${entity.teeth.join('-')}`,duration:45},out.at(-1)));
+  }else if(entity.type==='removable_prosthesis'){
+    out.push(createEntityPlanItem(db,entity,{key:'removable-records',treatment:'protesis removible',title:`Registros protesis removible ${entity.arch||'arco'}`,duration:40}));
+    out.push(createEntityPlanItem(db,entity,{key:'removable-delivery',treatment:'protesis removible',title:`Entrega protesis removible ${entity.arch||'arco'}`,duration:40},out.at(-1)));
+  }else if(entity.type==='orthodontics'){
+    out.push(createEntityPlanItem(db,entity,{key:'orthodontics-start',treatment:'ortodoncia',title:`Inicio ortodoncia ${entity.arch||'ambos arcos'}`,duration:50}));
+  }else if(entity.type==='pediatric'){
+    out.push(createEntityPlanItem(db,entity,{key:'pediatric-care',treatment:entity.metadata?.treatment||'odontopediatria',title:entity.metadata?.title||`Tratamiento odontopediatrico ${entity.teeth.join(', ')}`,duration:35}));
+  }else if(entity.type==='periodontal_chart'){
+    out.push(createEntityPlanItem(db,entity,{key:'periodontal-control',treatment:'tratamiento periodontal',title:'Control periodontal',duration:45}));
+  }
+  return out;
+}
 export function inferClinicalDependencies(db,patient_id){
   const items=(db.clinicalPlanItems||[]).filter(x=>Number(x.patient_id)===Number(patient_id)&&x.active!==false&&!['cancelled','cancelado'].includes(normClinical(x.status)));
   const byTooth=new Map(); for(const item of items){ const k=String(item.tooth||''); if(!byTooth.has(k)) byTooth.set(k,[]); byTooth.get(k).push(item); }
   for(const item of items){ item.manual_depends_on=Array.isArray(item.manual_depends_on)?item.manual_depends_on:[...(item.depends_on||[])]; item.inferred_depends_on=[]; }
   const find=(xs,treatments)=>xs.find(x=>treatments.includes(canonicalClinicalTreatment(x.treatment)));
   for(const xs of byTooth.values()){
     if(!xs[0]?.tooth) continue;
     const endo=find(xs,['endodoncia','reendodoncia']), post=find(xs,['perno']), crown=find(xs,['corona']), extraction=find(xs,['extraccion']), implant=find(xs,['implante']), implantCrown=find(xs,['corona sobre implante']);
     if(endo&&post) post.inferred_depends_on.push(endo.id);
     if(crown){ if(post) crown.inferred_depends_on.push(post.id); else if(endo) crown.inferred_depends_on.push(endo.id); }
diff --git a/tests/verify_odontogram_v3_clinical_plan.mjs b/tests/verify_odontogram_v3_clinical_plan.mjs
new file mode 100644
index 0000000..09da0c7
--- /dev/null
+++ b/tests/verify_odontogram_v3_clinical_plan.mjs
@@ -0,0 +1,50 @@
+import assert from 'node:assert/strict';
+import {
+  defaultDb,
+  createOdontogramEntity,
+  odontogramEntityToClinicalItems,
+  clinicalPlanGraph
+} from '../apps/legacy-preview/logic.js';
+
+const db = defaultDb();
+db.patients.push({ id: 1, first_name: 'Ana', last_name: 'Implante', archived: false });
+
+const implant = createOdontogramEntity(db, 1, {
+  type: 'implant_restoration',
+  status: 'planned',
+  teeth: ['36'],
+  components: [
+    { role: 'implant', tooth: '36', status: 'planned' },
+    { role: 'abutment', tooth: '36', status: 'planned' },
+    { role: 'crown', tooth: '36', status: 'planned' }
+  ],
+  metadata: { system: 'preview' }
+});
+
+const items = odontogramEntityToClinicalItems(db, 1, implant.id);
+assert.equal(items.length, 3);
+assert.equal(items[0].treatment, 'implante');
+assert.equal(items[1].treatment, 'pilar sobre implante');
+assert.equal(items[2].treatment, 'corona sobre implante');
+assert.deepEqual(items[1].depends_on, [items[0].id]);
+assert.deepEqual(items[2].depends_on, [items[1].id]);
+
+const graph = clinicalPlanGraph(db, 1);
+assert.equal(graph.items[0].id, items[0].id);
+assert.equal(graph.items.at(-1).id, items[2].id);
+
+const bridge = createOdontogramEntity(db, 1, {
+  type: 'bridge',
+  status: 'planned',
+  teeth: ['13', '14', '15'],
+  components: [
+    { role: 'abutment', tooth: '13' },
+    { role: 'pontic', tooth: '14' },
+    { role: 'abutment', tooth: '15' }
+  ]
+});
+const bridgeItems = odontogramEntityToClinicalItems(db, 1, bridge.id);
+assert.ok(bridgeItems.some(x => x.treatment === 'puente fijo'));
+assert.ok(bridgeItems.some(x => x.title.includes('pilares')));
+
+console.log('verify_odontogram_v3_clinical_plan: OK');
