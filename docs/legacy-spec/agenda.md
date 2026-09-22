# Especificación legacy · Agenda

Fuente: legacy actual. Debe preservarse la semántica de vistas, acciones contextuales, copiar/pegar, lista de espera, seguridad y acceso rápido. La nueva implementación no debe reutilizar HTML minificado ni DnD HTML5 en táctil.

## Funciones extraídas del legacy

### `renderAgendaByDoctors`

```js
function renderAgendaByDoctors(){
  const data=agendaColumnsForCurrentUser(state.date);
  if(!data.length) return `<div class="agenda-empty-day"><strong>Agenda no vinculada</strong><span>Este usuario odontólogo necesita estar vinculado a su profesional en Ajustes → Usuarios y acceso.</span></div>`;
  return `<div class="agenda-doctor-board">${data.map((col,index)=>{ const accent=agendaDoctorAccent(index); return `<article class="agenda-doctor-column" style="--agenda-accent:${accent}"><header><span class="agenda-doctor-avatar">${esc(initials({first_name:col.employee.name,last_name:''}))}</span><span><strong>${esc(col.employee.name)}</strong><small>${esc(col.employee.role||'Profesional')} · ${esc(col.employee.site||'Sin sede')}</small></span><b>${col.appointments.length}</b></header>${col.absences.length?`<div class="agenda-doctor-absence">${esc(col.absences.map(a=>a.type).join(' · '))}</div>`:''}<div class="agenda-doctor-cards">${col.appointments.length?col.appointments.map(a=>apptCard({...a,_agendaIndex:index},{compact:true})).join(''):'<div class="agenda-empty-compact">Sin citas</div>'}</div><button class="agenda-add-inline" type="button" data-new-appt-emp="${col.employee.id}">+ Añadir cita</button></article>`; }).join('')}</div>`;
}
```

### `renderAgendaList`

```js
function renderAgendaList({mobile=false}
```

### `renderAgendaTimeline`

```js
function renderAgendaTimeline(){
  const ag=db.settings?.agenda||{}, slotMinutes=Number(db.settings?.slotMinutes||20), start=ag.day_start||'09:00', end=ag.day_end||'20:00', startMin=agendaMinutes(start), endMin=Math.max(startMin+60,agendaMinutes(end)), pxPerMinute=1.05, height=Math.max(520,Math.round((endMin-startMin)*pxPerMinute));
  const data=agendaColumnsForCurrentUser(state.date), hourMarks=[];
  for(let t=Math.ceil(startMin/60)*60;t<=endMin;t+=60) hourMarks.push(t);
  const now=new Date(), nowMin=now.getHours()*60+now.getMinutes(), showNow=state.date===today()&&nowMin>=startMin&&nowMin<=endMin;
  return `<div class="agenda-timeline-shell" data-slot-minutes="${slotMinutes}"><div class="agenda-timeline-grid agenda-timeline-head" style="--agenda-doctors:${Math.max(1,data.length)}"><div class="agenda-time-head">Hora</div>${data.map((col,index)=>`<div class="agenda-doctor-head" style="--agenda-accent:${agendaDoctorAccent(index)}"><span class="agenda-doctor-dot"></span><span><strong>${esc(col.employee.name)}</strong><small>${esc(col.employee.site||'Sin sede')}</small></span></div>`).join('')}</div><div class="agenda-timeline-grid agenda-timeline-body" style="--agenda-doctors:${Math.max(1,data.length)};--agenda-height:${height}px"><div class="agenda-time-rail" style="height:${height}px">${hourMarks.map(t=>`<span style="top:${Math.round((t-startMin)*pxPerMinute)}px">${String(Math.floor(t/60)).padStart(2,'0')}:00</span>`).join('')}</div>${data.map((col,index)=>`<div class="agenda-doctor-track" data-agenda-track="${col.employee.id}" data-agenda-paste-slot data-agenda-start-min="${startMin}" data-agenda-px-minute="${pxPerMinute}" data-agenda-slot-minutes="${slotMinutes}" style="height:${height}px;--agenda-accent:${agendaDoctorAccent(index)}">${hourMarks.map(t=>`<i class="agenda-hour-line" style="top:${Math.round((t-startMin)*pxPerMinute)}px"></i>`).join('')}${showNow?`<i class="agenda-now-line" style="top:${Math.round((nowMin-startMin)*pxPerMinute)}px"><span>Ahora</span></i>`:''}${col.appointments.map(a=>{ const top=Math.max(0,(agendaMinutes(a.start_time)-startMin)*pxPerMinute), dur=Math.max(28,(agendaMinutes(a.end_time)-agendaMinutes(a.start_time))*pxPerMinute), meta=agendaStatusMeta(a), p=a.patient||patient(a.patient_id), conflict=a.availability_status&&a.availability_status!=='ok'; return `<button type="button" class="agenda-timeline-card tone-${meta.tone} ${conflict?'has-warning':''}" data-agenda-open="${a.id}" style="top:${Math.round(top)}px;height:${Math.round(dur)}px"><span>${esc(a.start_time||'')} · ${esc(p?patientFullName(p):'Sin paciente')}</span><strong>${esc(a.title||a.reason||'Cita dental')}</strong>${dur>48?`<small>${esc(meta.label)}</small>`:''}</button>`; }).join('')}<button class="agenda-track-add" type="button" data-new-appt-emp="${col.employee.id}" aria-label="Añadir cita con ${esc(col.employee.name)}">+</button></div>`).join('')}</div></div>${renderAgendaList({mobile:true})}`;
}
```

