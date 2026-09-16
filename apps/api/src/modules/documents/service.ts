import { createHash } from "node:crypto";
import { join, resolve, sep } from "node:path";
import { readFile } from "node:fs/promises";
import { prisma, runBusinessTransaction, writeAudit, writeDomainEvent } from "@denty/db";
import { attendanceCertificate, documentHash, mergeTemplate, type ActorContext } from "@denty/domain";
import { writePdf } from "./simple-pdf";

export async function createTemplate(actor:ActorContext,input:any){return runBusinessTransaction(prisma,async tx=>{const template=await tx.documentTemplate.create({data:{clinicId:actor.clinicId,code:String(input.code),title:String(input.title),versions:{create:{version:1,body:String(input.body),schemaJson:input.schema}}},include:{versions:true}});return template;});}
export async function createTemplateVersion(actor:ActorContext,templateId:string,input:any,correlationId:string){return runBusinessTransaction(prisma,async tx=>{
  const template=await tx.documentTemplate.findFirstOrThrow({where:{id:templateId,clinicId:actor.clinicId},include:{versions:{orderBy:{version:"desc"},take:1}}});
  const version=(template.versions[0]?.version??0)+1;
  const created=await tx.documentTemplateVersion.create({data:{templateId:template.id,version,body:String(input.body),schemaJson:input.schema}});
  await tx.documentTemplate.update({where:{id:template.id},data:{activeVersion:version,title:input.title?String(input.title):template.title}});
  await writeAudit(tx,{clinicId:actor.clinicId,actorUserId:actor.userId,action:"document_template.version_created",entityType:"document_template",entityId:template.id,correlationId,after:{version}});
  await writeDomainEvent(tx,{clinicId:actor.clinicId,actorUserId:actor.userId,type:"document_template.version_created",entityType:"document_template",entityId:template.id,correlationId,payload:{version}});
  return created;
});}
export async function createDocument(actor:ActorContext,input:any,correlationId:string){return runBusinessTransaction(prisma,async tx=>{await tx.patient.findFirstOrThrow({where:{id:input.patientId,clinicId:actor.clinicId}});let body="",templateVersion:number|undefined;if(input.templateId){const template=await tx.documentTemplate.findFirstOrThrow({where:{id:input.templateId,clinicId:actor.clinicId},include:{versions:true}});const v=template.versions.find(x=>x.version===template.activeVersion)??template.versions.at(-1);if(!v)throw new Error("Template has no active version");templateVersion=v.version;body=mergeTemplate(v.body,input.data??{});}else body=String(input.body??"");const doc=await tx.document.create({data:{clinicId:actor.clinicId,patientId:input.patientId,templateId:input.templateId,templateVersion,type:input.type,title:input.title,status:"DRAFT",bodySnapshot:body}});await writeAudit(tx,{clinicId:actor.clinicId,actorUserId:actor.userId,action:"document.created",entityType:"document",entityId:doc.id,correlationId,after:{type:doc.type,title:doc.title}});return doc;});}
export async function createAttendanceCertificate(actor:ActorContext,input:any,correlationId:string){const patient=await prisma.patient.findFirstOrThrow({where:{id:input.patientId,clinicId:actor.clinicId}}),clinic=await prisma.clinic.findUniqueOrThrow({where:{id:actor.clinicId}}),site=input.siteId?await prisma.site.findFirst({where:{id:input.siteId,clinicId:actor.clinicId}}):null;const body=attendanceCertificate({patientName:`${patient.firstName} ${patient.lastName}`,dni:patient.dni??undefined,date:input.date,start:input.start,end:input.end,clinicName:clinic.legalName??clinic.name,address:site?.address??clinic.fiscalAddress??undefined,city:input.city,procedure:input.procedure,includeProcedure:Boolean(input.includeProcedure)});return createDocument(actor,{patientId:patient.id,type:"ATTENDANCE_CERTIFICATE",title:"Justificante de asistencia",body},correlationId)}
export async function finalizeDocument(actor:ActorContext,id:string,correlationId:string){const doc=await prisma.document.findFirstOrThrow({where:{id,clinicId:actor.clinicId}});if(doc.status!=="DRAFT")throw Object.assign(new Error("Only draft documents can be finalized"),{statusCode:409});const hash=documentHash(doc.bodySnapshot),path=join(process.env.DENTY_DOCUMENT_DIR??"./data/documents",actor.clinicId,`${doc.id}-${hash.slice(0,12)}.pdf`);await writePdf(path,doc.title,doc.bodySnapshot);return runBusinessTransaction(prisma,async tx=>{const updated=await tx.document.update({where:{id},data:{status:"FINAL",pdfPath:path,contentHash:hash,finalizedAt:new Date(),version:{increment:1}}});await writeDomainEvent(tx,{clinicId:actor.clinicId,actorUserId:actor.userId,type:"document.finalized",entityType:"document",entityId:id,correlationId,payload:{patientId:doc.patientId,hash}});return updated;});}
export async function signDocument(actor:ActorContext,id:string,input:any,correlationId:string){return runBusinessTransaction(prisma,async tx=>{const doc=await tx.document.findFirstOrThrow({where:{id,clinicId:actor.clinicId}});if(actor.role==="PATIENT"&&!actor.patientIds?.includes(doc.patientId))throw Object.assign(new Error("Forbidden"),{statusCode:403});if(doc.status!=="FINAL")throw Object.assign(new Error("Document must be final and unsigned before signing"),{statusCode:409,code:"DOCUMENT_ALREADY_SIGNED_OR_NOT_FINAL"});const signatureHash=createHash("sha256").update(`${doc.contentHash??documentHash(doc.bodySnapshot)}|${input.signerName}|${input.signatureData??""}|${new Date().toISOString().slice(0,16)}`).digest("hex");const sig=await tx.documentSignature.create({data:{documentId:id,signerUserId:actor.userId,signerName:input.signerName,signerRole:actor.role,signatureData:input.signatureData,signatureHash}});await tx.document.update({where:{id},data:{status:"SIGNED",signedAt:new Date(),version:{increment:1}}});await writeAudit(tx,{clinicId:actor.clinicId,actorUserId:actor.userId,action:"document.signed",entityType:"document",entityId:id,correlationId,after:{signatureId:sig.id,signatureHash}});await writeDomainEvent(tx,{clinicId:actor.clinicId,actorUserId:actor.userId,type:"document.signed",entityType:"document",entityId:id,correlationId,payload:{patientId:doc.patientId,signatureId:sig.id}});return sig;});}

