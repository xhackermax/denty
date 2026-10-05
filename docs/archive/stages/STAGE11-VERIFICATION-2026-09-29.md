# Denty — Stage 11 Verification

**Fecha:** 2026-09-29

## Resultado

Stage 11 queda implementada en código y bloqueada como `DO_NOT_REIMPLEMENT`, pendiente de los gates LIVE descritos en el inventario.

## Evidencia ejecutada

| Gate                     | Resultado                                                                    |
| ------------------------ | ---------------------------------------------------------------------------- |
| Stage 11 contract tests  | PASS, 11/11                                                                  |
| Stage contracts 1→11     | PASS, 54/54; 4 runtime heredados con `--experimental-strip-types` en Node 22 |
| TS/TSX tocados           | PASS, 21/21 transpilan                                                       |
| Architecture             | PASS                                                                         |
| API parity               | PASS, 221/221                                                                |
| History regressions      | PASS                                                                         |
| Deployable package       | PASS                                                                         |
| Pipeline self-check      | PASS                                                                         |
| Games integrity          | PASS, 20 assets                                                              |
| Vercel regression matrix | PASS                                                                         |

## Gate no certificable en este entorno

El pipeline completo llega a `domain-smoke` y falla al resolver `@date-fns/tz`. El contenedor usa Node **22.16.0**, el proyecto requiere Node **24.x** y no dispone de `node_modules` instalados. Por tanto no se declara como superado:

- `npm ci`
- domain-smoke completo
- format/lint/styles
- `tsc`/typecheck completo
- unit suite completa
- Next build
- E2E

Se registra como `S11-LIVE-012` y debe ejecutarse en CI/Vercel o un entorno Node 24 con dependencias.

## Validaciones LIVE específicas de Stage 11

- `S11-LIVE-001` aplicar migraciones en staging.
- `S11-LIVE-002` fichaje/correcciones en dos sesiones.
- `S11-LIVE-003` privacidad/SLA/evidencia.
- `S11-LIVE-004` campaña/UTM/atribución histórica.
- `S11-LIVE-005` consentimiento y revocación entre enqueue/claim.
- `S11-LIVE-006` proveedor externo del communication outbox.
- `S11-LIVE-007` matriz de permisos campañas/comunicaciones.
- `S11-LIVE-008` tareas persistentes/acciones rápidas; receta se revalida tras Stage 12.
- `S11-LIVE-009` Realtime con dos sesiones.
- `S11-LIVE-010` audit_log y cross-clinic deny.
- `S11-LIVE-011` revisión operativa/legal de privacidad y marketing.
- `S11-LIVE-012` Node 24 + suite completa.
