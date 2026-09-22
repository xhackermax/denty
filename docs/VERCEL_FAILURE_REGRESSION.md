# Registro de regresiones de Vercel

Este documento convierte los fallos reales sufridos durante la migración de Denty en reglas de
preflight. No es una lista teórica: cada fila corresponde a un error que ya apareció en entregas
anteriores y que no debe repetirse.

| Fallo histórico | Causa | Guardia actual |
| --- | --- | --- |
| `apps/web/out` inexistente / 404 | Output Directory manual | `outputDirectory` prohibido |
| `.next` publicado como estático | Confundir build interno con salida pública | Output Directory vacío |
| "No Next.js version detected" | Next no estaba en la raíz real | `package.json` + `next` + `src/app` obligatorios en raíz |
| Build recursivo del monorepo | `pnpm -r`, workspaces, Prisma/backend | `apps`, `packages`, Prisma, pnpm y workspaces prohibidos |
| `pnpm-lock`/npm mezclados | Gestores de paquetes incompatibles | npm único y lockfiles alternativos prohibidos |
| `extends ../../tsconfig.base.json` | ZIP dependía del monorepo | referencias heredadas prohibidas |
| `vitest/globals` sin Vitest compatible | tsconfig heredado | patrón prohibido |
| ZIP sin página raíz | Drop to Deploy no encontraba ruta principal | `src/app/page.tsx` obligatorio |
| Prettier falló por lock generado | el bootstrap crea `package-lock.json` durante install | lock temporal aislado bajo `.artifacts/bootstrap/` y fuera de `public/` |
| ESLint falló por export default anónimo | `--max-warnings=0` | configs deben exportar variable nombrada |
| Vitest ejecutó `e2e/` de Playwright | descubrimiento de tests mezclado | Vitest excluye `e2e/**`; Playwright usa `./e2e` |
| React 19.0 + Mantine 9.6 | peer dependency incompatible | React/Mantine validados; `--force` y `--legacy-peer-deps` prohibidos |
| Stylelint import/hex/media ranges | CSS no normalizado | Stylelint sigue siendo gate obligatorio |
| TSX de tests no parseaba | Next usa `jsx: preserve` | Vitest usa `@vitejs/plugin-react` + alias `@` |
| `esbuild.jsx` inválido en Vite 8 | API antigua aplicada a Vite moderno | `esbuild.jsx` prohibido; Vite/plugin React fijados |
| TypeScript estricto descubrió props `undefined` | `exactOptionalPropertyTypes` | se mantiene estricto; no se desactiva |
| Fechas de negocio con `new Date()` disperso | riesgo UTC/Madrid | arquitectura bloquea `new Date()` fuera de `domain/dates.ts` |

## Orden del pipeline

1. **Preinstall histórico**: `history:check` y `deploy:check` se ejecutan antes de descargar npm.
2. Instalación npm reproducible. Mientras F1 no tenga lock raíz definitivo, se genera un lock temporal.
3. `verify`: regresiones históricas → paquete desplegable → arquitectura → Prettier → ESLint → Stylelint → TypeScript → Vitest.
4. CI ejecuta además cobertura de `domain` y `next build`.
5. Playwright se mantiene separado de Vitest.
6. El artefacto final con lock raíz deberá usar únicamente `npm ci`.

## Regla de entrega

Un ZIP no se llama "listo para Vercel" solo porque tenga estructura correcta. Debe superar el mismo
pipeline que el artefacto que se despliega. Los warnings de `npm audit` o scripts no aprobados se
registran por separado y no se confunden con el error que realmente detuvo el build.
## 2026-09-21 — falso positivo con `.vercel`

- **Síntoma:** el Historical Regression Gate abortó diciendo que el ZIP contenía `.vercel`.
- **Comprobación:** el archivo ZIP entregado no contenía ninguna entrada `.vercel`.
- **Causa:** Vercel puede crear `.vercel` dentro del workspace antes de ejecutar `installCommand`.
- **Corrección:** el gate de runtime ya no prohíbe la mera existencia de `.vercel`; el empaquetado sigue excluyéndolo y ningún script debe depender de `.vercel/project.json`.
- **Regla:** no inferir el contenido original del ZIP a partir del workspace ya mutado por Vercel.

## 2026-09-21 — metadatos runtime de Vercel

- **Síntoma:** `prettier --write .` recorría `.vercel/project.json` creado por la plataforma.
- **Riesgo:** confundir o mutar metadatos runtime que no pertenecen al artefacto fuente.
- **Corrección:** `.vercel/` queda fuera de Prettier; el gate histórico exige esa exclusión.

