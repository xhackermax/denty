import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { ActorContext } from "@denty/domain";
import type { VoicePlan } from "@denty/voice";

type VoicePlanTokenPayload={
  version:1;
  clinicId:string;
  userId:string;
  issuedAt:number;
  expiresAt:number;
  nonce:string;
  plan:VoicePlan;
};

function secret(){
  return process.env.DENTY_VOICE_PLAN_SECRET?.trim() || process.env.DENTY_AUDIT_HMAC_KEY?.trim() || "denty-development-voice-plan-secret-not-for-production";
}
function encode(value:unknown){return Buffer.from(JSON.stringify(value),"utf8").toString("base64url")}
function signature(body:string){return createHmac("sha256",secret()).update(body).digest("base64url")}

export function issueVoicePlanToken(actor:ActorContext,plan:VoicePlan,ttlMs=5*60_000){
  const issuedAt=Date.now();
  const payload:VoicePlanTokenPayload={version:1,clinicId:actor.clinicId,userId:actor.userId,issuedAt,expiresAt:issuedAt+ttlMs,nonce:randomBytes(16).toString("hex"),plan};
  const body=encode(payload);
  return `${body}.${signature(body)}`;
}

export function verifyVoicePlanToken(token:string,actor:ActorContext):VoicePlan{
  const [body,sig,...rest]=String(token??"").split(".");
  if(!body||!sig||rest.length)throw Object.assign(new Error("Plan de voz no válido."),{statusCode:400,code:"VOICE_PLAN_TOKEN_INVALID"});
  const expected=Buffer.from(signature(body));
  const received=Buffer.from(sig);
  if(expected.length!==received.length||!timingSafeEqual(expected,received))throw Object.assign(new Error("El plan de voz ha sido alterado."),{statusCode:400,code:"VOICE_PLAN_TOKEN_SIGNATURE"});
  let payload:VoicePlanTokenPayload;
  try{payload=JSON.parse(Buffer.from(body,"base64url").toString("utf8"))}catch{throw Object.assign(new Error("Plan de voz no válido."),{statusCode:400,code:"VOICE_PLAN_TOKEN_INVALID"})}
  if(payload.version!==1||payload.clinicId!==actor.clinicId||payload.userId!==actor.userId)throw Object.assign(new Error("Este plan de voz pertenece a otra sesión o clínica."),{statusCode:403,code:"VOICE_PLAN_TOKEN_SCOPE"});
  if(!Number.isFinite(payload.expiresAt)||Date.now()>payload.expiresAt)throw Object.assign(new Error("El plan de voz ha caducado. Revísalo de nuevo."),{statusCode:409,code:"VOICE_PLAN_TOKEN_EXPIRED"});
  if(!payload.plan||!Array.isArray(payload.plan.actions))throw Object.assign(new Error("Plan de voz incompleto."),{statusCode:400,code:"VOICE_PLAN_TOKEN_INVALID"});
  return payload.plan;
}
