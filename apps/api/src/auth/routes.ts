import type { FastifyInstance } from "fastify";
import { prisma } from "@denty/db";
import { normalizeRole } from "@denty/domain";
import { hashPassword, hashPin, needsCredentialRehash, verifyPassword, verifyPin } from "./credentials";
import { clearSessionCookie, parseCookies, sessionCookie } from "./cookies";
import { createSession, revokeSession, SESSION_COOKIE } from "./sessions";
import { requireActor } from "./require-permission";
import { assertLoginRate, recordLoginAttempt } from "./login-throttle";

export async function registerAuthRoutes(server:FastifyInstance){
  server.post("/api/auth/login",async(request,reply)=>{
    const b=request.body as any,identifier=String(b?.identifier??"").trim(),secret=String(b?.password??"");
    const fingerprints=await assertLoginRate(identifier,request.ip);
    const user=await prisma.user.findFirst({where:{active:true,OR:[{email:identifier},{username:identifier}]},include:{credential:true}});
    if(!user?.credential?.passwordHash||!(await verifyPassword(user.credential.passwordHash,secret))){
      await recordLoginAttempt({...fingerprints,userId:user?.id,success:false});
      return reply.code(401).send({error:{code:"INVALID_CREDENTIALS",message:"Credenciales no válidas."}});
    }
    await recordLoginAttempt({...fingerprints,userId:user.id,success:true});
    if(needsCredentialRehash(user.credential.passwordHash))await prisma.userCredential.update({where:{userId:user.id},data:{passwordHash:await hashPassword(secret),changedAt:new Date()}});
    const {token}=await createSession({userId:user.id,clinicId:user.clinicId,deviceLabel:b?.deviceLabel,ip:request.ip,userAgent:request.headers["user-agent"]});
    await prisma.user.update({where:{id:user.id},data:{lastLoginAt:new Date()}});
    reply.header("Set-Cookie",sessionCookie(token));
    return{user:{id:user.id,displayName:user.displayName,role:normalizeRole(user.role)}};
  });

  server.post("/api/auth/pin-login",async(request,reply)=>{
    if(process.env.DENTY_LOCAL_PIN_ENABLED!=="1")return reply.code(403).send({error:{code:"PIN_DISABLED"}});
    const b=request.body as any,identifier=String(b?.identifier??"").trim(),pin=String(b?.pin??"");
    const fingerprints=await assertLoginRate(identifier,request.ip);
    const user=await prisma.user.findFirst({where:{active:true,OR:[{email:identifier},{username:identifier}]},include:{credential:true}});
    if(!user?.credential?.pinHash||!(await verifyPin(user.credential.pinHash,pin))){
      await recordLoginAttempt({...fingerprints,userId:user?.id,success:false});
      return reply.code(401).send({error:{code:"INVALID_CREDENTIALS",message:"Credenciales no válidas."}});
    }
    await recordLoginAttempt({...fingerprints,userId:user.id,success:true});
    if(needsCredentialRehash(user.credential.pinHash))await prisma.userCredential.update({where:{userId:user.id},data:{pinHash:await hashPin(pin),changedAt:new Date()}});
    const {token}=await createSession({userId:user.id,clinicId:user.clinicId,ttlHours:8,ip:request.ip,userAgent:request.headers["user-agent"]});
    reply.header("Set-Cookie",sessionCookie(token));
    return{ok:true};
  });

  server.post("/api/auth/logout",async(request,reply)=>{const token=parseCookies(request.headers.cookie)[SESSION_COOKIE];if(token)await revokeSession(token);reply.header("Set-Cookie",clearSessionCookie());return{ok:true};});
  server.get("/api/auth/session",async request=>{const actor=await requireActor(request);return{actor,permissions:actor.permissions};});
  server.post("/api/auth/request-password-reset",async(request)=>{const b=request.body as any,identifier=String(b?.identifier??"").trim();const user=await prisma.user.findFirst({where:{active:true,OR:[{email:identifier},{username:identifier}]}});if(user){const token=(await import("node:crypto")).randomBytes(32).toString("base64url"),tokenHash=(await import("./sessions")).hashSessionToken(token),expiresAt=new Date(Date.now()+30*60_000);await prisma.passwordResetToken.create({data:{userId:user.id,tokenHash,expiresAt}});await prisma.notification.create({data:{clinicId:user.clinicId,userId:user.id,channel:user.email?"EMAIL":"MANUAL",type:"PASSWORD_RESET",subject:"Restablecer acceso a Denty",body:`Token de recuperación de un solo uso: ${token}`,status:"PENDING"}});}return{ok:true};});
  server.post("/api/auth/reset-password",async(request,reply)=>{const b=request.body as any,{hashSessionToken}=await import("./sessions"),row=await prisma.passwordResetToken.findUnique({where:{tokenHash:hashSessionToken(String(b?.token??""))}});if(!row||row.usedAt||row.expiresAt<=new Date())return reply.code(400).send({error:{code:"RESET_INVALID",message:"Enlace no válido o caducado."}});const passwordHash=await hashPassword(String(b?.newPassword??""));await prisma.$transaction([prisma.userCredential.upsert({where:{userId:row.userId},create:{userId:row.userId,passwordHash},update:{passwordHash,changedAt:new Date()}}),prisma.passwordResetToken.update({where:{id:row.id},data:{usedAt:new Date()}}),prisma.session.updateMany({where:{userId:row.userId,revokedAt:null},data:{revokedAt:new Date()}})]);return{ok:true};});
  server.post("/api/auth/change-password",async(request,reply)=>{const actor=await requireActor(request),b=request.body as any;const credential=await prisma.userCredential.findUnique({where:{userId:actor.userId}});if(!credential?.passwordHash||!(await verifyPassword(credential.passwordHash,String(b?.currentPassword??""))))return reply.code(400).send({error:{code:"CURRENT_PASSWORD_INVALID"}});const passwordHash=await hashPassword(String(b?.newPassword??""));await prisma.userCredential.upsert({where:{userId:actor.userId},create:{userId:actor.userId,passwordHash},update:{passwordHash,changedAt:new Date()}});await prisma.session.updateMany({where:{userId:actor.userId,id:{not:actor.sessionId}},data:{revokedAt:new Date()}});return{ok:true};});
}
export {hashPassword,hashPin};
