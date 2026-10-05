# Denty — Stage 11 Handoff

**Fecha:** 2026-09-29  
**Etapa:** 11 — Personal, comunicaciones, campañas, privacidad y tareas  
**Estado:** `implemented_code_pending_live_gate`  
**Bloqueo:** `DO_NOT_REIMPLEMENT`

## Objetivo alcanzado

Stage 11 sustituye estado local/demo por persistencia canónica Supabase para fichajes, privacidad, campañas/atribución, comunicaciones/consentimientos/outbox y tareas. Las escrituras sensibles pasan por RPC/RLS/auditoría y las superficies reciben invalidación Realtime por clínica.

## Hallazgos originales de Stage 11

Los 8 hallazgos originales asignados están **implementados en código y pendientes únicamente de validación LIVE**:

- `DNT-STF-001` — fichajes persistentes append-only y correcciones auditadas.
- `DNT-STF-004` — solicitudes de privacidad persistentes con lifecycle/SLA/evidencia.
- `DNT-MKT-001` — campañas persistentes, UTM y permisos separados read/manage.
- `DNT-MKT-002` — comunicaciones sobre pacientes reales y estados persistentes.
- `DNT-MKT-003` — consentimiento/opt-out persistente por canal.
- `DNT-MKT-004` — outbox idempotente + worker reclamable concurrentemente.
- `DNT-TSK-001` — tareas persistentes y acciones rápidas conectadas a flujos reales.
- `DNT-PAT-013` — origen/campaña/UTM y atribución histórica conectados al alta del paciente.

## Implementación principal

### Personal y fichaje

- `attendance_punches` es append-only.
- Entrada/salida se persisten en Supabase.
- Una corrección administrativa genera un nuevo evento enlazado al original, no reescribe el histórico.
- Auditoría, aislamiento de clínica y Realtime quedan en la misma arquitectura usada por etapas previas.

### Privacidad

- `privacy_requests` persiste tipo, estado, paciente, responsable, fechas, SLA, versión y documento de resolución.
- El flujo permite crear, asignar, completar/rechazar y conservar evidencia.
- La API transporta `resolution_document_id`, que antes podía quedar perdido entre DB y UI.

### Campañas y atribución

- `marketing_campaigns` sustituye constantes/useState.
- `marketing.read` permite consultar y `marketing.manage` controla mutaciones.
- El alta de paciente acepta `declared_campaign_id` en la **misma inserción**.
- Un trigger crea el touchpoint declarado y hereda los UTM de la campaña.
- First/last touch se conserva como resumen, pero las conversiones históricas se atribuyen al touchpoint vigente en el momento de firma/factura/pago, evitando reatribución retroactiva.

### Comunicaciones y consentimiento

- `communication_messages`, `communication_consents` y `communication_outbox` son persistentes.
- Marketing exige consentimiento al encolar y **vuelve a comprobarlo en el momento de claim**.
- Si el paciente revoca después del enqueue, el mensaje se cancela antes de llegar al proveedor.
- El worker usa `FOR UPDATE SKIP LOCKED`, idempotency key y retry/backoff.
- El proveedor concreto queda como configuración LIVE mediante `DENTY_COMMUNICATION_PROVIDER_URL` y `DENTY_COMMUNICATION_PROVIDER_TOKEN`.

### Tareas

- `tasks` persiste estado, prioridad, vencimiento, paciente, responsable y enlaces de origen.
- Acciones rápidas navegan a Pacientes, Agenda, Finanzas, Laboratorio y Recetas reales.
- La rama Recetas debe revalidarse tras Stage 12 porque la persistencia Supabase de recetas pertenece a `DNT-RX-001/002`.

## Hallazgos adicionales descubiertos y corregidos

1. `S11-FIND-001` — revocación posterior al enqueue podía llegar al proveedor. Corregido con revalidación en claim.
2. `S11-FIND-002` — ROI podía cambiar históricamente al cambiar last-touch. Corregido con atribución temporal de conversiones.
3. `S11-FIND-003` — `marketing.read` mostraba botones de mutación. Ahora exige `marketing.manage`.
4. `S11-FIND-004` — documento de resolución de privacidad no viajaba por API. Corregido.
5. `S11-FIND-005` — query keys manuales rompían el contrato Stage 3. Centralizadas en `dentyQueryKeys`.
6. `S11-FIND-006` — campaña seleccionada no heredaba UTM defaults. Corregido en PostgreSQL.
7. `S11-FIND-007` — PATCH genérico de campaña omitía Zod. Añadido schema explícito.
8. `S11-FIND-008` — UI comprimida rompía architecture gate por líneas excesivas. Remaquetada.
9. `S11-FIND-009` — nuevas rutas no figuraban en manifests de paridad. Reconciliado a 221/221.
10. `S11-FIND-010` — alta paciente→campaña dependía de una segunda petición y podía perder atribución. Convertida en operación atómica.

## Verificación ejecutada

- Stage 11 contracts: **11/11 PASS**.
- Stage contracts 1→11: **54/54 PASS**; cuatro tests runtime heredados requieren `--experimental-strip-types` bajo Node 22.
- TypeScript/TSX tocados: **21/21 transpilan**.
- Architecture: **PASS**.
- API parity: **221/221 PASS**.
- History regressions: **PASS**.
- Deployable package: **PASS**.
- Pipeline self-check: **PASS**.
- Games integrity: **20 assets PASS**.
- Vercel regression matrix: **PASS**.
- Pipeline completo avanza hasta `domain-smoke`; se bloquea por entorno sin `node_modules/@date-fns/tz` y Node 22.16.0. Esto es `S11-LIVE-012`, no un gate declarado como superado.

## Estado del inventario tras Stage 11

- `RESOLVED_IN_CODE`: **44**
- `IMPLEMENTED_PENDING_LIVE_VALIDATION`: **43**
- `PENDING_IMPLEMENTATION`: **4**
- Total abordado en código: **87/91**
- Tareas LIVE/operativas registradas: **92**
- LIVE pendientes: **91**

Los cuatro hallazgos originales todavía pendientes pertenecen a Stage 12: `DNT-RX-001`, `DNT-RX-002`, `DNT-TSK-002`, `DNT-TSK-003`.

## Regla de continuación

- **No reimplementar Stages 1–11.**
- Ejecutar sus `S*-LIVE-*` como validación, no como rediseño.
- Continuar funcionalmente por **Stage 12 — Portal del paciente, recetas y Oye Denty**.
