# Denty — Handoff Etapa 7: Agenda, recepción, no-show y sala de espera

**Fecha:** 2026-09-28  
**Base:** Etapa 6.1 — motor de dentición real  
**Estado:** `IMPLEMENTED_CODE_PENDING_LIVE_GATE`  
**Bloqueo:** `DO_NOT_REIMPLEMENT`

## Objetivo cerrado en código

Stage 7 convierte la agenda en un límite transaccional Supabase compartido por recepción, profesionales, personal y portal. La UI deja de depender de estado local o de rutas externas para las operaciones principales de agenda.

## 9 hallazgos originales abordados

| ID | Estado | Implementación |
|---|---|---|
| DNT-AGD-001 | IMPLEMENTED_PENDING_LIVE_VALIDATION | `AgendaRepository` + rutas Supabase locales para citas/agenda. |
| DNT-AGD-002 | IMPLEMENTED_PENDING_LIVE_VALIDATION | exclusion constraints por profesional/sillón + advisory locks + control transaccional contra bloqueos y ausencias. |
| DNT-AGD-003 | IMPLEMENTED_PENDING_LIVE_VALIDATION | State machine transaccional con `ARRIVED`, `WAITING`, `IN_CHAIR`, `COMPLETED`, `NO_SHOW`, `RUNNING_LATE`, timestamps y eventos. |
| DNT-AGD-004 | IMPLEMENTED_PENDING_LIVE_VALIDATION | Broadcast privado `clinic:<id>` desde cambios canónicos de cita/estado. |
| DNT-AGD-005 | IMPLEMENTED_PENDING_LIVE_VALIDATION | `clinic_settings`/`staff_settings` persistentes para separación entre visitas. |
| DNT-AGD-006 | IMPLEMENTED_PENDING_LIVE_VALIDATION | No-show idempotente → recall + notification + outbox; reagendado vinculado a la cita origen. |
| DNT-AGD-007 | IMPLEMENTED_PENDING_LIVE_VALIDATION | RPC `analytics_wait_times` y KPIs consumidos por Análisis. |
| DNT-STF-002 | IMPLEMENTED_PENDING_LIVE_VALIDATION | `staff_absences` + `staff_schedules`, RPC de alta/cancelación y bloqueo de disponibilidad. |
| DNT-PRT-002 | IMPLEMENTED_PENDING_LIVE_VALIDATION | Lista de espera persistente con alta, retirada y cumplimiento controlado. |

## Cambios principales

### 1. Reserva transaccional

- `book_appointment` y `update_appointment` son el límite de escritura de citas.
- Las escrituras directas de `appointments` se revocan al cliente autenticado.
- PostgreSQL impide solapes activos del mismo profesional o gabinete mediante `EXCLUDE USING gist` + `tstzrange(..., '[)')`.
- Los advisory locks serializan la mutación corta de recursos para evitar carreras cita ↔ ausencia ↔ bloqueo.
- `appointment_blocks` también pasa por `create_agenda_block`; una cita no puede atravesar un bloqueo y un bloqueo no puede crearse sobre una cita activa.

### 2. Recepción y sala de espera

Flujo soportado:

`PLANNED/CONFIRMED → ARRIVED → WAITING → IN_CHAIR → COMPLETED`

También se soportan `RUNNING_LATE`, `NO_SHOW` y `CANCELLED` con validación de transición, versionado optimista, timestamps y `appointment_status_events`.

### 3. Realtime

- Broadcast privado por clínica: `clinic:<clinicId>`.
- Cambios de `appointments`, `appointment_status_events`, ausencias, lista de espera, solicitudes de cita y settings invalidan las queries canónicas.
- Se conserva el bridge Realtime de Stage 3 como única vía de invalidación, sin crear otro sistema paralelo.

### 4. No-show y reagendado

- `NO_SHOW` crea un recall único por `(source_appointment_id, kind)`.
- Genera notificación interna y evento idempotente de outbox `agenda.no_show`.
- Una cita de sustitución acepta `rescheduledFromId`.
- Se registra `appointment_relationships(... reason='NO_SHOW')` y el recall pasa a `booked`.

### 5. Ausencias

- Modelo canónico `staff_absences` y `staff_schedules`.
- Crear una ausencia usa el mismo lock del profesional que una reserva.
- La disponibilidad descarta ausencias aprobadas.
- La UI de Personal permite crear y cancelar ausencias persistentes.

### 6. Lista de espera del paciente

- `patient_waitlist_requests` sustituye el boolean local.
- El paciente puede crear una solicitud con prioridad neutral y retirarla.
- No puede autoelevar prioridad ni marcarla como cumplida mediante REST directo.
- Recepción puede cumplir una solicitud y asociarla a una cita válida mediante RPC controlada.

### 7. Preferencias y métricas

- `clinic_settings` + `staff_settings` conservan `default_plan_visit_gap_days` entre dispositivos.
- `analytics_wait_times` calcula espera media, tiempo de sillón, puntualidad y retraso de llegada desde timestamps canónicos.
- La pantalla Análisis consume esa RPC y usa `dentyQueryKeys.analytics.waitTimes(...)`.

