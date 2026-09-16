import type { PrismaClient } from "../../generated/client/index.js";
import { calculateAuditHash } from "./hash";

export type AuditChainVerification={ok:true;checked:number;headHash:string|null;headSequence:number}|{ok:false;code:"AUDIT_CHAIN_BROKEN";checked:number;eventId:string;reason:"sequence"|"previousHash"|"eventHash";expected:string|number|null;actual:string|number|null};

export async function verifyAuditChain(prisma:PrismaClient,clinicId:string):Promise<AuditChainVerification>{
  const rows=await prisma.auditEvent.findMany({where:{clinicId},orderBy:{sequence:"asc"},select:{id:true,clinicId:true,sequence:true,occurredAt:true,actorUserId:true,action:true,entityType:true,entityId:true,correlationId:true,beforeJson:true,afterJson:true,previousHash:true,eventHash:true}});
  let previousHash:string|null=null,checked=0,expectedSequence=1;
  for(const row of rows){
    if(row.sequence!==expectedSequence)return{ok:false,code:"AUDIT_CHAIN_BROKEN",checked,eventId:row.id,reason:"sequence",expected:expectedSequence,actual:row.sequence};
    if((row.previousHash??null)!==previousHash)return{ok:false,code:"AUDIT_CHAIN_BROKEN",checked,eventId:row.id,reason:"previousHash",expected:previousHash,actual:row.previousHash??null};
    const expected=calculateAuditHash({clinicId:row.clinicId,sequence:row.sequence,occurredAt:row.occurredAt,actorUserId:row.actorUserId,action:row.action,entityType:row.entityType,entityId:row.entityId,correlationId:row.correlationId,before:row.beforeJson,after:row.afterJson},previousHash);
    if((row.eventHash??null)!==expected)return{ok:false,code:"AUDIT_CHAIN_BROKEN",checked,eventId:row.id,reason:"eventHash",expected,actual:row.eventHash??null};
    previousHash=expected;checked++;expectedSequence++;
  }
  return{ok:true,checked,headHash:previousHash,headSequence:expectedSequence-1};
}
