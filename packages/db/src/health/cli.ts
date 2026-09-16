import { prisma } from "../client";
import { checkDatabaseHealth } from "./check";

const result = await checkDatabaseHealth(prisma);
console.log(JSON.stringify(result, null, 2));
await prisma.$disconnect();

if (!result.ok) {
  process.exit(1);
}
