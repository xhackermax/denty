import { treatmentSpecialty, type TreatmentSpecialty } from "./treatment-specialty.ts";

/** Doctor analytics: only count completed clinical executions, not planned treatments. */
export interface DoctorExecution {doctorId:string;patientId:string;appointmentId:string;treatmentCategory:string;attributedRevenueCents:number|null;
 treatmentCode?:string|null;label?:string|null;specialty?:string|null;tooth?:string|null}
export interface DoctorVisit {doctorId:string;patientId:string;appointmentId:string;status:string}
export interface DoctorIncident {responsibleDoctorId:string|null;category:string;repeatTreatment:boolean;cause:string}
export interface DoctorImplantOutcome {doctorId:string;outcome:"PLACED"|"FAILED"|"DEFERRED";failureKind?:string|null;appointmentId?:string|null;toothPosition?:string|null}
export interface DoctorScorecard {
 doctorId:string;completedVisits:number;uniquePatients:number;
 treatmentCounts:Record<string,number>;specialtyCounts:Partial<Record<TreatmentSpecialty,number>>;recordedExecutions:number;
 attributedRevenueCents:number;attributedRevenueCoverage:number;
 averageTicketCents:number|null;
 repeatedTreatmentIncidents:number;reportedIncidents:number;
 placedImplants:number;failedPlacementAttempts:number;subsequentImplantFailures:number;deferredImplants:number;
}
export function doctorScorecard(doctorId:string,executions:readonly DoctorExecution[],visits:readonly DoctorVisit[],incidents:readonly DoctorIncident[],implants:readonly DoctorImplantOutcome[]):DoctorScorecard{
 const done=visits.filter(v=>v.doctorId===doctorId&&v.status==="COMPLETED");
 const unique=new Set(done.map(v=>v.patientId));
 const performed=executions.filter(e=>e.doctorId===doctorId);
 const counts:Record<string,number>={};
 for(const e of performed)counts[e.treatmentCategory]=(counts[e.treatmentCategory]??0)+1;
 const revenueRows=performed.filter(e=>e.attributedRevenueCents!==null&&Number.isFinite(e.attributedRevenueCents));
 const attributedRevenueCents=revenueRows.reduce((n,e)=>n+(e.attributedRevenueCents??0),0);
 const attributedVisits=new Set(revenueRows.map(e=>e.appointmentId));
 const relevantIncidents=incidents.filter(i=>i.responsibleDoctorId===doctorId);
 const relevantImplants=implants.filter(i=>i.doctorId===doctorId);
 const specialtyCounts=countBySpecialty(performed,relevantImplants);
 return {
  doctorId,completedVisits:done.length,uniquePatients:unique.size,treatmentCounts:counts,specialtyCounts,recordedExecutions:performed.length,
  attributedRevenueCents,attributedRevenueCoverage:performed.length?revenueRows.length/performed.length:0,
  averageTicketCents:attributedVisits.size?Math.round(attributedRevenueCents/attributedVisits.size):null,
  repeatedTreatmentIncidents:relevantIncidents.filter(i=>i.repeatTreatment).length,reportedIncidents:relevantIncidents.length,
  placedImplants:relevantImplants.filter(i=>i.outcome==="PLACED").length,
  failedPlacementAttempts:relevantImplants.filter(i=>i.outcome==="FAILED"&&i.failureKind==="PLACEMENT_ATTEMPT").length,
  subsequentImplantFailures:relevantImplants.filter(i=>i.outcome==="FAILED"&&i.failureKind==="PREVIOUSLY_PLACED").length,
  deferredImplants:relevantImplants.filter(i=>i.outcome==="DEFERRED").length
 };
}
/**
 * Implant surgery is recorded in its own outcome form, which is mandatory to close the visit,
 * so placed implants count even when no plan item was completed. A completed implant plan item
 * for the same visit and tooth is the same implant and is not counted twice.
 */
function countBySpecialty(performed:readonly DoctorExecution[],implants:readonly DoctorImplantOutcome[]){
 const counts:Partial<Record<TreatmentSpecialty,number>>={};
 const add=(key:TreatmentSpecialty)=>{counts[key]=(counts[key]??0)+1;};
 const placed=implants.filter(i=>i.outcome==="PLACED");
 const placedKeys=new Set(placed.map(i=>`${i.appointmentId??""}|${i.toothPosition??""}`));
 for(const e of performed){
  const key=treatmentSpecialty({treatmentCode:e.treatmentCode,label:e.label,category:e.treatmentCategory,specialty:e.specialty,tooth:e.tooth});
  if(key==="implants"&&placedKeys.has(`${e.appointmentId}|${e.tooth??""}`))continue;
  add(key);
 }
 if(placed.length)counts.implants=(counts.implants??0)+placed.length;
 return counts;
}
/** Attendance is append-only. Never sum raw punches as hours; resolve corrections, pair ENTRY/EXIT and exclude breaks first. */
export function attendanceHoursStatus(punchesCount:number):"NO_RECORDS"|"REQUIRES_PAIRING"{
 return punchesCount===0?"NO_RECORDS":"REQUIRES_PAIRING";
}
