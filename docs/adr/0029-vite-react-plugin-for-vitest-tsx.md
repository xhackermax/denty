# ADR 0029 · Vite y plugin React para Vitest TSX

## Contexto
Denty conserva `jsx: preserve` en `tsconfig.json` porque Next.js gestiona la transformación JSX.
Vitest 5 ejecuta sobre Vite y el intento de forzar `esbuild.jsx = automatic` dejó de ser válido
con la API de Vite 8, provocando un error de tipos antes de ejecutar los tests.

## Decisión
Fijar `vite` 8.3.0 y `@vitejs/plugin-react` 6.1.1 como dependencias de desarrollo exactas y
registrar `react()` en `vitest.config.ts`. Mantener el alias `@ -> ./src` y excluir `e2e/**`.

## Alternativas descartadas
No se cambia `jsx: preserve` globalmente porque pertenece al pipeline de Next. Tampoco se usa
`esbuild.jsx`, `@ts-ignore`, casts de configuración ni un transformador artesanal.

## Consecuencias
Los tests TSX usan el pipeline React oficial de Vite, Vite deja de ser un peer implícito y el gate
histórico bloquea tanto `esbuild.jsx` como combinaciones incompatibles de Vite/plugin React.
