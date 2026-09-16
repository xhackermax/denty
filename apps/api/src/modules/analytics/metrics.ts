export type AnalyticsEventLike={
  id?:string; type:string; category?:string|null; specialty?:string|null; clinicalPlanItemId?:string|null; staffId?:string|null; invoiceId?:string|null; paymentId?:string|null; labWorkId?:string|null;
  revenueCents?:number|null; costCents?:number|null; lossCents?:number|null; quantity?:number|null; metadataJson?:unknown;
};

function n(value:unknown){const x=Number(value??0);return Number.isFinite(x)?x:0}
function isLabCategory(value:unknown){return /lab|laborator/i.test(String(value??""))}
function hasUnknownHistoricalCost(event:AnalyticsEventLike){return Boolean((event.metadataJson as any)?.historicalCostUnavailable)}
function standardLabComponent(event:AnalyticsEventLike){const metadata=event.metadataJson as any,items=Array.isArray(metadata?.standardCostItems)?metadata.standardCostItems:[];return items.reduce((total:number,item:any)=>total+(isLabCategory(item?.category)?n(item?.lineCostCents??n(item?.quantity)*n(item?.unitCostCents)):0),0)}


function eventMeta(event:AnalyticsEventLike){return (event.metadataJson&&typeof event.metadataJson==="object"?event.metadataJson:{}) as any}
function isLabOnlyRework(event:AnalyticsEventLike){return event.type==="treatment.rework"&&eventMeta(event).source==="lab"}
function resolvedReworkCost(event:AnalyticsEventLike,events:AnalyticsEventLike[]){
  const meta=eventMeta(event);
  if(isLabOnlyRework(event)){const id=meta.labReworkId;const actual=id?events.filter(e=>e.type==="lab.cost_recorded"&&e.labWorkId===id).reduce((x,e)=>x+n(e.costCents),0):0;return actual>0?actual:n(event.costCents)}
  const standard=n(event.costCents),standardLab=standardLabComponent(event),reworkItemId=meta.reworkItemId,actualLab=reworkItemId?events.filter(e=>e.type==="lab.cost_recorded"&&e.clinicalPlanItemId===reworkItemId).reduce((x,e)=>x+n(e.costCents),0):0;
  return Math.max(0,standard-standardLab)+(actualLab>0?actualLab:standardLab);
}
function treatmentCostForCompletion(completion:AnalyticsEventLike,events:AnalyticsEventLike[]){
  const standard=n(completion.costCents),planItemId=completion.clinicalPlanItemId;
  if(!planItemId)return standard;
  const actualLab=events.filter(e=>e.type==="lab.cost_recorded"&&e.clinicalPlanItemId===planItemId).reduce((x,e)=>x+n(e.costCents),0);
  const rework=events.filter(e=>e.type==="treatment.rework"&&e.clinicalPlanItemId===planItemId&&!isLabOnlyRework(e)).reduce((x,e)=>x+resolvedReworkCost(e,events),0);
  const standardLab=standardLabComponent(completion);
  return Math.max(0,standard-standardLab)+(actualLab>0?actualLab:standardLab)+rework;
}

export function computeAnalyticsStats(events:AnalyticsEventLike[]){
  const completions=events.filter(e=>e.type==="treatment.completed");
  const producedCents=completions.reduce((x,e)=>x+n(e.revenueCents),0);
  const invoiceAggregates=events.filter(e=>e.type==="invoice.issued"),invoiceLines=events.filter(e=>e.type==="invoice.line_issued");
  const invoicedCents=(invoiceAggregates.length?invoiceAggregates:invoiceLines).reduce((x,e)=>x+n(e.revenueCents),0);
  const paymentAggregates=events.filter(e=>e.type==="payment.received"),paymentAllocations=events.filter(e=>e.type==="payment.allocated");
  const collectedCents=(paymentAggregates.length?paymentAggregates:paymentAllocations).reduce((x,e)=>x+n(e.revenueCents),0);
  const standardDirectCostCents=completions.reduce((x,e)=>x+n(e.costCents),0);
  const actualLabCostCents=events.filter(e=>e.type==="lab.cost_recorded").reduce((x,e)=>x+n(e.costCents),0);
  const reworkEvents=events.filter(e=>e.type==="treatment.rework"),clinicalReworkItemIds=new Set(reworkEvents.map(e=>eventMeta(e).reworkItemId).filter(Boolean));
  const reworkCostCents=reworkEvents.reduce((x,e)=>x+resolvedReworkCost(e,events),0);
  const purchaseSpendCents=events.filter(e=>e.type==="purchase.recorded").reduce((x,e)=>x+n(e.costCents),0);
  const lossCents=events.reduce((x,e)=>x+n(e.lossCents),0);
  const linkedPlanItems=new Set(completions.map(e=>e.clinicalPlanItemId).filter(Boolean)),consumedLabPlanItems=new Set([...linkedPlanItems,...clinicalReworkItemIds]);
  const completedCost=completions.reduce((x,e)=>x+treatmentCostForCompletion(e,events),0);
  const unlinkedLab=events.filter(e=>e.type==="lab.cost_recorded"&&(!e.clinicalPlanItemId||!consumedLabPlanItems.has(e.clinicalPlanItemId))).reduce((x,e)=>x+n(e.costCents),0);
  const unlinkedRework=reworkEvents.filter(e=>!isLabOnlyRework(e)&&(!e.clinicalPlanItemId||!linkedPlanItems.has(e.clinicalPlanItemId))).reduce((x,e)=>x+resolvedReworkCost(e,events),0);
  const directCostCents=completedCost+unlinkedLab+unlinkedRework;
  const unknownCostCompletions=completions.filter(hasUnknownHistoricalCost),knownCostCompletions=completions.filter(e=>!hasUnknownHistoricalCost(e));
  const unknownCostProducedCents=unknownCostCompletions.reduce((x,e)=>x+n(e.revenueCents),0),marginEligibleProducedCents=knownCostCompletions.reduce((x,e)=>x+n(e.revenueCents),0);
  const marginEligibleDirectCostCents=knownCostCompletions.reduce((x,e)=>x+treatmentCostForCompletion(e,events),0)+unlinkedLab+unlinkedRework;
  const marginCoveragePercent=producedCents?Math.round((marginEligibleProducedCents/producedCents)*1000)/10:100,marginIsComplete=unknownCostCompletions.length===0;
  const inefficiencyCostCents=lossCents+reworkCostCents;
  return{producedCents,invoicedCents,collectedCents,standardDirectCostCents,actualLabCostCents,reworkCostCents,purchaseSpendCents,directCostCents,costCents:directCostCents,lossCents,inefficiencyCostCents,unknownCostProducedCents,unknownCostTreatmentCount:unknownCostCompletions.length,marginEligibleProducedCents,marginEligibleDirectCostCents,marginCoveragePercent,marginIsComplete,marginCents:marginEligibleProducedCents-marginEligibleDirectCostCents-lossCents,eventCount:events.length};
}

