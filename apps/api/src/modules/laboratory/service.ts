import { prisma, runBusinessTransaction, writeAnalyticsEvent, writeAudit, writeDomainEvent } from "@denty/db";
import { transitionLab, type ActorContext, type LabStatus } from "@denty/domain";
import { specialtyForTreatmentCode } from "../analytics/metrics";


async function validateLabReferences(tx:any,actor:ActorContext,input:any){
  const patient=await tx.patient.findFirstOrThrow({where:{id:input.patientId,clinicId:actor.clinicId}});
  if(input.clinicalPlanItemId){const item=await tx.clinicalPlanItem.findFirstOrThrow({where:{id:input.clinicalPlanItemId,plan:{clinicId:actor.clinicId}} ,include:{plan:true}});if(item.plan.patientId!==patient.id)throw Object.assign(new Error("Clinical item belongs to another patient"),{statusCode:409,code:"LAB_PATIENT_PLAN_MISMATCH"});}
  if(input.staffId)await tx.staffProfile.findFirstOrThrow({where:{id:input.staffId,clinicId:actor.clinicId}});
  if(input.siteId)await tx.site.findFirstOrThrow({where:{id:input.siteId,clinicId:actor.clinicId}});
  if(input.labId)await tx.lab.findFirstOrThrow({where:{id:input.labId,clinicId:actor.clinicId}});
  if(input.reworkOfId){const original=await tx.labWork.findFirstOrThrow({where:{id:input.reworkOfId,clinicId:actor.clinicId}});if(original.patientId!==patient.id)throw Object.assign(new Error("Rework belongs to another patient"),{statusCode:409,code:"LAB_REWORK_PATIENT_MISMATCH"});}
}
export async function createLabWork(actor:ActorContext,input:any,correlationId:string){
  return runBusinessTransaction(prisma,async tx=>{
    await validateLabReferences(tx,actor,{...input,staffId:input.staffId??actor.staffId});
    const work=await tx.labWork.create({data:{clinicId:actor.clinicId,patientId:input.patientId,clinicalPlanItemId:input.clinicalPlanItemId,staffId:input.staffId??actor.staffId,siteId:input.siteId,labId:input.labId,title:input.title,category:input.category,toothOrZone:input.toothOrZone,etaAt:input.etaAt?new Date(input.etaAt):undefined,costCents:input.costCents??0,notes:input.notes,reworkOfId:input.reworkOfId}});
    await writeAudit(tx,{clinicId:actor.clinicId,actorUserId:actor.userId,action:"lab.work_created",entityType:"lab_work",entityId:work.id,correlationId,after:{status:work.status,title:work.title,reworkOfId:work.reworkOfId}});
    await writeDomainEvent(tx,{clinicId:actor.clinicId,actorUserId:actor.userId,type:"lab.work_created",entityType:"lab_work",entityId:work.id,correlationId,payload:{patientId:work.patientId,clinicalPlanItemId:work.clinicalPlanItemId,reworkOfId:work.reworkOfId}});
    return work;
  });
}

