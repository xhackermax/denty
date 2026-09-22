# Versiones fijadas en F1

## Núcleo conservado de la auditoría
- next 16.3.5
- react 19.3.0
- react-dom 19.3.0
- typescript 5.9.3
- @types/node 22.20.2
- @types/react 19.3.0
- @types/react-dom 19.3.0

## Herramientas nuevas verificadas contra publicaciones npm accesibles el 2026-09-21
- eslint 9.39.5 (pin conservador de la rama 9; Next 16 usa flat config nativo)
- eslint-config-next 16.3.5 (alineado exactamente con Next 16.3.5)
- eslint-config-prettier 10.1.8
- prettier 3.9.8
- stylelint 17.15.0
- stylelint-config-standard 40.0.0
- vitest 5.0.1
- @playwright/test 1.63.0
- husky 9.1.7
- zod 4.6.5

`npm view` no respondió desde el shell de este entorno. Las versiones se contrastaron con el registro/documentación web. ESLint 9.39.5 se mantiene temporalmente para evitar ampliar el cambio de framework; `eslint-config-next` queda alineado con Next 16.3.5.

## F2 · Diseño y shell
Versiones exactas verificadas el 2026-09-21 y añadidas sin rangos:
- @mantine/core 9.6.1
- @mantine/hooks 9.6.1
- @tabler/icons-react 3.47.0
- @tanstack/react-table 9.2.4
- motion 13.4.0
- next-intl 4.14.2
- nuqs 2.10.1
- @axe-core/playwright 4.13.0
- @testing-library/jest-dom 7.0.1
- @testing-library/react 16.3.3
- jsdom 30.0.1
- postcss 8.5.28
- postcss-preset-mantine 1.18.0

Cada alta tiene su ADR en `docs/adr/0012..0024`. No se han añadido todavía Mantine Form, Dates, Notifications, Charts ni TanStack Virtual porque F2 no los consume; se incorporarán en la fase que los use para evitar dependencias muertas.

## F3 · Dominio puro
Versiones exactas contrastadas el 2026-09-21:
- date-fns 4.4.0
- @date-fns/tz 1.5.0

Se añaden para centralizar todas las fechas de negocio en `Europe/Madrid` y cubrir DST de forma determinista.
- @vitest/coverage-v8 5.0.1 (alineado exactamente con Vitest 5.0.1)

## Corrección de compatibilidad · 2026-09-21
- React y React DOM suben de 19.0.0 a 19.3.0.
- Los tipos React/React DOM se alinean en 19.3.0.
- Motivo: Mantine 9.6.1 exige React `^19.2.0`; React 19.3.0 es la estable actual.
- Next.js queda en 16.3.5; ver ADR 0031 para la migración desde Next 15.
- Se prohíbe resolver peers con `--force` o `--legacy-peer-deps`.
- Decisión documentada en `docs/adr/0028-react-19-3-mantine-9-compat.md`.

## Corrección Vitest/Vite TSX · 2026-09-21
- vite 8.3.0
- @vitejs/plugin-react 6.1.1
- Motivo: Vitest 5 usa Vite como peer y el intento `esbuild.jsx` no es válido con la API de Vite 8.
- Se fija Vite explícitamente para evitar que npm resuelva un peer distinto entre builds.
- El plugin React oficial transforma TS/TSX mientras Next conserva `jsx: preserve`.
- Decisión documentada en `docs/adr/0029-vite-react-plugin-for-vitest-tsx.md`.
