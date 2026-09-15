import { readFileSync, statSync } from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { DB_KEY, PREVIOUS_KEYS, defaultDb, migrateDb } from './logic.js';

const root = new URL('.', import.meta.url);
const html = readFileSync(new URL('./index.html', root), 'utf8');
const app = readFileSync(new URL('./app.js', root), 'utf8');
const css = readFileSync(new URL('./styles.css', root), 'utf8');
const manifest = readFileSync(new URL('./manifest.webmanifest', root), 'utf8');
const tests = [];
function test(name, fn){ tests.push([name, fn]); }

test('version 0.6.1 uses isolated storage and migrates from 0.5', () => {
  assert.equal(DB_KEY, 'denty_web_vercel_preview_0_6_1_layout05_better_teeth');
  assert.ok(PREVIOUS_KEYS.includes('denty_web_vercel_preview_0_5_denty_apk_catalog'));
  assert.equal(defaultDb().version, '0.6.1');
  assert.equal(migrateDb({}).version, '0.6.1');
});

test('real APK logo remains packaged and referenced', () => {
  const logoUrl = new URL('./denty-logo.png', root);
  assert.ok(statSync(logoUrl).size > 100000);
  const sha = createHash('sha256').update(readFileSync(logoUrl)).digest('hex');
  assert.equal(sha, 'e4efa2a6e26e19b70c9d0418a429dba8bc9b8c1bda964843e861ac26aec6be83');
  assert.ok(html.includes('src="/denty-logo.png"'));
  assert.ok(manifest.includes('denty-logo.png'));
});

test('odontogram keeps 0.5 compact layout structure', () => {
  assert.ok(app.includes('odonto-page05'));
  assert.ok(app.includes('apk-arcade-card'));
  assert.ok(app.includes('tooth-labels compact'));
  assert.ok(app.includes('teeth-row compact'));
  assert.ok(app.includes('surface-row compact'));
  assert.ok(app.includes('legend apk-legend'));
  assert.ok(app.includes('clinical-grid'));
  assert.ok(app.includes('Arcada ausente'));
});

test('tooth drawing uses improved typed crown/root geometry without replacing layout', () => {
  assert.ok(app.includes('function toothGeometry('));
  assert.ok(app.includes("case 'incisor'"));
  assert.ok(app.includes("case 'canine'"));
  assert.ok(app.includes("case 'premolar'"));
  assert.ok(app.includes("case 'molar'"));
  assert.ok(app.includes('class="tooth-crown'));
  assert.ok(app.includes('class="tooth-root'));
  assert.ok(app.includes('class="tooth-fissure'));
  assert.ok(css.includes('.tooth-crown'));
  assert.ok(css.includes('.tooth-root'));
  assert.ok(css.includes('.tooth-fissure'));
});

test('versioned preview labels mention 0.6.1', () => {
  assert.match(html, /Denty Web Preview 0\.6\.1/);
  assert.match(manifest, /0\.6\.1/);
});

let passed = 0;
for (const [name, fn] of tests) {
  try { await fn(); console.log(`✓ ${name}`); passed++; }
  catch (err) { console.error(`✗ ${name}\n  ${err.stack || err}`); process.exitCode = 1; }
}
console.log(`${passed}/${tests.length} tests passed`);
