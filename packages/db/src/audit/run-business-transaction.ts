import type { PrismaClient } from "../../generated/client/index.js";

type PrismaTransaction = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export type BusinessTransactionClient = PrismaTransaction;

export function runBusinessTransaction<T>(
  prisma: PrismaClient,
  callback: (tx: BusinessTransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(callback);
}
