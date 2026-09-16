import type { FastifyInstance } from "fastify";
import { createPatientRequestSchema, updatePatientRequestSchema } from "@denty/contracts";
import { VersionConflictError } from "@denty/db";
import { getActor } from "../../plugins/actor";
import { getCorrelationId } from "../../plugins/correlation";
import { createPatient, getPatient, listPatients, updatePatient } from "./service";

export async function registerPatientRoutes(server: FastifyInstance) {
  server.get("/api/patients", async (request) => listPatients(await getActor(request)));

  server.post("/api/patients", async (request, reply) => {
    const actor = await getActor(request);
    const patient = await createPatient(actor, createPatientRequestSchema.parse(request.body), getCorrelationId(request));
    return reply.code(201).send(patient);
  });

  server.get<{ Params: { id: string } }>("/api/patients/:id", async (request) => getPatient(await getActor(request), request.params.id));

  server.patch<{ Params: { id: string } }>("/api/patients/:id", async (request, reply) => {
    try {
      return await updatePatient(
        await getActor(request),
        request.params.id,
        updatePatientRequestSchema.parse(request.body),
        getCorrelationId(request),
      );
    } catch (error) {
      if (error instanceof VersionConflictError) {
        return reply.code(409).send({
          error: { code: "VERSION_CONFLICT", message: "El registro ha cambiado en otro dispositivo.", correlationId: getCorrelationId(request) },
          current: error.current,
        });
      }
      throw error;
    }
  });
}
