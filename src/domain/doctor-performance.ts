/** Doctor analytics: only count completed clinical executions, not planned treatments. */
export interface DoctorExecution {doctorId:string;patientId:string;appointmentId:string;treatmentCategory:string;attributedRevenueCents:number|null}
export interface DoctorVisit {doctorId:string;patientId:string;appointmentId:string;status:string}
export interface DoctorIncident {responsibleDoctorId:string|null;category:string;repeatTreatment:boolean;cause:string}
export interface DoctorImplantOutcome {doctorId:string;outcome:"PLACED"|"FAILED"|"DEFERRED";failureKind?:string|null}
export interface DoctorScorecard {
 doctorId:string;completedVisits:number;uniquePatients:number;
 treatmentCounts:Record<string,number>;recordedExecutions:number;
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
 return {
  doctorId,completedVisits:done.length,uniquePatients:unique.size,treatmentCounts:counts,recordedExecutions:performed.length,
  attributedRevenueCents,attributedRevenueCoverage:performed.length?revenueRows.length/performed.length:0,
  averageTicketCents:attributedVisits.size?Math.round(attributedRevenueCents/attributedVisits.size):null,
  repeatedTreatmentIncidents:relevantIncidents.filter(i=>i.repeatTreatment).length,reportedIncidents:relevantIncidents.length,
  placedImplants:relevantImplants.filter(i=>i.outcome==="PLACED").length,
  failedPlacementAttempts:relevantImplants.filter(i=>i.outcome==="FAILED"&&i.failureKind==="PLACEMENT_ATTEMPT").length,
  subsequentImplantFailures:relevantImplants.filter(i=>i.outcome==="FAILED"&&i.failureKind==="PREVIOUSLY_PLACED").length,
  deferredImplants:relevantImplants.filter(i=>i.outcome==="DEFERRED").length
 };
}
/** Attendance is append-only. Never sum raw punches as hours; resolve corrections, pair ENTRY/EXIT and exclude breaks first. */
export function attendanceHoursStatus(punchesCount:number):"NO_RECORDS"|"REQUIRES_PAIRING"{
 return punchesCount===0?"NO_RECORDS":"REQUIRES_PAIRING";
}
