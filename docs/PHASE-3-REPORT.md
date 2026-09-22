# Informe F3 · Dominio puro · trabajo en curso

Fecha: 2026-09-21

## 1. Resumen

F3 concentra reglas de negocio de Denty 2.x en TypeScript puro, sin React, Next ni fetch. Se han
recuperado además reglas históricas útiles que no deben volver a vivir en componentes: triestado del
odontograma, snapshots, Kennedy, fase clínica, pipeline odontograma→plan→presupuesto y políticas de
estado. El gate arquitectónico impide `new Date()` fuera de `domain/dates.ts`, líneas >100 y patrones
legacy inseguros. F3 aún no se declara cerrada porque faltan el `package-lock.json` raíz y la ejecución
real de Vitest/cobertura/build en un entorno con acceso npm.

## 2. Archivos principales

```text
src/domain/
├─ agenda/index.ts
├─ clinical-pipeline.ts
├─ dates.ts
├─ endodontics.ts
├─ money.ts
├─ odontogram/
│  ├─ index.ts
│  └─ state.ts
├─ periodontal/index.ts
├─ permissions.ts
├─ plan/index.ts
├─ rewards.ts
├─ state-machines/index.ts
└─ __tests__/
   ├─ agenda.test.ts
   ├─ clinical-pipeline.test.ts
   ├─ dates.test.ts
   ├─ edge-cases.test.ts
   ├─ endodontics.test.ts
   ├─ money.test.ts
   ├─ odontogram-state.test.ts
   ├─ odontogram.test.ts
   ├─ periodontal.test.ts
   ├─ plan.test.ts
   ├─ rewards-permissions.test.ts
   └─ state-machines.test.ts

scripts/
├─ verify-architecture.mjs
├─ verify-deployable-package.mjs
└─ verify-domain-smoke.ts
```

## 3. Reglas implementadas

- Dinero en céntimos enteros, formato/parseo `es-ES`, cantidades y bps con un único redondeo.
- Fechas de negocio centralizadas en `Europe/Madrid`; DST 29/03/2026 y 25/10/2026 cubiertos por tests.
- Agenda: 08:30 visible, altura proporcional, solapes, bloqueos, resize, snap y semántica de espera.
- Odontograma: catálogo FDI permanente/temporal, 25 estados, superficies, triestado 2.3.7,
  implante→pilar→corona, endo→perno→corona, removible, puentes cruzando línea media y conflictos.
- Estado del odontograma: reducer compartible por UI/voz y undo/redo limitado a 30 checkpoints.
- Comparación de snapshots estable aunque cambie el orden de claves de `attributes`.
- Periodoncia: seis sitios, adaptador legacy, rangos clínicos, BOP/placa/PS/CAL y tipos Stage/Grade/Extent.
- Endodoncia AAE: catálogos y avisos de coherencia sin automatizar la decisión diagnóstica.
- Plan: DAG sin ciclos, añadir/quitar dependencia con motivo, fase/prioridad con motivo, categorías,
  etiquetas para paciente, fase clínica recuperada y sugerencia Kennedy conservadora.
- Máquinas de estado: cita, laboratorio, factura, VERI*FACTU, receta, plan, alternativa, documento,
  bono de juegos y fichaje.
- Permisos: `agenda.read` own/all, aislamiento de paciente y resolución de permisos por subruta.
- Bono de juegos y etiqueta de ranking anonimizada.
- Pipeline clínico por versiones: odontograma → plan → presupuesto, sin pisar presupuesto presentado.

## 4. Decisiones y supuestos

- `docs/HISTORY_RECOVERY.md`: catálogo de comportamiento histórico recuperado y deuda descartada.
- `ASSUMPTIONS.md` A-014: transiciones no explícitas de plan/receta siguen marcadas `INFERIDO`.
- `ASSUMPTIONS.md` A-015: Kennedy es sugerencia; la confirmación profesional es obligatoria.
- El backend sigue siendo autoridad para transiciones y permisos no confirmados por contrato.

## 5. Evidencia disponible en este entorno

- `node scripts/verify-deployable-package.mjs`: **verde**.
- `node scripts/verify-architecture.mjs`: **verde**.
- `npm run domain:smoke`: **verde** sin instalar dependencias externas.
- `tsc` estricto sobre `src/domain/**/*.ts` con stubs de las dependencias ausentes: **verde**.
- Smoke V8: 94,3 % de funciones ejercitadas en los 9 módulos de dominio que no requieren paquetes
  externos. Es una métrica auxiliar, **no sustituye** la cobertura oficial de Vitest.
- Suite Vitest ampliada con `edge-cases.test.ts` para caminos de error y terminales.

## 6. Pipeline recuperado

GitHub CI ahora valida la raíz antes de instalar, ejecuta el smoke barato, genera el lock una sola vez,
reutiliza exactamente ese lock en E2E, conserva cobertura/Playwright y solo después crea
`DENTY-V3-VERCEL-VERIFIED.zip`. El ZIP verificado incorpora el lock y normaliza Vercel a `npm ci`.

## 7. Matriz de paridad

No se marca todavía ninguna fila clínica completa como ☑ porque la matriz exige evidencia funcional de
UI/E2E en las fases F6/F7/F11. F3 aporta la evidencia de dominio necesaria para esas filas, pero no las
cierra prematuramente.

## 8. Riesgos y bloqueos

1. El entorno actual no resuelve `registry.npmjs.org`; no puede ejecutar el gate completo de Vitest.
2. Falta adoptar en el source el `package-lock.json` generado por CI/Vercel.
3. La cobertura oficial `@vitest/coverage-v8` ≥90 % sigue pendiente de ejecución real.
4. F2/F3 no se etiquetan formalmente cerradas hasta `lint + typecheck + test + build` verdes.

