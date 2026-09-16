import { createHash } from "node:crypto";
import { prisma, runBusinessTransaction, writeAnalyticsEvent, writeAudit, writeDomainEvent } from "@denty/db";
import { calculateInvoice } from "@denty/domain";
import { buildFiscalRecord, buildQrPayload, type FiscalInvoiceSnapshot } from "./verifactu/record-builder";
import { submitVerifactuRecord } from "./verifactu/provider";
import type { ActorContext } from "@denty/domain";
import { writeInvoiceLineAttribution, writePaymentAllocationAttribution } from "../analytics/financial-attribution";


async function validateInvoiceReferences(tx:any,actor:ActorContext,input:any){
  const patient=input.patientId?await tx.patient.findFirstOrThrow({where:{id:input.patientId,clinicId:actor.clinicId}}):null;
  const series=await tx.invoiceSeries.findFirstOrThrow({where:{id:input.seriesId,clinicId:actor.clinicId,active:true}});
  if(input.budgetId){const budget=await tx.budget.findFirstOrThrow({where:{id:input.budgetId,clinicId:actor.clinicId}});if(patient&&budget.patientId!==patient.id)throw Object.assign(new Error("Budget belongs to another patient"),{statusCode:409,code:"INVOICE_BUDGET_PATIENT_MISMATCH"});}
  for(const line of input.lines??[]){if(!line.clinicalPlanItemId)continue;const item=await tx.clinicalPlanItem.findFirstOrThrow({where:{id:line.clinicalPlanItemId,plan:{clinicId:actor.clinicId}},include:{plan:true}});if(patient&&item.plan.patientId!==patient.id)throw Object.assign(new Error("Clinical item belongs to another patient"),{statusCode:409,code:"INVOICE_ITEM_PATIENT_MISMATCH"});}
  return{patient,series};
}
export async function createInvoiceDraft(actor:ActorContext,input:any,correlationId:string){const allowNegative=input.type==="RECTIFYING",totals=calculateInvoice(input.lines,{allowNegative});return runBusinessTransaction(prisma,async tx=>{await validateInvoiceReferences(tx,actor,input);const inv=await tx.invoice.create({data:{clinicId:actor.clinicId,patientId:input.patientId,budgetId:input.budgetId,seriesId:input.seriesId,type:input.type??"STANDARD",customerName:input.customerName,customerTaxId:input.customerTaxId,customerAddress:input.customerAddress,subtotalCents:totals.subtotalCents,taxCents:totals.taxCents,totalCents:totals.totalCents,lines:{create:input.lines.map((l:any)=>{const calc=calculateInvoice([l],{allowNegative});return{description:l.description,quantity:l.quantity,unitPriceCents:l.unitPriceCents,subtotalCents:calc.subtotalCents,taxRateBps:l.taxRateBps??0,taxCents:calc.taxCents,totalCents:calc.totalCents,exemptionCode:l.exemptionCode,clinicalPlanItemId:l.clinicalPlanItemId}})}}});await writeAudit(tx,{clinicId:actor.clinicId,actorUserId:actor.userId,action:"invoice.draft_created",entityType:"invoice",entityId:inv.id,correlationId,after:{version:inv.version}});return inv;});}
export async function issueInvoice(actor:ActorContext,id:string,correlationId:string){return runBusinessTransaction(prisma,async tx=>{
  const invoice=await tx.invoice.findFirstOrThrow({where:{id,clinicId:actor.clinicId},include:{series:true,lines:true,clinic:true,originalInvoice:true}});
  if(invoice.status!=="DRAFT")throw Object.assign(new Error("Only draft invoices can be issued"),{statusCode:409});
  if(!invoice.clinic.taxId)throw Object.assign(new Error("La clínica necesita NIF/CIF antes de emitir facturas fiscales."),{statusCode:409,code:"CLINIC_TAX_ID_REQUIRED"});
  const series=await tx.invoiceSeries.update({where:{id:invoice.seriesId},data:{nextNumber:{increment:1},version:{increment:1}}});
  const number=series.nextNumber-1,fullNumber=`${series.code}-${String(number).padStart(6,"0")}`,issuedAt=new Date(),generatedAt=new Date();
  const previousRecord=await tx.fiscalRecord.findFirst({where:{invoice:{clinicId:actor.clinicId,status:{in:["ISSUED","RECTIFIED"]}}},include:{invoice:true},orderBy:{createdAt:"desc"}});
  const previous=previousRecord?.invoice.fullNumber&&previousRecord.invoice.issuedAt?{issuerTaxId:invoice.clinic.taxId,invoiceNumber:previousRecord.invoice.fullNumber,issuedAt:previousRecord.invoice.issuedAt.toISOString(),hash:previousRecord.recordHash}:undefined;
  const snapshot:FiscalInvoiceSnapshot={
    invoiceNumber:fullNumber,issuedAt:issuedAt.toISOString(),generatedAt:generatedAt.toISOString(),
    issuerTaxId:invoice.clinic.taxId,issuerName:invoice.clinic.legalName??invoice.clinic.name,
    customerTaxId:invoice.customerTaxId??undefined,customerName:invoice.customerName,
    subtotalCents:invoice.subtotalCents,taxCents:invoice.taxCents,totalCents:invoice.totalCents,type:invoice.type,
    description:invoice.lines.map(l=>l.description).filter(Boolean).slice(0,6).join("; ")||"Servicios odontológicos",
    taxDetails:invoice.lines.map(l=>({taxRateBps:l.taxRateBps,baseCents:l.subtotalCents,taxCents:l.taxCents,exemptionCode:l.exemptionCode??undefined})),
    rectifiedInvoiceNumber:invoice.originalInvoice?.fullNumber??undefined,previous
  };
  const fiscal=buildFiscalRecord(snapshot);
  const snapshotHash=createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
  const updated=await tx.invoice.update({where:{id},data:{status:"ISSUED",number,fullNumber,issuedAt,snapshotHash,version:{increment:1}}});
  await tx.fiscalRecord.create({data:{invoiceId:id,recordType:"ALTA",canonicalJson:fiscal.canonical as any,previousHash:fiscal.previousHash,recordHash:fiscal.recordHash,qrPayload:buildQrPayload(snapshot)}});
  await writeAudit(tx,{clinicId:actor.clinicId,actorUserId:actor.userId,action:"invoice.issued",entityType:"invoice",entityId:id,correlationId,after:{fullNumber,totalCents:updated.totalCents,recordHash:fiscal.recordHash}});
  await writeDomainEvent(tx,{clinicId:actor.clinicId,actorUserId:actor.userId,type:"invoice.issued",entityType:"invoice",entityId:id,correlationId,payload:{version:updated.version,fullNumber,totalCents:updated.totalCents,recordHash:fiscal.recordHash}});
  await writeAnalyticsEvent(tx,{clinicId:actor.clinicId,type:"invoice.issued",patientId:updated.patientId??undefined,invoiceId:id,revenueCents:updated.totalCents,correlationId,dedupeKey:`invoice.issued:${id}`});
  await writeInvoiceLineAttribution(tx,{clinicId:actor.clinicId,patientId:updated.patientId,invoiceId:id,lines:invoice.lines,correlationId});
  return updated;
});}

