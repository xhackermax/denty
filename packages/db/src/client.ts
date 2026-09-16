import { PrismaClient } from "../generated/client/index.js";

const globalForPrisma = globalThis as unknown as {
  dentyPrisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.dentyPrisma ??
  new PrismaClient({
    log: process.env.DENTY_DB_LOG === "true" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.dentyPrisma = prisma;
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
}
