import type { FastifyInstance } from "fastify";
import { prisma } from "@denty/db";
import type { PrismaClient } from "@denty/db/generated/client/index.js";
import { getActor } from "../../plugins/actor";

async function resumeFromEventId(clinicId:string,eventId:string|undefined){
  if(!eventId)return null;
  return prisma.domainEventOutbox.findFirst({where:{id:eventId,clinicId},select:{id:true,occurredAt:true}});
}

type OutboxRow = Awaited<ReturnType<typeof prisma.domainEventOutbox.findFirstOrThrow>>;

function payloadVersion(payload: unknown) {
  return payload && typeof payload === "object" && !Array.isArray(payload) && "version" in payload
    ? Number((payload as { version?: unknown }).version)
    : undefined;
}

export function formatOutboxSseMessage(row: OutboxRow) {
  const version = payloadVersion(row.payloadJson);
  const data = {
    eventId: row.id,
    operation: row.type,
    entityType: row.entityType,
    entityId: row.entityId,
    ...(Number.isFinite(version) ? { version } : {}),
    payload: row.payloadJson,
    occurredAt: row.occurredAt.toISOString(),
  };
  return `id: ${row.id}\nevent: ${row.type}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function markOutboxRowsPublished(client: PrismaClient, clinicId: string, ids: string[]) {
  if (!ids.length) return;
  await client.domainEventOutbox.updateMany({
    where: { clinicId, id: { in: ids }, publishedAt: null },
    data: { publishedAt: new Date() },
  });
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
    const send=async()=>{if(closed)return;const rows=await prisma.domainEventOutbox.findMany({where:{clinicId:actor.clinicId,OR:[{occurredAt:{gt:lastAt}},{occurredAt:lastAt,id:{gt:lastId}}]},orderBy:[{occurredAt:"asc"},{id:"asc"}],take:200});const streamedIds:string[]=[];for(const row of rows){reply.raw.write(formatOutboxSseMessage(row));lastAt=row.occurredAt;lastId=row.id;streamedIds.push(row.id);}await markOutboxRowsPublished(prisma,actor.clinicId,streamedIds);reply.raw.write(`: heartbeat ${Date.now()}\n\n`);};
    await send();const timer=setInterval(()=>void send().catch(()=>{}),1000);request.raw.on("close",()=>clearInterval(timer));
  });
}
