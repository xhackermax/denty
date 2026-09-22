# Typecheck hardening · F3

Fecha: 2026-09-21

Esta iteración conserva las opciones estrictas de TypeScript. No se ha usado `skip` por archivo,
`@ts-ignore`, `any`, ni se ha desactivado `exactOptionalPropertyTypes`.

## Decisiones

1. `scripts/verify-domain-smoke.ts` se ejecuta directamente con Node y por ello usa extensiones
   `.ts` explícitas. Como el proyecto tiene `noEmit: true`, se activa
   `allowImportingTsExtensions: true` y el script sigue incluido en el typecheck general.
2. Las fechas aceptan `Date | number | string` en la frontera, se validan y convierten a epoch
   antes de crear `TZDate`. Esto elimina la ambigüedad de overload sin cast inseguro.
3. Con `exactOptionalPropertyTypes`, una prop opcional ausente no equivale a pasar
   explícitamente `undefined`. Los wrappers de Mantine omiten esas props con spreads
   condicionales o proporcionan un valor booleano concreto cuando el default es `false`.
4. `DataTable` usa TanStack Table v9 (`tableFeatures` + `useTable`) y sus genéricos se limitan a
   `RowData`.

## No realizado

No se ha usado `--force`, `--legacy-peer-deps`, `@ts-ignore` ni una reducción de las opciones
estrictas para hacer pasar el pipeline.
