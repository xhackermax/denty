# Informe F1 · Cimientos

## 1. Resumen
1. Se creó un scaffold Denty v3 limpio con Next 15.5.25, React 19 y TypeScript estricto.
2. Se añadieron ESLint, Prettier, Stylelint, Vitest, Playwright, Husky y Zod con versiones exactas.
3. Se creó una página mínima y `/api/health` para validar el framework antes de migrar funciones.
4. Se creó CI con Node 24, `npm ci`, calidad, build y E2E.
5. Se retiró conceptualmente el `preflight-vercel.mjs`: v3 no depende de él.
6. Se añadieron ADR por cada dependencia nueva y `env.ts` validado.
7. El primer build Vercel confirmó el bloqueo exacto: `npm ci` se ejecutó sin `package-lock.json`.
8. Se añade un bootstrap de una sola transición que genera el lock en Vercel, ejecuta después `npm ci` y somete la fase a la puerta completa. F1 sigue abierta hasta recuperar e incorporar ese lock.

## 2. Archivos
- `package.json`, `tsconfig.json`, `next.config.ts`, `vercel.json`
- `eslint.config.mjs`, `stylelint.config.mjs`, `.prettierrc`
- `.github/workflows/ci.yml`, `.husky/pre-commit`
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/api/health/route.ts`
- `src/shared/config/env.ts`, `src/shared/lib/app-meta.ts`
- `vitest.config.ts`, `playwright.config.ts`, `e2e/foundation.spec.ts`
- `docs/ARCHITECTURE.md`, `docs/DEPENDENCY_VERSIONS.md`, `docs/adr/0001..0010`

## 3. Decisiones y supuestos
- ADR 0001–0011.
- A-008: excepción autorizada para iniciar F1 con F0 visual pendiente.
- A-009: `npm view`/instalación bloqueados en shell; versiones no inventadas.

## 4. Métricas
- Bundle: pendiente hasta build real.
- Cobertura: pendiente hasta instalar Vitest.
- Axe/Lighthouse: no pertenecen a la puerta F1 básica y requieren runtime.
- Build: bloqueado por acceso a npm.

## 5. Matriz de paridad
- Ninguna capacidad funcional pasa aún a ☑: F1 establece infraestructura, no porta módulos de producto.
- La evidencia de cimientos se registra en este informe y los archivos de configuración.

## 6. Riesgos y bloqueos; siguiente fase
- F1-01: pendiente incorporar a la raíz el lock que Vercel generará en el próximo despliegue.
- F1-02: el próximo build ejecutará automáticamente lint, stylelint, typecheck, test y build.
- Siguiente fase: F2 solo después de que ese log esté verde y el lock quede fijado en el artefacto.

## Corrección de compatibilidad
- ESLint se fija en 9.39.5 por compatibilidad de peer con eslint-config-next 15.5.25.
- No se usan flags de resolución forzada.
- Evidencia pendiente: siguiente build de Vercel.

## Actualización tras despliegue del 2026-09-21
El usuario confirmó que el build de Vercel quedó verde después de separar Vitest de los tests Playwright. Prettier, ESLint, Stylelint, TypeScript y Vitest atravesaron el pipeline. El bootstrap del lockfile continúa siendo deuda transitoria hasta incorporar un `package-lock.json` raíz.