export async function deliverDocument(actor:ActorContext,id:string,input:any,correlationId:string){return runBusinessTransaction(prisma,async tx=>{
  const doc=await tx.document.findFirstOrThrow({where:{id,clinicId:actor.clinicId}});
  if(!["FINAL","SIGNED"].includes(doc.status))throw Object.assign(new Error("Only final or signed documents can be delivered"),{statusCode:409});
  const deliveredAt=doc.deliveredAt??new Date();
  const updated=await tx.document.update({where:{id},data:{deliveredAt,version:{increment:1}}});
  const channel=String(input?.channel??"PORTAL").toUpperCase();
  if(channel!=="NONE")await tx.notification.create({data:{clinicId:actor.clinicId,patientId:doc.patientId,channel,type:"DOCUMENT_DELIVERED",subject:doc.title,body:String(input?.message??`Documento disponible: ${doc.title}`),status:channel==="PORTAL"?"SENT":"PENDING",sentAt:channel==="PORTAL"?deliveredAt:undefined}});
  await writeAudit(tx,{clinicId:actor.clinicId,actorUserId:actor.userId,action:"document.delivered",entityType:"document",entityId:id,correlationId,after:{deliveredAt,channel}});
  await writeDomainEvent(tx,{clinicId:actor.clinicId,actorUserId:actor.userId,type:"document.delivered",entityType:"document",entityId:id,correlationId,payload:{patientId:doc.patientId,deliveredAt,channel}});
  return updated;
});}

export async function archiveDocument(actor:ActorContext,id:string,correlationId:string){return runBusinessTransaction(prisma,async tx=>{
  const doc=await tx.document.findFirstOrThrow({where:{id,clinicId:actor.clinicId}});
  if(doc.status==="DRAFT")throw Object.assign(new Error("Finalize the document before archiving it"),{statusCode:409});
  const archivedAt=doc.archivedAt??new Date();
  const updated=await tx.document.update({where:{id},data:{archivedAt,version:{increment:1}}});
  await writeAudit(tx,{clinicId:actor.clinicId,actorUserId:actor.userId,action:"document.archived",entityType:"document",entityId:id,correlationId,after:{archivedAt,contentHash:doc.contentHash}});
  await writeDomainEvent(tx,{clinicId:actor.clinicId,actorUserId:actor.userId,type:"document.archived",entityType:"document",entityId:id,correlationId,payload:{patientId:doc.patientId,archivedAt,contentHash:doc.contentHash}});
  return updated;
});}

export async function readDocumentPdf(clinicId:string,pdfPath:string){const root=resolve(process.env.DENTY_DOCUMENT_DIR??"./data/documents",clinicId),candidate=resolve(pdfPath);if(candidate!==root&&!candidate.startsWith(root+sep))throw Object.assign(new Error("Invalid document storage path"),{statusCode:403,code:"DOCUMENT_PATH_INVALID"});return readFile(candidate);}
