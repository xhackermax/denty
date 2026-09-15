# Denty

Denty es una plataforma de gestion para clinicas dentales. El proyecto queda reorganizado como monorepo profesional para separar interfaz, API, dominio, datos de prueba, voz y persistencia.

## Estructura

- `apps/web`: aplicacion principal en Next.js App Router, TypeScript y estructura `src/app`.
- `apps/api`: base de API con Fastify para integraciones reales.
- `apps/legacy-preview`: preview estatica anterior, conservada para comparar y no perder funcionalidad.
- `packages/domain`: modelos, permisos, consentimientos y calculos compartidos.
- `packages/fixtures`: datos demo conectados para desarrollo y pruebas.
- `packages/ui`: navegacion y primitives compartidas.
- `packages/voice`: parser local de comandos de voz.
- `packages/db`: configuracion inicial de persistencia y Prisma.
- `tests`: verificaciones de la preview heredada y comportamiento critico.
- `docs`: documentacion funcional, arquitectura y planes de evolucion.

## Comandos

```bash
pnpm install
pnpm dev
pnpm build
pnpm test
```

Para regenerar y comprobar la preview anterior:

```bash
pnpm legacy:build
pnpm legacy:test
```

## Decisiones principales

- La app nueva se despliega desde `apps/web/dist`.
- Vercel construye con `pnpm build`.
- Los roles se gestionan desde `packages/domain`: el usuario operativo puede trabajar con pacientes, agenda, laboratorios, documentacion clinica y finanzas; solo el administrador puede modificar ajustes, usuarios y auditoria.
- Los consentimientos se generan con datos de paciente, doctor, sede y fecha, dejando solo la firma pendiente.
- La preview vieja no se borra: queda aislada en `apps/legacy-preview` para seguir verificando lo que ya funcionaba durante la migracion.

## Estado

La base nueva ya esta preparada para evolucionar hacia producto real. La preview anterior sigue disponible mientras se migran pantallas una por una a React y API segura.

## IA local y MCP

La preview puede usar reglas locales y, opcionalmente, un proveedor de IA ejecutado en el servidor local. Para **Ollama**, configura `DENTY_AI_PROVIDER=ollama` en el proceso que ejecuta `server.py`; las credenciales y la comunicación con el modelo permanecen del lado servidor y no se guardan en el navegador.

La integración MCP es también opcional. `server.py` actúa como adaptador y solo se activa cuando existe `DENTY_MCP_URL`; un token, si se necesita, se configura del lado servidor. La respuesta externa debe superar la validación de intenciones de Denty antes de poder modificar datos clínicos.

## Preview de Denty Paciente

La cuenta Administrador y la cuenta Paciente utilizan el mismo conjunto de datos clínicos del navegador, pero mantienen identidades de sesión separadas por pestaña. Esto permite abrir Denty Clínica en una pestaña y Denty Paciente en otra, modificar odontograma, citas, presupuestos o estados desde la clínica y reflejar el cambio en la vista del paciente sin convertir el rol activo en un dato compartido.

Esta separación prepara la migración futura al servidor local: la interfaz seguirá consumiendo una única fuente clínica, mientras autenticación, permisos y persistencia pasarán a la API/SQLite del servidor.
