import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../apps/legacy-preview/app.js', import.meta.url), 'utf8');

assert.match(app, /data-odontogram-back="patient"/, 'el odontograma debe exponer un boton explicito para volver al paciente');
assert.match(app, />Volver al paciente</, 'el boton debe decir Volver al paciente');
assert.match(app, /data-odontogram-back="patient"[\s\S]{0,160}data-go="patientDetail"/, 'el boton debe navegar a la ficha del paciente');

console.log('verify_odontogram_back_to_patient: OK');
