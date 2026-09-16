import { AppointmentRepository, prisma, runBusinessTransaction, VersionConflictError, writeAnalyticsEvent, writeAudit, writeDomainEvent } from "@denty/db";
import { can, canAccessAppointment, noShowOpportunityLoss, type AppointmentStatus, type ActorContext } from "@denty/domain";
import type { CreateAppointmentRequest, UpdateAppointmentRequest } from "@denty/contracts";
import { ensureClinic } from "../patients/service";
import { resolveStandardTreatmentCost } from "../analytics/cost-recipes";
import { resolveHistoricalMarginCentsPerMinute } from "../analytics/historical-margin";
import { specialtyForTreatmentCode } from "../analytics/metrics";

export async function listAppointments(actor: ActorContext, date: string) {
  await ensureClinic(actor.clinicId);
  const repository = new AppointmentRepository(prisma);
  const items=await repository.listForDay(actor.clinicId, date);
  return can(actor,"agenda.read.all")?items:items.filter(x=>canAccessAppointment(actor,x));
}

async function ensureNoConflict(db:any,input:{clinicId:string;staffId:string;cabinetId?:string|null;startsAt:Date;endsAt:Date;excludeId?:string}){const conflict=await db.appointment.findFirst({where:{clinicId:input.clinicId,id:input.excludeId?{not:input.excludeId}:undefined,status:{not:"CANCELLED"},startsAt:{lt:input.endsAt},endsAt:{gt:input.startsAt},OR:[{staffId:input.staffId},...(input.cabinetId?[{cabinetId:input.cabinetId}]:[])]}});if(conflict)throw Object.assign(new Error("El horario se solapa con otra cita."),{statusCode:409,code:"APPOINTMENT_CONFLICT",current:conflict});const block=await db.appointmentBlock.findFirst({where:{clinicId:input.clinicId,startsAt:{lt:input.endsAt},endsAt:{gt:input.startsAt},OR:[{staffId:input.staffId},{staffId:null},...(input.cabinetId?[{cabinetId:input.cabinetId}]:[])]}});if(block)throw Object.assign(new Error("El horario está bloqueado."),{statusCode:409,code:"APPOINTMENT_BLOCKED",current:block});}

async function assertAppointmentReferences(db:any,clinicId:string,input:{patientId:string;staffId:string;siteId:string;cabinetId?:string|null;clinicalPlanItemId?:string|null}){
  const [patient,staff,site,cabinet,clinicalItem]=await Promise.all([
    db.patient.findFirst({where:{id:input.patientId,clinicId,archivedAt:null},select:{id:true}}),
    db.staffProfile.findFirst({where:{id:input.staffId,clinicId,active:true},select:{id:true}}),
    db.site.findFirst({where:{id:input.siteId,clinicId,active:true},select:{id:true}}),
    input.cabinetId?db.cabinet.findFirst({where:{id:input.cabinetId,clinicId,siteId:input.siteId,active:true},select:{id:true}}):Promise.resolve({id:"none"}),
    input.clinicalPlanItemId?db.clinicalPlanItem.findFirst({where:{id:input.clinicalPlanItemId,plan:{clinicId,patientId:input.patientId}},select:{id:true}}):Promise.resolve({id:"none"}),
  ]);
  if(!patient||!staff||!site||(input.cabinetId&&!cabinet)||(input.clinicalPlanItemId&&!clinicalItem))throw Object.assign(new Error("La cita contiene referencias que no pertenecen a esta clínica/sede."),{statusCode:400,code:"APPOINTMENT_REFERENCE_SCOPE"});
}
function assertOwnAgendaTarget(actor:ActorContext,staffId:string){if(can(actor,"agenda.read.all"))return;if(!actor.staffId||actor.staffId!==staffId)throw Object.assign(new Error("No puedes modificar la agenda de otro profesional."),{statusCode:403,code:"AGENDA_SCOPE"});}

