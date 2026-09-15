import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('.', import.meta.url);
const app = readFileSync(new URL('./app.js', root), 'utf8');
const css = [
  readFileSync(new URL('./styles.css', root), 'utf8'),
  existsSync(new URL('./phase1.css', root)) ? readFileSync(new URL('./phase1.css', root), 'utf8') : ''
].join('\n');

const checks = [
  ['legend icons use refined clinical classes', app.includes('legend-clinical-icon refined')],
  ['legend exposes state chips', app.includes('legend-state-chip')],
  ['legend exposes applies chips', app.includes('legend-applies-chip')],
  ['safety panel exists in settings', app.includes('renderSafetyPanel')],
  ['backup export includes metadata', app.includes('schema_version') && app.includes('exported_at')],
  ['audit log function exists', app.includes('recordAudit(')],
  ['dangerous confirmations are centralized', app.includes('confirmDanger(')],
  ['CSS styles refined legend', css.includes('.clinical-legend-card.refined')],
  ['CSS styles safety panel', css.includes('.safety-grid')],
];

for (const [name, ok] of checks) assert.ok(ok, name);
console.log(`${checks.length}/${checks.length} phase 1 checks passed`);
