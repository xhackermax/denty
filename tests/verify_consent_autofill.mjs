import assert from 'node:assert/strict';
import { defaultDb, migrateDb, createPatient, createConsentDocument, patientFullName } from '../apps/legacy-preview/logic.js';

const REQUIRED_CONSENTS = [
  'CI Tratamiento de imagenes',
  'CI Anestesia',
  'CI Endodoncia',
  'CI Extraccion simple',
  'CI Implantes',
  'CI Obturaciones',
  'CI Antirresortivos (bifosfonatos)',
  'CI Periodoncia',
  'CI Plasma',
  'CI Procedimiento acido hialuronico',
  'CI Protesis',
  'CI Tejido liofilizado',
  'CI Cirugia periapical',
  'CI Extraccion tercer molar (cordales)',
  'CI Tartrectomia (limpieza dental)',
  'CI Sobredentaduras',
  'CI Blanqueamiento dental externo',
  'CI Blanqueamiento dental interno',
  'CI Carillas directas de resina compuesta (composite)',
  'CI Injerto de encia',
  'CI Para injertos oseos',
  'CI Regeneracion osea',
  'CI Sedacion consciente',
  'CI Biopsia'
];

function normalized(value){
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}

const fresh = defaultDb();
const titles = fresh.consents.map(c => normalized(c.title));
for(const title of REQUIRED_CONSENTS){
  assert.ok(titles.includes(normalized(title)), `missing consent: ${title}`);
}

const legacy = migrateDb({consents: fresh.consents.slice(0, 3)});
for(const title of REQUIRED_CONSENTS){
  assert.ok(legacy.consents.map(c => normalized(c.title)).includes(normalized(title)), `migration missing consent: ${title}`);
}

const db = defaultDb();
const patient = createPatient(db, {first_name:'Maria', last_name:'Lopez'});
db.currentUser = {id:12, role:'dentist', name:'Dra. Seneida'};
const consent = db.consents.find(c => normalized(c.title) === normalized('CI Endodoncia'));
const doc = createConsentDocument(db, {patient_id:patient.id, consent_id:consent.id});

assert.equal(doc.status, 'borrador');
assert.equal(doc.signature_data, '');
assert.ok(doc.text.includes(patientFullName(patient)));
assert.ok(doc.text.includes('Dra. Seneida'));
assert.ok(doc.text.includes('Centro Dental Funcional') || doc.text.includes('Avenida Navarra') || doc.text.includes('Paseo Damas'));
assert.match(doc.text, /Fecha:/);
assert.match(doc.text, /Firma del paciente/);
console.log('verify_consent_autofill: OK');
