import assert from 'node:assert/strict';
import {
  ensurePatientPortalState,
  patientPortalDelayDays,
  patientPortalProjectedDate,
  patientPortalPaymentPlan,
  patientPortalHealth,
  patientPortalRescheduleCandidates,
  patientPortalWaitingRoom
} from '../apps/legacy-preview/logic.js';

const db = {
  patientPortal: {},
  patients: [{id: 1, first_name: 'Paciente', last_name: 'Uno'}, {id: 2, first_name: 'Paciente', last_name: 'Dos'}],
  employees: [{id: 1, name: 'Dra. Demo', active: true}],
  shifts: Array.from({length: 7}, (_, weekday) => ({id: weekday + 1, employee_id: 1, weekday, start_time: '09:00', end_time: '12:00'})),
  absences: [],
  cabinets: [{id: 1, name: 'Gabinete 1', active: true}],
  appointments: [
    {id: 10, patient_id: 1, employee_id: 1, cabinet_id: 1, date: '2026-09-14', start_time: '10:00', end_time: '10:40', duration_minutes: 40, status: 'programada'},
    {id: 20, patient_id: 2, employee_id: 1, cabinet_id: 1, date: '2026-09-15', start_time: '10:00', end_time: '10:40', duration_minutes: 40, status: 'espera'},
    {id: 21, patient_id: 1, employee_id: 1, cabinet_id: 1, date: '2026-09-15', start_time: '10:40', end_time: '11:20', duration_minutes: 40, status: 'espera'}
  ]
};

const portal = ensurePatientPortalState(db, 1);
assert.equal(portal.payment_months, 6, 'el portal debe tener 6 meses como simulacion inicial');
assert.deepEqual(portal.appointment_changes, [], 'el historial de cambios empieza vacio');
assert.deepEqual(portal.preparation, {}, 'la preparacion debe persistirse por cita');

assert.equal(patientPortalDelayDays([{impact_days: 7}, {impact_days: 14}, {impact_days: -3}, {}]), 21, 'solo los retrasos positivos deben acumular tiempo');
assert.equal(patientPortalProjectedDate('2026-10-01', [{impact_days: 7}, {impact_days: 2}]), '2026-10-10', 'la fecha final proyectada debe incorporar el retraso acumulado');

const plan = patientPortalPaymentPlan(100, 3);
assert.equal(plan.months, 3);
assert.equal(plan.monthly, 33.33);
assert.equal(plan.last_payment, 33.34);
assert.equal(plan.total, 100);

assert.deepEqual(
  patientPortalHealth({hasNextAppointment:true,unsignedCount:0,delayDays:0,clinicalAlertsCount:0}),
  {tone:'ok',label:'En plazo',message:'Tu tratamiento avanza según la planificación disponible.'}
);
assert.equal(patientPortalHealth({hasNextAppointment:true,unsignedCount:1,delayDays:0,clinicalAlertsCount:0}).tone, 'warn');
assert.equal(patientPortalHealth({hasNextAppointment:false,unsignedCount:0,delayDays:0,clinicalAlertsCount:0}).tone, 'danger');

const candidates = patientPortalRescheduleCandidates(db, db.appointments[0], {days:3,max:3,step:20});
assert.equal(candidates.length, 3, 'debe proponer tres huecos compatibles cuando existen');
assert.equal(candidates[0].date, '2026-09-15');
assert.equal(candidates[0].start_time, '09:00');
assert.equal(candidates[0].impact_days, 1);
assert.ok(candidates.every(candidate => candidate.availability_status === 'ok'), 'solo debe ofrecer huecos compatibles');

const waiting = patientPortalWaitingRoom(db, 1, '2026-09-15');
assert.equal(waiting.checked_in, true);
assert.equal(waiting.ahead, 1, 'debe contar pacientes en espera antes de la cita del paciente');
assert.equal(waiting.eta_min, 12);
assert.equal(waiting.eta_max, 20);


import fs from 'node:fs';
const app = fs.readFileSync('apps/legacy-preview/app.js', 'utf8');
for(const label of ['Inicio','Tratamiento','Citas','Pagos','Documentos','Ayuda']) assert.match(app, new RegExp(`['\"]${label}['\"]`), `el portal debe incluir la seccion ${label}`);
assert.match(app, /Ruta hasta terminar/, 'debe mostrar la ruta completa del tratamiento');
assert.match(app, /Estado del tratamiento/, 'debe mostrar el semaforo del tratamiento');
assert.match(app, /Decisiones pendientes/, 'debe convertir datos en decisiones accionables');
assert.match(app, /Preparar mi cita/, 'debe incluir preparacion de la proxima visita');
assert.match(app, /Sala de espera/, 'debe incluir estado de sala de espera');
assert.match(app, /Lista de espera/, 'debe permitir pedir una cita anterior si se libera');
assert.match(app, /Historial de cambios/, 'debe transparentar cambios de cita e impacto');
assert.match(app, /Resumen de la ultima visita/, 'debe resumir la visita anterior');
assert.match(app, /Necesito ayuda/, 'debe ofrecer soporte estructurado');
assert.match(app, /Comunicar cambio medico/, 'debe permitir comunicar cambios medicos para revision');
assert.match(app, /Videos aprobados por tu clinica/, 'debe reservar contenido educativo curado por la clinica');
assert.match(app, /function openPatientRescheduleModal/, 'el cambio de cita debe tener flujo funcional');
assert.match(app, /function patientPortalCheckIn/, 'el check-in debe ser una accion funcional');
assert.match(app, /function patientPortalWaitingListToggle/, 'la lista de espera debe poder activarse y desactivarse');
assert.match(app, /function patientPortalPaymentMonths/, 'el simulador financiero debe permitir cambiar meses');
assert.match(app, /function openPatientSupportModal/, 'la ayuda debe registrar solicitudes estructuradas');
assert.match(app, /patientPortalPaymentMonths\(Number\(b\.dataset\.portalPaymentMonths\)\)/, 'los botones de meses deben estar enlazados');
assert.match(app, /openPatientRescheduleModal\(\)/, 'el boton de reprogramar debe abrir el flujo');
assert.match(app, /patientPortalCheckIn\(\)/, 'el boton de llegada debe registrar check-in');
assert.match(app, /patientPortalWaitingListToggle\(\)/, 'el boton de lista de espera debe estar enlazado');
assert.match(app, /patientPortalTogglePreparation\(b\.dataset\.portalPrep\)/, 'la preparacion debe persistir checklist');
assert.match(app, /openPatientSupportModal\('Cambio medico'\)/, 'el cambio medico debe abrir soporte estructurado');
assert.match(app, /printPatientAttendanceCertificate\(\)/, 'el justificante debe tener accion de impresion');
assert.match(app, /patientPortalExit.*showAccountChooser/s, 'el paciente debe poder salir a cambiar de cuenta');

const css = fs.readFileSync('apps/legacy-preview/styles/styles.css', 'utf8');
for(const selector of ['.patient-portal-nav','.portal-health','.portal-route-meta','.portal-checklist','.portal-reschedule-options','.portal-document-list','.portal-support-list']) assert.match(css, new RegExp(selector.replace('.', '\\.')), `falta estilo ${selector}`);
assert.match(css, /@media \(max-width: 480px\)/, 'el portal debe tener ajuste especifico para movil estrecho');

console.log('verify_patient_portal_v2: OK');
