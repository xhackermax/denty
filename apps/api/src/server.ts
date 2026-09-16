import Fastify from 'fastify';
import { createDemoClinic } from '@denty/fixtures';
import { registerAppointmentRoutes } from './modules/appointments/routes';
import { registerPatientRoutes } from './modules/patients/routes';
import { registerCorrelationPlugin } from './plugins/correlation';

export function buildServer() {
  const server = Fastify({ logger: true });
  void registerCorrelationPlugin(server);

  server.get('/health', async () => ({
    ok: true,
    service: 'denty-api',
  }));

  server.get('/api/clinic/demo', async () => createDemoClinic());
  void registerPatientRoutes(server);
  void registerAppointmentRoutes(server);

  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 4000);
  const server = buildServer();
  server.listen({ host: '0.0.0.0', port }).catch((error) => {
    server.log.error(error);
    process.exit(1);
  });
}
