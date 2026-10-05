# Stage 10 — Handoff: Laboratorios y alertas conectadas

**Fecha:** 2026-09-28  
**Estado:** `implemented_code_pending_live_gate`  
**Implementation lock:** `DO_NOT_REIMPLEMENT`  
**Base:** Stage 9 — dashboard/analytics

## Resultado

Stage 10 sustituye los subsistemas de laboratorio y alertas que aún dependían de datos derivados, estado local o rutas sin implementación Supabase por un modelo persistente, multi-clínica, auditado y conectado con el pipeline clínico/financiero.

## Implementado

- Maestro `laboratories` con CRUD, versionado, activo/inactivo, RLS, auditoría y Realtime.
- `lab_works` persistente con timeline de estados, reworks, paciente, item de plan, cita, sede y entidad dental.
- Navegación plan → laboratorio y laboratorio → plan/cita/paciente.
- Adjuntos privados en Storage `lab-attachments` con metadata y SHA-256; no se envían bytes base64 por JSON.
- Ledger de proveedor: `supplier_invoices`, items, payments y allocations.
- Idempotencia concurrente en pagos de proveedor y límites de sobreasignación.
- Permisos clínicos de laboratorio separados de permisos financieros.
- Ledger `alerts` persistente con list/review/resolve/snooze/assign, dedupe, RLS, auditoría y Broadcast.
- Alertas derivadas de laboratorio por incidencia, retraso y riesgo cita/ETA.
- Refresco de alertas idempotente: lecturas repetidas no generan auditoría/Broadcast fantasma.
- Recurrencia real de alertas mediante `condition_active`.
- Inicio respeta `alerts.read` y comparte el mismo ledger que el módulo Alertas.
- Coste externo de laboratorio incorporado al margen `DENTY-KPI-1`: provisional hasta factura real y sustituido por coste real sin doble conteo.
- Baseline heredado de Denty Games reconciliado: se actualizaron hashes del manifiesto, no assets.
- `.env.example` completado con variables Supabase requeridas por el wiring de servidor.

## Corrección histórica importante

`DNT-ALT-001` y `DNT-ALT-002` estaban marcados como resueltos desde Stage 3, pero Stage 10 demostró que el cierre era incompleto: faltaba el backend Supabase canónico de alertas y `/api/admin/alerts` podía terminar en `501`. Se reabrieron de forma explícita y se implementaron de verdad en Stage 10. Por eso pasan a `IMPLEMENTED_PENDING_LIVE_VALIDATION`, no a `RESOLVED_IN_CODE`.

## Migraciones Stage 10

- `supabase/migrations/20260928100000_stage10_laboratories_supplier_ledger.sql`
- `supabase/migrations/20260928101000_stage10_alerts_connected.sql`
- `supabase/migrations/20260928102000_stage10_analytics_lab_costs.sql`

## Hallazgos originales asignados

Los 9 están implementados en código y pendientes únicamente de validación LIVE:

- [x] **DNT-LAB-001 — No existe maestro de laboratorios en Supabase** → `IMPLEMENTED_PENDING_LIVE_VALIDATION`
- [x] **DNT-LAB-002 — No existe tabla lab_works aunque la API y UI la usan** → `IMPLEMENTED_PENDING_LIVE_VALIDATION`
- [x] **DNT-LAB-003 — Pestaña Laboratorios no ofrece CRUD real** → `IMPLEMENTED_PENDING_LIVE_VALIDATION`
- [x] **DNT-LAB-004 — Balances reales están incompletos y pagos de laboratorio son demo** → `IMPLEMENTED_PENDING_LIVE_VALIDATION`
- [x] **DNT-LAB-005 — Suppliers analytics se usa como fuente de laboratorios** → `IMPLEMENTED_PENDING_LIVE_VALIDATION`
- [x] **DNT-LAB-006 — Adjuntos se convierten a base64 y se envían por JSON** → `IMPLEMENTED_PENDING_LIVE_VALIDATION`
- [x] **DNT-LAB-007 — Trabajo de laboratorio no tiene vínculo DB garantizado con plan/cita/prótesis** → `IMPLEMENTED_PENDING_LIVE_VALIDATION`
- [x] **DNT-ALT-001 — Alertas solo viven en useState demo** → `IMPLEMENTED_PENDING_LIVE_VALIDATION`
- [x] **DNT-ALT-002 — Inicio cuenta una lista distinta de la que se resuelve en Alertas** → `IMPLEMENTED_PENDING_LIVE_VALIDATION`

## Hallazgos adicionales cerrados durante Stage 10

- [x] S10-FIND-001 Supplier finance required lab.* + finance.* at RLS/RPC/API.
- [x] S10-FIND-002 CANCELLED lab works cannot be revived by rework.
- [x] S10-FIND-003 Generic application/octet-stream is accepted only for .stl.
- [x] S10-FIND-004 Lab plan-item validation originally referenced nonexistent clinical_plan_items.patient_id; corrected through clinical_plans.
- [x] S10-FIND-005 DNT-ALT-001/002 were false closures: Supabase alerts routes/table were absent and could return 501; canonical alerts ledger added.
- [x] S10-FIND-006 Derived alert refresh initially churned version/audit/Realtime on unchanged reads; UPSERT/clear logic made idempotent.
- [x] S10-FIND-007 Dashboard queried alerts for actors without alerts.read; query/card now permission-gated.
- [x] S10-FIND-008 Supplier payment idempotency was race-prone and supplier invoice number could be blank; advisory serialization and DB validation added.
- [x] S10-FIND-009 Manually resolved derived alerts could suppress a later recurrence forever; condition_active now distinguishes clear vs recurrence.
- [x] S10-FIND-010 DENTY-KPI-1 margin omitted attributable external lab cost; Stage 10 adds provisional/actual lab cost attribution without mutating production history.
- [x] S10-INHERITED-001 Games integrity manifest had three stale hashes unchanged since Stage 5; baseline hashes reconciled, game assets untouched.
- [x] S10-INHERITED-002 .env.example omitted documented Supabase service-role/anon variables used by server wiring; example completed.

## Pendientes técnicos que no justifican reabrir Stage 10

- [ ] S10-PEND-001 Residual S9-PEND-002: purchases/suppliers/supplier-invoices are now canonical, but legacy cost-recipes still has no defined Stage 10 semantic and remains for cleanup rather than inventing a metric.
- [ ] S9-PEND-001 Legacy unused analytics comparison/losses/events/treatments-drilldown still need retirement or explicit semantics.
- [ ] S9-PEND-003 PARTIALLY_REFUNDED still lacks an explicit refund-amount ledger.

## Estado del roadmap tras Stage 10

- `RESOLVED_IN_CODE`: **44**
- `IMPLEMENTED_PENDING_LIVE_VALIDATION`: **35**
- `PENDING_IMPLEMENTATION`: **12**
- **79/91** hallazgos originales abordados en código.
- **12/91** quedan para implementación funcional en Stage 11–12.
- **80** tareas LIVE/operativas registradas hasta Stage 10: **79 pendientes**, **1 completada/absorbida**.
- Siguiente implementación funcional: **Stage 11**.

## Regla de continuidad

No reimplementar Stage 1–10. Las tareas `S10-LIVE-*` son validaciones sobre Supabase/Node 24/entorno real. Si una validación LIVE falla, primero registrar el fallo reproducible y corregir la mínima causa; no reconstruir el módulo completo.
