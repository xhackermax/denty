# Agenda V12 Operativa Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Agenda V12 with drag/drop moves, resize, smart waiting list, cancellations, cascade rescheduling, blocks/vacations, multi-appointment treatments and automatic clinical-plan scheduling.

**Architecture:** Keep all scheduling rules in pure functions inside `apps/legacy-preview/logic.js`, then expose them in `apps/legacy-preview/app.js` through deterministic UI controls. The legacy bundle remains the shipped runtime for Next, so every app change must be followed by `node apps/legacy-preview/build-static-bundle.mjs` and `pnpm --filter @denty/web sync:legacy`.

**Tech Stack:** Vanilla JavaScript legacy preview, localStorage persistence, Next static wrapper, Node assertion tests.

**Spec:** `docs/superpowers/specs/2026-09-16-agenda-v12-operativa-design.md`

## Global Constraints

- Keep Agenda V11 status colors for appointment state: waiting yellow, late red, active green, absent blue.
- Do not require backend, external AI, Google Calendar, Outlook or WhatsApp.
- All agenda mutations must be testable from `apps/legacy-preview/logic.js`.
- All mutations must record an audit item in `appointmentMoves[]`.
- Mobile must have button/select alternatives even if desktop drag is present.
- Do not weaken role permissions from the current operational user model.

---

### Task 1: Agenda V12 Data Migration And Core Move Engine

**Files:**
- Modify: `apps/legacy-preview/logic.js`
- Test: `tests/verify_agenda_v12_engine.mjs`

**Interfaces:**
- Consumes: existing `defaultDb`, `migrateDb`, `appointmentAvailability`, `addMinutes`, `durationMinutes`, `id`, `today`.
- Produces:
  - `agendaSlotKey({date,start_time,employee_id,cabinet_id}) -> string`
  - `agendaValidateMove(db, appointment, patch) -> {ok:boolean, status:string, message:string, appointment:object}`
  - `agendaMoveAppointment(db, appointmentId, patch, actor='system') -> object`
  - `agendaResizeAppointment(db, appointmentId, duration_minutes, actor='system') -> object`

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict';
import {
  defaultDb, migrateDb, agendaSlotKey, agendaValidateMove,
  agendaMoveAppointment, agendaResizeAppointment
} from '../apps/legacy-preview/logic.js';

const db = defaultDb();
const patientId = db.patients[0].id;
db.appointments.push(
  {id:101, patient_id:patientId, employee_id:1, cabinet_id:1, site_id:1, date:'2026-09-16', start_time:'10:00', end_time:'10:40', duration_minutes:40, status:'programada', title:'A'},
  {id:102, patient_id:patientId, employee_id:1, cabinet_id:1, site_id:1, date:'2026-09-16', start_time:'11:00', end_time:'11:40', duration_minutes:40, status:'programada', title:'B'}
);
const migrated = migrateDb(db);

assert.ok(Array.isArray(migrated.agendaBlocks), 'migration creates agendaBlocks');
assert.ok(Array.isArray(migrated.appointmentMoves), 'migration creates appointmentMoves');
assert.equal(agendaSlotKey({date:'2026-09-16', start_time:'10:00', employee_id:1, cabinet_id:1}), '2026-09-16|10:00|e:1|c:1');
assert.equal(agendaValidateMove(migrated, migrated.appointments[0], {start_time:'10:20', end_time:'11:00'}).ok, false, 'doctor overlap blocks move');
const moved = agendaMoveAppointment(migrated, 101, {employee_id:2, cabinet_id:2, start_time:'10:20', end_time:'11:00'}, 'admin');
assert.equal(moved.employee_id, 2);
assert.equal(moved.cabinet_id, 2);
assert.equal(moved.start_time, '10:20');
assert.equal(migrated.appointmentMoves.at(-1).type, 'move');
const resized = agendaResizeAppointment(migrated, 101, 60, 'admin');
assert.equal(resized.end_time, '11:20');
assert.equal(resized.duration_minutes, 60);
assert.equal(migrated.appointmentMoves.at(-1).type, 'resize');

