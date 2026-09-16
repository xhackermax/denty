import type { FastifyInstance, FastifyRequest } from "fastify";

function configuredOrigins(){return new Set((process.env.DENTY_ALLOWED_ORIGINS??"").split(",").map(v=>v.trim()).filter(Boolean).map(v=>new URL(v).origin))}
function forwardedProto(request:FastifyRequest){const raw=request.headers["x-forwarded-proto"];return String(Array.isArray(raw)?raw[0]:raw??(process.env.NODE_ENV==="production"?"https":"http")).split(",")[0].trim()}
export function sameOrigin(request:FastifyRequest,origin:string){
  try{const host=String(request.headers["x-forwarded-host"]??request.headers.host??"").split(",")[0].trim();if(!host)return false;return new URL(origin).origin===`${forwardedProto(request)}://${host}`}catch{return false}
}
export function isAllowedOrigin(request:FastifyRequest,origin:string){if(sameOrigin(request,origin))return true;try{return configuredOrigins().has(new URL(origin).origin)}catch{return false}}

export function registerHttpSecurity(server:FastifyInstance){
  server.addHook("onRequest",async(request,reply)=>{
    const origin=String(request.headers.origin??"").trim();
    if(!origin)return;
    if(!isAllowedOrigin(request,origin))return reply.code(403).send({error:{code:"ORIGIN_NOT_ALLOWED",message:"Origen web no autorizado."}});
    reply.header("Access-Control-Allow-Origin",origin);
    reply.header("Access-Control-Allow-Credentials","true");
    reply.header("Vary","Origin");
    if(request.method==="OPTIONS"){
      reply.header("Access-Control-Allow-Methods","GET, POST, PUT, PATCH, DELETE, OPTIONS");
      reply.header("Access-Control-Allow-Headers","Content-Type, Authorization, X-Request-Id");
      reply.header("Access-Control-Max-Age","600");
      return reply.code(204).send();
    }
  });
}