### `renderAgendaClipboardBar`

```js
function renderAgendaClipboardBar(){
  const a=agendaClipboardAppointment(); if(!a) return '';
  const p=patient(a.patient_id);
  return `<div class="agenda-clipboard-bar" role="status"><span><strong>Cita copiada</strong><small>${esc(p?patientFullName(p):'Paciente')} · ${esc(a.title||'Cita dental')} · ${esc(String(a.duration_minutes||durationMinutes(a.start_time,a.end_time)||40))} min</small></span><div><button type="button" data-agenda-paste-open>Pegar…</button><button type="button" class="ghost" data-agenda-copy-clear>Cancelar copia</button></div></div>`;
}
```

### `renderAgendaContextMenu`

```js
function renderAgendaContextMenu(){
  const ctx=state.agendaContext, a=ctx&&db.appointments.find(x=>Number(x.id)===Number(ctx.id)); if(!a) return '';
  const x=Math.max(12,Math.min(Number(ctx.x||20),Math.max(12,window.innerWidth-230))), y=Math.max(12,Math.min(Number(ctx.y||20),Math.max(12,window.innerHeight-250)));
  const extend=ctx.mode==='extend';
  return `<div class="agenda-context-layer"><button class="agenda-context-backdrop" type="button" data-agenda-context-close aria-label="Cerrar menú"></button><div class="agenda-context-menu" data-agenda-context style="left:${x}px;top:${y}px" role="menu" aria-label="Opciones de cita">${extend?`<div class="agenda-context-title"><button type="button" data-agenda-context-back>‹</button><strong>Extender cita</strong></div><div class="agenda-context-extend">${[10,20,30,60].map(n=>`<button type="button" data-agenda-extend="${n}" data-agenda-id="${a.id}">+${n} min</button>`).join('')}</div>`:`<button type="button" data-agenda-context-action="copy" data-agenda-id="${a.id}">Copiar</button><button type="button" data-agenda-context-action="extend" data-agenda-id="${a.id}">Extender</button><button type="button" class="danger" data-agenda-context-action="cancel" data-agenda-id="${a.id}">Cancelar</button>`}</div></div>`;
}
```

### `renderAgendaQuickPanel`

