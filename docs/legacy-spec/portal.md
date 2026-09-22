# Especificación legacy · Portal del paciente

Fuente: legacy actual. Se preservan próxima cita, sala de espera, plan, decisiones, pagos, documentos, medios y navegación del portal. La v3 lo reescribirá mobile-first sin iframe para juegos.

## Funciones extraídas del legacy

### `renderPatientPortalNav`

```js
function renderPatientPortalNav(){
  const tabs=[['inicio','Inicio'],['tratamiento','Tratamiento'],['citas','Citas'],['pagos','Pagos'],['documentos','Documentos'],['juegos','Juegos'],['ayuda','Ayuda']];
  return `<nav class="patient-portal-nav" aria-label="Denty Paciente">${tabs.map(([id,label])=>`<button type="button" class="${state.patientPortalTab===id?'active':''}" data-patient-portal-tab="${id}">${iconLabel(id,label,{stacked:true})}</button>`).join('')}</nav>`;
}
```

### `renderPatientPortalStatus`

```js
function renderPatientPortalStatus(d){
  return `<section class="portal-health ${esc(d.health.tone)}" aria-label="Estado del tratamiento"><span class="portal-health-dot" aria-hidden="true"></span><div><small>Estado del tratamiento</small><strong>${esc(d.health.label)}</strong><p>${esc(d.health.message)}</p></div>${d.delayDays?`<b>+${d.delayDays} dias</b>`:'<b>Sin retrasos</b>'}</section>`;
}
```

### `renderPatientPortalRoute`

```js
function renderPatientPortalRoute(d,{compact=false}
```

### `renderPatientPortalAlternatives`

