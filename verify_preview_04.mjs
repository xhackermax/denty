import { readFileSync, statSync } from 'node:fs';
import assert from 'node:assert/strict';
import {
  DB_KEY, defaultDb, createPatient, ensureOdontogram, markArcadeMissing,
  setToothLegendState, legendVariant, legendLabel, legendStateText, legendNextIndex,
  statusTone, normalizeSurfaceForTooth, ODONTO_LEGEND_CYCLES, ODONTO_LEGEND_MAIN
} from './logic.js';

const root = new URL('.', import.meta.url);
const html = readFileSync(new URL('./index.html', root), 'utf8');
const app = readFileSync(new URL('./app.js', root), 'utf8');
const css = readFileSync(new URL('./styles.css', root), 'utf8');
const tests = [];
function test(name, fn){ tests.push([name, fn]); }

test('version 0.4 uses isolated storage and migrates from 0.3', () => {
  assert.equal(DB_KEY, 'denty_web_vercel_preview_0_4_odonto_apk_like');
});

test('legend cycles mirror Denty APK correct-bad-pending states', () => {
  assert.deepEqual(ODONTO_LEGEND_CYCLES.filling, ['filling','filling_bad','filling_pending']);
  assert.deepEqual(ODONTO_LEGEND_CYCLES.crown, ['crown','crown_bad','crown_pending']);
  assert.deepEqual(ODONTO_LEGEND_CYCLES.endo, ['endo','endo_bad','endo_indicated']);
  assert.deepEqual(ODONTO_LEGEND_CYCLES.implant, ['implant','implant_review','implant_indicated']);
  assert.equal(legendVariant('implant',1), 'implant_review');
  assert.equal(legendStateText('implant',1), 'A revisar');
  assert.match(legendLabel('endo',2), /indicada/i);
  assert.equal(legendNextIndex('crown',2), 0);
});

test('legend main includes APK-visible clinical tools', () => {
  for (const base of ['caries','filling','crown','endo','post','implant','prosthesis','removable','healthy','missing','extraction']) {
    assert.ok(ODONTO_LEGEND_MAIN.includes(base), `missing ${base}`);
  }
});

test('surface codes apply only to target surface and preserve primary tooth', () => {
  const db = defaultDb();
  const p = createPatient(db, {first_name:'Ana'});
  setToothLegendState(db, p.id, '16', 'filling_bad', 'O');
  const od = ensureOdontogram(db,p.id);
  assert.equal(od['16'].status, 'healthy');
  assert.equal(od['16'].surfaces.O, 'filling_bad');
  assert.equal(Object.keys(od['16'].surfaces).length, 1);
});

test('anterior teeth normalize O to I for incisal surface', () => {
  assert.equal(normalizeSurfaceForTooth('11','O'), 'I');
  const db = defaultDb(); const p = createPatient(db, {first_name:'Luis'});
  setToothLegendState(db, p.id, '11', 'caries', 'O');
  assert.equal(ensureOdontogram(db,p.id)['11'].surfaces.I, 'caries');
});

test('whole tooth states use stable color grammar', () => {
  assert.equal(statusTone('crown'), 'blue');
  assert.equal(statusTone('crown_bad'), 'blue-red');
  assert.equal(statusTone('crown_pending'), 'red');
  assert.equal(statusTone('healthy'), 'green');
  assert.equal(statusTone('missing'), 'missing');
});

test('arcade missing clears surfaces to avoid contradictory chart data', () => {
  const db = defaultDb(); const p = createPatient(db, {first_name:'Rosa'});
  setToothLegendState(db,p.id,'18','filling','O');
  markArcadeMissing(db,p.id,'superior');
  const od = ensureOdontogram(db,p.id);
  assert.equal(od['18'].status, 'missing');
  assert.deepEqual(od['18'].surfaces, {});
  assert.equal(od['28'].status, 'missing');
});

test('web app has compact APK-like odontogram layout and clickable legend', () => {
  assert.ok(app.includes('odonto-page04'));
  assert.ok(app.includes('data-legend-base'));
  assert.ok(app.includes('cycleLegend'));
  assert.ok(app.includes('surface-map'));
  assert.ok(app.includes('data-mark-arcade'));
  assert.ok(css.includes('DENTY 0.4 ODONTOGRAMA APK-LIKE'));
  assert.match(css, /grid-template-columns:repeat\(16,33px\)/);
});

test('html keeps vercel static entry points', () => {
  assert.ok(html.includes('app.js'));
  assert.ok(statSync(new URL('./vercel.json', root)).isFile());
});

let passed = 0;
for (const [name, fn] of tests) {
  try { await fn(); console.log(`✓ ${name}`); passed++; }
  catch (err) { console.error(`✗ ${name}\n  ${err.stack || err}`); process.exitCode = 1; }
}
console.log(`${passed}/${tests.length} tests passed`);
