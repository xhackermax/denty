import assert from 'node:assert/strict';
import {
  defaultDb,
  agendaCreateBlock,
  agendaFindOpenSlots
} from '../apps/legacy-preview/logic.js';

const db = defaultDb();
db.patients.push({ id: 1, first_name: 'Ana', last_name: 'Prueba', archived: false });
db.appointments.push({
  id: 301,
  patient_id: 1,
  employee_id: 1,
  cabinet_id: 1,
  site_id: 1,
  date: '2026-09-16',
  start_time: '10:00',
  end_time: '10:40',
  duration_minutes: 40,
  status: 'programada'
});

const block = agendaCreateBlock(db, {
  scope: 'employee',
  employee_id: 1,
  date: '2026-09-16',
  start_time: '11:00',
  end_time: '12:00',
  reason: 'Vacaciones'
}, 'admin');

assert.equal(block.scope, 'employee');
assert.equal(db.agendaBlocks.length, 1);

const slots = agendaFindOpenSlots(db, {
  date: '2026-09-16',
  duration_minutes: 40,
  employee_id: 1,
  cabinet_id: 1,
  site_id: 1,
  start: '09:00',
  end: '13:00',
  step: 20
});

assert.ok(slots.some(s => s.start_time === '09:00'), '09:00 should be open');
assert.ok(!slots.some(s => s.start_time === '10:00'), 'existing appointment blocks 10:00');
assert.ok(!slots.some(s => s.start_time === '11:00'), 'block removes 11:00');
assert.ok(!slots.some(s => s.start_time === '11:20'), 'block removes overlapping 11:20');

console.log('verify_agenda_v12_blocks_slots: OK');