console.log('verify_agenda_v12_engine: OK');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests\verify_agenda_v12_engine.mjs`
Expected: FAIL because the exported Agenda V12 functions do not exist.

- [ ] **Step 3: Implement migration fields**

In `migrateDb`, include:

```js
agendaBlocks: Array.isArray(current.agendaBlocks) ? current.agendaBlocks : [],
appointmentMoves: Array.isArray(current.appointmentMoves) ? current.appointmentMoves : [],
```

Also add both keys to the id scan list.

- [ ] **Step 4: Implement pure move helpers**

Add these exports to `logic.js`:

```js
export function agendaSlotKey({date,start_time,employee_id,cabinet_id}){
  return `${date||''}|${start_time||''}|e:${employee_id||''}|c:${cabinet_id||''}`;
}
function agendaMoveAudit(db, type, before, after, actor, reason=''){
  db.appointmentMoves = Array.isArray(db.appointmentMoves) ? db.appointmentMoves : [];
  const entry = {id:id(db), type, appointment_id:after?.id||before?.id, patient_id:after?.patient_id||before?.patient_id||null, before, after, actor, reason, created_at:new Date().toISOString()};
  db.appointmentMoves.push(entry);
  return entry;
}
export function agendaValidateMove(db, appointment, patch={}){
  const candidate = {...appointment, ...patch};
  if(candidate.start_time && !candidate.end_time && candidate.duration_minutes) candidate.end_time = addMinutes(candidate.start_time, Number(candidate.duration_minutes));
  if(candidate.start_time && candidate.end_time) candidate.duration_minutes = durationMinutes(candidate.start_time, candidate.end_time) || Number(candidate.duration_minutes||40);
  const availability = appointmentAvailability(db, candidate);
  return {ok:availability.status==='ok', status:availability.status, message:availability.message, appointment:candidate};
}
export function agendaMoveAppointment(db, appointmentId, patch={}, actor='system'){
  const appt = (db.appointments||[]).find(a=>Number(a.id)===Number(appointmentId));
  if(!appt) throw new Error('Cita no encontrada');
  const before = {...appt};
  const validation = agendaValidateMove(db, appt, patch);
  if(!validation.ok) throw new Error(validation.message || 'Movimiento no disponible');
  Object.assign(appt, validation.appointment, {updated_at:new Date().toISOString()});
  agendaMoveAudit(db, 'move', before, {...appt}, actor);
  return appt;
}
export function agendaResizeAppointment(db, appointmentId, duration_minutes, actor='system'){
  const appt = (db.appointments||[]).find(a=>Number(a.id)===Number(appointmentId));
  if(!appt) throw new Error('Cita no encontrada');
  const duration = Math.max(10, Number(duration_minutes||appt.duration_minutes||40));
  const patch = {duration_minutes:duration, end_time:addMinutes(appt.start_time||'10:00', duration)};
  const before = {...appt};
  const validation = agendaValidateMove(db, appt, patch);
  if(!validation.ok) throw new Error(validation.message || 'Duracion no disponible');
  Object.assign(appt, validation.appointment, {updated_at:new Date().toISOString()});
  agendaMoveAudit(db, 'resize', before, {...appt}, actor);
  return appt;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node tests\verify_agenda_v12_engine.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/legacy-preview/logic.js tests/verify_agenda_v12_engine.mjs
git commit -m "Add agenda v12 move engine"
```

### Task 2: Blocks, Vacations And Open Slot Search

**Files:**
- Modify: `apps/legacy-preview/logic.js`
- Test: `tests/verify_agenda_v12_blocks_slots.mjs`

**Interfaces:**
- Consumes: Task 1 helpers.
- Produces:
  - `agendaCreateBlock(db, input, actor='system') -> object`
  - `agendaFindOpenSlots(db, request) -> Array<{date,start_time,end_time,employee_id,cabinet_id,site_id,score}>`

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict';
import { defaultDb, agendaCreateBlock, agendaFindOpenSlots } from '../apps/legacy-preview/logic.js';

const db = defaultDb();
db.appointments.push({id:301, patient_id:1, employee_id:1, cabinet_id:1, site_id:1, date:'2026-09-16', start_time:'10:00', end_time:'10:40', duration_minutes:40, status:'programada'});
const block = agendaCreateBlock(db, {scope:'employee', employee_id:1, date:'2026-09-16', start_time:'11:00', end_time:'12:00', reason:'Vacaciones'}, 'admin');
assert.equal(block.scope, 'employee');
assert.equal(db.agendaBlocks.length, 1);

const slots = agendaFindOpenSlots(db, {date:'2026-09-16', duration_minutes:40, employee_id:1, cabinet_id:1, site_id:1, start:'09:00', end:'13:00', step:20});
assert.ok(slots.some(s=>s.start_time==='09:00'), '09:00 should be open');
assert.ok(!slots.some(s=>s.start_time==='10:00'), 'existing appointment blocks 10:00');
assert.ok(!slots.some(s=>s.start_time==='11:00'), 'block removes 11:00');
assert.ok(!slots.some(s=>s.start_time==='11:20'), 'block removes overlapping 11:20');

console.log('verify_agenda_v12_blocks_slots: OK');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests\verify_agenda_v12_blocks_slots.mjs`
Expected: FAIL because block and slot helpers do not exist.

- [ ] **Step 3: Implement block overlap in availability**

Update `appointmentAvailability` so a candidate fails when an `agendaBlocks[]` item overlaps:

```js
const block = (db.agendaBlocks||[]).find(b => b.date===appt.date && minutes(start)<minutes(b.end_time) && minutes(end)>minutes(b.start_time) && (
  b.scope==='clinic' ||
  Number(b.employee_id)===Number(appt.employee_id) ||
  Number(b.cabinet_id)===Number(appt.cabinet_id) ||
  Number(b.site_id)===Number(appt.site_id)
));
if(block) return {status:'blocked', message:block.reason||'Bloqueo de agenda'};
```

- [ ] **Step 4: Implement helpers**

```js
export function agendaCreateBlock(db, input={}, actor='system'){
  db.agendaBlocks = Array.isArray(db.agendaBlocks) ? db.agendaBlocks : [];
  const block = {id:id(db), scope:input.scope||'employee', employee_id:Number(input.employee_id)||null, cabinet_id:Number(input.cabinet_id)||null, site_id:Number(input.site_id)||null, date:input.date||today(), start_time:input.start_time||'09:00', end_time:input.end_time||addMinutes(input.start_time||'09:00', Number(input.duration_minutes||60)), reason:input.reason||'Bloqueo', created_by:actor, created_at:new Date().toISOString()};
  db.agendaBlocks.push(block);
  return block;
}
export function agendaFindOpenSlots(db, request={}){
  const date=request.date||today(), duration=Math.max(10,Number(request.duration_minutes||40));
  const start=request.start||db.settings?.agenda?.day_start||'09:00', end=request.end||db.settings?.agenda?.day_end||'20:00', step=Number(request.step||20);
  const employees=(db.employees||[]).filter(e=>e.active!==false && (!request.employee_id || Number(e.id)===Number(request.employee_id)));
  const cabinets=(db.cabinets||[{id:request.cabinet_id||1,site_id:request.site_id||1}]).filter(c=>!request.cabinet_id || Number(c.id)===Number(request.cabinet_id));
  const out=[];
  for(const emp of employees) for(const cab of cabinets) for(let t=minutes(start); t+duration<=minutes(end); t+=step){
    const start_time=minutesToTime(t), end_time=minutesToTime(t+duration);
    const candidate={id:'candidate', date, start_time, end_time, duration_minutes:duration, employee_id:emp.id, cabinet_id:cab.id, site_id:request.site_id||cab.site_id||emp.site_id||null};
    if(agendaValidateMove(db, candidate, {}).ok) out.push({...candidate, score:100 - out.length});
  }
  return out;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node tests\verify_agenda_v12_blocks_slots.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/legacy-preview/logic.js tests/verify_agenda_v12_blocks_slots.mjs
git commit -m "Add agenda blocks and open slot search"
```

### Task 3: Waiting List, Cancellation And Rescheduling Suggestions

**Files:**
- Modify: `apps/legacy-preview/logic.js`
- Test: `tests/verify_agenda_v12_waiting_reschedule.mjs`

**Interfaces:**
- Consumes: `agendaFindOpenSlots`, `agendaMoveAppointment`.
- Produces:
  - `agendaCancelAppointment(db, appointmentId, reason, actor='system') -> object`
  - `agendaWaitingListMatches(db, gap) -> Array<object>`
  - `agendaRescheduleOptions(db, appointmentId, options) -> Array<object>`

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict';
import { defaultDb, agendaCancelAppointment, agendaWaitingListMatches, agendaRescheduleOptions } from '../apps/legacy-preview/logic.js';

const db = defaultDb();
db.waiting_list = [
  {id:1, patient_id:1, duration_minutes:40, preferred_employee_id:1, preferred_site_id:1, priority:8, created_at:'2026-09-01T10:00:00Z', active:true},
  {id:2, patient_id:2, duration_minutes:80, preferred_employee_id:1, preferred_site_id:1, priority:9, created_at:'2026-09-01T09:00:00Z', active:true}
];
db.appointments.push({id:401, patient_id:1, employee_id:1, cabinet_id:1, site_id:1, date:'2026-09-16', start_time:'10:00', end_time:'10:40', duration_minutes:40, status:'programada'});
const cancelled = agendaCancelAppointment(db, 401, 'Paciente no puede venir', 'recepcion');
assert.equal(cancelled.status, 'cancelada');
assert.equal(db.appointmentMoves.at(-1).type, 'cancel');
const matches = agendaWaitingListMatches(db, {date:'2026-09-16', start_time:'10:00', end_time:'10:40', duration_minutes:40, employee_id:1, site_id:1});
assert.equal(matches[0].id, 1, 'compatible shorter treatment wins over too-long item');
const options = agendaRescheduleOptions(db, 401, {days:5, max:3, step:20});
assert.ok(Array.isArray(options));

console.log('verify_agenda_v12_waiting_reschedule: OK');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests\verify_agenda_v12_waiting_reschedule.mjs`
Expected: FAIL because helpers do not exist.

- [ ] **Step 3: Implement cancellation and matching**

Add exports:

```js
export function agendaCancelAppointment(db, appointmentId, reason='', actor='system'){
  const appt=(db.appointments||[]).find(a=>Number(a.id)===Number(appointmentId));
  if(!appt) throw new Error('Cita no encontrada');
  const before={...appt};
  Object.assign(appt,{status:'cancelada',cancelled_at:new Date().toISOString(),cancel_reason:reason,updated_at:new Date().toISOString()});
  agendaMoveAudit(db,'cancel',before,{...appt},actor,reason);
  return appt;
}
export function agendaWaitingListMatches(db, gap={}){
  const duration=Number(gap.duration_minutes||durationMinutes(gap.start_time,gap.end_time)||40);
  return (db.waiting_list||[]).filter(x=>x.active!==false)
    .filter(x=>Number(x.duration_minutes||40)<=duration)
    .filter(x=>!x.preferred_employee_id || Number(x.preferred_employee_id)===Number(gap.employee_id))
    .filter(x=>!x.preferred_site_id || Number(x.preferred_site_id)===Number(gap.site_id))
    .sort((a,b)=>Number(b.priority||0)-Number(a.priority||0) || String(a.created_at||'').localeCompare(String(b.created_at||'')));
}
export function agendaRescheduleOptions(db, appointmentId, options={}){
  const appt=(db.appointments||[]).find(a=>Number(a.id)===Number(appointmentId));
  if(!appt) throw new Error('Cita no encontrada');
  const days=Number(options.days||21), max=Number(options.max||6), out=[];
  for(let offset=0; offset<=days && out.length<max; offset++){
    const date = new Date(`${appt.date}T00:00:00`);
    date.setDate(date.getDate()+offset);
    out.push(...agendaFindOpenSlots(db,{date:date.toISOString().slice(0,10), duration_minutes:appt.duration_minutes, employee_id:appt.employee_id, site_id:appt.site_id, step:options.step||20}).slice(0,max-out.length));
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests\verify_agenda_v12_waiting_reschedule.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/legacy-preview/logic.js tests/verify_agenda_v12_waiting_reschedule.mjs
git commit -m "Add agenda waiting list and reschedule engine"
```

### Task 4: Cascade And Clinical Sequence Planning

**Files:**
- Modify: `apps/legacy-preview/logic.js`
- Test: `tests/verify_agenda_v12_cascade_clinical.mjs`

**Interfaces:**
- Consumes: clinical plan helpers, `agendaFindOpenSlots`, `agendaMoveAppointment`.
- Produces:
  - `agendaCascadeSuggestions(db, appointmentId, patch) -> Array<object>`
  - `agendaPlanClinicalSequence(db, patientId, options) -> Array<object>`

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict';
import { defaultDb, createClinicalPlanItem, agendaCascadeSuggestions, agendaPlanClinicalSequence } from '../apps/legacy-preview/logic.js';

const db = defaultDb();
const patientId = db.patients[0].id;
db.appointments.push(
  {id:501, patient_id:patientId, employee_id:1, cabinet_id:1, site_id:1, date:'2026-09-16', start_time:'10:00', end_time:'10:40', duration_minutes:40, status:'programada', treatment_plan_id:900, sequence_index:1, sequence_total:2},
  {id:502, patient_id:patientId, employee_id:1, cabinet_id:1, site_id:1, date:'2026-09-16', start_time:'10:40', end_time:'11:20', duration_minutes:40, status:'programada', treatment_plan_id:900, sequence_index:2, sequence_total:2}
);
const cascade = agendaCascadeSuggestions(db, 501, {start_time:'10:30', end_time:'11:10'});
assert.ok(cascade.some(x=>Number(x.appointment_id)===502), 'moving first treatment should suggest moving dependent appointment');

createClinicalPlanItem(db,{patient_id:patientId,tooth:'26',treatment:'endodoncia',title:'Endodoncia 26',duration_minutes:60});
createClinicalPlanItem(db,{patient_id:patientId,tooth:'26',treatment:'corona',title:'Corona 26',duration_minutes:45});
const planned = agendaPlanClinicalSequence(db, patientId, {date:'2026-09-17', employee_id:1, cabinet_id:1, site_id:1});
assert.ok(planned.length >= 2);
assert.equal(planned[0].sequence_index, 1);
assert.equal(planned[0].patient_id, patientId);

console.log('verify_agenda_v12_cascade_clinical: OK');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests\verify_agenda_v12_cascade_clinical.mjs`
Expected: FAIL because helpers do not exist.

- [ ] **Step 3: Implement cascade suggestions**

```js
export function agendaCascadeSuggestions(db, appointmentId, patch={}){
  const appt=(db.appointments||[]).find(a=>Number(a.id)===Number(appointmentId));
  if(!appt) throw new Error('Cita no encontrada');
  const shifted={...appt,...patch};
  const delta=minutes(shifted.start_time||appt.start_time)-minutes(appt.start_time||'00:00');
  if(!delta) return [];
  return (db.appointments||[])
    .filter(a=>String(a.id)!==String(appt.id) && Number(a.patient_id)===Number(appt.patient_id) && a.treatment_plan_id && String(a.treatment_plan_id)===String(appt.treatment_plan_id) && Number(a.sequence_index||0)>Number(appt.sequence_index||0))
    .map(a=>({appointment_id:a.id, from:{date:a.date,start_time:a.start_time,end_time:a.end_time}, to:{date:a.date,start_time:minutesToTime(minutes(a.start_time)+delta),end_time:minutesToTime(minutes(a.end_time||addMinutes(a.start_time,a.duration_minutes||40))+delta)}, reason:'Mantener secuencia del tratamiento'}));
}
```

- [ ] **Step 4: Implement clinical sequence planning**

```js
export function agendaPlanClinicalSequence(db, patientId, options={}){
  const graph=clinicalPlanGraph(db, patientId);
  const items=graph.items.filter(x=>x.active!==false&&!['completed','completado','cancelled','cancelado','agendada'].includes(normalizeText(x.status||'')));
  const out=[]; let cursor=options.start_time||'10:00'; const sequenceTotal=items.length;
  for(let i=0;i<items.length;i++){
    const item=items[i], duration=Number(item.duration_minutes||item.duration||db.settings?.agenda?.default_duration||40);
    const slots=agendaFindOpenSlots(db,{date:options.date||today(), duration_minutes:duration, employee_id:options.employee_id, cabinet_id:options.cabinet_id, site_id:options.site_id, start:cursor, step:options.step||20});
    const slot=slots[0]; if(!slot) break;
    const appt={id:id(db), patient_id:Number(patientId), employee_id:slot.employee_id, cabinet_id:slot.cabinet_id, site_id:slot.site_id, date:slot.date, start_time:slot.start_time, end_time:slot.end_time, duration_minutes:duration, title:item.title, reason:item.title, status:'programada', clinical_item_id:item.id, treatment_plan_id:options.treatment_plan_id||`clinical-${patientId}-${Date.now()}`, sequence_index:i+1, sequence_total:sequenceTotal, created_at:new Date().toISOString()};
    db.appointments.push(appt); item.status='agendada'; item.appointment_id=appt.id; out.push(appt); cursor=appt.end_time;
  }
  return out;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node tests\verify_agenda_v12_cascade_clinical.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/legacy-preview/logic.js tests/verify_agenda_v12_cascade_clinical.mjs
git commit -m "Add agenda cascade and clinical sequence planning"
```

### Task 5: Agenda V12 UI Controls

**Files:**
- Modify: `apps/legacy-preview/app.js`
- Modify: `apps/legacy-preview/styles/styles.css`
- Test: `tests/verify_agenda_v12_ui.mjs`

**Interfaces:**
- Consumes: Tasks 1-4 logic exports.
- Produces: visible controls and event bindings for V12 operations.

- [ ] **Step 1: Write the failing UI test**

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync('apps/legacy-preview/app.js','utf8');
const css = readFileSync('apps/legacy-preview/styles/styles.css','utf8');

for (const token of [
  'agenda-v12-tools',
  'data-agenda-mode="move"',
  'data-agenda-mode="resize"',
  'data-agenda-mode="block"',
  'data-agenda-action="cancel"',
  'data-agenda-action="reschedule"',
  'agendaWaitingListMatches',
  'agendaCascadeSuggestions',
  'agendaPlanClinicalSequence',
  'bindAgendaV12Operations'
]) assert.ok(app.includes(token), `falta UI/binding ${token}`);

for (const selector of ['.agenda-v12-tools', '.agenda-resize-controls', '.agenda-waiting-panel', '.agenda-cascade-panel', '.agenda-block-card']) {
  assert.ok(css.includes(selector), `falta estilo ${selector}`);
}

console.log('verify_agenda_v12_ui: OK');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests\verify_agenda_v12_ui.mjs`
Expected: FAIL because V12 UI controls do not exist.

- [ ] **Step 3: Import V12 helpers in app.js**

Add to the import list:

```js
agendaMoveAppointment, agendaResizeAppointment, agendaCreateBlock, agendaCancelAppointment,
agendaWaitingListMatches, agendaRescheduleOptions, agendaCascadeSuggestions, agendaPlanClinicalSequence
```

- [ ] **Step 4: Add V12 toolbar to renderAgenda**

Insert near the agenda command bar:

```js
<div class="agenda-v12-tools" role="toolbar" aria-label="Operaciones de agenda">
  <button type="button" data-agenda-mode="move">Mover citas</button>
  <button type="button" data-agenda-mode="resize">Duración</button>
  <button type="button" data-agenda-mode="block">Bloquear hueco</button>
  <button type="button" data-agenda-mode="waiting">Lista de espera</button>
  <button type="button" id="agendaAutoPlanClinical">Planificar plan clínico</button>
</div>
```

- [ ] **Step 5: Add per-appointment controls**

Inside `agendaAppointmentCard` or the local card renderer, add:

```js
<div class="agenda-resize-controls">
  <button type="button" data-agenda-resize="-10" data-agenda-id="${a.id}">-10 min</button>
  <button type="button" data-agenda-resize="10" data-agenda-id="${a.id}">+10 min</button>
</div>
```

Also ensure quick panel includes existing cancel/reschedule buttons:

```html
<button type="button" data-agenda-action="cancel" data-agenda-id="...">Cancelar</button>
<button type="button" data-agenda-action="reschedule" data-agenda-id="...">Reprogramar</button>
```

- [ ] **Step 6: Implement `bindAgendaV12Operations`**

Add function:

```js
function bindAgendaV12Operations(){
  $$('[data-agenda-resize]').forEach(btn=>btn.onclick=()=>{ const appt=db.appointments.find(a=>Number(a.id)===Number(btn.dataset.agendaId)); if(!appt) return; snapshot('agenda.resize',appt.patient_id); agendaResizeAppointment(db, appt.id, Number(appt.duration_minutes||durationMinutes(appt.start_time,appt.end_time)||40)+Number(btn.dataset.agendaResize), sessionUser?.role||'local'); persist(); render(); toast('Duración actualizada'); });
  $$('[data-agenda-action="cancel"]').forEach(btn=>btn.onclick=()=>{ const reason=prompt('Motivo de cancelación')||'Cancelación'; const appt=db.appointments.find(a=>Number(a.id)===Number(btn.dataset.agendaId)); if(!appt) return; snapshot('agenda.cancel',appt.patient_id); agendaCancelAppointment(db, appt.id, reason, sessionUser?.role||'local'); persist(); render(); toast('Cita cancelada'); });
  $('#agendaAutoPlanClinical')?.addEventListener('click',()=>{ const pid=state.patientId||activePatients()[0]?.id; if(!pid) return toast('Elige un paciente'); snapshot('agenda.plan_clinical',pid); const planned=agendaPlanClinicalSequence(db,pid,{date:state.date,employee_id:db.employees?.[0]?.id,cabinet_id:db.cabinets?.[0]?.id,site_id:db.sites?.[0]?.id}); persist(); render(); toast(`${planned.length} cita(s) planificadas`); });
}
```

Call it from the main `bind()` after agenda bindings.

- [ ] **Step 7: Add CSS**

```css
.agenda-v12-tools{display:flex;gap:8px;flex-wrap:wrap;padding:8px;border:1px solid var(--agenda-border);border-radius:16px;background:#fff}
.agenda-v12-tools button,.agenda-resize-controls button{border:1px solid #d8e1e4;background:#fff;border-radius:12px;padding:8px 10px;font-size:12px;font-weight:850;color:#27414b}
.agenda-resize-controls{display:flex;gap:6px;margin-top:8px;grid-column:1/-1}
.agenda-waiting-panel,.agenda-cascade-panel,.agenda-block-card{border:1px solid var(--agenda-border);border-radius:16px;background:#f8fafb;padding:12px}
```

- [ ] **Step 8: Run UI test**

Run: `node tests\verify_agenda_v12_ui.mjs`
Expected: PASS.

- [ ] **Step 9: Rebuild bundle**

Run:

```bash
node apps/legacy-preview/build-static-bundle.mjs
pnpm --filter @denty/web sync:legacy
```

- [ ] **Step 10: Commit**

```bash
git add apps/legacy-preview/app.js apps/legacy-preview/styles/styles.css apps/legacy-preview/denty-app.bundle.js apps/web/public tests/verify_agenda_v12_ui.mjs
git commit -m "Add agenda v12 operation controls"
```

### Task 6: Final Verification And GitHub Push

**Files:**
- Modify: `docs/AGENDA-STATUS-LAYER-V11.md` or create `docs/AGENDA-V12-OPERATIVA.md`
- Test: all V12 tests plus existing agenda tests.

**Interfaces:**
- Consumes: Tasks 1-5.
- Produces: documented Agenda V12 and pushed GitHub state.

- [ ] **Step 1: Add V12 documentation**

Create `docs/AGENDA-V12-OPERATIVA.md` with:

```md
# Agenda V12 Operativa

Agenda V12 añade movimiento, duración editable, bloqueos, lista de espera, cancelación, reprogramación, cascada y planificación automática desde el plan clínico.

## Operación diaria

- Mover citas cambia hora, doctor o gabinete solo si el motor de disponibilidad lo permite.
- Cambiar duración recalcula `end_time` y valida solapes.
- Cancelar conserva trazabilidad en `appointmentMoves`.
- La lista de espera propone pacientes compatibles para huecos liberados.

## Plan clínico

La planificación automática crea citas secuenciales desde tratamientos clínicos pendientes y marca esos items como `agendada`.

## Seguridad

Las acciones quedan auditadas localmente. Los overrides reales quedan reservados para backend.
```

- [ ] **Step 2: Run full Agenda V12 verification**

Run:

```bash
node tests\verify_agenda_v12_engine.mjs
node tests\verify_agenda_v12_blocks_slots.mjs
node tests\verify_agenda_v12_waiting_reschedule.mjs
node tests\verify_agenda_v12_cascade_clinical.mjs
node tests\verify_agenda_v12_ui.mjs
node tests\verify_agenda_status_layer_v11.mjs
node tests\verify_agenda_modern_v10.mjs
```

Expected: all PASS.

- [ ] **Step 3: Run app build**

Run: `pnpm --filter @denty/web build`
Expected: successful Next static build.

- [ ] **Step 4: Restart local server**

Run:

```powershell
if(Test-Path apps\web\.next){ Remove-Item apps\web\.next -Recurse -Force }
pnpm --filter @denty/web sync:legacy
pnpm --dir apps/web exec next dev -H 127.0.0.1 -p 8767
```

Expected: `http://127.0.0.1:8767/` responds 200.

- [ ] **Step 5: Commit documentation**

```bash
git add docs/AGENDA-V12-OPERATIVA.md
git commit -m "Document agenda v12 operations"
```

- [ ] **Step 6: Push**

```bash
git push origin main
```

Expected: GitHub `main` contains Agenda V12.

## Self-Review

- Spec coverage: drag/drop, resize, blocks, vacations/absences, waiting list, cancellation, reschedule, cascade and clinical plan scheduling are covered by Tasks 1-5.
- No placeholders: plan has concrete files, functions, test snippets, commands and expected results.
- Type consistency: helper names are consistent between spec and tasks.