export function groupTreatmentProfitability(events:AnalyticsEventLike[]){
  const completions=events.filter(e=>e.type==="treatment.completed"),by=new Map<string,AnalyticsEventLike[]>();
  for(const completion of completions){const key=completion.category??completion.specialty??"Sin clasificar";(by.get(key)??by.set(key,[]).get(key)!).push(completion)}
  return [...by].map(([name,items])=>{
    const planIds=new Set(items.map(e=>e.clinicalPlanItemId).filter(Boolean));
    const related=events.filter(e=>items.includes(e)||(e.clinicalPlanItemId&&planIds.has(e.clinicalPlanItemId)));
    const producedCents=items.reduce((x,e)=>x+n(e.revenueCents),0),knownItems=items.filter(e=>!hasUnknownHistoricalCost(e)),unknownItems=items.filter(hasUnknownHistoricalCost);
    const directCostCents=items.reduce((x,e)=>x+treatmentCostForCompletion(e,events),0),marginEligibleProducedCents=knownItems.reduce((x,e)=>x+n(e.revenueCents),0),marginEligibleDirectCostCents=knownItems.reduce((x,e)=>x+treatmentCostForCompletion(e,events),0);
    const lossCents=related.reduce((x,e)=>x+n(e.lossCents),0);
    const marginCents=marginEligibleProducedCents-marginEligibleDirectCostCents-lossCents;
    const quantity=items.reduce((x,e)=>x+n(e.quantity||1),0),marginCoveragePercent=producedCents?Math.round((marginEligibleProducedCents/producedCents)*1000)/10:100;
    return{name,producedCents,directCostCents,costCents:directCostCents,lossCents,marginCents,marginPercent:marginEligibleProducedCents?Math.round(marginCents/marginEligibleProducedCents*1000)/10:null,marginCoveragePercent,marginIsComplete:unknownItems.length===0,unknownCostTreatmentCount:unknownItems.length,quantity};
  }).sort((a,b)=>b.producedCents-a.producedCents);
}

export function specialtyForTreatmentCode(code:unknown){const value=String(code??"").toLowerCase();if(/implant|sinus|bone|regener|graft/.test(value))return"Implantología";if(/ortho|bracket|aligner|invis|retainer/.test(value))return"Ortodoncia";if(/endo|root_canal|pulp/.test(value))return"Endodoncia";if(/perio|scal|root_plan|hygien|cleaning/.test(value))return"Periodoncia e higiene";if(/extract|surgery|surgical|exodon/.test(value))return"Cirugía";if(/crown|bridge|prost|removable|denture|onlay|veneer|maryland/.test(value))return"Prótesis y rehabilitación";if(/restor|filling|caries|composite|reconstruction/.test(value))return"Conservadora";if(/whiten|aesthetic|esthetic/.test(value))return"Estética";if(/pedo|pulpotomy|pulpectomy|space_maintainer/.test(value))return"Odontopediatría";return"Otros"}
export function groupSpecialtyProfitability(events:AnalyticsEventLike[]){const remapped=events.map(e=>e.type==="treatment.completed"?{...e,category:e.specialty??specialtyForTreatmentCode(e.category)}:e);return groupTreatmentProfitability(remapped)}

export function sumAttributedFinancialsByStaff(events:AnalyticsEventLike[]){
  const totals:Record<string,{billedCents:number;collectedCents:number}>={};
  for(const event of events){
    if(!event.staffId)continue;
    if(event.type!=="invoice.line_issued"&&event.type!=="payment.allocated")continue;
    const row=totals[event.staffId]??(totals[event.staffId]={billedCents:0,collectedCents:0});
    if(event.type==="invoice.line_issued")row.billedCents+=n(event.revenueCents);
    if(event.type==="payment.allocated")row.collectedCents+=n(event.revenueCents);
  }
  return totals;
}
