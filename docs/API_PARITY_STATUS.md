# Paridad de API · Denty 2.3.7 → V3

## Estado actual

La auditoría combina el `API_CONTRACT.md` histórico con las rutas registradas
dinámicamente en el source 2.3.7.

- **197** rutas HTTP verificadas en total.
- **193** contratos destinados a navegador representados en `shared/api`.
- **4** rutas deliberadamente excluidas del navegador por ser infraestructura servidor.
- **1** bug histórico corregido de forma explícita: `schedule-plan-item`.

El gate `scripts/verify-api-parity.mjs` compara el manifiesto histórico con los recursos
actuales en cada preflight. El gate `scripts/verify-bff-policy.ts` comprueba además que
el proxy same-origin no exponga rutas desconocidas ni webhooks entrantes.

## Rutas solo servidor

Estas rutas forman parte del backend 2.3.7 pero no deben ser invocables desde el cliente:

- `GET /health`
- `GET /health/db`
- `GET /api/clinic/demo`
- `POST /api/payments/provider-webhook`

## Diferencia intencionada

El backend 2.3.7 registra:

`POST /api/agenda/schedule-plan-item`

pero el handler intenta leer `request.params.planItemId` aunque la URL no declara ese
parámetro. V3 conserva la intención funcional con:

`POST /api/agenda/schedule-plan-item/:planItemId`

Esto se considera corrección de un bug legacy, no regresión de comportamiento.

## Rutas dinámicas recuperadas

El contrato antiguo no enumeraba estas cuatro rutas porque se registraban dentro del
objeto `statusActions`:

- `POST /api/appointments/:id/arrive`
- `POST /api/appointments/:id/chair`
- `POST /api/appointments/:id/no-show`
- `POST /api/appointments/:id/complete`

El manifiesto V3 sí las incluye para evitar perderlas en futuras migraciones.
