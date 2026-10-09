import { toMadridISO } from "./dates";

export type ImplantOutcome="PLACED"|"FAILED"|"DEFERRED";
export type ImplantFailureKind="PLACEMENT_ATTEMPT"|"PREVIOUSLY_PLACED";
export interface ImplantOutcomeForm {
 appointmentId:string;patientId:string;doctorId:string;clinicId:string;toothPosition:string;
 outcome:ImplantOutcome|null;system:string;implantModel:string;platform:string;
 diameterMm:number|null;lengthMm:number|null;lotNumber:string;
 failureKind:ImplantFailureKind|null;reason:string;reassessmentDate:string;notes:string;
}
export const emptyImplantOutcome=(appointmentId:string,patientId:string,doctorId:string,clinicId:string):ImplantOutcomeForm=>({
 appointmentId,patientId,doctorId,clinicId,toothPosition:"",outcome:null,system:"",implantModel:"",platform:"",
 diameterMm:null,lengthMm:null,lotNumber:"",failureKind:null,reason:"",reassessmentDate:"",notes:""
});
export function validateImplantOutcome(form:ImplantOutcomeForm):string[]{
 const errors:string[]=[];
 if(!form.appointmentId||!form.patientId||!form.doctorId||!form.clinicId)errors.push("La cita debe estar vinculada a clínica, paciente y doctor.");
 if(!form.toothPosition.trim())errors.push("Indica la posición dental del implante.");
 if(!form.outcome)errors.push("Marca implante colocado, fracaso o colocación diferida.");
 if(form.outcome==="PLACED"){
  if(!form.system.trim())errors.push("Indica el sistema/fabricante.");
  if(!form.implantModel.trim())errors.push("Indica el modelo de implante.");
  if(!form.platform.trim())errors.push("Indica la plataforma/conexión.");
  if(!(form.diameterMm!==null&&form.diameterMm>0))errors.push("Indica diámetro válido.");
  if(!(form.lengthMm!==null&&form.lengthMm>0))errors.push("Indica longitud válida.");
 }
 if(form.outcome==="FAILED"){
  if(!form.failureKind)errors.push("Diferencia fracaso al colocar y fracaso de implante previamente colocado.");
  if(!form.reason.trim())errors.push("Describe el motivo del fracaso.");
 }
 if(form.outcome==="DEFERRED"&&!form.reason.trim())errors.push("Indica el motivo del diferimiento.");
 return errors;
}
export function implantOutcomePayload(form:ImplantOutcomeForm){
 const errors=validateImplantOutcome(form);
 if(errors.length)throw new Error(errors.join(" "));
 return {
 clinic_id:form.clinicId,appointment_id:form.appointmentId,patient_id:form.patientId,doctor_id:form.doctorId,
 tooth_position:form.toothPosition.trim(),outcome:form.outcome,
 system:form.outcome==="PLACED"?form.system.trim():null,
 implant_model:form.outcome==="PLACED"?form.implantModel.trim():null,
 platform:form.outcome==="PLACED"?form.platform.trim():null,
 diameter_mm:form.outcome==="PLACED"?form.diameterMm:null,
 length_mm:form.outcome==="PLACED"?form.lengthMm:null,
 lot_number:form.outcome==="PLACED"?form.lotNumber.trim()||null:null,
 placed_at:form.outcome==="PLACED"?toMadridISO(Date.now()):null,
 failure_kind:form.outcome==="FAILED"?form.failureKind:null,
 failure_at:form.outcome==="FAILED"?toMadridISO(Date.now()):null,
 reason:form.outcome!=="PLACED"?form.reason.trim():null,
 reassessment_date:form.outcome==="DEFERRED"?form.reassessmentDate||null:null,
 notes:form.notes.trim()||null
 };
}
