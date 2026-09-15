import assert from 'node:assert/strict';
import {
  defaultDb,
  ensureOdontogram,
  setToothLegendState,
  removeToothWholeState,
  patientPortalDentalFindings,
  treatmentPlanHierarchy,
  createTreatmentPlan,
  createPatient,
  patientTreatmentRoute
} from '../apps/legacy-preview/logic.js';

const db=defaultDb();
const patientId=createPatient(db,{first_name:'Paciente',last_name:'Prueba'}).id;
const tooth='26';

setToothLegendState(db,patientId,tooth,'endo_indicated');
setToothLegendState(db,patientId,tooth,'crown_pending');
let rec=ensureOdontogram(db,patientId)[tooth];
assert.deepEqual(rec.whole_states,['endo_indicated','crown_pending'],'un diente debe conservar endodoncia y corona simultaneamente');

setToothLegendState(db,patientId,tooth,'endo');
rec=ensureOdontogram(db,patientId)[tooth];
assert.deepEqual(rec.whole_states,['crown_pending','endo'],'cambiar el estado de endodoncia debe sustituir solo la familia endodoncia');
removeToothWholeState(db,patientId,tooth,'endo');
rec=ensureOdontogram(db,patientId)[tooth];
assert.deepEqual(rec.whole_states,['crown_pending'],'quitar endodoncia debe conservar la corona y retirar solo su familia');
setToothLegendState(db,patientId,tooth,'endo');

const findings=patientPortalDentalFindings(db,patientId).filter(x=>x.tooth===tooth);
assert.ok(findings.some(x=>x.code==='crown_pending'),'el portal paciente debe conservar la corona pendiente');

setToothLegendState(db,patientId,tooth,'missing');
rec=ensureOdontogram(db,patientId)[tooth];
assert.deepEqual(rec.whole_states,['missing'],'ausente debe ser un estado exclusivo del diente');
assert.deepEqual(rec.surfaces,{},'ausente debe limpiar las superficies activas');

const migrated=defaultDb();
const migratedPatientId=createPatient(migrated,{first_name:'Paciente',last_name:'Migrado'}).id;
migrated.odontograms[String(migratedPatientId)][tooth]={status:'post_pending',surfaces:{}};
rec=ensureOdontogram(migrated,migratedPatientId)[tooth];
assert.deepEqual(rec.whole_states,['post_pending'],'los odontogramas anteriores deben migrar sin perder su estado global');

const routeDb=defaultDb();
createPatient(routeDb,{first_name:'Paciente',last_name:'Ruta'});
routeDb.treatmentPlans=[];
createTreatmentPlan(routeDb,{
  patient_id:patientId,
  title:'Plan secuencial real',
  priority:'alta',
  steps:[
    {title:'Diagnostico',order:1,deadline:'2026-12-20',status:'completado'},
    {title:'Endodoncia',order:2,deadline:'2026-10-01',status:'pendiente'},
    {title:'Corona',order:3,deadline:'2026-11-01',status:'pendiente'}
  ]
});
const hierarchy=treatmentPlanHierarchy(routeDb,patientId);
assert.deepEqual(hierarchy[0].steps.map(s=>s.order),[1,2,3],'la secuencia clinica debe respetar order aunque los plazos sean distintos');
assert.deepEqual(patientTreatmentRoute(routeDb,patientId).map(s=>s.title),['Diagnostico','Endodoncia','Corona'],'Ruta hasta terminar debe usar los pasos reales y su orden clinico');

const empty=defaultDb();
createPatient(empty,{first_name:'Paciente',last_name:'Vacio'});
empty.treatmentPlans=[];
assert.deepEqual(patientTreatmentRoute(empty,patientId),[],'sin plan clinico no se deben inventar fases genericas');

console.log('verify_multi_treatment_odontogram: OK');
