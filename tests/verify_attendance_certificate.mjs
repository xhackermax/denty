import assert from 'node:assert/strict';
import { defaultDb, createPatient, createAttendanceCertificateDocument, attendanceCertificateText } from '../apps/legacy-preview/logic.js';

const db=defaultDb();
const p=createPatient(db,{first_name:'María',last_name:'García López',dni:'12345678A'});
db.settings.clinicProfile={...db.settings.clinicProfile,name:'Centro Dental Funcional',phone:'600 891 594',address:'Paseo Damas 32, 1ºC · Zaragoza'};
db.sites[0]={...db.sites[0],name:'Centro Dental Funcional · Avenida Navarra',address:'Avenida Navarra 17 · Zaragoza'};
const ap={id:999,patient_id:p.id,site_id:db.sites[0].id,date:'2026-09-15',start_time:'10:00',end_time:'10:45',status:'realizada',title:'Reconstrucción 26',reason:'Reconstrucción 26'};
db.appointments.push(ap);

const generic=attendanceCertificateText(db,{patient_id:p.id,appointment_id:ap.id,issued_date:'2026-09-15',include_procedure:false});
assert.match(generic,/JUSTIFICANTE DE ASISTENCIA/);
assert.match(generic,/María García López/);
assert.match(generic,/12345678A/);
assert.match(generic,/15 de septiembre de 2026/);
assert.match(generic,/10:00/);
assert.match(generic,/10:45/);
assert.match(generic,/atención odontológica/i);
assert.doesNotMatch(generic,/Reconstrucción 26/,'el modo mínimo no debe revelar el procedimiento concreto');
assert.match(generic,/acredita exclusivamente la asistencia/i);

const detailed=attendanceCertificateText(db,{patient_id:p.id,appointment_id:ap.id,issued_date:'2026-09-15',include_procedure:true});
assert.match(detailed,/Reconstrucción 26/,'el modo detallado debe poder incluir el procedimiento de la cita');

const doc=createAttendanceCertificateDocument(db,{patient_id:p.id,appointment_id:ap.id,issued_date:'2026-09-15',include_procedure:true});
assert.equal(doc.type,'attendance_certificate');
assert.equal(doc.status,'emitido');
assert.equal(doc.appointment_id,ap.id);
assert.match(doc.text,/Y para que conste/i);
assert.ok(db.documents.includes(doc));

assert.throws(()=>attendanceCertificateText(db,{patient_id:p.id,appointment_id:123456,issued_date:'2026-09-15'}),/Cita no encontrada/);
const pending={id:1000,patient_id:p.id,date:'2026-09-15',start_time:'12:00',status:'programada',title:'Revisión'};
db.appointments.push(pending);
assert.throws(()=>attendanceCertificateText(db,{patient_id:p.id,appointment_id:pending.id,issued_date:'2026-09-15'}),/realizada/i,'no debe acreditarse una cita que no consta realizada');
console.log('verify_attendance_certificate: OK');
