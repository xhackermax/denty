export type RadiographicAiInput={findings:Array<{code:string;confidence:number}>;modelVersion:string};
export function evaluateRadiographicAiResult(input:RadiographicAiInput){
 return { ...input, clinicalStatus:'requires_human_review' as const, canAutoWriteDiagnosis:false as const, canAutoPlanTreatment:false as const };
}
