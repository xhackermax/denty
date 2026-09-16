import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync('apps/legacy-preview/app.js', 'utf8');
const css = readFileSync('apps/legacy-preview/styles/styles.css', 'utf8');

for (const token of [
  'odontogram-v3-panel',
  'data-odonto-v3="bridge"',
  'data-odonto-v3="implant_restoration"',
  'data-odonto-v3="removable_prosthesis"',
  'data-odonto-v3="orthodontics"',
  'data-odonto-v3="pediatric"',
  'createOdontogramSnapshot',
  'periodontalVisualSummary',
  'bindOdontogramV3'
]) assert.ok(app.includes(token), `falta token UI ${token}`);

for (const selector of [
  '.odontogram-v3-panel',
  '.odonto-entity-card',
  '.odonto-bridge-bar',
  '.odonto-component-chip',
  '.odonto-snapshot-diff',
  '.perio-visual-summary'
]) assert.ok(css.includes(selector), `falta estilo ${selector}`);

console.log('verify_odontogram_v3_ui: OK');