export async function createAppointmentTx(tx:any,actor:ActorContext,input:CreateAppointmentRequest,correlationId:string){
  assertOwnAgendaTarget(actor,input.staffId);
  await assertAppointmentReferences(tx,actor.clinicId,{patientId:input.patientId,staffId:input.staffId,siteId:input.siteId,cabinetId:input.cabinetId,clinicalPlanItemId:input.clinicalPlanItemId});
  const startsAt=new Date(input.startsAt),endsAt=new Date(input.endsAt);await ensureNoConflict(tx,{clinicId:actor.clinicId,staffId:input.staffId,cabinetId:input.cabinetId,startsAt,endsAt});
  const repository=new AppointmentRepository(tx);
  const appointment=await repository.create({clinicId:actor.clinicId,patientId:input.patientId,staffId:input.staffId,siteId:input.siteId,cabinetId:input.cabinetId,clinicalPlanItemId:input.clinicalPlanItemId,startsAt,endsAt,title:input.title,reason:input.reason});
  await writeAudit(tx,{clinicId:actor.clinicId,actorUserId:actor.userId,action:"appointment.created",entityType:"appointment",entityId:appointment.id,correlationId,after:{id:appointment.id,version:appointment.version}});
  await writeDomainEvent(tx,{clinicId:actor.clinicId,actorUserId:actor.userId,type:"appointment.created",entityType:"appointment",entityId:appointment.id,correlationId,payload:{version:appointment.version,patientId:appointment.patientId,staffId:appointment.staffId,startsAt:appointment.startsAt}});
  return appointment;
}

export async function createAppointment(actor:ActorContext,input:CreateAppointmentRequest,correlationId:string){
  await ensureClinic(actor.clinicId);if(!can(actor,"agenda.write"))throw Object.assign(new Error("Forbidden"),{statusCode:403});
  return runBusinessTransaction(prisma,tx=>createAppointmentTx(tx,actor,input,correlationId));
}

