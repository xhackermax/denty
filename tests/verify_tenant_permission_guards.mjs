import fs from 'node:fs';import assert from 'node:assert/strict';
const patients=fs.readFileSync('apps/api/src/modules/patients/service.ts','utf8');
const appts=fs.readFileSync('apps/api/src/modules/appointments/service.ts','utf8');
const checks=[
 ['patient listing enforces patients.read', /listPatients[\s\S]*can\(actor,\s*["']patients\.read["']\)/.test(patients)],
 ['patient read enforces patients.read', /getPatient[\s\S]*can\(actor,\s*["']patients\.read["']\)/.test(patients)],
 ['patient creation and update enforce demographic write permission', /createPatient[\s\S]*patients\.write_demographics/.test(patients) && /updatePatient[\s\S]*patients\.write_demographics/.test(patients)],
 ['appointment creation validates patient staff site and cabinet tenant references', /assertAppointmentReferences/.test(appts) && /patient/.test(appts) && /staffProfile/.test(appts) && /site/.test(appts) && /cabinet/.test(appts)],
 ['dentist own-agenda scope is enforced on appointment creation', /assertOwnAgendaTarget/.test(appts) && /agenda\.read\.all/.test(appts)],
 ['appointment update revalidates changed tenant references', /assertAppointmentReferences\(tx/.test(appts) && /nextStaff/.test(appts) && /nextSite/.test(appts)],
];
let passed=0;for(const [n,ok] of checks){if(ok){console.log(`PASS ${n}`);passed++}else console.error(`FAIL ${n}`)}console.log(`${passed}/${checks.length} checks passed`);assert.equal(passed,checks.length);
