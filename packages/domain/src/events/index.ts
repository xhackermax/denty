export interface DomainEvent<T = unknown> {
  id: string;
  clinicId: string;
  type: string;
  entityType: string;
  entityId: string;
  occurredAt: string;
  actorUserId?: string;
  correlationId: string;
  payload: T;
}
