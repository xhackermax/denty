import { createHmac } from "node:crypto";

export interface AuditHashInput {
  clinicId:string;
  sequence:number;
  occurredAt:Date|string;
  actorUserId?:string|null;
  action:string;
  entityType:string;
  entityId:string;
  correlationId:string;
  before?:unknown;
  after?:unknown;
}

function stable(value:unknown):unknown{
  if(Array.isArray(value))return value.map(stable);
  if(value&&typeof value==="object"&&!(value instanceof Date))return Object.fromEntries(Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,stable(v)]));
  return value instanceof Date?value.toISOString():value;
}

function auditHmacKey(){
  const configured=process.env.DENTY_AUDIT_HMAC_KEY?.trim();
  if(configured)return configured;
  if(process.env.NODE_ENV==="production")throw new Error("DENTY_AUDIT_HMAC_KEY is required in production");
  return "denty-development-audit-hmac-key-not-for-production";
}

export function calculateAuditHash(input:AuditHashInput,previousHash:string|null){
  const payload=stable({previousHash,clinicId:input.clinicId,sequence:input.sequence,occurredAt:input.occurredAt,actorUserId:input.actorUserId??null,action:input.action,entityType:input.entityType,entityId:input.entityId,correlationId:input.correlationId,before:input.before??null,after:input.after??null});
  return createHmac("sha256",auditHmacKey()).update(JSON.stringify(payload)).digest("hex");
}
