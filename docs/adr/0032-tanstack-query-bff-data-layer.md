# ADR 0032 · TanStack Query + BFF same-origin para datos interactivos

## Contexto

Denty V3 ya tiene un cliente REST tipado, pero las pantallas interactivas necesitan caché,
invalidación y estado de mutación compartido. Exponer `DENTY_API_URL` al navegador también
complicaría las cookies httpOnly y permitiría llamadas fuera del contrato conocido.

## Decisión

- Fijar `@tanstack/react-query` en `5.103.1`.
- Usar un único `QueryClientProvider` en `app/providers.tsx`.
- Reintentar solo un fallo de red; errores clínicos, 4xx y conflictos no se reintentan.
- El navegador usa `/api/denty` como BFF same-origin.
- El BFF solo permite método+ruta presentes en el manifiesto verificado de Denty 2.3.7.
- Rutas de health, demo y webhooks entrantes permanecen fuera del cliente web.
- Si `DENTY_API_URL` no existe, se devuelve `API_NOT_CONFIGURED`; no hay fallback clínico.

## Alternativas descartadas

- Fetches dispersos por componente: duplican caché, errores e invalidación.
- `NEXT_PUBLIC_DENTY_API_URL`: expone topología y complica cookies entre orígenes.
- Persistir el cache de Query en localStorage: prohibido para datos clínicos.
