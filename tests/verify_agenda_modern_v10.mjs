import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const app=fs.readFileSync('apps/legacy-preview/app.js','utf8');
const css=fs.readFileSync('apps/legacy-preview/styles/styles.css','utf8');

for(const fn of ['agendaStatusMeta','agendaMinutes','renderAgendaTimeline','renderAgendaList','renderAgendaQuickPanel']){
  assert.match(app,new RegExp(`function ${fn}\\(`),`${fn} debe existir`);
}
assert.match(app,/data-agenda-view="timeline"/, 'la agenda debe ofrecer vista Día');
assert.match(app,/data-agenda-view="list"/, 'la agenda debe ofrecer vista Lista');
assert.match(app,/data-agenda-open=/, 'las citas deben abrir panel rápido');
assert.match(app,/data-agenda-action="arrival"/, 'el panel rápido debe permitir registrar llegada');
assert.match(app,/data-agenda-action="complete"/, 'el panel rápido debe permitir completar la cita');
assert.match(app,/agenda-quick-panel/, 'debe existir panel rápido de cita');
assert.match(css,/\.agenda-v10\b/, 'debe existir el sistema visual Agenda V10');
assert.match(css,/\.agenda-timeline-grid\b/, 'debe existir timeline moderna');
assert.match(css,/@media\(max-width:760px\)[\s\S]*\.agenda-timeline-grid/, 'la agenda debe tener adaptación móvil');
assert.doesNotMatch(css,/#e66c9e|#ef4444|#dc2626|#f43f5e|#ff0000/i, 'la agenda v10 no debe introducir tonos rojos de alerta como paleta base');

// Verifica la semántica de estados con el código real del helper.
const metaSource=app.match(/function agendaStatusMeta\([\s\S]*?\n\}/)?.[0];
assert.ok(metaSource,'no se pudo extraer agendaStatusMeta');
const ctx={normalizeText:s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()};
vm.createContext(ctx);
vm.runInContext(`${metaSource}; this.f=agendaStatusMeta;`,ctx);
assert.equal(ctx.f({status:'confirmada'}).tone,'confirmed');
assert.equal(ctx.f({status:'espera'}).tone,'waiting');
assert.equal(ctx.f({status:'realizada'}).tone,'done');
assert.equal(ctx.f({status:'cancelada'}).tone,'cancelled');

console.log('verify_agenda_modern_v10: OK');
