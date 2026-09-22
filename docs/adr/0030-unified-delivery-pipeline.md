# ADR 0030 — Pipeline de entrega unificado por stages y DAG

**Estado:** aceptado — 2026-09-21

## Contexto

Vercel, `package.json` y GitHub Actions tenían secuencias parcialmente duplicadas. Los fallos históricos
incluyeron formato, peers, Stylelint, TypeScript, mezcla Vitest/Playwright y herencia de `NODE_ENV`.

## Decisión

Centralizar orden, entorno, timeouts y reintentos en `scripts/pipeline`. El catálogo es declarativo y el
runner usa un DAG validado. GitHub y Vercel solo invocan targets del runner.

## Alternativas descartadas

- framework interno de plugins/hooks: no hay consumidores externos;
- fluent builder de stages: los objetos literales son más legibles;
- paralelismo por defecto: la máquina Vercel actual tiene 2 cores y la contención puede empeorar tiempos.

## Consecuencias

Hay más código de infraestructura, compensado por una única fuente de verdad, reportes por stage, timeout,
retry selectivo de red y entornos de test/build explícitos. Los stages puros del grafo son testeables sin
levantar Next ni instalar navegadores.
