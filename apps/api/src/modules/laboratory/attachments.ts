import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve, sep } from "node:path";
import { prisma, runBusinessTransaction, writeAudit, writeDomainEvent } from "@denty/db";
import type { ActorContext } from "@denty/domain";

const MAGIC=Buffer.from("DENTYENC1");
const MAX_ATTACHMENT_BYTES=25*1024*1024;
function storageRoot(){return process.env.DENTY_ATTACHMENT_DIR??"./data/attachments";}
function safeStoragePath(storageKey:string){const root=resolve(storageRoot()),candidate=resolve(root,String(storageKey||""));if(candidate!==root&&!candidate.startsWith(root+sep))throw Object.assign(new Error("Ruta de adjunto no válida"),{statusCode:500,code:"ATTACHMENT_PATH_INVALID"});return candidate;}
function encryptionKey(actor:ActorContext){
  const raw=process.env.DENTY_ATTACHMENT_KEY_BASE64;
  if(raw){const key=Buffer.from(raw,"base64");if(key.length!==32)throw Object.assign(new Error("DENTY_ATTACHMENT_KEY_BASE64 must decode to 32 bytes"),{statusCode:500,code:"ATTACHMENT_KEY_INVALID"});return key;}
  if(process.env.NODE_ENV==="production")throw Object.assign(new Error("Configura DENTY_ATTACHMENT_KEY_BASE64 antes de guardar adjuntos en producción"),{statusCode:503,code:"ATTACHMENT_KEY_REQUIRED"});
  return createHash("sha256").update(`denty-development-only:${process.env.DENTY_DEV_ATTACHMENT_SECRET??actor.clinicId}`).digest();
}
function safeName(value:string){return basename(String(value||"archivo.bin")).replace(/[^a-zA-Z0-9._() -]+/g,"_").slice(0,180)||"archivo.bin";}
function encrypt(data:Buffer,key:Buffer){const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",key,iv),ciphertext=Buffer.concat([cipher.update(data),cipher.final()]),tag=cipher.getAuthTag();return Buffer.concat([MAGIC,iv,tag,ciphertext]);}
function decrypt(blob:Buffer,key:Buffer){if(blob.subarray(0,MAGIC.length).compare(MAGIC)!==0)throw Object.assign(new Error("Formato de adjunto cifrado no reconocido"),{statusCode:500,code:"ATTACHMENT_FORMAT_INVALID"});const iv=blob.subarray(MAGIC.length,MAGIC.length+12),tag=blob.subarray(MAGIC.length+12,MAGIC.length+28),ciphertext=blob.subarray(MAGIC.length+28),dec=createDecipheriv("aes-256-gcm",key,iv);dec.setAuthTag(tag);return Buffer.concat([dec.update(ciphertext),dec.final()]);}

export async function addLabAttachment(actor:ActorContext,labWorkId:string,input:{fileName:string;mimeType:string;base64:string},correlationId:string){
  const work=await prisma.labWork.findFirstOrThrow({where:{id:labWorkId,clinicId:actor.clinicId}}),data=Buffer.from(String(input.base64||""),"base64");
  if(!data.length)throw Object.assign(new Error("El adjunto está vacío"),{statusCode:400});
  if(data.length>MAX_ATTACHMENT_BYTES)throw Object.assign(new Error("El adjunto supera el límite de 25 MB"),{statusCode:413});
  const id=randomUUID(),fileName=safeName(input.fileName),mimeType=String(input.mimeType||"application/octet-stream").slice(0,120),sha256=createHash("sha256").update(data).digest("hex"),relative=join(actor.clinicId,"laboratory",labWorkId,`${id}.enc`),absolute=join(storageRoot(),relative);
  await mkdir(join(storageRoot(),actor.clinicId,"laboratory",labWorkId),{recursive:true});
  await writeFile(absolute,encrypt(data,encryptionKey(actor)),{mode:0o600});
  return runBusinessTransaction(prisma,async tx=>{const attachment=await tx.attachment.create({data:{id,clinicId:actor.clinicId,labWorkId:work.id,fileName,mimeType,sizeBytes:data.length,storageKey:relative,sha256,encrypted:true}});await tx.labWorkEvent.create({data:{labWorkId:work.id,type:"attachment.added",note:fileName,payloadJson:{attachmentId:id,mimeType,sizeBytes:data.length,sha256}}});await writeAudit(tx,{clinicId:actor.clinicId,actorUserId:actor.userId,action:"lab.attachment_added",entityType:"lab_work",entityId:work.id,correlationId,after:{attachmentId:id,fileName,mimeType,sizeBytes:data.length,sha256}});await writeDomainEvent(tx,{clinicId:actor.clinicId,actorUserId:actor.userId,type:"lab.attachment_added",entityType:"lab_work",entityId:work.id,correlationId,payload:{patientId:work.patientId,attachmentId:id,fileName,mimeType,sizeBytes:data.length}});return attachment;});
}

export async function readLabAttachment(actor:ActorContext,labWorkId:string,attachmentId:string){const attachment=await prisma.attachment.findFirstOrThrow({where:{id:attachmentId,clinicId:actor.clinicId,labWorkId}}),blob=await readFile(safeStoragePath(attachment.storageKey)),data=attachment.encrypted?decrypt(blob,encryptionKey(actor)):blob,sha=createHash("sha256").update(data).digest("hex");if(sha!==attachment.sha256)throw Object.assign(new Error("La integridad del adjunto no coincide"),{statusCode:500,code:"ATTACHMENT_INTEGRITY_ERROR"});return{attachment,data};}
