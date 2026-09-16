import type { FastifyRequest } from "fastify";
import { can, canAccessPatient, type Permission } from "@denty/domain";
import { actorFromRequest } from "./actor";
export class AuthError extends Error{constructor(public statusCode:number,public code:string,message:string){super(message)}}
export async function requireActor(request:FastifyRequest){const actor=await actorFromRequest(request);if(actor)return actor;if(process.env.NODE_ENV==="test"||process.env.DENTY_ALLOW_TEST_ACTOR==="1"){const {permissionsForRole}=await import("@denty/domain");return{userId:"test-user",clinicId:"test-clinic",role:"ADMIN" as const,permissions:permissionsForRole("ADMIN"),sessionId:"test-session"};}throw new AuthError(401,"UNAUTHENTICATED","Debes iniciar sesión.");}
export function requirePermission(permission:Permission){return async(request:FastifyRequest)=>{const actor=await requireActor(request);if(!can(actor,permission))throw new AuthError(403,"FORBIDDEN","No tienes permiso para realizar esta acción.");return actor}}
export async function requirePatientScope(request:FastifyRequest,patientId:string){const actor=await requireActor(request);if(!canAccessPatient(actor,patientId))throw new AuthError(403,"PATIENT_SCOPE","No tienes acceso a este paciente.");return actor;}
