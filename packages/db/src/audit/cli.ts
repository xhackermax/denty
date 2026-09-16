import { prisma } from "../client";
import { verifyAuditChain } from "./verify-audit-chain";

const args=process.argv.slice(2),clinicIndex=args.indexOf("--clinic"),clinicId=clinicIndex>=0?args[clinicIndex+1]:process.env.DENTY_CLINIC_ID;
if(!clinicId){console.error("Usage: pnpm --filter @denty/db audit:verify -- --clinic <clinic-id>");process.exit(2)}
try{
  const result=await verifyAuditChain(prisma,clinicId);
  console.log(JSON.stringify(result,null,2));
  process.exitCode=result.ok?0:1;
}finally{await prisma.$disconnect()}
