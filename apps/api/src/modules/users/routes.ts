import type { FastifyInstance } from "fastify";
import { prisma } from "@denty/db";
import { can, normalizeRole } from "@denty/domain";
import { hashPassword, hashPin } from "../../auth/routes";
import { getActor } from "../../plugins/actor";

function adminOnly(actor:any){if(!can(actor,"users.manage"))throw Object.assign(new Error("Forbidden"),{statusCode:403});}
export async function registerUserRoutes(server:FastifyInstance){
  server.get("/api/users",async request=>{const actor=await getActor(request);adminOnly(actor);return{items:await prisma.user.findMany({where:{clinicId:actor.clinicId},select:{id:true,email:true,username:true,displayName:true,role:true,active:true,lastLoginAt:true,staffProfile:{select:{id:true,displayName:true}}},orderBy:{displayName:"asc"}})}});
  server.post("/api/users",async(request,reply)=>{const actor=await getActor(request);adminOnly(actor);const b=request.body as any,role=normalizeRole(String(b.role??"RECEPTION"));const passwordHash=b.password?await hashPassword(String(b.password)):undefined,pinHash=b.pin?await hashPin(String(b.pin)):undefined;const user=await prisma.user.create({data:{clinicId:actor.clinicId,email:b.email||undefined,username:b.username||undefined,displayName:String(b.displayName),role,credential:(passwordHash||pinHash)?{create:{passwordHash,pinHash}}:undefined}});if(b.staffId)await prisma.staffProfile.update({where:{id:String(b.staffId)},data:{userId:user.id,role}});return reply.code(201).send({id:user.id,displayName:user.displayName,role:user.role});});
  server.patch<{Params:{id:string}}>("/api/users/:id",async(request)=>{const actor=await getActor(request);adminOnly(actor);const b=request.body as any;const data:any={};if(b.displayName!==undefined)data.displayName=String(b.displayName);if(b.active!==undefined)data.active=Boolean(b.active);if(b.role!==undefined)data.role=normalizeRole(String(b.role));return prisma.user.update({where:{id:request.params.id},data});});
  server.post<{Params:{id:string}}>("/api/users/:id/reset-password",async request=>{const actor=await getActor(request);adminOnly(actor);const b=request.body as any,passwordHash=await hashPassword(String(b.password));await prisma.userCredential.upsert({where:{userId:request.params.id},create:{userId:request.params.id,passwordHash},update:{passwordHash,changedAt:new Date()}});await prisma.session.updateMany({where:{userId:request.params.id},data:{revokedAt:new Date()}});return{ok:true};});
}