export async function updateAppointmentTx(tx:any,actor:ActorContext,id:string,input:UpdateAppointmentRequest,correlationId:string,statusOverride?:AppointmentStatus){
  const before=await tx.appointment.findFirstOrThrow({where:{id,clinicId:actor.clinicId}});if(!canAccessAppointment(actor,before)&&!can(actor,"agenda.read.all"))throw Object.assign(new Error("Forbidden"),{statusCode:403});
  const {expectedVersion,startsAt,endsAt,status,...patch}=input;const nextStarts=startsAt?new Date(startsAt):before.startsAt,nextEnds=endsAt?new Date(endsAt):before.endsAt,nextStaff=patch.staffId??before.staffId,nextSite=patch.siteId??before.siteId,nextPatient=patch.patientId??before.patientId,nextCabinet=patch.cabinetId===undefined?before.cabinetId:patch.cabinetId;
  assertOwnAgendaTarget(actor,nextStaff);
  if(patch.staffId||patch.siteId||patch.patientId||patch.cabinetId!==undefined)await assertAppointmentReferences(tx,actor.clinicId,{patientId:nextPatient,staffId:nextStaff,siteId:nextSite,cabinetId:nextCabinet});
  if(startsAt||endsAt||patch.staffId||patch.siteId||patch.cabinetId!==undefined)await ensureNoConflict(tx,{clinicId:actor.clinicId,staffId:nextStaff,cabinetId:nextCabinet,startsAt:nextStarts,endsAt:nextEnds,excludeId:id});
  const repository=new AppointmentRepository(tx);
  const appointment=await repository.update(id,expectedVersion,{...patch,startsAt:startsAt?new Date(startsAt):undefined,endsAt:endsAt?new Date(endsAt):undefined,status:statusOverride??status});
  const eventType=`appointment.${appointment.status.toLowerCase()}`;
  await writeAudit(tx,{clinicId:actor.clinicId,actorUserId:actor.userId,action:eventType,entityType:"appointment",entityId:appointment.id,correlationId,before:{status:before.status,version:before.version},after:{status:appointment.status,version:appointment.version}});
  await writeDomainEvent(tx,{clinicId:actor.clinicId,actorUserId:actor.userId,type:eventType,entityType:"appointment",entityId:appointment.id,correlationId,payload:{version:appointment.version,patientId:appointment.patientId,staffId:appointment.staffId,arrivedAt:appointment.arrivedAt,chairAt:appointment.chairAt}});
  if(appointment.status==="NO_SHOW"&&before.status!=="NO_SHOW"){const duration=Math.max(0,(appointment.endsAt.getTime()-appointment.startsAt.getTime())/60000),margin=await resolveHistoricalMarginCentsPerMinute(tx,actor.clinicId,appointment.staffId,appointment.absentAt??new Date());await writeAnalyticsEvent(tx,{clinicId:actor.clinicId,type:"appointment.no_show",patientId:appointment.patientId,staffId:appointment.staffId,siteId:appointment.siteId,appointmentId:appointment.id,lossCents:noShowOpportunityLoss(duration,margin),metadata:{durationMinutes:duration,historicalMarginCentsPerMinute:margin,method:margin>0?"historical_margin":"unavailable"},correlationId,dedupeKey:`appointment.no_show:${appointment.id}`});}
  if(appointment.status==="COMPLETED"&&appointment.clinicalPlanItemId){const related=await tx.appointment.findMany({where:{clinicalPlanItemId:appointment.clinicalPlanItemId,status:{not:"CANCELLED"}}});if(related.length&&related.every((x:any)=>x.id===appointment.id||x.status==="COMPLETED")){const beforeItem=await tx.clinicalPlanItem.findFirstOrThrow({where:{id:appointment.clinicalPlanItemId,plan:{clinicId:actor.clinicId}}}),item=beforeItem.status==="COMPLETED"?beforeItem:await tx.clinicalPlanItem.update({where:{id:appointment.clinicalPlanItemId},data:{status:"COMPLETED",version:{increment:1}}});if(beforeItem.status!=="COMPLETED")await writeDomainEvent(tx,{clinicId:actor.clinicId,actorUserId:actor.userId,type:item.source==="rework"?"treatment.rework":"treatment.completed",entityType:"clinical_plan_item",entityId:item.id,correlationId,payload:{patientId:appointment.patientId,staffId:appointment.staffId,version:item.version}});const standardCost=await resolveStandardTreatmentCost(tx,actor.clinicId,item.treatmentCode,appointment.completedAt??new Date()),metadata={standardCostRecipeId:standardCost.recipeId,standardCostItems:standardCost.items.map((x:any)=>({category:x.category,description:x.description,quantity:x.quantity,unitCostCents:x.unitCostCents,lineCostCents:x.lineCostCents}))};if(item.source==="rework")await writeAnalyticsEvent(tx,{clinicId:actor.clinicId,type:"treatment.rework",category:item.treatmentCode,specialty:specialtyForTreatmentCode(item.treatmentCode),patientId:appointment.patientId,staffId:appointment.staffId,siteId:appointment.siteId,appointmentId:appointment.id,clinicalPlanItemId:item.sourceRefId??item.id,costCents:standardCost.costCents,metadata:{...metadata,reworkItemId:item.id,reworkReason:item.clinicalReason},correlationId,dedupeKey:`treatment.rework:${item.id}`});else await writeAnalyticsEvent(tx,{clinicId:actor.clinicId,type:"treatment.completed",category:item.treatmentCode,specialty:specialtyForTreatmentCode(item.treatmentCode),patientId:appointment.patientId,staffId:appointment.staffId,siteId:appointment.siteId,appointmentId:appointment.id,clinicalPlanItemId:item.id,revenueCents:item.priceCents??0,costCents:standardCost.costCents,metadata,correlationId,dedupeKey:`treatment.completed:${item.id}`});}}
  return appointment;
}

export async function updateAppointment(actor:ActorContext,id:string,input:UpdateAppointmentRequest,correlationId:string,statusOverride?:AppointmentStatus){
  await ensureClinic(actor.clinicId);if(!can(actor,"agenda.write"))throw Object.assign(new Error("Forbidden"),{statusCode:403});
  return runBusinessTransaction(prisma,tx=>updateAppointmentTx(tx,actor,id,input,correlationId,statusOverride));
}
export { VersionConflictError };
