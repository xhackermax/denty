import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  defaultDb,
  createPatient,
  setToothLegendState,
  patientPortalDentalFindings
} from '../apps/legacy-preview/logic.js';

const html = fs.readFileSync('apps/legacy-preview/index.html', 'utf8');
const app = fs.readFileSync('apps/legacy-preview/app.js', 'utf8');
const css = fs.readFileSync('apps/legacy-preview/styles/styles.css', 'utf8');
const syncScript = fs.readFileSync('apps/web/scripts/sync-legacy-assets.mjs', 'utf8');

assert.match(html, /id="accountPatientPicker"/, 'el acceso paciente debe tener selector de identidad');
assert.match(html, /id="accountPatientSelect"/, 'debe poder elegir el paciente a simular');
assert.match(html, /id="accountSwitchBtn"/, 'la aplicacion clinica debe permitir cambiar de cuenta');

assert.match(app, /denty\.sessionUser/, 'la identidad activa debe persistirse por sesion/pestana');
assert.match(app, /denty\.portalPatientId/, 'el paciente elegido debe persistirse por sesion/pestana');
assert.match(app, /new BroadcastChannel\(['"]denty-shared-state['"]\)/, 'debe existir sincronizacion inmediata entre pestanas');
assert.match(app, /addEventListener\(['"]storage['"]/, 'debe reaccionar tambien al evento storage');
assert.match(app, /function reloadSharedDb/, 'debe recargar el repositorio compartido preservando la sesion');
assert.match(app, /function persistSharedDb|function persist\(\)/, 'las escrituras deben pasar por la persistencia compartida');

assert.match(css, /\.patient-portal-mode \.topbar\s*\{[^}]*display:\s*none/is, 'el portal paciente no debe mostrar la barra clinica');
assert.match(app, /patient-portal-brandbar/, 'el paciente debe tener cabecera propia');
assert.match(syncScript, /legacy-shell\.ts/, 'el shell Next debe generarse desde la fuente legacy para no divergir');

const db = defaultDb();
const patient = createPatient(db,{first_name:'Maria',last_name:'Prueba'});
setToothLegendState(db, patient.id, '26', 'caries', 'O');
const findings = patientPortalDentalFindings(db, patient.id);
const caries = findings.find(item => item.tooth === '26' && item.code === 'caries');
assert.ok(caries, 'una caries marcada por el administrador debe aparecer en la proyeccion paciente');
assert.match(caries.title, /Caries/i);
assert.ok(caries.surfaces.includes('O'), 'debe conservar la superficie clinica sin exponer complejidad innecesaria');

console.log('verify_patient_shared_session: OK');
