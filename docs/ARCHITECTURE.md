# Arquitectura Denty v3

## Estado
Este documento comienza en F1 y se ampliará en cada fase. La arquitectura objetivo completa está definida en el prompt maestro.

## Reglas ya activas en F1
- Next.js App Router y React 19.
- TypeScript estricto con `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride` y `verbatimModuleSyntax`.
- Alias `@/*` limitado a `src/*`.
- Node 24.x y npm como gestor único.
- `npm ci` será el único método de instalación en CI/Vercel una vez exista el lockfile válido.
- Sin monorepo, pnpm, Prisma ni referencias externas en el artefacto web.
- Código de aplicación bajo `src/`; documentación bajo `docs/`.
- F1 no porta todavía datos clínicos ni autenticación. Eso evita reproducir el fallback inseguro actual.

## Dirección de dependencias objetivo
`app → features → shared/domain`.

`domain` será TypeScript puro y no importará React, Next ni `fetch`.

## F2 · Diseño y shell
- `MantineProvider` centraliza tema, color scheme y primitives; los estilos propios viven en CSS Modules/tokens.
- `next-intl` centraliza textos, locale `es` y zona `Europe/Madrid`.
- `nuqs` será la única vía para estado de UI que deba sobrevivir en URL.
- Los iconos del shell son Tabler; quedan prohibidos los glifos Unicode como iconografía funcional nueva.
- El shell responsive vive en `features/shell`; no contiene reglas clínicas ni acceso a datos.
- `shared/ui` contiene patrones transversales y no importa features.
- Route groups separan `(public)`, `(staff)` y `(patient)` sin duplicar providers globales.
- F2 no implementa autenticación: el middleware, sesión servidor y RBAC llegan en F4.
- `localStorage` solo se usa para la preferencia de densidad; no hay datos clínicos ni fallback de API.
