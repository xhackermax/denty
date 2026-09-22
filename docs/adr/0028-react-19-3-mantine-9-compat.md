# ADR 0028 · React 19.3 para compatibilidad con Mantine 9

## Contexto
F2 fijó Mantine 9.6.1 manteniendo React 19.0.0. La instalación reproducible falló porque
`@mantine/hooks@9.6.1` exige React `^19.2.0`. Además, React 19.0.0 quedó por detrás de
correcciones de seguridad publicadas para React Server Components.

## Decisión
Fijar `react` y `react-dom` en 19.3.0 y alinear `@types/react` y `@types/react-dom` en 19.3.0.
Mantener Next.js 15.5.25 y Mantine 9.6.1. Añadir un gate local que impida combinar Mantine 9
con React anterior a 19.2.0 o desalinear React/React DOM y Mantine Core/Hooks.

## Alternativas descartadas
Bajar Mantine a 8.x evitaría el conflicto, pero retrocedería una decisión de modernización ya
adoptada. `--force` y `--legacy-peer-deps` se descartan porque ocultan incompatibilidades.

## Consecuencias
La instalación conserva resolución estricta de peers y versiones exactas. Cualquier cambio de
esta matriz debe volver a pasar instalación, quality gates y build antes de cerrar fase.
