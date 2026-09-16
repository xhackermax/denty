import { computeAnalyticsStats } from "./metrics";

const DAY=86_400_000;
function chairMinutes(appointments:any[]){return appointments.reduce((total,a)=>{const start=a.chairAt??a.startsAt,end=a.completedAt??a.endsAt;return total+Math.max(0,(end.getTime()-start.getTime())/60000)},0)}
async function sample(db:any,clinicId:string,before:Date,staffId?:string){
  const start=new Date(before.getTime()-90*DAY),whereStaff=staffId?{staffId}:{};
  const [events,appointments]=await Promise.all([
    db.analyticsEvent.findMany({where:{clinicId,occurredAt:{gte:start,lt:before},...whereStaff,type:{in:["treatment.completed","lab.cost_recorded","treatment.rework"]}}}),
    db.appointment.findMany({where:{clinicId,...whereStaff,status:"COMPLETED",startsAt:{gte:start,lt:before}}}),
  ]);
  const minutes=chairMinutes(appointments),margin=computeAnalyticsStats(events).marginCents;
  return{minutes,margin,rate:minutes>=60&&margin>0?margin/minutes:0};
}
export async function resolveHistoricalMarginCentsPerMinute(db:any,clinicId:string,staffId:string,before=new Date()){
  const doctor=await sample(db,clinicId,before,staffId);if(doctor.rate>0)return Math.round(doctor.rate);
  const clinic=await sample(db,clinicId,before);if(clinic.rate>0)return Math.round(clinic.rate);
  const configured=Number(process.env.DENTY_MARGIN_CENTS_PER_MINUTE??0);return Number.isFinite(configured)&&configured>0?configured:0;
}
