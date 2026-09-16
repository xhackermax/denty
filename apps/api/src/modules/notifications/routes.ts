import type {FastifyInstance} from "fastify";
import {can} from "@denty/domain";
import {prisma} from "@denty/db";
import {getActor} from "../../plugins/actor";
export async function registerNotificationRoutes(server:FastifyInstance){
 server.get("/api/notifications/preferences",async request=>{const actor=await getActor(request);return{items:await prisma.notificationPreference.findMany({where:{clinicId:actor.clinicId,OR:[{userId:actor.userId},...(actor.patientIds?.length?[{patientId:{in:actor.patientIds}}]:[])]},orderBy:{updatedAt:"desc"}})}});
 server.put("/api/notifications/preferences",async request=>{const actor=await getActor(request),b=request.body as any,patientId=b.patientId?String(b.patientId):undefined;if(patientId&&actor.role==="PATIENT"&&!actor.patientIds?.includes(patientId))throw Object.assign(new Error("Forbidden"),{statusCode:403});if(patientId&&actor.role!=="PATIENT"&&!can(actor,"patients.write_demographics"))throw Object.assign(new Error("Forbidden"),{statusCode:403});const channel=String(b.channel??"EMAIL").toUpperCase(),type=String(b.type??"*").toUpperCase();const existing=await prisma.notificationPreference.findFirst({where:{clinicId:actor.clinicId,userId:patientId?null:actor.userId,patientId:patientId??null,channel,type}});return existing?prisma.notificationPreference.update({where:{id:existing.id},data:{enabled:Boolean(b.enabled)}}):prisma.notificationPreference.create({data:{clinicId:actor.clinicId,userId:patientId?undefined:actor.userId,patientId,channel,type,enabled:Boolean(b.enabled)}})});
}
