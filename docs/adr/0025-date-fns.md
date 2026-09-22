# ADR 0025 · date-fns

## Contexto
Denty necesita cálculos de fecha puros y testeables sin depender de la zona horaria del servidor o navegador.
El bug histórico de `toISOString().slice(0,10)` puede mostrar el día anterior en Madrid.

## Decisión
Usar `date-fns` 4.4.0, fijado sin rango, para operaciones de fecha en `domain/dates.ts`.

## Alternativas descartadas
- `Date` manual disperso: repetiría el bug y reglas distintas por módulo.
- Luxon/Day.js: añadirían otro modelo cuando el plan arquitectónico ya cerró date-fns.

## Consecuencias
Toda fecha de negocio pasa por `domain/dates.ts`; la UI no improvisa conversiones UTC/locales.
