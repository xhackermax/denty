# Denty - Reorganizacion Arquitectonica

## 1. Contexto del proyecto

Denty es una aplicacion clinica dental en evolucion. La version actual funciona como una preview web autonoma: abre desde `index.html`, carga `denty-app.bundle.js`, persiste datos en navegador y conserva `server.py` como backend opcional para integraciones avanzadas como pagos reales, IA externa/MCP y sincronizacion.

El producto ya cubre muchos flujos reales de clinica:

- puerta de acceso Administrador / Usuario / Paciente;
- pacientes y ficha clinica;
- odontograma restaurador y periodontal;
- agenda, tareas y trabajos de laboratorio;
- presupuestos, pagos y finanzas;
- consentimientos informados con firma;
- ajustes de clinica, doctores, sedes, tarifas, laboratorios, usuarios y permisos;
- voz / NLU local;
- preview de pagos con datafono virtual;
- pruebas de regresion `verify_*`.

La preview actual es valiosa porque permite probar Denty sin backend. Esa capacidad debe conservarse durante la migracion.

## 2. Diagnostico actual

La arquitectura actual ha llegado al limite natural de una SPA estatica escrita en pocos archivos grandes.

### Fortalezas

- La app abre sin backend y es facil de probar.
- Hay un modelo local completo con migraciones.
- Existen pruebas de regresion para areas criticas.
- La documentacion ya distingue implementado, simulado y pendiente.
- El bundle estatico permite desplegar en Vercel o abrir localmente.

### Problemas

- `app.js` concentra UI, modales, bindings, permisos, navegacion, estado y flujos.
- `logic.js` mezcla modelo, seeds, migraciones y reglas de dominio.
- `denty-app.bundle.js` es generado, pero la estructura fuente no escala.
- Los tests son utiles, pero estan dispersos y no siguen una jerarquia por modulo.
- La persistencia en navegador no sirve como base final multiusuario.
- Autenticacion, portal paciente, fichaje real, sync y pagos reales requieren backend seguro.
- El codigo actual dificulta incorporar nuevas pantallas sin aumentar fragilidad.

## 3. Objetivo de la reorganizacion

Crear una base tecnica profesional para Denty sin perder la preview funcional.

La nueva arquitectura debe permitir:

- desarrollo modular por areas clinicas;
- componentes de UI mantenibles;
- dominio testeable fuera de la interfaz;
- backend seguro para datos reales, pagos, IA y sync;
- persistencia local y remota;
- control de permisos real;
- migracion progresiva desde la preview actual;
- despliegue web moderno;
- futuro empaquetado desktop si se necesita en clinica.

## 4. Stack recomendado

### Frontend

- React + TypeScript + Vite.
- React Router para rutas internas.
- Zustand para estado de UI y sesion.
- TanStack Query cuando exista API real.
- Zod para validacion de formularios, comandos y payloads.
- Radix UI para dialogs, selectores y componentes accesibles.
- CSS Modules o CSS por feature al inicio; Tailwind solo si se decide normalizar todo el diseno mas adelante.

Motivo: Denty es una aplicacion de gestion con muchas pantallas interactivas. React + TypeScript + Vite da modularidad, rapidez de desarrollo y mejor verificabilidad que el `app.js` monolitico.

### Backend

- TypeScript con Fastify o Hono.
- API modular por dominio.
- Autenticacion por sesion/token con roles.
- Adaptadores para pagos, IA/MCP y sync.
- Nada de secretos en el navegador.

Motivo: Denty necesita backend real para multiusuario, pagos fisicos, IA externa y sincronizacion. TypeScript permite compartir tipos y validaciones con el frontend.

### Base de datos

- Prisma ORM.
- SQLite para modo local/desarrollo.
- PostgreSQL para produccion multiusuario.

Motivo: permite empezar localmente sin complicar instalacion y pasar a una base robusta cuando haya servidor.

### Testing

- Vitest para dominio y utilidades.
- Testing Library para componentes.
- Playwright para flujos completos.
- Mantener tests `verify_*` durante la transicion y migrarlos por area.

### Tooling

- Monorepo con pnpm workspaces.
- ESLint + Prettier.
- TypeScript estricto por fases.
- Scripts de build, test y preview por app/paquete.

## 5. Estructura objetivo

```text
apps/
  web/
    src/
      app/
      routes/
      features/
      shared/
      styles/
  api/
    src/
      modules/
      adapters/
      auth/
      server.ts

packages/
  domain/
    src/
      patients/
      odontogram/
      agenda/
      documents/
      finance/
      permissions/
  db/
    prisma/
    src/
      client.ts
      seed.ts
  ui/
    src/
      components/
      forms/
      layout/
  voice/
    src/
      parser.ts
      validator.ts
      executor.ts
  fixtures/
    src/
      demo-db.ts
      consents.ts

docs/
  architecture/
  product/
  qa/
```

## 6. Limites de cada capa

### `apps/web`

Responsable de:

- renderizar pantallas;
- manejar interacciones de usuario;
- llamar a dominio/API;
- mostrar estados de carga/error;
- mantener experiencia offline/demo cuando aplique.

No debe contener:

- reglas clinicas complejas;
- secretos;
- SQL;
- logica de pago real;
- integraciones directas con IA externa.

### `apps/api`

Responsable de:

- autenticacion;
- autorizacion;
- persistencia real;
- auditoria;
- pagos reales;
- IA/MCP;
- sync;
- endpoints para web y posibles clientes futuros.

