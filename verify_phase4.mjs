import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('.', import.meta.url);
const app = readFileSync(new URL('./app.js', root), 'utf8');
const css = [
  readFileSync(new URL('./styles.css', root), 'utf8'),
  existsSync(new URL('./phase1.css', root)) ? readFileSync(new URL('./phase1.css', root), 'utf8') : '',
  existsSync(new URL('./phase2.css', root)) ? readFileSync(new URL('./phase2.css', root), 'utf8') : '',
  existsSync(new URL('./phase3.css', root)) ? readFileSync(new URL('./phase3.css', root), 'utf8') : '',
  existsSync(new URL('./phase4.css', root)) ? readFileSync(new URL('./phase4.css', root), 'utf8') : ''
].join('\n');

const checks = [
  ['periodontal sextant summary exists', app.includes('renderPerioSextantSummary')],
  ['periodontal risk panel exists', app.includes('perio-risk-panel') && app.includes('furcation')],
  ['CSV import validation exists', app.includes('renderImportValidation') && app.includes('import-duplicate-row')],
  ['import applies audit metadata', app.includes('import.preview') && app.includes('import.commit')],
  ['printable document center exists', app.includes('renderPrintableDocumentCenter')],
  ['print document buttons exist', app.includes('data-print-doc') && app.includes('printClinicalDocument')],
  ['patient print summary exists', app.includes('patient-print-summary')],
  ['phase 4 CSS loaded', css.includes('.phase4-panel')],
  ['CSS styles perio/import/print', css.includes('.perio-sextant-grid') && css.includes('.import-validation') && css.includes('.print-document')],
];

for (const [name, ok] of checks) assert.ok(ok, name);
console.log(`${checks.length}/${checks.length} phase 4 checks passed`);
