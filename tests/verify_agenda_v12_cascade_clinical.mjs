import assert from 'node:assert/strict';
import {
  defaultDb,
  createClinicalPlanItem,
  agendaCascadeSuggestions,
  agendaPlanClinicalSequence
} from '../apps/legacy-preview/logic.js';

const db = defaultDb();
db.patients.push({ id: 1, first_name: 'Ana', last_name: 'Prueba', archived: false });

const endo = createClinicalPlanItem(db, {
  patient_id: 1,
  treatment: 'endodoncia',
  tooth: '26',
  duration: 50,
  visits: 1
});
const crown = createClinicalPlanItem(db, {
  patient_id: 1,
  treatment: 'corona',
  tooth: '26',
  duration: 40,
  visits: 2
});

const sequence = agendaPlanClinicalSequence(db, {
  patient_id: 1,
  start_date: '2026-09-16',
  employee_id: 1,
  cabinet_id: 1,
  site_id: 1,
  gap_days: 1
});

assert.equal(sequence.length, 3, 'one endodontic visit plus two crown visits should be planned');
assert.equal(sequence[0].clinical_item_id, endo.id);
assert.equal(sequence[1].clinical_item_id, crown.id);
assert.equal(sequence[2].sequence_index, 2);
assert.ok(sequence.every(x => x.status === 'programada'));

const cascade = agendaCascadeSuggestions(db, sequence[0].id, { gap_days: 1 });
assert.ok(cascade.length >= 2, 'moving the first visit should suggest downstream changes');
assert.ok(cascade.every(x => x.after.date >= x.before.date));

console.log('verify_agenda_v12_cascade_clinical: OK');
