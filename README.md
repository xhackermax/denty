# Denty

Software de gestión para clínicas dentales: ficha del paciente, **odontograma**, periodontograma, agenda, presupuestos y cobros, laboratorio, tareas del equipo, portal del paciente y dictado por voz.

> Antes de tocar código lee [AGENTS.md](AGENTS.md) y [CLAUDE.md](CLAUDE.md): esta versión de Next.js tiene cambios incompatibles y el repositorio tiene reglas de pruebas y arquitectura.

## Stack

| Capa | Tecnología |
| --- | --- |
| Web | Next.js 16 (App Router), React, TypeScript estricto, Mantine, CSS Modules |
| Datos | Supabase (Postgres + RLS + Realtime + Storage), migraciones SQL en `supabase/` |
| Voz / IA | Whisper local (Transformers.js), Deepgram, Web Speech, NLU local, Claude vía AI Gateway |
| Pagos | Stripe, SumUp y datáfonos (adaptadores intercambiables), VeriFactu |
| Pruebas | Vitest (unitarias), Playwright (e2e), contratos en `scripts/` |

## Puesta en marcha

```bash
nvm use            # Node 24 (.nvmrc)
npm install
cp .env.example .env.local   # rellenar Supabase y claves opcionales
npm run dev        # http://localhost:3000
```

Variables de entorno: ver [.env.example](.env.example) (Supabase, voz, pagos, VeriFactu, comunicaciones). Solo las de Supabase son imprescindibles para arrancar.

## Comandos habituales

| Comando | Para qué |
| --- | --- |
| `npm run dev` / `build` / `start` | Servidor de desarrollo, build y producción |
| `npm run typecheck` | TypeScript sin emitir |
| `npm run lint` · `lint:styles` | ESLint y Stylelint |
| `npm run format:check` · `format` | Prettier |
| `npx vitest run <ruta>` | Tests unitarios acotados (recomendado; `npm test` ejecuta todo el pipeline) |
| `npm run test:e2e` | Playwright |
| `npm run verify` / `ci` | Pipeline completo de verificación |
| `npm run architecture:check` | Reglas de arquitectura (sin estilos inline, rutas API, etc.) |
| `npm run test:torture:*` | Pruebas de estrés del odontograma ([guía](docs/testing/odontogram-torture.md)) |

Los demás scripts `*:check` (`payments:check`, `clinical:stage6-check`, `agenda:stage7-check`…) son contratos por área; su listado completo está en `package.json`.

## Mapa del repositorio

```
src/app/        Rutas Next.js (páginas y API). Solo orquesta: delega en features/ y server/
src/features/   UI por funcionalidad (odontograma, agenda, voz, pagos…)
src/domain/     Reglas de negocio puras, sin React ni red. Es lo más testeado
src/server/     Acceso a Supabase, pagos, voz, documentos. Solo se importa desde rutas API
src/shared/     Utilidades y geometría reutilizables (UI, odontograma, API cliente)
src/i18n/       Textos (es.json) y carga de mensajes
supabase/       Migraciones, funciones edge y tests SQL
scripts/        Pipeline de verificación, contratos, backups, generadores
e2e/            Pruebas Playwright
docs/           Documentación (índice en docs/README.md)
```

Detalle de cada carpeta, qué hace y con qué interactúa: [docs/architecture/repository-map.md](docs/architecture/repository-map.md).

## Documentación

Empieza por el índice: **[docs/README.md](docs/README.md)**.

- Arquitectura y flujo de datos: [repository-map](docs/architecture/repository-map.md)
- Voz y odontograma por dictado: [IA-VOZ-NLU](docs/guias/IA-VOZ-NLU.md)
- Pagos y datáfonos: [DATAFONOS](docs/guias/DATAFONOS.md), [arquitectura de pagos](docs/PAYMENTS-PROVIDER-ARCHITECTURE.md)
- Hoja de ruta: [ROADMAP-MEJORAS-FUTURAS](docs/ROADMAP-MEJORAS-FUTURAS.md)
- Historial de etapas y releases: [docs/archive](docs/archive/README.md)

## Despliegue

Vercel (Node 24). Cada push a `main` despliega. Las rutas API nuevas deben registrarse en `docs/legacy-api-routes.json` y pasar `npm run architecture:check`.