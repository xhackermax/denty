import assert from 'node:assert/strict';
import {
  defaultDb,
  migrateDb,
  agendaSlotKey,
  agendaValidateMove,
  agendaMoveAppointment,
  agendaResizeAppointment
} from '../apps/legacy-preview/logic.js';

const db = defaultDb();
db.patients.push({ id: 1, first_name: 'Ana', last_name: 'Prueba', archived: false });
const patientId = 1;
db.appointments.push(
  { id: 101, patient_id: patientId, employee_id: 1, cabinet_id: 1, site_id: 1, date: '2026-09-16', start_time: '10:00', end_time: '10:40', duration_minutes: 40, status: 'programada', title: 'A' },
  { id: 102, patient_id: patientId, employee_id: 1, cabinet_id: 1, site_id: 1, date: '2026-09-16', start_time: '11:00', end_time: '11:40', duration_minutes: 40, status: 'programada', title: 'B' }
);
const migrated = migrateDb(db);

assert.ok(Array.isArray(migrated.agendaBlocks), 'migration creates agendaBlocks');
assert.ok(Array.isArray(migrated.appointmentMoves), 'migration creates appointmentMoves');
assert.equal(agendaSlotKey({ date: '2026-09-16', start_time: '10:00', employee_id: 1, cabinet_id: 1 }), '2026-09-16|10:00|e:1|c:1');
assert.equal(agendaValidateMove(migrated, migrated.appointments[0], { start_time: '10:30', end_time: '11:10' }).ok, false, 'doctor overlap blocks move');

const moved = agendaMoveAppointment(migrated, 101, { employee_id: 1, cabinet_id: 2, start_time: '09:00', end_time: '09:40' }, 'admin');
assert.equal(moved.employee_id, 1);
assert.equal(moved.cabinet_id, 2);
assert.equal(moved.start_time, '09:00');
assert.equal(migrated.appointmentMoves.at(-1).type, 'move');

const resized = agendaResizeAppointment(migrated, 101, 60, 'admin');
assert.equal(resized.end_time, '10:00');
assert.equal(resized.duration_minutes, 60);
assert.equal(migrated.appointmentMoves.at(-1).type, 'resize');

console.log('verify_agenda_v12_engine: OK');
