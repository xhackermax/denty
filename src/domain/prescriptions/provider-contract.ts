export type PrescriptionDispatchInput={prescriptionId:string;patientId:string;prescriberId:string;medicationName:string;signed:boolean};
export function buildPrescriptionDispatch(input:PrescriptionDispatchInput){
 if(!input.signed) throw new Error('PRESCRIPTION_MUST_BE_SIGNED');
 if(!input.medicationName.trim()) throw new Error('MEDICATION_REQUIRED');
 return {ready:true as const, providerAction:'submit_prescription' as const, payload:{prescriptionId:input.prescriptionId,patientId:input.patientId,prescriberId:input.prescriberId,medicationName:input.medicationName}};
}