### `packages/domain`

Responsable de reglas puras:

- permisos;
- odontograma;
- agenda/disponibilidad;
- documentos y consentimientos;
- presupuestos/pagos;
- migracion de estructuras de datos;
- validaciones clinicas.

Debe poder probarse sin navegador ni base de datos.

### `packages/db`

Responsable de:

- schema Prisma;
- migraciones;
- seeds;
- adaptadores de repositorio.

### `packages/ui`

Responsable de componentes visuales reutilizables:

- layout;
- botones;
- formularios;
- modales;
- tablas;
- chips;
- indicadores clinicos.

### `packages/voice`

Responsable de:

- parser local;
- validacion con Zod;
- conversion a comandos estructurados;
- contrato comun para IA externa.

## 7. Modelo de producto

El producto se organiza en modulos:

- Identidad y permisos.
- Pacientes.
- Ficha clinica.
- Odontograma.
- Agenda.
- Laboratorio.
- Documentos y consentimientos.
- Finanzas y pagos.
- Ajustes administrativos.
- Voz e IA.
- Sync y copias.
- Portal paciente.

Cada modulo debe tener:

- entidad principal;
- casos de uso;
- UI propia;
- tests;
- documentacion breve;
- permisos asociados.

## 8. Estrategia de migracion

No se debe reescribir todo de golpe. La preview actual queda como referencia funcional mientras la nueva arquitectura crece por modulos.

### Fase 0 - Documentacion y preparacion

- Mantener la preview actual funcionando.
- Documentar arquitectura actual.
- Crear monorepo y tooling.
- Registrar reglas de migracion.

Resultado: repo ordenado, sin cambio funcional visible.

### Fase 1 - Dominio extraido

- Extraer permisos, pacientes, consentimientos y utilidades base a `packages/domain`.
- Crear tests Vitest equivalentes a `verify_*`.
- Mantener `logic.js` como adaptador temporal si hace falta.

Resultado: reglas importantes testeables fuera de UI.

### Fase 2 - Nueva app web base

- Crear `apps/web` con React/Vite.
- Implementar shell principal, gateway y layout.
- Conectar a fixtures/demo.
- Mantener estilo Denty, sin landing page.

Resultado: app nueva abre y navega, aunque aun no cubra todo.

### Fase 3 - Migracion de modulos operativos

Migrar en este orden:

1. Pacientes.
2. Documentos y consentimientos.
3. Agenda.
4. Laboratorio.
5. Finanzas.
6. Odontograma.
7. Ajustes.
8. Voz.

Resultado: cada modulo reemplaza una parte de la preview con pruebas.

### Fase 4 - Backend real

- Crear `apps/api`.
- Definir autenticacion.
- Crear schema Prisma.
- Migrar demo local a repositorios.
- Añadir auditoria.

Resultado: base lista para multiusuario y datos reales.

### Fase 5 - Integraciones

- Pagos reales desde backend.
- IA/MCP desde backend.
- Sync.
- Portal paciente.

Resultado: funcionalidades sensibles fuera del navegador.

### Fase 6 - Retirada de preview antigua

- Cuando la nueva app cubra la funcionalidad critica, congelar la preview antigua.
- Conservarla como demo historica o eliminarla tras acuerdo.

## 9. Reglas de seguridad

- Nunca guardar secretos en frontend, bundle, localStorage o fixtures.
- Todo pago real pasa por backend.
- Toda IA externa pasa por backend.
- Todo acceso a datos reales requiere autenticacion.
- Los roles deben validarse en frontend y backend.
- Las acciones sensibles deben generar auditoria.
- Los documentos firmados quedan bloqueados.
- Los consentimientos deben preservar version y huella.

## 10. Reglas de UX

- Denty es una herramienta clinica, no una landing.
- Primera pantalla tras acceso: trabajo operativo, no marketing.
- Interfaz densa, clara, rapida y escaneable.
- Administrador y Usuario operativo deben ver superficies distintas.
- No mostrar botones muertos.
- Si algo es simulado, debe indicarse.
- Si algo esta pendiente, no debe aparentar estar terminado.

## 11. QA y verificacion

Cada fase debe incluir:

- test de dominio;
- test de UI/componente cuando aplique;
- flujo Playwright para rutas criticas;
- build de produccion;
- verificacion de no secretos;
- documentacion actualizada.

Tests criticos iniciales:

- gateway Admin/Usuario/Paciente;
- permisos de Usuario operativo;
- crear paciente;
- crear consentimiento autocompletado;
- firmar documento;
- exportar PDF;
- agenda con conflicto;
- trabajo de laboratorio;
- cobro simulado;
- ajustes solo administrador.

## 12. Compatibilidad con la preview actual

Durante la migracion:

- `index.html`, `app.js`, `logic.js`, `voice-router.js` y `denty-app.bundle.js` se mantienen.
- No se rompe `node build-static-bundle.mjs`.
- Los scripts `verify_*` siguen siendo la red de seguridad.
- Las nuevas pruebas no sustituyen a las antiguas hasta cubrir el mismo comportamiento.

## 13. Decision recomendada

La direccion recomendada es:

**Monorepo TypeScript con React/Vite para frontend, Fastify/Hono para backend, Prisma con SQLite/PostgreSQL para persistencia, dominio compartido en paquetes y migracion gradual por modulos.**

Esta opcion conserva lo mejor de la preview actual y permite convertir Denty en una aplicacion clinica mantenible, segura y preparada para uso real.

