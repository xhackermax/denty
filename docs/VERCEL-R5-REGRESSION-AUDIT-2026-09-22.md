# Denty V3 R5 — auditoría histórica de Vercel

R5 revisa el artefacto contra la matriz de fallos históricos recopilada durante la migración de Denty.

## Cambios de R5

- El target `vercel-build` ya no ejecuta `prettier --write` ni ningún stage que modifique el source.
- Prettier se conserva como comprobación de CI (`format`) y comando de desarrollo, fuera del camino de despliegue de Vercel.
- `pipeline:self-check` inspecciona el plan real de `vercel-build` y falla si un formatter mutante vuelve a ser alcanzable.
- Nuevo gate dependency-free `vercel-regression-matrix`, incluido en `preflight`, para vigilar contaminación de monorepo, Root/Output Directory, lockfiles incompatibles, tsconfig heredado, Vitest/E2E, regex histórica de Next, Games y mutación de formato.

## Deuda aún abierta

El ZIP todavía no incluye un `package-lock.json` raíz definitivo. La instalación actual genera temporalmente el lock en Vercel y después ejecuta `npm ci`. Esto permite desplegar, pero no cierra la deuda de reproducibilidad. Para cerrarla de forma correcta hace falta generar el lock con Node 24/npm del proyecto, incorporarlo a la raíz y cambiar `installCommand` a `npm ci`.

No se publica ningún lock temporal bajo `public/`.
