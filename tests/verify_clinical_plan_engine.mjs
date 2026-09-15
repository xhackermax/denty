import assert from 'node:assert/strict';
import {
  defaultDb, createPatient,
  createClinicalPlanItem, clinicalPriorityFor, clinicalPlanGraph,
  patientClinicalPlanProjection, createMissingToothAlternatives,
  setPatientAlternativePreference, updateClinicalAlternativeContext,
  approveClinicalAlternativeOption, syncClinicalPlanFromOdontogram,
  ensureOdontogram, setToothLegendState
} from '../apps/legacy-preview/logic.js';

const db=defaultDb();
const patient=createPatient(db,{first_name:'Ana',last_name:'Plan'});

const endo=createClinicalPlanItem(db,{patient_id:patient.id,tooth:'26',treatment:'endodoncia',clinical_cause:'pulpitis',title:'Endodoncia 26'});
const post=createClinicalPlanItem(db,{patient_id:patient.id,tooth:'26',treatment:'perno',title:'Perno 26',depends_on:[endo.id]});
const crown=createClinicalPlanItem(db,{patient_id:patient.id,tooth:'26',treatment:'corona',title:'Corona 26',depends_on:[post.id]});
assert.equal(clinicalPriorityFor(endo).rank,1,'endodoncia debe priorizarse como control de foco');
assert.equal(clinicalPriorityFor(crown).rank,5,'corona debe quedar en rehabilitacion');
const graph=clinicalPlanGraph(db,patient.id);
assert.deepEqual(graph.items.map(x=>x.id),[endo.id,post.id,crown.id],'las dependencias clinicas deben respetarse');
assert.equal(graph.items[2].dependency_explanations.length,1,'el grafo debe explicar por que un paso depende del anterior');

const patientView=patientClinicalPlanProjection(db,patient.id);
assert.equal(patientView.items.length,3);
assert.match(patientView.items[0].patient_title,/interior|nervio|endodoncia/i,'el paciente debe recibir una explicacion comprensible');
assert.ok(patientView.items[2].why_order,'cada paso debe explicar por que va en ese orden');

const alternatives=createMissingToothAlternatives(db,{patient_id:patient.id,tooth:'36'});
assert.ok(alternatives.options.some(x=>x.key==='implant'),'debe ofrecer implante como alternativa configurable');
assert.ok(alternatives.options.some(x=>x.key==='fixed_bridge'),'debe ofrecer puente fijo');
assert.ok(alternatives.options.some(x=>x.key==='removable'),'debe ofrecer removible');
for(const option of alternatives.options){
  assert.ok(option.pros.length>0 && option.cons.length>0,'cada alternativa debe tener pros y contras');
}
const implant=alternatives.options.find(x=>x.key==='implant');
setPatientAlternativePreference(db,{group_id:alternatives.id,option_id:implant.id,patient_id:patient.id});
assert.equal(alternatives.patient_preference.option_id,implant.id,'el paciente puede expresar preferencia');
assert.equal(alternatives.approved_option_id,null,'preferencia del paciente no equivale a aprobacion clinica');
assert.throws(()=>approveClinicalAlternativeOption(db,{group_id:alternatives.id,option_id:implant.id}),/faltan datos/i,'no debe aprobar una alternativa si faltan datos clinicos requeridos');
for(const key of implant.required_context) updateClinicalAlternativeContext(db,{group_id:alternatives.id,key,value:true});
const approved=approveClinicalAlternativeOption(db,{group_id:alternatives.id,option_id:implant.id,clinician_note:'Opcion validada tras revisar hueso y oclusion'});
assert.equal(alternatives.approved_option_id,implant.id);
assert.ok(approved.created_items.length>=2,'aprobar una alternativa debe materializar sus pasos en el plan clinico');

const db2=defaultDb();
const p2=createPatient(db2,{first_name:'Luis',last_name:'Odonto'});
setToothLegendState(db2,p2.id,'14','endo_indicated');
setToothLegendState(db2,p2.id,'14','crown_pending');
const synced=syncClinicalPlanFromOdontogram(db2,p2.id);
assert.ok(synced.created.length>=2,'el odontograma debe poder alimentar el plan clinico');
const g2=clinicalPlanGraph(db2,p2.id);
const titles=g2.items.map(x=>x.treatment);
assert.ok(titles.includes('endodoncia')&&titles.includes('corona'),'debe conservar tratamientos multiples del mismo diente');
const crown14=g2.items.find(x=>x.tooth==='14'&&x.treatment==='corona');
const endo14=g2.items.find(x=>x.tooth==='14'&&x.treatment==='endodoncia');
assert.ok(crown14.depends_on.includes(endo14.id),'la corona debe depender de la endodoncia indicada del mismo diente');
setToothLegendState(db2,p2.id,'14','crown');
syncClinicalPlanFromOdontogram(db2,p2.id);
assert.equal(clinicalPlanGraph(db2,p2.id).items.find(x=>x.tooth==='14'&&x.treatment==='corona')?.status,'completed','al resolver una indicacion del odontograma, el item auto-generado debe quedar completado en la ruta');

console.log('verify_clinical_plan_engine: OK');
