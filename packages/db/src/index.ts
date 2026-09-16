export interface DatabaseConfig {
  provider: "sqlite" | "postgresql";
  url: string;
}

export const defaultDatabaseConfig: DatabaseConfig = {
  provider: "sqlite",
  url: "file:./denty.sqlite"
};

export { disconnectDatabase, prisma } from "./client";
export { runBusinessTransaction } from "./audit/run-business-transaction";
export { writeAudit } from "./audit/write-audit";
export { writeDomainEvent } from "./outbox/write-domain-event";
export { AppointmentRepository, VersionConflictError } from "./repositories/appointment-repository";