export async function submitInvoiceToVerifactu(actor:ActorContext,id:string,correlationId:string){
  const invoice=await prisma.invoice.findFirstOrThrow({where:{id,clinicId:actor.clinicId},include:{fiscalRecord:{include:{submissions:true}}}});
  if(invoice.status!=="ISSUED"&&invoice.status!=="RECTIFIED")throw Object.assign(new Error("La factura debe estar emitida antes de remitirla a VERI*FACTU."),{statusCode:409});
  if(!invoice.fiscalRecord)throw Object.assign(new Error("La factura no tiene registro fiscal encadenado."),{statusCode:409,code:"FISCAL_RECORD_MISSING"});
  const accepted=invoice.fiscalRecord.submissions.find(x=>x.status==="ACCEPTED");
  if(accepted)return{status:"ALREADY_ACCEPTED",submission:accepted};
  const snapshot=invoice.fiscalRecord.canonicalJson as unknown as FiscalInvoiceSnapshot;
  const attempt=invoice.fiscalRecord.submissions.reduce((m,x)=>Math.max(m,x.attempt),0)+1;
  try{
    const result=await submitVerifactuRecord(snapshot,invoice.fiscalRecord.recordHash);
    const submission=await prisma.fiscalSubmission.create({data:{fiscalRecordId:invoice.fiscalRecord.id,attempt,provider:"AEAT_VERIFACTU",requestDigest:result.requestDigest,responseCode:result.responseCode,responseRef:result.providerReference,status:result.ok?"ACCEPTED":"REJECTED"}});
    await runBusinessTransaction(prisma,async tx=>{
      await writeAudit(tx,{clinicId:actor.clinicId,actorUserId:actor.userId,action:"verifactu.submitted",entityType:"invoice",entityId:id,correlationId,after:{attempt,status:submission.status,responseCode:submission.responseCode,responseRef:submission.responseRef}});
      await writeDomainEvent(tx,{clinicId:actor.clinicId,actorUserId:actor.userId,type:"verifactu.submitted",entityType:"invoice",entityId:id,correlationId,payload:{attempt,status:submission.status,responseCode:submission.responseCode,responseRef:submission.responseRef}});
    });
    return{submission,provider:{ok:result.ok,responseCode:result.responseCode,providerReference:result.providerReference}};
  }catch(error:any){
    const digest=createHash("sha256").update(String(error?.providerBody??error?.message??"AEAT submission failed")).digest("hex");
    const submission=await prisma.fiscalSubmission.create({data:{fiscalRecordId:invoice.fiscalRecord.id,attempt,provider:"AEAT_VERIFACTU",requestDigest:digest,responseCode:String(error?.providerStatus??error?.code??"TRANSPORT_ERROR"),status:"ERROR"}});
    await runBusinessTransaction(prisma,async tx=>{await writeAudit(tx,{clinicId:actor.clinicId,actorUserId:actor.userId,action:"verifactu.submit_failed",entityType:"invoice",entityId:id,correlationId,after:{attempt,status:"ERROR",message:String(error?.message??error)}});});
    throw error;
  }
}
export async function rectifyInvoice(actor:ActorContext,id:string,input:{reason:string;lines?:any[]},correlationId:string){const original=await prisma.invoice.findFirstOrThrow({where:{id,clinicId:actor.clinicId},include:{lines:true}});if(original.status!=="ISSUED")throw Object.assign(new Error("Invoice must be issued"),{statusCode:409});const lines=input.lines??original.lines.map(l=>({description:`Rectificación: ${l.description}`,quantity:l.quantity,unitPriceCents:-l.unitPriceCents,taxRateBps:l.taxRateBps,exemptionCode:l.exemptionCode,clinicalPlanItemId:l.clinicalPlanItemId}));const draft=await createInvoiceDraft(actor,{seriesId:original.seriesId,type:"RECTIFYING",patientId:original.patientId,customerName:original.customerName,customerTaxId:original.customerTaxId,customerAddress:original.customerAddress,lines},correlationId);await prisma.invoice.update({where:{id:draft.id},data:{originalInvoiceId:id,rectificationReason:input.reason}});const rect=await issueInvoice(actor,draft.id,correlationId);await prisma.invoice.update({where:{id},data:{status:"RECTIFIED",version:{increment:1}}});await runBusinessTransaction(prisma,async tx=>{await writeAnalyticsEvent(tx,{clinicId:actor.clinicId,type:"invoice.rectified",patientId:rect.patientId??undefined,invoiceId:rect.id,revenueCents:rect.totalCents,correlationId,dedupeKey:`invoice.rectified:${rect.id}`,metadata:{originalInvoiceId:id,reason:input.reason}})});return rect;}
export async function recordPaymentTx(tx:any,actor:ActorContext,input:any,correlationId:string){if(input.patientId)await tx.patient.findFirstOrThrow({where:{id:input.patientId,clinicId:actor.clinicId}});const p=await tx.payment.create({data:{clinicId:actor.clinicId,patientId:input.patientId,amountCents:input.amountCents,method:input.method,reference:input.reference}});await writeAudit(tx,{clinicId:actor.clinicId,actorUserId:actor.userId,action:"payment.received",entityType:"payment",entityId:p.id,correlationId,after:{patientId:p.patientId,amountCents:p.amountCents,method:p.method}});await writeDomainEvent(tx,{clinicId:actor.clinicId,actorUserId:actor.userId,type:"payment.received",entityType:"payment",entityId:p.id,correlationId,payload:{amountCents:p.amountCents}});await writeAnalyticsEvent(tx,{clinicId:actor.clinicId,type:"payment.received",patientId:p.patientId??undefined,paymentId:p.id,revenueCents:p.amountCents,correlationId,dedupeKey:`payment.received:${p.id}`});return p;}
export async function recordPayment(actor:ActorContext,input:any,correlationId:string){return runBusinessTransaction(prisma,tx=>recordPaymentTx(tx,actor,input,correlationId));}
export async function allocatePayment(actor:ActorContext,paymentId:string,input:{invoiceId:string;amountCents:number},correlationId:string){return runBusinessTransaction(prisma,async tx=>{const [payment,invoice]=await Promise.all([tx.payment.findFirstOrThrow({where:{id:paymentId,clinicId:actor.clinicId},include:{allocations:true}}),tx.invoice.findFirstOrThrow({where:{id:input.invoiceId,clinicId:actor.clinicId},include:{allocations:true}})]);const used=payment.allocations.reduce((n,x)=>n+x.amountCents,0),paid=invoice.allocations.reduce((n,x)=>n+x.amountCents,0);if(used+input.amountCents>payment.amountCents)throw Object.assign(new Error("Payment over-allocation"),{statusCode:409});if(paid+input.amountCents>invoice.totalCents)throw Object.assign(new Error("Invoice over-allocation"),{statusCode:409});if(payment.patientId&&invoice.patientId&&payment.patientId!==invoice.patientId)throw Object.assign(new Error("No se puede asignar un cobro a una factura de otro paciente."),{statusCode:409,code:"PAYMENT_PATIENT_MISMATCH"});const a=await tx.paymentAllocation.upsert({where:{paymentId_invoiceId:{paymentId,invoiceId:invoice.id}},create:{paymentId,invoiceId:invoice.id,amountCents:input.amountCents},update:{amountCents:{increment:input.amountCents}}});await writeDomainEvent(tx,{clinicId:actor.clinicId,actorUserId:actor.userId,type:"payment.allocated",entityType:"invoice",entityId:invoice.id,correlationId,payload:{paymentId,amountCents:input.amountCents}});await writePaymentAllocationAttribution(tx,{clinicId:actor.clinicId,patientId:payment.patientId,paymentId,invoiceId:invoice.id,amountCents:input.amountCents,correlationId});return a;});}
