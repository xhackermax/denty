import type { Prisma } from "../../generated/client/index.js";
import type { BusinessTransactionClient } from "./run-business-transaction";

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
  if (!input.action.trim()) {
    throw new Error("Audit action is required");
  }

  return tx.auditEvent.create({
    data: {
      clinicId: input.clinicId,
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      correlationId: input.correlationId,
      beforeJson: toJson(input.before),
      afterJson: toJson(input.after),
    },
  });
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value as Prisma.InputJsonValue;
}
