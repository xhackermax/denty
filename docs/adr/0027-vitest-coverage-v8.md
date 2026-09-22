# ADR 0027 · @vitest/coverage-v8

## Contexto
F3 exige demostrar ≥90 % de cobertura en `src/domain`, no solo contar tests existentes.

## Decisión
Usar `@vitest/coverage-v8` 5.0.1, exactamente alineado con Vitest 5.0.1.
La cobertura se limita a `src/domain` y fija umbrales del 90 %.

## Alternativas descartadas
- Cobertura global de toda la aplicación: mezclaría F2/UI con el Definition of Done específico de F3.
- No medir cobertura: impediría demostrar la puerta de salida del prompt maestro.

## Consecuencias
`npm run test:domain:coverage` es la evidencia formal de F3; `verify` sigue ejecutando los tests normales.