### 8. Solicitudes de cita del portal

- `appointment_requests` deja de depender de UPDATE directo del paciente.
- El paciente puede crear o cancelar su solicitud mediante RPC autorizada.
- Solo staff puede programarla; `schedule_appointment_request` reutiliza `book_appointment` y enlaza la cita resultante.
- Broadcast privado actualiza agenda/portal cuando cambia la solicitud.

## Hallazgos adicionales detectados y cerrados durante Stage 7

1. **RPCs inaccesibles tras revocar DML directo.** Las mutaciones críticas quedaron como `SECURITY DEFINER` con autorización explícita de clínica/rol y `search_path=''`.
2. **Carrera cita ↔ bloqueo.** La exclusion constraint cita↔cita no cubría otra tabla; se añadió `assert_not_blocked` + `create_agenda_block` transaccional.
3. **Escalada de estado en lista de espera.** Se retiró UPDATE/DELETE directo y se añadieron RPC de retirada/cumplimiento con comprobación de propietario/staff.
4. **Regresión de fuente única de query keys.** Los nuevos KPIs/ausencias usan `dentyQueryKeys` central.
5. **Estilo inline introducido por Personal.** Movido a CSS module para conservar el gate arquitectónico.
6. **Manifiesto de paridad desactualizado.** Las rutas nuevas quedaron registradas; gate actual 208/208.
7. **Referencias cross-clinic dentro de RPC `SECURITY DEFINER`.** Alta/edición de cita y alta de ausencia revalidan paciente, profesional, sede, gabinete y plan contra la misma clínica antes de escribir.
8. **Tablas Stage 7 con varias FKs independientes.** `staff_settings`, `staff_schedules`, `patient_waitlist_requests` y `appointment_requests` tienen trigger de integridad tenant para impedir asociaciones entre clínicas incluso ante futuras rutas.
9. **Contrato TypeScript incompleto de reagendado.** `createAppointmentSchema` ya declara `rescheduledFromId`; repositorio y respuesta conservan `rescheduled_from_id` sin romper typecheck futuro.
10. **Escalada de estado en solicitudes de cita.** Se revocó DML directo sobre `appointment_requests`; crear/cancelar/programar pasa por RPC con autorización explícita y programación reutiliza la reserva transaccional.

## Gates ejecutados en este entorno

- Stage 1 auth: PASS.
- Stage 2 security/RPC: PASS.
- Stage 3 single source: PASS.
- Stage 4 patient lifecycle: PASS.
- Stage 5 storage/documents: PASS.
- Stage 6 clinical/dentition: PASS.
- Stage 7 agenda contracts: PASS.
- Architecture gate: PASS.
- API parity: **208/208 PASS**; 3 server-only excluidas.
- Pipeline self-check: PASS.
- Agenda empty-slot regression: PASS usando `--experimental-strip-types` por Node 22.
- Transpilación sintáctica de los 16 TS/TSX modificados: **16/16 PASS**.

## Validaciones LIVE pendientes de Stage 7

- `S7-LIVE-001`: aplicar migración Stage 7 en Supabase staging tras revisar solapes/duplicados legacy que puedan bloquear constraints.
- `S7-LIVE-002`: prueba concurrente real de doble reserva y carrera cita↔bloqueo; exactamente una operación incompatible debe confirmar.
- `S7-LIVE-003`: dos sesiones reales deben ver `ARRIVED → WAITING → IN_CHAIR` por Broadcast sin recarga.
- `S7-LIVE-004`: probar carrera ausencia↔reserva y verificar disponibilidad inmediata.
- `S7-LIVE-005`: validar no-show, recall, notification, outbox y reagendado idempotente extremo a extremo.
- `S7-LIVE-006`: probar lista de espera con cuenta paciente y cuenta staff, incluido intento de escalada de prioridad/estado.
- `S7-LIVE-007`: validar `analytics_wait_times` contra fixtures SQL conocidos.
- `S7-LIVE-008`: en Node 24 con dependencias: `npm ci`, typecheck, test, build y E2E Stage 7.
- `S7-LIVE-009`: validar ciclo real de solicitud de cita del portal y matriz cross-clinic, incluido rechazo de auto-programación y referencias de otra clínica.

## Limitaciones de verificación del contenedor

Este entorno usa **Node 22.16.0** y el proyecto exige **Node 24.x**. Además no contiene `node_modules`. Se intentó instalar Node 24, pero el contenedor no dispone de resolución de red hacia `nodejs.org`. Por ello no se certifican aquí `npm run typecheck`, la suite Vitest/Playwright completa ni `npm run build`. Esas comprobaciones permanecen explícitamente en `S7-LIVE-008`.

## Continuidad

- No reimplementar Etapas 1–7 salvo fallo reproducible de sus gates o de una validación LIVE.
- Siguiente etapa funcional: **Etapa 8 — Facturación, pagos y fiscal**.
