import type { Prisma } from "../../generated/client/index.js";
import type { BusinessTransactionClient } from "./run-business-transaction";
import { calculateAuditHash } from "./hash";

export interface AuditInput {
  clinicId: string;
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId: string;
  correlationId: string;
  before?: unknown;
  after?: unknown;
}

export async function writeAudit(tx: BusinessTransactionClient, input: AuditInput) {
  if (!input.action.trim()) throw new Error("Audit action is required");
  const previous=await tx.auditEvent.findFirst({where:{clinicId:input.clinicId},orderBy:{sequence:"desc"},select:{eventHash:true,sequence:true}});
  const previousHash=previous?.eventHash??null,sequence=(previous?.sequence??0)+1,occurredAt=new Date();
  const eventHash=calculateAuditHash({...input,sequence,occurredAt},previousHash);
  return tx.auditEvent.create({data:{clinicId:input.clinicId,sequence,actorUserId:input.actorUserId,action:input.action,entityType:input.entityType,entityId:input.entityId,correlationId:input.correlationId,beforeJson:toJson(input.before),afterJson:toJson(input.after),previousHash,eventHash,occurredAt}});
}
function toJson(value: unknown): Prisma.InputJsonValue | undefined { return value===undefined?undefined:value as Prisma.InputJsonValue; }
