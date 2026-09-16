import type { FastifyInstance } from "fastify";
import { createAppointmentRequestSchema, updateAppointmentRequestSchema, versionSchema } from "@denty/contracts";
import { getActor } from "../../plugins/actor";
import { getCorrelationId } from "../../plugins/correlation";
import { createAppointment, listAppointments, updateAppointment, VersionConflictError } from "./service";

const statusActions = {
  arrive: "ARRIVED",
  chair: "IN_CHAIR",
  "no-show": "NO_SHOW",
  complete: "COMPLETED",
} as const;

export async function registerAppointmentRoutes(server: FastifyInstance) {
  server.get<{ Querystring: { date?: string } }>("/api/appointments", async (request) => {
    const date = request.query.date ?? new Date().toISOString().slice(0, 10);
    return listAppointments(await getActor(), date);
  });

  server.post("/api/appointments", async (request, reply) => {
    const appointment = await createAppointment(
      await getActor(),
      createAppointmentRequestSchema.parse(request.body),
      getCorrelationId(request),
    );
    return reply.code(201).send(appointment);
  });

  server.patch<{ Params: { id: string } }>("/api/appointments/:id", async (request, reply) => {
    try {
      return await updateAppointment(
        await getActor(),
        request.params.id,
        updateAppointmentRequestSchema.parse(request.body),
        getCorrelationId(request),
      );
    } catch (error) {
      return handleConflict(error, reply, getCorrelationId(request));
    }
  });

  for (const [path, status] of Object.entries(statusActions)) {
    server.post<{ Params: { id: string } }>(`/api/appointments/:id/${path}`, async (request, reply) => {
      try {
        const body = request.body;
        const expectedVersion = versionSchema.parse((body as { expectedVersion?: unknown })?.expectedVersion);
        return await updateAppointment(await getActor(), request.params.id, { expectedVersion }, getCorrelationId(request), status);
      } catch (error) {
        return handleConflict(error, reply, getCorrelationId(request));
      }
    });
  }
}

function handleConflict(error: unknown, reply: { code: (statusCode: number) => { send: (payload: unknown) => unknown } }, correlationId: string) {
  if (error instanceof VersionConflictError) {
    return reply.code(409).send({
      error: { code: "VERSION_CONFLICT", message: "El registro ha cambiado en otro dispositivo.", correlationId },
      current: error.current,
    });
  }
  throw error;
}
