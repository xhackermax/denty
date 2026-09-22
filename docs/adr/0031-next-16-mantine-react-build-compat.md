# ADR 0031 · Next 16 para compatibilidad de build con Mantine 9 y React 19.2+

## Contexto

El pipeline de Vercel llegó por primera vez a `next build` con 88/88 tests verdes.
Next 15.5.25 falló al compilar Mantine 9.6.1 porque el bundle React del App Router no
exponía `useEffectEvent` ni `Activity`, APIs que Mantine 9 usa y que forman parte de React
19.2+.

## Decisión

Actualizar `next` y `eslint-config-next` de 15.5.25 a 16.3.5 y mantener React/React DOM
19.3.0 y Mantine 9.6.1. Migrar ESLint a la configuración flat nativa recomendada por
Next 16. No se parchea `node_modules`, no se fuerzan peers y no se baja Mantine.

## Evidencia

- Next 16 es la rama Active LTS y soporta explícitamente las APIs React 19.2
  `useEffectEvent` y `Activity` en App Router.
- Next 16.3.5 es la estable publicada más reciente al realizar esta migración.
- Mantine 9.x exige React 19.2 o posterior.

## Alternativas descartadas

- Bajar Mantine a 8.x: evita el síntoma pero revierte la modernización de F2.
- Parchear imports dentro de Mantine: frágil y no reproducible.
- `--force` / `--legacy-peer-deps`: no resuelve la incompatibilidad de compilación.
- Mantener Next 15: ya produjo un fallo reproducible de `next build`.

## Consecuencias

Next 16 usa Turbopack por defecto para `next build`. El proyecto no tiene configuración
webpack personalizada, middleware legado ni APIs síncronas de request que bloqueen esta
migración. Los gates exigen Next 16+ mientras Mantine 9 siga en uso y alinean exactamente
`next` con `eslint-config-next`.
