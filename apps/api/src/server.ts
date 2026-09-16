import Fastify from "fastify";
import { assertProductionConfig } from "./config/production";
import { registerHttpSecurity } from "./config/http-security";
import { checkDatabaseHealth, prisma } from "@denty/db";
import { createDemoClinic } from "@denty/fixtures";
import { AuthError } from "./auth/require-permission";
import { registerAuthRoutes } from "./auth/routes";
import { registerAppointmentRoutes } from "./modules/appointments/routes";
import { registerPatientRoutes } from "./modules/patients/routes";
import { registerUserRoutes } from "./modules/users/routes";
import { registerBillingRoutes } from "./modules/billing/routes";
import { registerClinicalRoutes } from "./modules/clinical/routes";
import { registerOdontogramRoutes } from "./modules/odontogram/routes";
import { registerPortalRoutes } from "./modules/portal/routes";
import { registerDocumentRoutes } from "./modules/documents/routes";
import { registerLaboratoryRoutes } from "./modules/laboratory/routes";
import { registerAnalyticsRoutes } from "./modules/analytics/routes";
import { registerEventRoutes } from "./modules/events/routes";
import { registerVoiceRoutes } from "./modules/voice/routes";
import { registerAgendaOperationsRoutes } from "./modules/appointments/operations-routes";
import { registerSecurityRoutes } from "./modules/security/routes";
import { registerNotificationRoutes } from "./modules/notifications/routes";
import { startNotificationDispatcher } from "./modules/notifications/dispatcher";
import { startBackupScheduler } from "./modules/security/backup-scheduler";
import { registerCorrelationPlugin, getCorrelationId } from "./plugins/correlation";

export function buildServer() {
  assertProductionConfig();
  const server = Fastify({ logger: { redact: { paths: ["req.headers.authorization","req.headers.cookie","res.headers.set-cookie"], censor: "[REDACTED]" } }, bodyLimit: 10 * 1024 * 1024 });
  void registerCorrelationPlugin(server);
  registerHttpSecurity(server);
  server.addHook("onSend",async(_request,reply,payload)=>{reply.header("X-Content-Type-Options","nosniff");reply.header("Referrer-Policy","strict-origin-when-cross-origin");reply.header("X-Frame-Options","DENY");reply.header("Content-Security-Policy","default-src 'none'; frame-ancestors 'none'; base-uri 'none'");reply.header("Permissions-Policy","camera=(), geolocation=(), microphone=(self)");if(_request.url.startsWith("/api/")||_request.url.startsWith("/health"))reply.header("Cache-Control","no-store");if(process.env.NODE_ENV==="production")reply.header("Strict-Transport-Security","max-age=31536000; includeSubDomains");return payload;});
  server.setErrorHandler((error,request,reply)=>{const anyError=error as any;const status=error instanceof AuthError?error.statusCode:Number(anyError.statusCode)||500;const code=error instanceof AuthError?error.code:anyError.code??(status>=500?"INTERNAL_ERROR":"REQUEST_ERROR");if(status>=500)request.log.error(error);reply.code(status).send({error:{code,message:status>=500?"Error interno del servidor.":String(anyError.message??"Solicitud no valida."),correlationId:getCorrelationId(request),...(anyError.current?{current:anyError.current}:{}),...(anyError.missing?{missing:anyError.missing}:{})}});});

  server.get("/health", async () => ({ ok: true, service: "denty-api", version: "3.0.0" }));
  server.get("/health/db", async () => checkDatabaseHealth(prisma));
  server.get("/api/clinic/demo", async () => createDemoClinic());
  void registerAuthRoutes(server);
  void registerPatientRoutes(server);
  void registerAppointmentRoutes(server);
  void registerAgendaOperationsRoutes(server);
  void registerUserRoutes(server);
  void registerBillingRoutes(server);
  void registerClinicalRoutes(server);
  void registerOdontogramRoutes(server);
  void registerPortalRoutes(server);
  void registerDocumentRoutes(server);
  void registerLaboratoryRoutes(server);
  void registerAnalyticsRoutes(server);
  void registerVoiceRoutes(server);
  void registerEventRoutes(server);
  void registerSecurityRoutes(server);
  void registerNotificationRoutes(server);
  startBackupScheduler();
  startNotificationDispatcher();
  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 4000);
  const server = buildServer();
  server.listen({ host: process.env.HOST ?? "0.0.0.0", port }).catch((error) => { server.log.error(error); process.exit(1); });
}