```js
function renderPatientPortalAlternatives(d){
  const groups=d.clinical?.alternatives||[]; if(!groups.length) return '';
  return `<section class="patient-alternatives"><div class="section-title"><div><h2>Opciones que puedes valorar</h2><p>Puedes indicar cuál te interesa más. Tu preferencia no sustituye la validación clínica del profesional.</p></div></div>${groups.map(group=>{ const approved=group.options?.find(o=>Number(o.id)===Number(group.approved_option_id)); const preferred=group.options?.find(o=>Number(o.id)===Number(group.patient_preference?.option_id)); return `<article class="patient-portal-card patient-alt-group"><div class="section-title"><div><h3>${esc(group.title)}</h3><p>${esc(group.context||'')}</p></div>${approved?`<span class="portal-status-chip ok">Clínica: ${esc(approved.title)}</span>`:'<span class="portal-status-chip warn">En estudio</span>'}</div><div class="patient-alt-options">${(group.options||[]).map(option=>{ const isPreferred=Number(preferred?.id)===Number(option.id), isApproved=Number(approved?.id)===Number(option.id), missing=(option.required_context||[]).filter(key=>!group.context_checks?.[key]); return `<section class="patient-alt-option ${isApproved?'approved':''} ${isPreferred?'preferred':''}"><div class="section-title"><div><h4>${esc(option.title)}</h4><p>${esc(option.summary||'')}</p></div>${isPreferred?'<span class="portal-status-chip ok">Tu preferencia</span>':''}</div><div class="alt-procon"><div><strong>Ventajas</strong><ul>${(option.pros||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><div><strong>Inconvenientes</strong><ul>${(option.cons||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div></div><div class="patient-alt-facts"><span><b>Tiempo</b>${esc(option.time_relative||'A confirmar')}</span><span><b>Coste</b>${esc(option.cost_relative||'A confirmar')}</span><span><b>Mantenimiento</b>${esc(option.maintenance||'A confirmar')}</span><span><b>Invasividad</b>${esc(option.invasiveness||'A confirmar')}</span></div><details><summary>Recorrido si se elige esta opción</summary><ol>${(option.plan||[]).map(step=>`<li>${esc(step.title||step.treatment)}</li>`).join('')}</ol><p>${esc(option.limitations||'')}</p></details>${missing.length?`<div class="portal-muted-state">La clínica aún debe revisar ${missing.length} dato(s) antes de poder validar esta opción.</div>`:''}${isApproved?'<div class="ok-banner">Esta opción ha sido validada por la clínica para este caso.</div>':`<button class="${isPreferred?'ghost':'primary'} mini" type="button" data-patient-alt-preference="${group.id}:${option.id}">${isPreferred?'Preferencia guardada':'Me interesa esta opción'}</button>`}</section>`; }).join('')}</div></article>`; }).join('')}</section>`;
}
```

### `renderPatientPortalDecisions`

```js
function renderPatientPortalDecisions(d){
  return `<article class="patient-portal-card"><div class="section-title"><div><h2>Decisiones pendientes</h2><p>Solo mostramos lo que puedes resolver ahora.</p></div><span class="portal-count">${d.decisions.length}</span></div><div class="portal-decision-list">${d.decisions.map(item=>`<button type="button" data-patient-portal-tab="${esc(item.tab)}"><span>${esc(item.label)}</span><b aria-hidden="true">›</b></button>`).join('')}</div></article>`;
}
```

### `renderPatientPortalWaitingRoom`

```js
function renderPatientPortalWaitingRoom(p,d){
  const todayAppt=(db.appointments||[]).filter(a=>Number(a.patient_id)===Number(p.id)&&a.date===today()&&normalizeText(a.status)!=='cancelada').sort((a,b)=>String(a.start_time).localeCompare(String(b.start_time)))[0]||null;
  if(!todayAppt) return `<article class="patient-portal-card waiting-room-card"><div class="section-title"><div><h2>Sala de espera</h2><p>El check-in y la estimacion aparecen el dia de tu cita.</p></div><span class="portal-room-icon" aria-hidden="true">◷</span></div><div class="portal-muted-state">Hoy no tienes una cita activa.</div></article>`;
  if(!d.waitingRoom.checked_in) return `<article class="patient-portal-card waiting-room-card"><div class="section-title"><div><h2>Sala de espera</h2><p>${esc(portalPrettyDate(todayAppt.date))} · ${esc(todayAppt.start_time||'')}</p></div><span class="portal-room-icon" aria-hidden="true">◷</span></div><p>Cuando llegues, registra tu llegada para que recepcion y el gabinete sepan que estas aqui.</p><button class="primary" type="button" id="patientPortalCheckIn">He llegado</button></article>`;
  return `<article class="patient-portal-card waiting-room-card checked-in"><div class="section-title"><div><h2>Sala de espera</h2><p>Check-in registrado</p></div><span class="portal-room-icon" aria-hidden="true">✓</span></div><strong class="waiting-room-position">${esc(d.waitingRoom.label)}</strong><p>${d.waitingRoom.ahead?`Espera estimada: ${d.waitingRoom.eta_min}-${d.waitingRoom.eta_max} minutos.`:'El equipo te llamara cuando el gabinete este preparado.'}</p><small>La estimacion usa el estado actual de la agenda y puede cambiar si una atencion necesita mas tiempo.</small></article>`;
}
```

### `renderPatientPortalPreparation`

```js
function renderPatientPortalPreparation(d){
  if(!d.s.next) return `<article class="patient-portal-card"><h2>Preparar mi cita</h2><div class="portal-muted-state">Primero necesitamos programar tu siguiente visita.</div></article>`;
  const items=patientPortalPreparationItems(d.s.next);
  const completed=new Set(d.portal.preparation[String(d.s.next.id)]||[]);
  return `<article class="patient-portal-card"><div class="section-title"><div><h2>Preparar mi cita</h2><p>${esc(portalPrettyDate(d.s.next.date))} · ${esc(d.s.next.start_time||'')} · ${esc(d.s.next.reason||d.s.next.title||'Revision')}</p></div><span class="portal-count">${completed.size}/${items.length}</span></div><div class="portal-checklist">${items.map(item=>`<label><input type="checkbox" data-portal-prep="${esc(item.id)}" ${completed.has(item.id)?'checked':''}><span>${esc(item.label)}</span></label>`).join('')}</div></article>`;
}
```

### `renderPatientPortalMoney`

```js
function renderPatientPortalMoney(d){
  const plan=patientPortalPaymentPlan(d.s.pending,d.portal.payment_months||6);
  const choices=[1,3,6,12];
  return `<article class="patient-portal-card portal-money-card"><div class="section-title"><div><h2>Mi economia del tratamiento</h2><p>Deuda real y tratamiento futuro se muestran por separado.</p></div><button class="ghost mini" type="button" data-patient-portal-tab="pagos">Ver detalle</button></div><div class="treatment-money-grid"><div><small>Tratamiento total</small><strong>${d.s.total.toFixed(2)} EUR</strong></div><div><small>Ya realizado</small><strong>${d.s.treatmentRealized.toFixed(2)} EUR</strong></div><div><small>Ya pagado</small><strong>${d.s.paid.toFixed(2)} EUR</strong></div><div><small>Pendiente de pago</small><strong>${d.s.pending.toFixed(2)} EUR</strong></div><div><small>Tratamiento futuro</small><strong>${d.s.future.toFixed(2)} EUR</strong></div><div><small>Simulacion actual</small><strong>${plan.monthly.toFixed(2)} EUR/mes</strong></div></div><div class="payment-simulator"><b>Como prefieres visualizarlo</b>${choices.map(months=>`<button type="button" class="${plan.months===months?'active':''}" data-portal-payment-months="${months}">${months===1?'Pago completo':months+' meses'}</button>`).join('')}<p>${plan.total?`Simulacion: ${plan.monthly.toFixed(2)} EUR durante ${plan.months} mes(es)${plan.months>1?`, ultimo pago ${plan.last_payment.toFixed(2)} EUR`:''}.`: 'No tienes saldo pendiente registrado.'} Esto no activa cargos recurrentes ni constituye financiacion.</p></div></article>`;
}
```

### `renderPatientPortalMedia`

```js
function renderPatientPortalMedia(d){
  const safeUrl=value=>/^https?:\/\//i.test(String(value||''))?String(value):'';
  const smile=safeUrl(d.portal.smilecloud_url), arch=safeUrl(d.portal.archform_url);
  const links=d.portal.education_links.filter(x=>safeUrl(x?.url));
  return `<article class="patient-portal-card"><div class="section-title"><div><h2>Mi sonrisa y planificacion</h2><p>Fotos, simulaciones y recursos que tu clinica haya vinculado a tu caso.</p></div></div><div class="portal-media-actions">${smile?`<a class="ghost" href="${esc(smile)}" target="_blank" rel="noopener">Abrir Smilecloud</a>`:'<span class="portal-integration-off">Smilecloud · no enlazado</span>'}${arch?`<a class="ghost" href="${esc(arch)}" target="_blank" rel="noopener">Abrir ArchForm</a>`:'<span class="portal-integration-off">ArchForm · no enlazado</span>'}</div><h3>Videos aprobados por tu clinica</h3>${links.length?`<div class="portal-education-links">${links.map(link=>`<a href="${esc(link.url)}" target="_blank" rel="noopener"><strong>${esc(link.title||'Ver video')}</strong><span>Recurso externo revisado por la clinica ↗</span></a>`).join('')}</div>`:'<div class="portal-muted-state">Tu clinica todavia no ha asociado videos educativos a este tratamiento.</div>'}</article>`;
}
```

### `renderPatientPortalDentalFindings`

```js
function renderPatientPortalDentalFindings(d,{compact=false}
```

### `renderPatientPortalHome`

```js
function renderPatientPortalHome(p,d){
  const next=d.s.next;
  return `${renderPatientPortalStatus(d)}${renderPatientPortalDentalFindings(d,{compact:true})}<article class="patient-portal-hero"><div class="section-title"><div><h2>Tu tratamiento ahora</h2><p>${esc(d.s.current?.title||d.s.phase||'Plan clinico activo')}</p></div><strong>${d.s.progress}%</strong></div><div class="treatment-progress-bar" aria-label="Progreso del tratamiento"><span style="width:${d.s.progress}%"></span></div><div class="treatment-now-grid"><div><small>Fase actual</small><strong>${esc(d.s.current?.phase||d.s.phase||'Plan activo')}</strong><span>${esc(d.s.current?.detail||'Seguimiento clinico en curso.')}</span></div><div><small>Finalizacion estimada</small><strong>${esc(portalPrettyDate(d.projectedDate))}</strong><span>${d.delayDays?`La previsión incluye ${d.delayDays} dia(s) añadidos por cambios de cita.`:'Sigues la planificacion temporal disponible.'}</span></div><div><small>Proxima cita</small><strong>${next?`${esc(portalPrettyDate(next.date))} · ${esc(next.start_time||'')}`:'Sin cita programada'}</strong><span>${next?esc(next.reason||next.title||'Revision'):'El plan necesita una nueva cita.'}</span><button class="primary mini" type="button" data-patient-portal-tab="citas">${next?'Gestionar cita':'Ver agenda'}</button></div></div><div class="treatment-impact"><strong>Impacto temporal</strong><p>Cuando cambias una cita, Denty separa el posible retraso clinico de cualquier politica economica de cancelacion. No aplicamos cargos automaticamente.</p></div></article><div class="patient-portal-grid">${renderPatientPortalDecisions(d)}${renderPatientPortalWaitingRoom(p,d)}</div>${renderPatientPortalRoute(d,{compact:true})}<div class="patient-portal-grid">${renderPatientPortalPreparation(d)}${d.lastVisit?`<article class="patient-portal-card"><h2>Resumen de la ultima visita</h2><p><strong>${esc(portalPrettyDate(d.lastVisit.date))}</strong> · ${esc(d.lastVisit.title||d.lastVisit.reason||'Visita dental')}</p><p>${esc(d.lastVisit.detail||'La clinica no ha añadido un resumen detallado a esta cita.')}</p><button class="ghost mini" type="button" data-patient-portal-tab="tratamiento">Ver siguiente fase</button></article>`:`<article class="patient-portal-card"><h2>Resumen de la ultima visita</h2><div class="portal-muted-state">Aun no hay una visita anterior registrada en este tratamiento.</div></article>`}</div>${renderPatientPortalMoney(d)}`;
}
```

### `renderPatientPortalTreatment`

```js
function renderPatientPortalTreatment(p,d){
  const current=d.clinical?.items?.find(x=>!treatmentDoneStatus(x.status))||d.s.current;
  const routeCount=d.clinical?.items?.length||portalTreatmentTimeline(d.s).length||0;
  const alternativeCount=d.clinical?.alternatives?.length||0;
  const dentalCount=d.dentalFindings?.length||0;
  const routeBody=renderPatientPortalRoute(d).replace(/^<article class="patient-portal-card portal-route-card">|<\/article>$/g,'');
  const alternativesBody=renderPatientPortalAlternatives(d) || '<div class="portal-muted-state">No hay alternativas abiertas para comparar en este momento.</div>';
  const orderBody=`<article class="patient-portal-card"><p>${esc(current?.why_order||current?.patient_explanation||current?.detail||'El plan intenta resolver primero lo que condiciona las fases siguientes.')}</p><ul><li>Las dependencias vienen del mismo plan que usa la clínica.</li><li>Las alternativas muestran ventajas e inconvenientes antes de expresar una preferencia.</li><li>Una preferencia del paciente nunca se convierte automáticamente en indicación clínica.</li></ul></article>`;
  const delayBody=`<article class="patient-portal-card"><p>La fase actual es <strong>${esc(current?.patient_title||current?.title||d.s.phase||'tu tratamiento activo')}</strong>. Aplazar revisiones puede desplazar fases que dependen de esta y alargar la ruta global.</p><div class="treatment-impact"><strong>${d.delayDays?`Retraso acumulado: +${d.delayDays} dias`:'Ahora mismo no hay retraso acumulado'}</strong><p>La evolución clínica exacta depende de tu caso y la confirma siempre tu profesional.</p></div></article>`;
  const patientRoleBody=`<article class="patient-portal-card"><div class="patient-tasks"><span>Acudir o reprogramar con la mayor antelacion posible.</span><span>Seguir las instrucciones individualizadas entregadas por tu profesional.</span><span>Comunicar cambios de salud, medicacion o alergias para que el equipo los revise.</span></div><h3>Responsabilidad de la clínica</h3><p>Validar las opciones, explicar alternativas, actualizar el progreso y avisarte si una fase necesita cambiar.</p></article>`;
  return `${renderPatientPortalStatus(d)}<div class="patient-treatment-accordion">${renderPatientTreatmentDisclosure({title:'Mi boca ahora',subtitle:'Hallazgos que la clínica ha marcado en tu odontograma',body:renderPatientPortalDentalFindings(d),badge:dentalCount?`${dentalCount}`:''})}${renderPatientTreatmentDisclosure({title:'Ruta hasta terminar',subtitle:'Orden del tratamiento y por qué una fase depende de otra',body:routeBody,badge:routeCount?`${routeCount} pasos`:''})}${renderPatientTreatmentDisclosure({title:'Opciones de tratamiento',subtitle:'Compara ventajas, inconvenientes y recorridos posibles',body:alternativesBody,badge:alternativeCount?`${alternativeCount}`:''})}${renderPatientTreatmentDisclosure({title:'Por qué este orden',subtitle:'Por que me recomiendan esto y qué condiciona la secuencia clínica',body:orderBody})}${renderPatientTreatmentDisclosure({title:'Qué pasa si lo retraso',subtitle:'Impacto posible de mover fases o revisiones',body:delayBody,badge:d.delayDays?`+${d.delayDays} días`:''})}${renderPatientTreatmentDisclosure({title:'Qué tengo que hacer yo',subtitle:'Tus próximos pasos y los de la clínica',body:patientRoleBody})}${renderPatientTreatmentDisclosure({title:'Mi sonrisa y planificación',subtitle:'Simulaciones, recursos y material compartido',body:renderPatientPortalMedia(d)})}</div>`;
}
```

### `renderPatientPortalAppointments`

```js
function renderPatientPortalAppointments(p,d){
  const next=d.s.next;
  const changes=d.portal.appointment_changes.slice().sort((a,b)=>String(b.changed_at||'').localeCompare(String(a.changed_at||'')));
  const lateNotice=next?(()=>{ const when=new Date(`${next.date}T${next.start_time||'12:00'}:00`).getTime(); const hours=(when-Date.now())/3600000; return Number.isFinite(hours)&&hours>=0&&hours<24; })():false;
  return `<div class="patient-portal-grid"><article class="patient-portal-card portal-next-appointment"><div class="section-title"><div><h2>Proxima cita</h2><p>${next?`${esc(portalPrettyDate(next.date))} · ${esc(next.start_time||'')}`:'No hay una cita futura programada'}</p></div>${next?`<span class="portal-status-chip ${next.confirmed?'ok':'warn'}">${next.confirmed?'Confirmada':'Por confirmar'}</span>`:''}</div>${next?`<h3>${esc(next.reason||next.title||'Revision')}</h3><p>${esc(next.detail||'La clinica no ha añadido instrucciones especificas para esta cita.')}</p><div class="toolbar">${next.confirmed?'':`<button class="primary" type="button" id="patientPortalConfirmAppointment">Confirmar cita</button>`}<button class="ghost" type="button" id="patientPortalReschedule">Necesito cambiarla</button></div>${lateNotice?'<div class="portal-policy-warning"><strong>Cambio con menos de 24 horas</strong><p>La politica economica de cancelaciones de la clinica, si existe y fue aceptada, se revisa aparte del impacto temporal del tratamiento. Denty no aplica cargos automaticamente.</p></div>':''}`:'<p>Puedes contactar con la clinica desde Ayuda para coordinar la siguiente fase.</p>'}</article><article class="patient-portal-card"><h2>Lista de espera</h2><p>Si se libera un hueco compatible antes de tu cita, la clinica podra ofrecertelo.</p>${next?`<button class="${d.waitingListActive?'danger':'ghost'}" type="button" id="patientPortalWaitingListToggle">${d.waitingListActive?'Salir de la lista de espera':'Avisarme si se libera antes'}</button>`:'<div class="portal-muted-state">Necesitas una cita futura para activar esta opcion.</div>'}<small>No cambia tu cita actual hasta que aceptes una alternativa.</small></article></div>${renderPatientPortalPreparation(d)}${renderPatientPortalWaitingRoom(p,d)}<article class="patient-portal-card"><div class="section-title"><div><h2>Historial de cambios</h2><p>Asi puedes ver cuanto tiempo han añadido las reprogramaciones.</p></div><strong>${d.delayDays?`+${d.delayDays} dias`:'0 dias'}</strong></div>${changes.length?`<div class="portal-history">${changes.map(change=>`<div><span><strong>${esc(portalPrettyDate(change.old_date))} → ${esc(portalPrettyDate(change.new_date))}</strong><small>${esc(change.reason||'Cambio solicitado')} · ${esc(change.changed_at?new Date(change.changed_at).toLocaleString('es-ES'):'')}</small></span><b>${Number(change.impact_days||0)>0?`+${Number(change.impact_days)} dias`:'Sin retraso'}</b></div>`).join('')}</div>`:'<div class="portal-muted-state">No has reprogramado citas desde que se activo este seguimiento.</div>'}</article>`;
}
```

### `renderPatientPortalPayments`

```js
function renderPatientPortalPayments(p,d){
  const rows=d.s.rows;
  return `${renderPatientPortalMoney(d)}<article class="patient-portal-card"><div class="section-title"><div><h2>Presupuestos en lenguaje claro</h2><p>Lo pagado, lo pendiente y el tratamiento aun no realizado no se mezclan.</p></div></div>${rows.length?`<div class="portal-budget-list">${rows.map(row=>`<div><span><strong>${esc(row.title||'Presupuesto')}</strong><small>${row.tooth?`Diente ${esc(row.tooth)} · `:''}${esc(row.source||'clinica')}</small></span><span class="money-stack"><b>${Number(row.total||0).toFixed(2)} EUR</b><small>Pagado ${Number(row.paid||0).toFixed(2)} · Pendiente ${Number(row.pending||0).toFixed(2)}</small></span></div>`).join('')}</div>`:'<div class="portal-muted-state">No hay presupuestos asociados a tu ficha.</div>'}<div class="portal-finance-note"><strong>Importante</strong><p>El simulador organiza visualmente el saldo. Una financiacion real debe mostrar proveedor, intereses, TAE, cuotas y consentimiento antes de contratarse.</p></div></article>`;
}
```

### `renderPatientPortalDocuments`

```js
function renderPatientPortalDocuments(p,d){
  const docs=(db.documents||[]).filter(doc=>Number(doc.patient_id)===Number(p.id)).sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
  const files=(db.files||[]).filter(file=>Number(file.patient_id)===Number(p.id));
  return `<article class="patient-portal-card"><div class="section-title"><div><h2>Documentos</h2><p>Consentimientos, justificantes y archivos que forman parte de tu tratamiento.</p></div><button class="ghost mini" type="button" id="patientPortalAttendanceCertificate">Justificante de asistencia</button></div>${docs.length?`<div class="portal-document-list">${docs.map(doc=>`<div><span><strong>${esc(doc.title||'Documento')}</strong><small>${esc(doc.status||'pendiente')} · ${esc(doc.created_at?new Date(doc.created_at).toLocaleDateString('es-ES'):'')}</small></span><div class="toolbar"><button class="ghost mini" type="button" data-view-doc="${doc.id}">Ver</button><button class="ghost mini" type="button" data-pdf-doc="doc:${doc.id}">PDF</button></div></div>`).join('')}</div>`:'<div class="portal-muted-state">No tienes documentos asociados todavia.</div>'}</article><article class="patient-portal-card"><h2>Archivos de mi caso</h2>${files.length?`<div class="portal-document-list">${files.map(file=>`<div><span><strong>${esc(file.original_name||file.title||'Archivo')}</strong><small>${esc(file.category||file.kind||'archivo')} · ${Number(file.size||0)?`${Math.max(1,Math.round(Number(file.size)/1024))} KB`:''}</small></span>${file.data_url?`<a class="ghost mini" href="${esc(file.data_url)}" download="${esc(file.original_name||file.title||'archivo')}">Descargar</a>`:''}</div>`).join('')}</div>`:'<div class="portal-muted-state">No hay archivos compartidos en esta preview.</div>'}</article>`;
}
```

### `renderPatientPortalHelp`

```js
function renderPatientPortalHelp(p,d){
  const requests=d.portal.support_requests.slice().sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
  return `<div class="patient-portal-grid"><article class="patient-portal-card"><h2>Necesito ayuda</h2><p>Envia la consulta con contexto para que llegue al equipo como una tarea pendiente.</p><div class="portal-help-actions"><button class="primary" type="button" id="patientPortalSupport">Enviar consulta</button><button class="ghost" type="button" id="patientPortalMedicalUpdate">Comunicar cambio medico</button></div><small>Un cambio medico queda pendiente de revision. Denty no modifica automaticamente diagnosticos, alergias ni medicacion.</small></article><article class="patient-portal-card"><h2>Mis solicitudes</h2>${requests.length?`<div class="portal-support-list">${requests.map(req=>`<div><span><strong>${esc(req.category)}</strong><small>${esc(req.created_at?new Date(req.created_at).toLocaleString('es-ES'):'')}</small><p>${esc(req.message)}</p></span><b class="portal-status-chip ${req.status==='resuelto'?'ok':'warn'}">${esc(req.status||'pendiente')}</b></div>`).join('')}</div>`:'<div class="portal-muted-state">No tienes solicitudes abiertas.</div>'}</article></div>${renderPatientPortalMedia(d)}<article class="patient-portal-card"><h2>Privacidad y acceso familiar</h2><p>La delegacion a padres, tutores o familiares requiere autenticacion y permisos de servidor. Esta preview no concede acceso a otras fichas para evitar simular una seguridad que aun no existe.</p></article>`;
}
```

### `renderPatientPortal`

```js
function renderPatientPortal(){
  const p=portalPatient();
  const d=patientPortalContext(p);
  const tab=state.patientPortalTab||'inicio';
  let body=renderPatientPortalHome(p,d);
  if(tab==='tratamiento') body=renderPatientPortalTreatment(p,d);
  else if(tab==='citas') body=renderPatientPortalAppointments(p,d);
  else if(tab==='pagos') body=renderPatientPortalPayments(p,d);
  else if(tab==='documentos') body=renderPatientPortalDocuments(p,d);
  else if(tab==='juegos') body=renderPatientGamesModule({portal:true,patientId:p.id});
  else if(tab==='ayuda') body=renderPatientPortalHelp(p,d);
  return `<section class="patient-portal"><header class="patient-portal-brandbar"><div><span class="patient-brand-mark" aria-hidden="true">${iconSvg('patient')}</span><span><strong>Denty Paciente</strong><small>Espacio personal de ${esc(patientFullName(p))}</small></span></div><button class="ghost" type="button" id="patientPortalExit">Cambiar cuenta</button></header><div class="patient-portal-top"><div><span>Mi espacio</span><h1>Hola, ${esc(p.first_name||'Paciente')}</h1><p>Tu tratamiento, citas, dinero y decisiones en un solo recorrido.</p></div></div>${renderPatientPortalNav()}<div class="patient-portal-body">${body}</div></section>`;
}
```
