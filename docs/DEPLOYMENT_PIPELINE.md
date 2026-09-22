# Pipeline de entrega de Denty V3

La fuente de verdad es `scripts/pipeline/catalog.mjs`. Vercel, npm y GitHub no vuelven a describir el
orden de los quality gates; solo invocan targets del runner.

## Entradas principales

```text
node scripts/pipeline/run.mjs preflight
node scripts/pipeline/run.mjs verify
node scripts/pipeline/run.mjs ci
node scripts/pipeline/run.mjs vercel-install
node scripts/pipeline/run.mjs vercel-build
```

Para inspeccionar un target sin ejecutarlo:

```text
node scripts/pipeline/run.mjs ci --plan
```

## Principios

1. El ZIP desplegable sigue siendo frontend Next plano, con `package.json` y `src/app` en raíz.
2. El preflight corre antes de descargar dependencias.
3. La instalación temporal genera lock solo mientras esa deuda siga abierta.
4. El build nunca autoformatea ni modifica el source.
5. Tests unitarios y cobertura siempre corren con `NODE_ENV=test`.
6. `next build` y E2E usan entorno de producción.
7. Solo errores transitorios de red de npm reciben un reintento; ERESOLVE, lint, tipos y tests no.
8. Cada stage tiene timeout y eventos estructurados con correlation id.
9. El packaging ocurre solo tras E2E verde.
10. El ZIP final de CI incluye el lock exacto usado por el pipeline y cambia Vercel a `npm ci`.

El diseño, matriz de patrones, contratos y guía de extensión están en `docs/PIPELINE_ARCHITECTURE.md`.
