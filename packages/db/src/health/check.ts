import type { PrismaClient } from "../../generated/client/index.js";

export interface DatabaseHealth {
  ok: boolean;
  provider: "sqlite";
  checks: {
    opens: boolean;
    foreignKeys: boolean;
    wal: boolean;
    migrationsTable: boolean;
    writeRollback: boolean;
  };
}

export async function checkDatabaseHealth(prisma: PrismaClient): Promise<DatabaseHealth> {
  const checks: DatabaseHealth["checks"] = {
    opens: false,
    foreignKeys: false,
    wal: false,
    migrationsTable: false,
    writeRollback: false,
  };

  await prisma.$queryRawUnsafe("SELECT 1");
  checks.opens = true;

  await prisma.$executeRawUnsafe("PRAGMA foreign_keys = ON");
  const foreignKeys = await prisma.$queryRawUnsafe<Array<{ foreign_keys: number }>>("PRAGMA foreign_keys");
  checks.foreignKeys = Number(foreignKeys[0]?.foreign_keys ?? 0) === 1;

  const journalMode = await prisma.$queryRawUnsafe<Array<{ journal_mode: string }>>("PRAGMA journal_mode = WAL");
  checks.wal = journalMode[0]?.journal_mode?.toLowerCase() === "wal";

  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS "_prisma_migrations" ("id" TEXT PRIMARY KEY NOT NULL, "checksum" TEXT, "finished_at" DATETIME)',
  );
  await prisma.$queryRawUnsafe('SELECT id FROM "_prisma_migrations" LIMIT 1');
  checks.migrationsTable = true;

  await prisma.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "_denty_healthcheck" ("id" TEXT PRIMARY KEY NOT NULL)');
  await prisma.$executeRawUnsafe('DELETE FROM "_denty_healthcheck"');
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('INSERT INTO "_denty_healthcheck" ("id") VALUES ("rollback-check")');
      throw new Error("ROLLBACK_HEALTHCHECK");
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ROLLBACK_HEALTHCHECK") {
      const rows = await prisma.$queryRawUnsafe<Array<{ count: number }>>('SELECT COUNT(*) as count FROM "_denty_healthcheck"');
      checks.writeRollback = Number(rows[0]?.count ?? 1) === 0;
    } else {
      throw error;
    }
  }

  return {
    ok: Object.values(checks).every(Boolean),
    provider: "sqlite",
    checks,
  };
}
