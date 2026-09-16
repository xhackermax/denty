import type { FastifyRequest } from "fastify";
import { permissionsForRole, type ActorContext, type Role } from "@denty/domain";
import { parseCookies } from "./cookies";
import { SESSION_COOKIE, sessionFromToken } from "./sessions";
export async function actorFromRequest(request:FastifyRequest):Promise<ActorContext|null>{const token=parseCookies(request.headers.cookie)[SESSION_COOKIE];if(!token)return null;const session=await sessionFromToken(token);if(!session)return null;const role=session.user.role as Role;return{userId:session.user.id,clinicId:session.clinicId,role,staffId:session.user.staffProfile?.id,patientIds:session.user.patientGrants.map(g=>g.patientId),permissions:permissionsForRole(role),sessionId:session.id};}
