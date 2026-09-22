# Denty v3

Reescritura progresiva de Denty conforme a `PROMPT-MIGRACION-DENTY-V3.md`.

## Requisitos

- Node 24.x
- npm

## Scripts

- `npm ci`
- `npm run dev`
- `npm run deploy:check`
- `npm run architecture:check`
- `npm run format:check`
- `npm run lint`
- `npm run lint:styles`
- `npm run typecheck`
- `npm run test`
- `npm run test:domain:coverage`
- `npm run domain:smoke`
- `npm run build`
- `npm run test:e2e`

## Estado

F2 · Diseño y shell sigue pendiente del gate completo antes de declararla cerrada. Por autorización
expresa del usuario, F3 · Dominio puro está en curso con recuperación selectiva de reglas útiles del
historial. Ver `docs/HISTORY_RECOVERY.md` y `docs/PHASE-3-REPORT.md`.

Todavía no se reclama paridad funcional de módulos clínicos; se sigue en `docs/MIGRATION_MATRIX.md`.

La dirección de dependencias es `app → features → shared/domain`. El gate de arquitectura y ESLint
impiden dependencias inversas y patrones legacy críticos.

## Bootstrap temporal del lockfile

El entorno que genera esta entrega no resuelve `registry.npmjs.org`, pero Vercel sí. El ZIP mantiene
provisionalmente el bootstrap que genera un `package-lock.json` y ejecuta después `npm ci`. La copia
de evidencia queda en `.artifacts/bootstrap/package-lock.json`, fuera de `public/`, para que el lock no
se exponga como asset estático. La arquitectura final debe incorporar ese lock en la raíz y volver a
`installCommand: npm ci` puro. Ver `docs/F1-BLOCKERS.md`.

## Compatibilidad Next 16

Denty v3 se mantiene en Next 16.3.5 con React 19.3.0. `next` y `eslint-config-next` se fijan
en la misma versión exacta. No usar `--force` ni
`--legacy-peer-deps`.


## SaaS multi-tenant foundation

Denty V3 includes organization/clinic tenant primitives in `src/domain/tenancy`. See `docs/SAAS-MULTITENANT-FOUNDATION.md`.
