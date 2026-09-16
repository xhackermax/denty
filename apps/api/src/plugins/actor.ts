import type { FastifyRequest } from "fastify";
import type { ActorContext } from "@denty/domain";
import { requireActor } from "../auth/require-permission";
export type { ActorContext } from "@denty/domain";
export async function getActor(request?:FastifyRequest):Promise<ActorContext>{if(request)return requireActor(request);if(process.env.NODE_ENV==="test"||process.env.DENTY_ALLOW_TEST_ACTOR==="1"){const {permissionsForRole}=await import("@denty/domain");return{userId:"test-user",clinicId:"test-clinic",role:"ADMIN",permissions:permissionsForRole("ADMIN"),sessionId:"test-session"};}throw new Error("getActor requires FastifyRequest outside tests");}
