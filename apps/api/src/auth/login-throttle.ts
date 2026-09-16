import { createHmac } from "node:crypto";
import { prisma } from "@denty/db";

const WINDOW_MS=15*60_000;
const MAX_FAILURES=8;

function authPepper(){
  const value=process.env.DENTY_AUTH_PEPPER?.trim();
  if(value)return value;
  if(process.env.NODE_ENV==="production")throw new Error("DENTY_AUTH_PEPPER is required in production");
  return "denty-development-auth-pepper-not-for-production";
}
function fingerprint(value:string){return createHmac("sha256",authPepper()).update(value).digest("hex")}
export function loginFingerprints(identifier:string,ip:string){return{identifierHash:fingerprint(identifier.trim().toLowerCase()),ipHash:fingerprint(ip)}}

export async function assertLoginRate(identifier:string,ip:string){
  const hashes=loginFingerprints(identifier,ip),windowStart=new Date(Date.now()-WINDOW_MS);
  const lastSuccess=await prisma.loginAttempt.findFirst({where:{...hashes,success:true,occurredAt:{gte:windowStart}},orderBy:{occurredAt:"desc"},select:{occurredAt:true}});
  const failureSince=lastSuccess?.occurredAt??windowStart;
  const failures=await prisma.loginAttempt.count({where:{...hashes,success:false,occurredAt:{gt:failureSince}}});
  if(failures>=MAX_FAILURES)throw Object.assign(new Error("Too many login attempts"),{statusCode:429,code:"LOGIN_RATE_LIMIT"});
  return hashes;
}

export async function recordLoginAttempt(input:{identifierHash:string;ipHash:string;userId?:string;success:boolean}){
  await prisma.loginAttempt.create({data:{identifierHash:input.identifierHash,ipHash:input.ipHash,userId:input.userId,success:input.success}});
}
