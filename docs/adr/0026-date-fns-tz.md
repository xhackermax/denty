# ADR 0026 · @date-fns/tz

## Contexto
La clínica opera en `Europe/Madrid` y debe comportarse bien en los cambios DST, incluida la hora duplicada de otoño.

## Decisión
Usar `@date-fns/tz` 1.5.0 con `TZDate` para fijar explícitamente `Europe/Madrid`.

## Alternativas descartadas
- Zona horaria del sistema: no es determinista entre Vercel, navegador y tests.
- Offsets fijos `+01/+02`: fallan al cruzar horario de verano.

## Consecuencias
Los tests cubren 2026-03-29 y 2026-10-25 y los ISO de negocio conservan offset explícito.
