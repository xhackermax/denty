import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const app = readFileSync(new URL('./app.js', root), 'utf8');
const logic = readFileSync(new URL('./logic.js', root), 'utf8');
const serverExists = existsSync(new URL('./server.py', root));
const server = serverExists ? readFileSync(new URL('./server.py', root), 'utf8') : '';

const checks = [
  ['Fase 2 indispensable: consent lock', logic.includes('locked_at') && logic.includes('consent_history')],
  ['Fase 2 indispensable: PDF/print action', app.includes('downloadClinicalPdf') && app.includes('data-pdf-doc')],
  ['Fase 3 indispensable: cabinets', logic.includes('cabinets:') && app.includes('cabinet_id')],
  ['Fase 3 indispensable: real conflict check', logic.includes('cabinetConflict') && app.includes('availability_status')],
  ['Fase 4 indispensable: PIN gate', app.includes('requirePin') && app.includes('admin_pin_hash')],
  ['Fase 4 indispensable: permission checks', app.includes('canAccess') && app.includes('rolePermissions')],
  ['Fase 5 indispensable: local SQLite server exists', serverExists && server.includes('sqlite3') && server.includes('denty.sqlite')],
  ['Fase 5 indispensable: sync endpoints exist', server.includes('/api/sync/pull') && server.includes('/api/sync/push')],
  ['Fase 5 indispensable: server security headers', server.includes('X-Content-Type-Options') && server.includes('127.0.0.1')],
];

for (const [name, ok] of checks) assert.ok(ok, name);
console.log(`${checks.length}/${checks.length} roadmap essential checks passed`);
