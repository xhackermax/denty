import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { slotMinuteFromOffset } from '../src/domain/agenda/slot-selection.ts';

assert.equal(slotMinuteFromOffset(0, 1.55, 15, 780), 0);
assert.equal(slotMinuteFromOffset(22, 1.55, 15, 780), 0);
assert.equal(slotMinuteFromOffset(24, 1.55, 15, 780), 15);
assert.equal(slotMinuteFromOffset(93, 1.55, 15, 780), 60);
assert.equal(slotMinuteFromOffset(99999, 1.55, 15, 780), 765);
assert.equal(slotMinuteFromOffset(-30, 1.55, 15, 780), 0);

console.log('Agenda empty-slot selection regression OK');

const agendaSource = await readFile(new URL('../src/features/agenda/agenda-page.tsx', import.meta.url), 'utf8');
assert.match(agendaSource, /openAppointmentAtSlot\(member\.id, event\.clientY, rect\.top\)/);
assert.match(agendaSource, /if \(event\.target !== event\.currentTarget\) return;/);
assert.match(agendaSource, /label="Duración"/);
assert.match(agendaSource, /label="Fecha" type="date" value=\{date\} readOnly/);
assert.match(agendaSource, /setAppointmentTime\(timeForMinute\(minute\)\)/);
