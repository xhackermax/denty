import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {defaultDb,migrateDb} from '../apps/legacy-preview/logic.js';

const app=fs.readFileSync('apps/legacy-preview/app.js','utf8');
const css=fs.readFileSync('apps/legacy-preview/styles/styles.css','utf8');

for(const fn of ['agendaWaitMinutes','agendaStatusMeta','currentAgendaEmployeeId','agendaColumnsForCurrentUser','agendaVisibleCounters']){
  assert.match(app,new RegExp(`function ${fn}\\(`),`${fn} debe existir`);
}
assert.match(app,/data-agenda-action="absent"/, 'el panel rápido debe permitir marcar Ausente / NPA');
assert.match(app,/action==='absent'[\s\S]{0,180}status='ausente'/, 'la acción absent debe guardar estado ausente');
assert.match(app,/action==='arrival'[\s\S]{0,220}arrived_at=/, 'la llegada debe guardar hora real de check-in');
assert.match(app,/patientPortalCheckIn[\s\S]{0,900}arrived_at=/, 'el check-in del paciente también debe guardar arrived_at en la cita');
assert.match(app,/setInterval\([\s\S]{0,220}state\.view==='agenda'/, 'la capa temporal debe refrescar la agenda mientras está abierta');

assert.match(css,/\.agenda-status-pill\.tone-late\b[^{]*\{[^}]*hsl\(4\s+78%/s, 'espera >15 min debe tener tono rojo de alerta');
assert.match(css,/\.agenda-status-pill\.tone-absent\b[^{]*\{[^}]*hsl\(214\s+/s, 'ausente debe tener tono azul');
assert.match(css,/\.agenda-appointment-card\.tone-waiting\b[^{]*\{[^}]*hsl\(43\s+/s, 'llegada debe colorear tarjeta en amarillo');
assert.match(css,/\.agenda-appointment-card\.tone-active\b[^{]*\{[^}]*hsl\(154\s+/s, 'gabinete debe colorear tarjeta en verde');

const waitSource=app.match(/function agendaWaitMinutes\([\s\S]*?\n\}/)?.[0];
const metaSource=app.match(/function agendaStatusMeta\([\s\S]*?\n\}/)?.[0];
assert.ok(waitSource&&metaSource,'no se pudieron extraer helpers de estado');
const ctx={normalizeText:s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(),Date};
vm.createContext(ctx);
vm.runInContext(`${waitSource}\n${metaSource}; this.meta=agendaStatusMeta;`,ctx);
const now=new Date('2026-09-16T10:20:00Z');
assert.equal(ctx.meta({status:'espera',arrived_at:'2026-09-16T10:10:00Z'},now).tone,'waiting','10 min de espera debe seguir amarillo');
assert.equal(ctx.meta({status:'espera',arrived_at:'2026-09-16T10:05:00Z'},now).tone,'waiting','15 min exactos debe seguir amarillo');
assert.equal(ctx.meta({status:'espera',arrived_at:'2026-09-16T10:04:00Z'},now).tone,'late','más de 15 min debe ser rojo');
assert.equal(ctx.meta({status:'gabinete',chair_at:'2026-09-16T10:18:00Z'},now).tone,'active','gabinete debe ser verde');
assert.equal(ctx.meta({status:'ausente'},now).tone,'absent','ausente debe ser azul');
assert.equal(ctx.meta({status:'npa'},now).tone,'absent','NPA debe ser azul');


const employeeSource=app.match(/function currentAgendaEmployeeId\([\s\S]*?\n\}/)?.[0];
const columnsSource=app.match(/function agendaColumnsForCurrentUser\([\s\S]*?\n\}/)?.[0];
assert.ok(employeeSource&&columnsSource,'no se pudieron extraer helpers de visibilidad por rol');
const columns=[1,2,3].map(id=>({employee:{id},appointments:[{id:id*10,employee_id:id}]}));
const roleCtx={
  db:{currentUser:{id:11,role:'admin'},users:[{id:11,role:'admin'},{id:12,role:'dentist',employee_id:2},{id:13,role:'reception'}]},
  sessionUser:null,
  state:{date:'2026-09-16'},
  agendaByDoctors:()=>columns,
  normalizeText:s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()
};
vm.createContext(roleCtx);
vm.runInContext(`${employeeSource}
${columnsSource}; this.visible=agendaColumnsForCurrentUser;`,roleCtx);
assert.equal(roleCtx.visible().length,3,'administrador debe ver todas las agendas');
roleCtx.sessionUser={id:13,role:'reception'};
assert.equal(roleCtx.visible().length,3,'recepción/secretaría debe ver todas las agendas');
roleCtx.sessionUser={id:12,role:'dentist',employee_id:2};
assert.deepEqual(Array.from(roleCtx.visible(),x=>x.employee.id),[2],'odontólogo debe ver solo su agenda vinculada');

const base=defaultDb();
const dentist=base.users.find(u=>u.role==='dentist');
assert.ok(Number(dentist?.employee_id)>0,'el usuario odontólogo predeterminado debe estar vinculado a un empleado');
const migrated=migrateDb({...base,appointments:[{id:500,patient_id:1,employee_id:1,date:'2026-09-16',start_time:'10:00',end_time:'10:40',status:'espera',arrived_at:'2026-09-16T10:03:00Z',chair_at:'',absent_at:'',updated_at:'2026-09-16T10:03:00Z'}]});
assert.equal(migrated.appointments[0].arrived_at,'2026-09-16T10:03:00Z','la migración debe conservar arrived_at');

console.log('verify_agenda_status_layer_v11: OK');
