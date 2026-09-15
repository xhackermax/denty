import assert from 'node:assert/strict';
import {
  defaultDb,
  agendaCancelAppointment,
  agendaFindOpenSlots,
  agendaWaitingListMatches,
  agendaRescheduleOptions
} from '../apps/legacy-preview/logic.js';

const db = defaultDb();
db.patients.push(
  { id: 1, first_name: 'Ana', last_name: 'Prueba', archived: false },
  { id: 2, first_name: 'Luis', last_name: 'Espera', archived: false }
);
db.waiting_list = [
  { id: 1, patient_id: 2, active: true, treatment: 'Higiene', duration_minutes: 40, preferred_employee_id: 1, priority: 8, created_at: '2026-09-01T08:00:00.000Z' },
  { id: 2, patient_id: 1, active: true, treatment: 'Revision', duration_minutes: 60, preferred_employee_id: 2, priority: 2, created_at: '2026-09-02T08:00:00.000Z' }
];
db.appointments.push({
  id: 401,
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

const cancelled = agendaCancelAppointment(db, 401, 'Paciente cancela', 'recepcion');
assert.equal(cancelled.status, 'cancelada');
assert.equal(cancelled.cancel_reason, 'Paciente cancela');
assert.equal(db.appointmentMoves.at(-1).type, 'cancel');
assert.ok(agendaFindOpenSlots(db, {
  date: '2026-09-16',
  start: '10:00',
  end: '11:00',
  duration_minutes: 40,
  employee_id: 1,
  cabinet_id: 1,
  site_id: 1
}).some(x => x.start_time === '10:00'), 'cancelled appointments should release their slot');

const matches = agendaWaitingListMatches(db, {
  date: '2026-09-16',
  start_time: '10:00',
  end_time: '10:40',
  employee_id: 1,
  site_id: 1
});
assert.equal(matches[0].id, 1);
assert.ok(!matches.some(x => x.id === 2), 'longer or wrong-professional entries should not fill this gap first');

const options = agendaRescheduleOptions(db, 401, { days: 2, limit: 5 });
assert.ok(Array.isArray(options));
assert.ok(options.length > 0, 'reschedule should suggest valid open slots');

console.log('verify_agenda_v12_waiting_reschedule: OK');
