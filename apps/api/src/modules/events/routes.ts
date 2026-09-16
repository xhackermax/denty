import type { FastifyInstance } from "fastify";
import { prisma } from "@denty/db";
import { getActor } from "../../plugins/actor";

async function resumeFromEventId(clinicId:string,eventId:string|undefined){
  if(!eventId)return null;
  return prisma.domainEventOutbox.findFirst({where:{id:eventId,clinicId},select:{id:true,occurredAt:true}});
}

export async function registerEventRoutes(server:FastifyInstance){
  server.get("/api/events",async(request,reply)=>{
    const actor=await getActor(request);
    reply.raw.setHeader("Content-Type","text/event-stream");reply.raw.setHeader("Cache-Control","no-cache, no-transform");reply.raw.setHeader("Connection","keep-alive");reply.hijack();
    let closed=false;
    const requestedId=Array.isArray(request.headers["last-event-id"])?request.headers["last-event-id"][0]:request.headers["last-event-id"];
    const resumed=await resumeFromEventId(actor.clinicId,requestedId);
    let lastAt=resumed?.occurredAt??new Date(Date.now()-5_000),lastId=resumed?.id??"";
    request.raw.on("close",()=>{closed=true});
    const send=async()=>{if(closed)return;const rows=await prisma.domainEventOutbox.findMany({where:{clinicId:actor.clinicId,OR:[{occurredAt:{gt:lastAt}},{occurredAt:lastAt,id:{gt:lastId}}]},orderBy:[{occurredAt:"asc"},{id:"asc"}],take:200});for(const row of rows){reply.raw.write(`id: ${row.id}\n`);reply.raw.write(`event: ${row.type}\n`);reply.raw.write(`data: ${JSON.stringify({id:row.id,type:row.type,entityType:row.entityType,entityId:row.entityId,payload:row.payloadJson,occurredAt:row.occurredAt})}\n\n`);lastAt=row.occurredAt;lastId=row.id;}reply.raw.write(`: heartbeat ${Date.now()}\n\n`);};
    await send();const timer=setInterval(()=>void send().catch(()=>{}),1000);request.raw.on("close",()=>clearInterval(timer));
  });
}
