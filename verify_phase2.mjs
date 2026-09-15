import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('.', import.meta.url);
const app = readFileSync(new URL('./app.js', root), 'utf8');
const logic = readFileSync(new URL('./logic.js', root), 'utf8');
const css = [
  readFileSync(new URL('./styles.css', root), 'utf8'),
  existsSync(new URL('./phase1.css', root)) ? readFileSync(new URL('./phase1.css', root), 'utf8') : '',
  existsSync(new URL('./phase2.css', root)) ? readFileSync(new URL('./phase2.css', root), 'utf8') : ''
].join('\n');

const checks = [
  ['default roles exist', logic.includes('rolePermissions') && logic.includes('Administrador clinico')],
  ['users collection migrates', logic.includes('users:') && logic.includes("'users'")],
  ['access panel renderer exists', app.includes('renderAccessPanel')],
  ['patient risk strip renderer exists', app.includes('renderPatientRiskStrip')],
  ['agenda safety banner exists', app.includes('renderAgendaSafetyBanner')],
  ['consent checklist exists', app.includes('consent-checklist') && app.includes('accepted_risks')],
  ['phase 2 CSS loaded', app.includes('phase2') || css.includes('.phase2-panel')],
  ['CSS styles access and risk blocks', css.includes('.access-role-grid') && css.includes('.patient-risk-strip')],
  ['CSS styles consent checklist', css.includes('.consent-checklist')],
];

for (const [name, ok] of checks) assert.ok(ok, name);
console.log(`${checks.length}/${checks.length} phase 2 checks passed`);
