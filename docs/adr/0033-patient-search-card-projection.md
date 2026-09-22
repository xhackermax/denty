# ADR 0033 · Proyección enriquecida para el carrusel de pacientes

## Contexto

La búsqueda visual solicitada necesita foto, última visita y próxima visita. El DTO histórico
2.3.7 de paciente no incluía esos campos y obligar al navegador a consultar citas paciente por
paciente produciría un patrón N+1.

## Decisión

V3 admite tres campos **opcionales y retrocompatibles** en la proyección de paciente:

- `photoUrl`
- `lastVisitAt`
- `nextVisitAt`

El backend V3 podrá calcular las fechas al construir la lista de pacientes. Un backend 2.3.7
puede seguir devolviendo el DTO antiguo porque los campos son opcionales. La UI mantiene la
geometría de la tarjeta y muestra `xx/xx/xxxx` cuando no existe próxima visita.

No se añade un endpoint nuevo solo para tarjetas: la búsqueda de pacientes continúa usando
`GET /api/patients`.
