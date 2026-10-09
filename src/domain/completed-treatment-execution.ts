/**
 * Single source of truth for the analytics ledger: an appointment can only
 * contribute a treatment after BOTH the appointment and treatment are complete.
 * Idempotency key: appointmentId + clinicalPlanItemId.
 * This function intentionally never infers treatment execution from a completed visit alone.
 */
export interface TreatmentExecutionCandidate {
 appointmentId:string;appointmentStatus:string;clinicId:string;patientId:string;doctorId:string;
 planItemId:string;planItemStatus:string;treatmentCode:string;treatmentCategory:string;
 toothPosition?:string|null;
}
export function executionFromCompletedTreatment(input:TreatmentExecutionCandidate){
 if(input.appointmentStatus!=="COMPLETED"||input.planItemStatus!=="COMPLETED")return null;
 if(!input.appointmentId||!input.planItemId||!input.clinicId||!input.patientId||!input.doctorId)return null;
 if(!input.treatmentCode.trim()||!input.treatmentCategory.trim())return null;
 return {
  appointment_id:input.appointmentId,clinical_plan_item_id:input.planItemId,
  clinic_id:input.clinicId,patient_id:input.patientId,doctor_id:input.doctorId,
  treatment_code:input.treatmentCode,treatment_category:input.treatmentCategory,
  tooth_position:input.toothPosition??null,
  // Revenue must be attributed from the actual budget/payment allocation, never guessed.
  attributed_revenue_cents:null
 };
}
export function executionIdempotencyKey(appointmentId:string,planItemId:string){
 return `${appointmentId}:${planItemId}`;
}
