import { readFileSync, statSync } from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { DB_KEY, PREVIOUS_KEYS, defaultDb, migrateDb, ensureOdontogram } from './logic.js';

const root = new URL('.', import.meta.url);
const html = readFileSync(new URL('./index.html', root), 'utf8');
const app = readFileSync(new URL('./app.js', root), 'utf8');
const css = readFileSync(new URL('./styles.css', root), 'utf8');
const manifest = readFileSync(new URL('./manifest.webmanifest', root), 'utf8');
const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test('version 0.6.2 uses isolated storage and migrates from 0.6.1', () => {
  assert.equal(DB_KEY, 'denty_web_vercel_preview_0_6_2_perio_position');
  assert.ok(PREVIOUS_KEYS.includes('denty_web_vercel_preview_0_6_1_layout05_better_teeth'));
  assert.equal(defaultDb().version, '0.6.2');
  assert.equal(migrateDb({}).version, '0.6.2');
});

test('odontogram records now include periodontal and position blocks', () => {
  const db = defaultDb();
  const od = ensureOdontogram(db, 1);
  const t = od['11'];
  assert.ok(t.periodontal);
  assert.ok(t.position);
  for (const key of ['mv','v','dv','ml','lp','dl']) assert.ok(key in t.periodontal.depths);
  for (const key of ['mv','v','dv','ml','lp','dl']) assert.ok(key in t.periodontal.recession);
  for (const flag of ['bleeding','suppuration','plaque']) assert.ok(t.periodontal[flag] && 'mv' in t.periodontal[flag]);
  assert.ok('furcation' in t.periodontal);
  assert.ok('mobility' in t.periodontal);
  for (const key of ['mesialization','distalization','extrusion','intrusion','rotation','vestibuloversion','linguoversion','recessionVisible','mobility']) assert.ok(key in t.position);
});

test('odontogram UI keeps 0.5 compact layout and adds periodontal/position modules', () => {
  assert.ok(app.includes('odonto-page05'));
  assert.ok(app.includes('apk-arcade-card'));
  assert.ok(app.includes('renderPerioPositionPanel'));
  assert.ok(app.includes('Resumen periodontal'));
  assert.ok(app.includes('Profundidad de bolsa'));
  assert.ok(app.includes('MV'));
  assert.ok(app.includes('ML/P'));
  assert.ok(app.includes('Supuración'));
  assert.ok(app.includes('Mesialización'));
  assert.ok(app.includes('Vestibuloversión'));
  assert.ok(app.includes('Linguoversión / palatoversión'));
});

test('styles include periodontal layout helpers', () => {
  assert.ok(css.includes('.perio-summary-grid'));
  assert.ok(css.includes('.perio-table'));
  assert.ok(css.includes('.toggle-chip'));
  assert.ok(css.includes('.position-grid'));
});

test('real APK logo remains packaged and referenced', () => {
  const logoUrl = new URL('./denty-logo.png', root);
  assert.ok(statSync(logoUrl).size > 100000);
  const sha = createHash('sha256').update(readFileSync(logoUrl)).digest('hex');
  assert.equal(sha, 'e4efa2a6e26e19b70c9d0418a429dba8bc9b8c1bda964843e861ac26aec6be83');
  assert.ok(html.includes('src="/denty-logo.png"'));
});

test('versioned preview labels mention 0.6.2', () => {
  assert.match(html, /Denty Web Preview 0\.6\.2/);
  assert.match(manifest, /0\.6\.2/);
});

let passed = 0;
for (const [name, fn] of tests) {
  try { await fn(); console.log(`✓ ${name}`); passed++; }
  catch (err) { console.error(`✗ ${name}\n  ${err.stack || err}`); process.exitCode = 1; }
}
console.log(`${passed}/${tests.length} tests passed`);
