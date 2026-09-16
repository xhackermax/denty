import type { FastifyInstance, FastifyRequest } from "fastify";

export function getCorrelationId(request: FastifyRequest) {
  return request.headers["x-correlation-id"]?.toString() || `corr-${Date.now()}`;
}

export async function registerCorrelationPlugin(server: FastifyInstance) {
  server.addHook("onRequest", async (request, reply) => {
    reply.header("x-correlation-id", getCorrelationId(request));
  });
}
