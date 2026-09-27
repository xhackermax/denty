type Recall={patientId:string;dueAt:string;channel:'email'|'sms'|'whatsapp'|'push'};
export function buildRecallCampaign(recalls:Recall[], now:string){
 const nowMs=Date.parse(now); const horizon=nowMs+30*24*60*60*1000;
 return {jobs:recalls.filter(r=>{const d=Date.parse(r.dueAt);return d>=nowMs&&d<=horizon}).map(r=>({kind:'patient_recall' as const,...r,idempotencyKey:`recall:${r.patientId}:${r.dueAt}:${r.channel}`}))};
}
