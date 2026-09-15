import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const app = readFileSync(new URL('./app.js', root), 'utf8');
const motion = readFileSync(new URL('./scripts/cinematic-motion.js', root), 'utf8');
const css = readFileSync(new URL('./styles/cinematic-motion.css', root), 'utf8');

const checks = [
  ['render tracks previous view', app.includes('previousViewForMotion')],
  ['page transition only runs on view change', app.includes('state.view!==previousViewForMotion')],
  ['current view is exposed to DOM', app.includes('data-view')],
  ['odontogram excludes cinematic depth scene', app.includes("state.view==='odontogram'") && app.includes('return; const section')],
  ['motion script skips 3D interest on odontogram', motion.includes("view === 'odontogram'") && motion.includes('skipCinematicDepth')],
  ['odontogram CSS disables 3D parallax', css.includes('.main[data-view=\"odontogram\"] .cinematic-depth-scene')],
];

for (const [name, ok] of checks) assert.ok(ok, name);
console.log(`${checks.length}/${checks.length} odontogram motion scope checks passed`);
