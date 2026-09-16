import type { Prisma } from "../../generated/client/index.js";
import type { BusinessTransactionClient } from "../audit/run-business-transaction";

export interface DomainEventInput<T> {
  clinicId: string;
  type: string;
  entityType: string;
  entityId: string;
  correlationId: string;
  actorUserId?: string;
  payload: T;
}

export async function writeDomainEvent<T>(tx: BusinessTransactionClient, input: DomainEventInput<T>) {
  if (!input.type.trim()) {
    throw new Error("Domain event type is required");
  }

  return tx.domainEventOutbox.create({
    data: {
      clinicId: input.clinicId,
      type: input.type,
      entityType: input.entityType,
      entityId: input.entityId,
      correlationId: input.correlationId,
      actorUserId: input.actorUserId,
      payloadJson: input.payload as Prisma.InputJsonValue,
    },
  });
}