## 9. Siguiente trabajo dentro de F3

- Ejecutar CI/Vercel con el source actualizado y recoger `denty-v3-package-lock`.
- Adoptar ese lock en raíz y retirar el bootstrap temporal.
- Ejecutar cobertura oficial; corregir cualquier rama por debajo de 90 %.
- Solo entonces congelar F3 y abrir F4 `shared/api + auth` como fase formal.

## Hotfix de instalación · 2026-09-21
El primer deployment de esta entrega detectó un conflicto real de peer dependencies antes de
`verify`: Mantine 9.6.1 requiere React `^19.2.0` y el proyecto conservaba React 19.0.0. Se
actualizó React/React DOM y sus tipos a 19.3.0, sin usar `--force` ni `--legacy-peer-deps`, y se
añadió una comprobación de compatibilidad al gate desplegable. F3 sigue abierta hasta observar
la instalación y los quality gates completos en Vercel.

## Iteración 2026-09-21 — cierre de errores TypeScript detectados por Vercel

El pipeline remoto superó instalación, formato, ESLint y Stylelint y alcanzó `tsc --noEmit`.
Se corrigieron los errores sin relajar `strict` ni `exactOptionalPropertyTypes`:

- el smoke ejecutable mantiene imports `.ts` y `tsconfig` habilita `allowImportingTsExtensions`
  de forma segura junto con `noEmit`;
- `domain/dates.ts` normaliza todas las entradas a epoch antes de construir `TZDate`, evitando
  un union argument ambiguo entre los overloads `string`/`number`;
- los iconos Tabler usan `aria-hidden` booleano;
- componentes Mantine omiten props opcionales ausentes en vez de pasar `undefined`;
- `DataTable` sigue la API v9 de TanStack Table y restringe su genérico a `RowData`.

La fase permanece abierta hasta que Vercel confirme `typecheck`, Vitest y `next build` verdes.

## Ajuste de Vitest para TSX — 2026-09-21

El deployment de Vercel alcanzó Vitest con TypeScript estricto ya en verde: 77 tests pasaron y
solo falló `src/shared/ui/shared-ui.test.tsx` durante el análisis de imports de Vite, antes de
registrar tests. La causa fue que el `tsconfig` de Next conserva JSX (`jsx: preserve`) y el
`vitest.config.ts` no declaraba transformación JSX ni el alias `@` usado por los tests.

Se mantiene `jsx: preserve` para Next y se configura únicamente el pipeline de Vitest/Vite con
`esbuild.jsx = automatic`, `jsxImportSource = react` y alias `@ -> ./src`. No se eliminan tests,
no se rebaja TypeScript y no se añade ninguna dependencia.


## Ajuste Vitest/Vite 8 — 2026-09-21

El deployment siguiente confirmó que `tsc --noEmit` sí revisa `vitest.config.ts` y rechazó
`esbuild.jsx` porque esa propiedad ya no pertenece a `ESBuildOptions` en Vite 8. La corrección
no relaja TypeScript: se fija Vite 8.3.0, se añade `@vitejs/plugin-react` 6.1.1 y Vitest registra
`react()` como plugin raíz. Se conserva `jsx: preserve` para Next y el alias `@ -> ./src`.

El Historical Regression Gate prohíbe volver a introducir `esbuild.jsx` y el Deployable Package
Gate valida que plugin React 6 no se combine con Vite <8.

## Pipeline unificado por stages/DAG — 2026-09-21

A raíz de los fallos acumulados de Vercel se sustituyó la orquestación duplicada por un runner único en
`scripts/pipeline/`. La decisión no introduce un framework de plugins: stages declarativos + grafo +
executor + reporter cubren el problema actual con menos indirección.

Mejoras:

- Vercel usa `vercel-install` y `vercel-build` del mismo catálogo que CI/local.
- GitHub Actions usa un único job `pipeline`; no regenera dependencias ni recompila la app en jobs distintos.
- Cada stage declara timeout y entorno; solo npm puede reintentarse y únicamente ante errores de red conocidos.
- Unit/coverage fuerzan `NODE_ENV=test`; build/E2E fuerzan producción.
- El delivery dejó de ejecutar `prettier --write`; Prettier es un gate de lectura, no una mutación del build.
- Se emiten eventos NDJSON y reportes JSON/Markdown con correlation id por ejecución.
- El artefacto final se prepara en un staging separado, incorpora el lock verificado y usa `npm ci` sin mutar el checkout.
- El DAG y sus invariantes tienen self-check preinstall y tests Vitest.

F3 sigue abierta hasta que Vercel confirme el pipeline completo y la cobertura oficial de dominio ≥90 %.
## Ajuste final del test EUR / Unicode — 2026-09-21

El deployment posterior dejó 87/88 tests verdes. El único fallo restante no era de producción: `Intl.NumberFormat("es-ES")` generó `1234,56 €` con NBSP y `getByText()` aplicó su normalizador de whitespace. El componente ya reutilizaba `domain/money.formatEUR`; se cambió exclusivamente el assertion para comparar `container.textContent` con la salida canónica sin normalización intermedia. El Historical Regression Gate bloquea volver al matcher frágil.



### React 19 / Next 16 density hydration lint

- Symptom: `react-hooks/set-state-in-effect` failed on `DensityProvider` after the Next 16 ESLint upgrade.
- Cause: UI density was restored from `localStorage` by calling `setState` synchronously inside `useEffect`.
- Fix: model the UI preference as an external store with `useSyncExternalStore`; keep the DOM data attribute synchronization as the only effect.
- Regression guard: the historical gate requires `useSyncExternalStore` and rejects density hydration that calls `setDensity` inside an effect.
