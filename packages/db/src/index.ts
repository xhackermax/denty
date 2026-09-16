export interface DatabaseConfig {
  provider: "sqlite" | "postgresql";
  url: string;
}

export const defaultDatabaseConfig: DatabaseConfig = {
  provider: "sqlite",
  url: "file:./denty.sqlite"
};

export { disconnectDatabase, prisma } from "./client";
export { checkDatabaseHealth } from "./health/check";
export { runBusinessTransaction } from "./audit/run-business-transaction";
export { writeAudit } from "./audit/write-audit";
export { verifyAuditChain } from "./audit/verify-audit-chain";
export { writeDomainEvent } from "./outbox/write-domain-event";
export { AppointmentRepository, VersionConflictError } from "./repositories/appointment-repository";
export { writeAnalyticsEvent } from "./analytics/write-analytics-event";
export { createEncryptedBackup, verifyEncryptedBackup, decryptBackup, verifyRestoreCandidate, restoreBackupPackage } from "./backup/backup";
export { importLegacyState } from "./import/legacy";