export async function transitionLabWorkTx(tx:any,actor:ActorContext,id:string,input:any,correlationId:string){
    const before=await tx.labWork.findFirstOrThrow({where:{id,clinicId:actor.clinicId}});
    if(before.version!==input.expectedVersion)throw Object.assign(new Error("Version conflict"),{statusCode:409,current:before});
    const next=transitionLab(before.status as LabStatus,input.status),now=new Date(),stamps:any={};
    if(next==="SENT")stamps.sentAt=before.sentAt??now;
    if(next==="RECEIVED")stamps.receivedAt=now;
    if(next==="PLACED")stamps.placedAt=now;
    const updated=await tx.labWork.update({where:{id},data:{status:next,...stamps,version:{increment:1}}});
    await tx.labWorkEvent.create({data:{labWorkId:id,type:`status.${next.toLowerCase()}`,note:input.note}});
    await writeAudit(tx,{clinicId:actor.clinicId,actorUserId:actor.userId,action:`lab.${next.toLowerCase()}`,entityType:"lab_work",entityId:id,correlationId,before:{status:before.status},after:{status:next,version:updated.version}});
    await writeDomainEvent(tx,{clinicId:actor.clinicId,actorUserId:actor.userId,type:`lab.${next.toLowerCase()}`,entityType:"lab_work",entityId:id,correlationId,payload:{patientId:updated.patientId,version:updated.version,etaAt:updated.etaAt}});
    if(next==="RECEIVED"&&updated.costCents>0){
      const item=updated.clinicalPlanItemId?await tx.clinicalPlanItem.findFirst({where:{id:updated.clinicalPlanItemId,plan:{clinicId:actor.clinicId}},select:{treatmentCode:true}}):null;
      await writeAnalyticsEvent(tx,{clinicId:actor.clinicId,type:"lab.cost_recorded",category:item?.treatmentCode??updated.category??undefined,specialty:item?.treatmentCode?specialtyForTreatmentCode(item.treatmentCode):undefined,patientId:updated.patientId,staffId:updated.staffId??undefined,siteId:updated.siteId??undefined,clinicalPlanItemId:updated.clinicalPlanItemId??undefined,labWorkId:id,costCents:updated.costCents,metadata:{labCategory:updated.category??undefined,reworkOfLabWorkId:updated.reworkOfId??undefined},correlationId,dedupeKey:`lab.cost_recorded:${id}`});
    }
    return updated;
}
export async function transitionLabWork(actor:ActorContext,id:string,input:any,correlationId:string){return runBusinessTransaction(prisma,tx=>transitionLabWorkTx(tx,actor,id,input,correlationId));}

export async function createRework(actor:ActorContext,id:string,input:any,correlationId:string){
  return runBusinessTransaction(prisma,async tx=>{
    const original=await tx.labWork.findFirstOrThrow({where:{id,clinicId:actor.clinicId}});
    const item=original.clinicalPlanItemId?await tx.clinicalPlanItem.findFirst({where:{id:original.clinicalPlanItemId,plan:{clinicId:actor.clinicId}},select:{treatmentCode:true}}):null;
    const rework=await tx.labWork.create({data:{clinicId:actor.clinicId,patientId:original.patientId,clinicalPlanItemId:original.clinicalPlanItemId,staffId:original.staffId,siteId:original.siteId,labId:original.labId,title:`Repetición · ${original.title}`,category:original.category,toothOrZone:original.toothOrZone,etaAt:input.etaAt?new Date(input.etaAt):undefined,costCents:input.costCents??0,notes:input.reason,reworkOfId:id}});
    await tx.labWorkEvent.create({data:{labWorkId:rework.id,type:"rework.created",note:input.reason,payloadJson:{reworkOfId:id,expectedCostCents:input.costCents??0}}});
    await writeAudit(tx,{clinicId:actor.clinicId,actorUserId:actor.userId,action:"lab.rework_created",entityType:"lab_work",entityId:rework.id,correlationId,after:{reworkOfId:id,reason:input.reason,expectedCostCents:input.costCents??0}});
    await writeDomainEvent(tx,{clinicId:actor.clinicId,actorUserId:actor.userId,type:"lab.rework_created",entityType:"lab_work",entityId:rework.id,correlationId,payload:{patientId:rework.patientId,clinicalPlanItemId:rework.clinicalPlanItemId,reworkOfId:id}});
    await writeAnalyticsEvent(tx,{clinicId:actor.clinicId,type:"treatment.rework",category:item?.treatmentCode??original.category??undefined,specialty:item?.treatmentCode?specialtyForTreatmentCode(item.treatmentCode):undefined,patientId:original.patientId,staffId:original.staffId??undefined,siteId:original.siteId??undefined,clinicalPlanItemId:original.clinicalPlanItemId??undefined,labWorkId:rework.id,costCents:0,metadata:{reason:input.reason,source:"lab",labReworkId:rework.id,reworkOfLabWorkId:id,expectedCostCents:input.costCents??0},correlationId,dedupeKey:`treatment.rework:lab:${rework.id}`});
    return rework;
  });
}
