# Review package Task 5

Base: 60df7f8be5437ee60900a5e5380642862f5defdc
Head: 8dce169581658d8e1d33ac7b9e8be0c3324bf8bd

## Commits
8dce169 Add odontogram v3 interface controls

## Stat
 apps/legacy-preview/app.js            | 60 +++++++++++++++++++++++++++++++++--
 apps/legacy-preview/styles/styles.css | 18 +++++++++++
 tests/verify_odontogram_v3_ui.mjs     | 28 ++++++++++++++++
 3 files changed, 104 insertions(+), 2 deletions(-)

## Diff
diff --git a/apps/legacy-preview/app.js b/apps/legacy-preview/app.js
index 99b16d5..01e1122 100644
--- a/apps/legacy-preview/app.js
+++ b/apps/legacy-preview/app.js
@@ -5,21 +5,24 @@ import {
   setToothSurfaceState, markArcadeMissing, createPatient, archivePatient, restorePatient, patientDetailActions,
   legendVariant, legendLabel, legendStateText, legendNextIndex, statusTone, normalizeSurfaceForTooth,
   agendaByDoctors, agendaByHours, agendaCounters, appointmentAvailability, durationMinutes, addMinutes,
   agendaMoveAppointment, agendaResizeAppointment, agendaCreateBlock, agendaCancelAppointment,
   agendaWaitingListMatches, agendaRescheduleOptions, agendaCascadeSuggestions, agendaPlanClinicalSequence,
   createConsentDocument, signDocument, createAttendanceCertificateDocument, attendanceAppointmentIsEligible, createTreatmentPlan, treatmentPlanHierarchy, patientTreatmentRoute, schedulePlanStepToAgenda, csvRows, patientFromRow, runAction,
   clinicalPlanGraph, patientClinicalPlanProjection, createClinicalPlanItem, syncClinicalPlanFromOdontogram, syncClinicalPlanBudget,
   createMissingToothAlternatives, clinicalAlternativeContextLabel, updateClinicalAlternativeContext, approveClinicalAlternativeOption,
   setPatientAlternativePreference, setClinicalPlanItemStatus,
   validateStorageHealth, paymentAmountForBudget, isSettledPayment, ensurePatientPortalState, patientPortalDelayDays, patientPortalProjectedDate,
-  patientPortalPaymentPlan, patientPortalHealth, patientPortalRescheduleCandidates, patientPortalWaitingRoom, patientPortalDentalFindings
+  patientPortalPaymentPlan, patientPortalHealth, patientPortalRescheduleCandidates, patientPortalWaitingRoom, patientPortalDentalFindings,
+  ensureOdontogramV3, createOdontogramEntity, odontogramEntitiesForPatient,
+  syncLegacyOdontogramFromEntities, odontogramEntityToClinicalItems,
+  createOdontogramSnapshot, compareOdontogramSnapshots, periodontalVisualSummary
 } from './logic.js';
 import { parseVoiceCommand, validateStructuredCommand, executeVoiceCommand } from './voice-router.js';
 
 const $ = (sel, root=document) => root.querySelector(sel);
 const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
 const storage = (()=>{
   try{
     const s=window.localStorage, key='__denty_storage_probe__';
     s.setItem(key,'1'); s.removeItem(key); return s;
   }catch{
@@ -711,21 +714,33 @@ function legacyRenderPeriodontalMode(od){
 function renderRestorativeModeLegacy(od,p,pid,currentBase,currentIdx,currentCode){
   const labelRow=arr=>arr.map(t=>`<span>${t}</span>`).join('');
   const arch=(title, arr, arcade)=>`<div class="apk-arcade-card ${arcade}"><div class="apk-arcade-label"><strong>${title}</strong><small>${arr.filter(t=>od[t].status==='missing').length} ausentes</small><button class="ghost mini" data-mark-arcade="${arcade}">Arcada ausente</button></div><div class="apk-arcade-content"><div class="tooth-labels compact">${labelRow(arr)}</div><div class="teeth-row compact"><span class="row-spacer"></span>${arr.map(t=>`<button class="tooth-ui apk ${esc(statusTone(od[t].status))} ${state.selectedTooth===t?'selected':''}" data-tooth="${t}" title="${t} · ${esc(toothSummary(od[t]))}">${toothMarkers(t,od[t])}</button>`).join('')}</div><div class="surface-row compact"><span class="row-spacer"></span>${arr.map(t=>`<div class="surface-stack compact">${surfaceSvg(t,od[t])}</div>`).join('')}</div></div></div>`;
   return `<section class="odonto-page05"><article class="card odonto-card apk-like"><div class="odonto-header sticky-odonto"><div><h1>Odontograma</h1><p>${p?esc(patientFullName(p)):'Demo sin paciente'} · modo ${esc(legendLabel(currentBase,currentIdx))}</p></div><div class="odonto-header-actions"><button class="ghost" data-odontogram-back="patient" data-go="patientDetail">Volver al paciente</button><button class="ghost" data-go="patientDetail">Ficha</button></div></div><select id="odontogramPatient" class="select-line">${activePatients().map(x=>`<option value="${x.id}" ${Number(x.id)===Number(pid)?'selected':''}>${esc(patientFullName(x))}</option>`).join('')||'<option value="demo">Demo sin paciente</option>'}</select>${odontoTopSwitch('restorative')}<div class="active-tool-bar tone-${currentCode?statusTone(currentCode):'neutral'}"><span>${currentCode?legendSymbol(currentCode):'○'}</span><strong>${currentCode?esc(legendLabel(currentBase,currentIdx)):'Sin herramienta activa'}</strong><small>${currentCode?esc(legendStateText(currentBase,currentIdx))+' · toca dientes o superficies':'toca una leyenda o mantén pulsado un diente'}</small><button class="ghost mini" id="clearOdontoTool">Salir</button></div>${arch('Maxilar superior',FDI_UPPER,'superior')}${arch('Maxilar inferior',FDI_LOWER,'inferior')}<div class="quick-odonto-actions compact-actions"><button class="ghost" id="cycleSelectedTooth">Estados del diente</button><button class="ghost" id="selectFdiRange">Rango FDI</button><button class="ghost" id="clearSelectedSurface">Limpiar superficie</button></div><section class="legend apk-legend"><div class="section-title"><h2>Leyenda</h2><p>Toque repetido: correcto → insatisfactorio → pendiente. Después toca el diente o una superficie.</p></div><div class="legend-grid apk clinical-grid">${legendItems()}</div><p class="tiny">Azul = correcto · Azul + rojo = insatisfactorio/a revisar · Rojo = pendiente/patología · Verde = sano al finalizar. Las tarjetas indican si actúan en superficie o en diente completo.</p></section></article></section>`;
 }
 function renderRestorativeMode(od,p,pid,currentBase,currentIdx,currentCode){
   const labelRow=arr=>arr.map(t=>`<span>${t}</span>`).join('');
   const teethRow=arr=>`<div class="teeth-row compact"><span class="row-spacer"></span>${arr.map(t=>`<button class="tooth-ui apk ${esc(statusTone(od[t].status))} ${state.selectedTooth===t?'selected':''}" data-tooth="${t}" title="${t} - ${esc(toothSummary(od[t]))}">${toothMarkers(t,od[t])}</button>`).join('')}</div>`;
   const surfaces=arr=>`<div class="surface-row compact"><span class="row-spacer"></span>${arr.map(t=>`<div class="surface-stack compact">${surfaceSvg(t,od[t])}</div>`).join('')}</div>`;
   const arch=(title, arr, arcade)=>`<div class="apk-arcade-card minimal-odontogram ${arcade}"><div class="apk-arcade-label"><strong>${title}</strong><small>${arr.filter(t=>od[t].status==='missing').length} ausentes</small><button class="ghost mini" data-mark-arcade="${arcade}">Arcada ausente</button></div><div class="apk-arcade-content">${arcade==='superior'?`${teethRow(arr)}<div class="tooth-labels compact">${labelRow(arr)}</div>${surfaces(arr)}`:`${surfaces(arr)}<div class="tooth-labels compact">${labelRow(arr)}</div>${teethRow(arr)}`}</div></div>`;
-  return `<section class="odonto-page05"><article class="card odonto-card apk-like"><div class="odonto-header sticky-odonto"><div><h1>Odontograma</h1><p>${p?esc(patientFullName(p)):'Demo sin paciente'} - modo ${esc(legendLabel(currentBase,currentIdx))}</p></div><div class="odonto-header-actions"><button class="ghost" data-odontogram-back="patient" data-go="patientDetail">Volver al paciente</button><button class="ghost" data-go="patientDetail">Ficha</button></div></div><select id="odontogramPatient" class="select-line">${activePatients().map(x=>`<option value="${x.id}" ${Number(x.id)===Number(pid)?'selected':''}>${esc(patientFullName(x))}</option>`).join('')||'<option value="demo">Demo sin paciente</option>'}</select>${odontoTopSwitch('restorative')}<div class="active-tool-bar tone-${currentCode?statusTone(currentCode):'neutral'}"><span>${currentCode?legendSymbol(currentCode):'○'}</span><strong>${currentCode?esc(legendLabel(currentBase,currentIdx)):'Sin herramienta activa'}</strong><small>${currentCode?esc(legendStateText(currentBase,currentIdx))+' - toca dientes o superficies':'toca una leyenda o manten pulsado un diente'}</small><button class="ghost mini" id="clearOdontoTool">Salir</button></div>${arch('Maxilar superior',FDI_UPPER,'superior')}${arch('Maxilar inferior',FDI_LOWER,'inferior')}<div class="quick-odonto-actions compact-actions"><button class="ghost" id="cycleSelectedTooth">Estados del diente</button><button class="ghost" id="selectFdiRange">Rango FDI</button><button class="ghost" id="clearSelectedSurface">Limpiar superficie</button></div><section class="legend apk-legend"><div class="section-title"><h2>Leyenda</h2><p>Toque repetido: correcto -> insatisfactorio -> pendiente. Despues toca el diente o una superficie.</p></div><div class="legend-grid apk clinical-grid">${legendItems()}</div><p class="tiny">Diente blanco con contorno azul. Los colores se reservan para marcas clinicas y estados.</p></section></article></section>`;
+  return `<section class="odonto-page05"><article class="card odonto-card apk-like"><div class="odonto-header sticky-odonto"><div><h1>Odontograma</h1><p>${p?esc(patientFullName(p)):'Demo sin paciente'} - modo ${esc(legendLabel(currentBase,currentIdx))}</p></div><div class="odonto-header-actions"><button class="ghost" data-odontogram-back="patient" data-go="patientDetail">Volver al paciente</button><button class="ghost" data-go="patientDetail">Ficha</button></div></div><select id="odontogramPatient" class="select-line">${activePatients().map(x=>`<option value="${x.id}" ${Number(x.id)===Number(pid)?'selected':''}>${esc(patientFullName(x))}</option>`).join('')||'<option value="demo">Demo sin paciente</option>'}</select>${odontoTopSwitch('restorative')}<div class="active-tool-bar tone-${currentCode?statusTone(currentCode):'neutral'}"><span>${currentCode?legendSymbol(currentCode):'○'}</span><strong>${currentCode?esc(legendLabel(currentBase,currentIdx)):'Sin herramienta activa'}</strong><small>${currentCode?esc(legendStateText(currentBase,currentIdx))+' - toca dientes o superficies':'toca una leyenda o manten pulsado un diente'}</small><button class="ghost mini" id="clearOdontoTool">Salir</button></div>${arch('Maxilar superior',FDI_UPPER,'superior')}${arch('Maxilar inferior',FDI_LOWER,'inferior')}<div class="quick-odonto-actions compact-actions"><button class="ghost" id="cycleSelectedTooth">Estados del diente</button><button class="ghost" id="selectFdiRange">Rango FDI</button><button class="ghost" id="clearSelectedSurface">Limpiar superficie</button></div>${renderOdontogramV3Panel(pid)}<section class="legend apk-legend"><div class="section-title"><h2>Leyenda</h2><p>Toque repetido: correcto -> insatisfactorio -> pendiente. Despues toca el diente o una superficie.</p></div><div class="legend-grid apk clinical-grid">${legendItems()}</div><p class="tiny">Diente blanco con contorno azul. Los colores se reservan para marcas clinicas y estados.</p></section></article></section>`;
+}
+function renderOdontogramV3Panel(pid){
+  ensureOdontogramV3(db,pid);
+  const entities=odontogramEntitiesForPatient(db,pid);
+  const summary=periodontalVisualSummary(db,pid);
+  return `<section class="odontogram-v3-panel"><div class="section-title"><div><h2>Odontograma V3</h2><p>Entidades clinicas compartidas por voz, plan y agenda.</p></div><button class="ghost mini" id="createOdontoSnapshot">Snapshot</button></div><div class="odonto-v3-actions"><button data-odonto-v3="bridge">Puente</button><button data-odonto-v3="implant_restoration">Implante + pilar + corona</button><button data-odonto-v3="removable_prosthesis">Removible</button><button data-odonto-v3="orthodontics">Ortodoncia</button><button data-odonto-v3="pediatric">Odontopediatria</button></div><div class="perio-visual-summary severity-${esc(summary.severity)}"><strong>Periodontal</strong><span>Max ${esc(summary.max_depth)} mm - sangrado ${esc(summary.bleeding_percent)}% - placa ${esc(summary.plaque_percent)}%</span></div><div class="odonto-v3-entities">${entities.length?entities.map(renderOdontoEntityCard).join(''):'<div class="empty-state">Sin entidades V3 todavia.</div>'}</div></section>`;
+}
+function renderOdontoEntityCard(entity){
+  const teeth=(entity.teeth||[]).join(' - ') || entity.arch || 'zona';
+  const bridge=entity.type==='bridge'?`<div class="odonto-bridge-bar">${(entity.components||[]).map(c=>`<span class="${esc(c.role)}">${esc(c.tooth||c.role)}</span>`).join('')}</div>`:'';
+  const chips=(entity.components||[]).map(c=>`<span class="odonto-component-chip">${esc(c.role)}${c.tooth?' '+esc(c.tooth):''}</span>`).join('');
+  return `<article class="odonto-entity-card type-${esc(entity.type)}"><div><strong>${esc(String(entity.type||'entidad').replace(/_/g,' '))}</strong><small>${esc(teeth)} - ${esc(entity.status||'planned')}</small></div>${bridge}<div class="odonto-component-row">${chips}</div><button class="ghost mini" data-entity-plan="${esc(entity.id)}">Plan clinico</button></article>`;
 }
 function renderOdontogram(){
   const p=currentPatient();
   const pid=p?.id||'demo';
   const od=ensureOdontogram(db,pid);
   const currentBase=state.odontoToolBase||'';
   const currentIdx=Number(state.odontoLegendState?.[currentBase]||0);
   const currentCode=currentBase?(state.odontoToolCode||legendVariant(currentBase,currentIdx)):'';
   const mode = state.odontoMode || 'restorative';
   if(mode==='periodontal') return renderPeriodontalMode(od);
@@ -1299,21 +1314,62 @@ async function importPatientFiles(){
       });
     }
     recordAudit('patient_file.import',state.patientId,`${files.length} archivo(s)`);
     persist();
     render();
     toast(`${files.length} archivo(s) importado(s)`);
   }catch(err){
     toast(err?.message||'No se pudo importar el archivo');
   }
 }
+function bindOdontogramV3(){
+  $$('[data-odonto-v3]').forEach(btn=>btn.onclick=()=>{
+    const pid=state.patientId||activePatients()[0]?.id;
+    if(!pid) return toast('Elige paciente');
+    const type=btn.dataset.odontoV3;
+    let input={type,status:'planned',teeth:[state.selectedTooth||'36'],components:[],metadata:{},source:'ui'};
+    if(type==='bridge'){
+      const raw=prompt('Dientes del puente separados por coma', '13,14,15')||'';
+      const teeth=raw.split(/[,\s]+/).map(x=>x.trim()).filter(Boolean);
+      input={...input,teeth,components:teeth.map((tooth,i)=>({tooth,role:i===0||i===teeth.length-1?'abutment':'pontic',status:'planned'}))};
+    }else if(type==='implant_restoration'){
+      const tooth=prompt('Diente/zona del implante', state.selectedTooth||'36')||'36';
+      input={...input,teeth:[tooth],components:[{tooth,role:'implant',status:'planned'},{tooth,role:'abutment',status:'planned'},{tooth,role:'crown',status:'planned'}]};
+    }else if(type==='removable_prosthesis'){
+      input={...input,teeth:[],arch:prompt('Arco: upper/lower/both','upper')||'upper',components:[{role:'base',status:'planned'}],metadata:{design:'parcial'}};
+    }else if(type==='orthodontics'){
+      input={...input,teeth:[],arch:'both',components:[{role:'aligner',status:'planned'}],metadata:{appliance:'alineadores'}};
+    }else if(type==='pediatric'){
+      const tooth=prompt('Diente temporal', '75')||'75';
+      input={...input,teeth:[tooth],components:[{tooth,role:'pulpotomy',status:'planned'}],metadata:{treatment:'pulpotomia'}};
+    }
+    try{ snapshot('odontogram.v3.create',pid); const entity=createOdontogramEntity(db,pid,input); syncLegacyOdontogramFromEntities(db,pid); persist(); render(); toast('Entidad V3 creada: '+entity.type); }
+    catch(err){ toast(err?.message||'No se pudo crear la entidad'); }
+  });
+  $$('[data-entity-plan]').forEach(btn=>btn.onclick=()=>{
+    const pid=state.patientId||activePatients()[0]?.id;
+    try{ snapshot('odontogram.v3.plan',pid); const items=odontogramEntityToClinicalItems(db,pid,Number(btn.dataset.entityPlan)); persist(); render(); toast(items.length+' item(s) enviados al plan clinico'); }
+    catch(err){ toast(err?.message||'No se pudo crear plan clinico'); }
+  });
+  $('#createOdontoSnapshot')?.addEventListener('click',()=>{
+    const pid=state.patientId||activePatients()[0]?.id;
+    if(!pid) return;
+    snapshot('odontogram.v3.snapshot',pid);
+    const snap=createOdontogramSnapshot(db,pid,prompt('Nombre del snapshot','review')||'review');
+    const bucket=db.odontogramSnapshots?.[String(pid)]||[];
+    const previous=bucket.length>1?bucket[bucket.length-2]:null;
+    const diff=previous?compareOdontogramSnapshots(previous,snap):null;
+    persist(); render(); toast(diff?`Snapshot guardado: ${diff.changedTeeth.length} diente(s) cambiados`:'Snapshot guardado');
+  });
+}
 function bindOdonto(){
+  bindOdontogramV3();
   $$('[data-odonto-mode]').forEach(b=>b.onclick=()=>{ state.odontoMode=b.dataset.odontoMode; render(); });
   $$('[data-select-tooth]').forEach(b=>b.onclick=()=>{ state.selectedTooth=String(b.dataset.selectTooth); render(); });
   $$('[data-legend-base]').forEach(btn=>btn.onclick=e=>{ e.preventDefault(); cycleLegend(btn.dataset.legendBase); });
   $$('[data-tooth]').forEach(btn=>{
     btn.onpointerdown=()=>{ const tooth=btn.dataset.tooth; longPressTimer=setTimeout(()=>openToothStateSheet(tooth),650); };
     btn.onpointerup=()=>clearTimeout(longPressTimer); btn.onpointerleave=()=>clearTimeout(longPressTimer); btn.onpointercancel=()=>clearTimeout(longPressTimer);
     btn.onclick=()=>{ clearTimeout(longPressTimer); applyToolToTooth(btn.dataset.tooth); };
     btn.oncontextmenu=e=>{ e.preventDefault(); openToothStateSheet(btn.dataset.tooth); };
   });
   $$('[data-surface-tooth]').forEach(seg=>seg.onclick=e=>{ e.preventDefault(); e.stopPropagation(); const tooth=seg.dataset.surfaceTooth, surface=seg.dataset.surface; const code=state.odontoToolCode||''; if(!['caries','filling','filling_bad','filling_pending'].includes(code)) return applyToolToTooth(tooth); applyToolToTooth(tooth,surface); });
diff --git a/apps/legacy-preview/styles/styles.css b/apps/legacy-preview/styles/styles.css
index e3b4bcd..f8d1763 100644
--- a/apps/legacy-preview/styles/styles.css
+++ b/apps/legacy-preview/styles/styles.css
@@ -953,10 +953,28 @@ html[data-theme="dark"] .agenda-appointment-card.tone-absent,html[data-theme="da
 /* Agenda V12 · operaciones diarias */
 .agenda-v12-tools{display:flex;gap:8px;flex-wrap:wrap;padding:8px;border:1px solid var(--agenda-border);border-radius:16px;background:#fff}
 .agenda-v12-tools button,.agenda-resize-controls span{border:1px solid #d8e1e4;background:#fff;border-radius:12px;padding:8px 10px;font-size:12px;font-weight:850;color:#27414b;cursor:pointer}
 .agenda-v12-tools button:hover,.agenda-resize-controls span:hover{background:#eef6f7;border-color:#b7d7dc}
 .agenda-resize-controls{display:flex;gap:6px;margin-top:8px;grid-column:1/-1;flex-wrap:wrap}
 .agenda-waiting-panel,.agenda-cascade-panel,.agenda-block-card{border:1px solid var(--agenda-border);border-radius:16px;background:#f8fafb;padding:12px;color:#53666f;font-size:12px;font-weight:750}
 .agenda-v12-panels{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
 html[data-theme="dark"] .agenda-v12-tools,html[data-theme="dark"] .agenda-v12-tools button,html[data-theme="dark"] .agenda-resize-controls span{background:#102d38;color:#e4f0f3;border-color:rgba(186,210,219,.16)}
 html[data-theme="dark"] .agenda-waiting-panel,html[data-theme="dark"] .agenda-cascade-panel,html[data-theme="dark"] .agenda-block-card{background:#102d38;color:#b7cbd2}
 @media(max-width:760px){.agenda-v12-panels{grid-template-columns:1fr}.agenda-v12-tools{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.agenda-v12-tools button:last-child{grid-column:1/-1}}
+
+.odontogram-v3-panel{display:grid;gap:12px;border:1px solid var(--line);background:#fff;border-radius:18px;padding:14px;margin:14px 0}
+.odonto-v3-actions{display:flex;gap:8px;flex-wrap:wrap}
+.odonto-v3-actions button{border:1px solid #d8e1e4;background:#fff;border-radius:12px;padding:8px 10px;font-size:12px;font-weight:850;color:#27414b}
+.odonto-v3-entities{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
+.odonto-entity-card{border:1px solid #d9e4e7;border-radius:14px;background:#f8fafb;padding:12px;display:grid;gap:8px}
+.odonto-entity-card strong{text-transform:capitalize}
+.odonto-bridge-bar{display:flex;align-items:center;gap:4px;height:28px}
+.odonto-bridge-bar span{display:grid;place-items:center;min-width:30px;height:24px;border-radius:8px;background:#dceef7;color:#184859;font-size:11px;font-weight:900}
+.odonto-bridge-bar span.abutment{background:#cfe7dc;color:#145333}
+.odonto-bridge-bar span.pontic{background:#e8edf1;color:#485b63;border-style:dashed}
+.odonto-component-row{display:flex;gap:6px;flex-wrap:wrap}
+.odonto-component-chip{display:inline-flex;border:1px solid #d2dde1;border-radius:999px;padding:4px 8px;background:#fff;font-size:11px;font-weight:800;color:#51656d}
+.perio-visual-summary{display:flex;justify-content:space-between;gap:10px;align-items:center;border-radius:14px;padding:10px 12px;background:#eef7f8;color:#24515b;font-size:12px}
+.perio-visual-summary.severity-severe{background:#feecec;color:#8a2424}
+.perio-visual-summary.severity-moderate{background:#fff5dc;color:#75540c}
+.perio-visual-summary.severity-mild{background:#eef6ff;color:#24517e}
+.odonto-snapshot-diff{border:1px solid #d8e1e4;border-radius:14px;padding:10px;background:#fff}
diff --git a/tests/verify_odontogram_v3_ui.mjs b/tests/verify_odontogram_v3_ui.mjs
new file mode 100644
index 0000000..75d9601
--- /dev/null
+++ b/tests/verify_odontogram_v3_ui.mjs
@@ -0,0 +1,28 @@
+import assert from 'node:assert/strict';
+import { readFileSync } from 'node:fs';
+
+const app = readFileSync('apps/legacy-preview/app.js', 'utf8');
+const css = readFileSync('apps/legacy-preview/styles/styles.css', 'utf8');
+
+for (const token of [
+  'odontogram-v3-panel',
+  'data-odonto-v3="bridge"',
+  'data-odonto-v3="implant_restoration"',
+  'data-odonto-v3="removable_prosthesis"',
+  'data-odonto-v3="orthodontics"',
+  'data-odonto-v3="pediatric"',
+  'createOdontogramSnapshot',
+  'periodontalVisualSummary',
+  'bindOdontogramV3'
+]) assert.ok(app.includes(token), `falta token UI ${token}`);
+
+for (const selector of [
+  '.odontogram-v3-panel',
+  '.odonto-entity-card',
+  '.odonto-bridge-bar',
+  '.odonto-component-chip',
+  '.odonto-snapshot-diff',
+  '.perio-visual-summary'
+]) assert.ok(css.includes(selector), `falta estilo ${selector}`);
+
+console.log('verify_odontogram_v3_ui: OK');
