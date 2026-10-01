import {
  diagnosisInputSchema,
  resolveDiagnosisSchema,
  diagnosisPlanInputSchema,
} from "@/shared/api/schemas/diagnoses";
import { DiagnosisRepository } from "./diagnosis-repository";
import type { SupabaseRestClient } from "../supabase/rest-client";
interface Identity {
  actor: { role: string; clinicId: string };
  restClient: SupabaseRestClient;
}
export async function handleDiagnosesRoute(
  request: Request,
  parts: readonly string[],
  identity: Identity | null,
  headers: HeadersInit = {},
) {
  const reply = (status: number, body: unknown) => Response.json(body, { status, headers });
  if (!identity)
    return reply(401, { error: { code: "UNAUTHENTICATED", message: "Sesión requerida." } });
  if (!["ADMIN", "DENTIST", "ASSISTANT", "RECEPTION"].includes(identity.actor.role))
    return reply(403, { error: { code: "FORBIDDEN", message: "Acceso clínico requerido." } });
  const patientId = decodeURIComponent(parts[2] ?? "");
  const repo = new DiagnosisRepository(identity.restClient, identity.actor.clinicId);
  if (parts.length === 4 && request.method === "GET") return reply(200, await repo.list(patientId));
  if (request.method === "POST") {
    if (!["ADMIN", "DENTIST"].includes(identity.actor.role))
      return reply(403, {
        error: { code: "FORBIDDEN", message: "El diagnóstico requiere confirmación del dentista." },
      });
    if (parts.length === 4)
      return reply(
        201,
        await repo.create(patientId, diagnosisInputSchema.parse(await request.json())),
      );
    const id = decodeURIComponent(parts[4] ?? "");
    if (parts.length === 6 && parts[5] === "resolve") {
      const input = resolveDiagnosisSchema.parse(await request.json());
      return reply(200, await repo.resolve(patientId, id, input.expectedVersion));
    }
    if (parts.length === 6 && parts[5] === "plan")
      return reply(
        201,
        await repo.addToPlan(patientId, id, diagnosisPlanInputSchema.parse(await request.json())),
      );
  }
  return reply(404, { error: { code: "NOT_FOUND", message: "Ruta no encontrada." } });
}