```js
function renderAgendaQuickPanel(){
  const a=db.appointments.find(x=>Number(x.id)===Number(state.agendaQuickId)); if(!a) return '';
  const p=patient(a.patient_id), e=emp(a.employee_id), meta=agendaStatusMeta(a), duration=durationMinutes(a.start_time,a.end_time)||Number(a.duration_minutes||0);
  return `<aside class="agenda-quick-panel" aria-label="Detalle rápido de cita"><div class="agenda-quick-backdrop" data-agenda-close></div><div class="agenda-quick-card"><header><div><span class="agenda-status-pill tone-${meta.tone}">${esc(meta.label)}</span><h2>${esc(p?patientFullName(p):'Sin paciente')}</h2><p>${esc(a.title||a.reason||'Cita dental')}</p></div><button class="icon-btn" type="button" data-agenda-close aria-label="Cerrar">×</button></header><div class="agenda-quick-facts"><div><small>Horario</small><strong>${esc(a.start_time||'')}–${esc(a.end_time||'')}</strong><span>${duration?duration+' min':''}</span></div><div><small>Profesional</small><strong>${esc(e?.name||'Sin profesional')}</strong><span>${esc(a.site||e?.site||'Sin sede')}</span></div></div>${a.detail?`<div class="agenda-quick-note"><small>Detalle</small><p>${esc(a.detail)}</p></div>`:''}<div class="agenda-quick-actions"><button type="button" data-agenda-action="confirm" data-agenda-id="${a.id}">Confirmar</button><button type="button" data-agenda-action="arrival" data-agenda-id="${a.id}">Ha llegado</button><button type="button" data-agenda-action="cabinet" data-agenda-id="${a.id}">A gabinete</button><button type="button" data-agenda-action="absent" data-agenda-id="${a.id}">Ausente / NPA</button><button type="button" data-agenda-action="complete" data-agenda-id="${a.id}">Completar</button></div><div class="agenda-quick-footer"><button class="ghost" type="button" data-agenda-action="reschedule" data-agenda-id="${a.id}">Reprogramar</button><button class="ghost" type="button" data-agenda-action="cancel" data-agenda-id="${a.id}">Cancelar</button>${p?`<button class="ghost" type="button" data-agenda-action="patient" data-agenda-id="${a.id}">Abrir ficha</button>`:''}</div></div></aside>`;
}
```

### `renderAgenda`

```js
function renderAgenda(){
  const c=agendaVisibleCounters(), view=state.agendaView==='doctors'?renderAgendaByDoctors():state.agendaView==='list'?renderAgendaList():renderAgendaTimeline();
  return `<section class="agenda-v10"><header class="agenda-commandbar"><div class="agenda-title-block"><span class="eyebrow">Organización clínica</span><h1>Agenda</h1><p>${esc(prettyDate(state.date))}</p></div><div class="agenda-day-controls"><button type="button" class="agenda-nav-arrow" id="prevDay" aria-label="Día anterior">‹</button><button type="button" class="agenda-today-btn" id="agendaToday">Hoy</button><input id="agendaDate" type="date" value="${state.date}" aria-label="Fecha de agenda"><button type="button" class="agenda-nav-arrow" id="nextDay" aria-label="Día siguiente">›</button></div><button class="primary agenda-new-btn" id="openAppointmentModal">+ Cita</button></header><div class="agenda-v12-tools" role="toolbar" aria-label="Operaciones de agenda"><button type="button" data-agenda-mode="move">Mover citas</button><button type="button" data-agenda-mode="resize">Duracion</button><button type="button" data-agenda-mode="block">Bloquear hueco</button><button type="button" data-agenda-mode="waiting">Lista de espera</button><button type="button" id="agendaAutoPlanClinical">Planificar plan clinico</button></div><div class="agenda-v12-panels"><div class="agenda-waiting-panel">Lista de espera inteligente preparada para huecos libres.</div><div class="agenda-cascade-panel">Reprogramacion en cascada disponible desde cada cita.</div><div class="agenda-block-card">Bloqueos y vacaciones se validan antes de guardar nuevas citas.</div></div><div class="agenda-overview"><div><strong>${c.total}</strong><span>Citas</span></div><div><strong>${c.confirmed}</strong><span>Confirmadas</span></div><div><strong>${c.waiting}</strong><span>En espera</span></div><div class="${c.conflicts?'attention':''}"><strong>${c.conflicts+c.overlaps}</strong><span>Avisos</span></div></div>${renderAgendaSafetyBanner()}${renderAgendaClipboardBar()}<div class="agenda-viewbar" role="tablist" aria-label="Vista de agenda"><button class="${state.agendaView==='doctors'?'active':''}" data-agenda-view="doctors">Doctores</button><button class="${state.agendaView==='timeline'||state.agendaView==='hours'?'active':''}" data-agenda-view="timeline">Día</button><button class="${state.agendaView==='list'?'active':''}" data-agenda-view="list">Lista</button></div><div class="agenda-content">${view}</div>${renderAgendaQuickPanel()}${renderAgendaContextMenu()}</section>`;
}
```
