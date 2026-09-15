import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync('apps/legacy-preview/app.js', 'utf8');
const css = readFileSync('apps/legacy-preview/styles/styles.css', 'utf8');

for (const token of [
  'agenda-v12-tools',
  'data-agenda-mode="move"',
  'data-agenda-mode="resize"',
  'data-agenda-mode="block"',
  'data-agenda-action="cancel"',
  'data-agenda-action="reschedule"',
  'agendaWaitingListMatches',
  'agendaCascadeSuggestions',
  'agendaPlanClinicalSequence',
  'bindAgendaV12Operations'
]) assert.ok(app.includes(token), `falta UI/binding ${token}`);

for (const selector of [
  '.agenda-v12-tools',
  '.agenda-resize-controls',
  '.agenda-waiting-panel',
  '.agenda-cascade-panel',
  '.agenda-block-card'
]) assert.ok(css.includes(selector), `falta estilo ${selector}`);

console.log('verify_agenda_v12_ui: OK');