## 2026-09-21 — React Testing Library heredó `NODE_ENV=production`

- **Síntoma:** los 6 tests UI alcanzaron `render()` pero fallaron con `TypeError: React.act is not a function`.
- **Causa:** Vercel ejecuta el build con entorno de producción y Vitest heredó ese `NODE_ENV`; React carga entonces la variante de producción de sus helpers de test.
- **Corrección:** el stage `unit` y el stage `coverage` fuerzan `NODE_ENV=test` en el boundary del proceso; `build` y E2E fuerzan `NODE_ENV=production`.
- **Regla:** ningún runner de tests unitarios depende del entorno heredado del proveedor CI/CD.

## 2026-09-21 — orquestación duplicada

- **Síntoma:** `package.json`, `vercel.json` y GitHub Actions mantenían secuencias parcialmente distintas, de modo que un hotfix podía arreglar Vercel y dejar CI/local con otro orden.
- **Causa:** la cadena de entrega estaba codificada como varios `&&` y listas de steps independientes.
- **Corrección:** `scripts/pipeline/catalog.mjs` es la única definición del DAG; Vercel, npm y GitHub delegan en targets del mismo runner.
- **Regla:** añadir/reordenar una quality gate se hace en el catálogo, no en tres orquestadores distintos.

## 2026-09-21 — jsdom sin `matchMedia`

- **Síntoma:** componentes envueltos en `MantineProvider` fallaban con `TypeError: window.matchMedia is not a function`.
- **Causa:** jsdom no implementa `matchMedia`, pero Mantine lo usa para resolver el esquema de color.
- **Corrección:** `src/test/setup.ts` instala un polyfill mínimo solo cuando `matchMedia` no existe.
- **Regla:** el Historical Regression Gate exige que Vitest cargue ese setup y que el setup cubra `matchMedia`.

## 2026-09-21 — test de moneda dependía del separador de miles

- **Síntoma:** el test esperaba `1.234,56`, pero `Intl(es-ES)` devolvió `1234,56 €` en el runtime de Vercel.
- **Causa:** el test duplicaba una expectativa de presentación en vez de reutilizar el contrato de dominio.
- **Corrección:** `MoneyText` reutiliza `domain/money.formatEUR` y el test compara contra esa salida canónica.
- **Regla:** el formateo monetario tiene una sola fuente de verdad.

## 2026-09-21 — contrato de target Vercel desfasado

- **Síntoma:** el test del DAG esperaba que `vercel-build` tuviera raíz `build`, aunque el pipeline usa `vercel-build-final`.
- **Causa:** el stage cambió al introducir la normalización temporal de formato y el test no siguió el contrato real.
- **Corrección:** el test y `pipeline/self-check.mjs` validan `vercel-build-final` explícitamente.
- **Regla:** los tests del grafo deben comprobar el target real, no nombres históricos.
## 2026-09-21 — Testing Library normalizó el NBSP del formato EUR

- **Síntoma:** quedaba 1 fallo de 88 tests; el DOM contenía exactamente `1234,56 €`, pero `getByText(formatEUR(...))` no encontraba el nodo porque Testing Library normalizó el espacio no separable (NBSP) de `Intl.NumberFormat`.
- **Causa:** el assertion pasaba por un normalizador de whitespace aunque el contrato que queríamos probar era el texto exacto producido por `formatEUR`.
- **Corrección:** el test obtiene el `container` de `render()` y compara `container.textContent` directamente con `formatEUR(...)`.
- **Regla:** para valores formateados donde Unicode forma parte de la salida canónica, comparar el texto raw; no acoplar el test a los normalizadores de queries.


## 2026-09-21 · Mantine 9 + Next 15 falla en `next build`

- **Síntoma:** webpack reportó que `useEffectEvent` y `Activity` no se exportaban desde React.
- **Causa:** Mantine 9 consume APIs React 19.2+, mientras el App Router de Next 15 usado en este build no las exponía.
- **Prevención:** Next 16.x obligatorio con Mantine 9, `next` y `eslint-config-next` alineados y ADR 0031.


### React 19 / Next 16 density hydration lint

- Symptom: `react-hooks/set-state-in-effect` failed on `DensityProvider` after the Next 16 ESLint upgrade.
- Cause: UI density was restored from `localStorage` by calling `setState` synchronously inside `useEffect`.
- Fix: model the UI preference as an external store with `useSyncExternalStore`; keep the DOM data attribute synchronization as the only effect.
- Regression guard: the historical gate requires `useSyncExternalStore` and rejects density hydration that calls `setDensity` inside an effect.
