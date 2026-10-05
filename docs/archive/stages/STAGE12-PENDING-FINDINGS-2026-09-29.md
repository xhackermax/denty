# Denty — Hallazgos y validaciones pendientes tras Stage 12

Procedimientos y evidencias: [inventario JSON](../../../DENTY-INVENTARIO-MAESTRO-TOTAL-2026-09-28.json). Este informe conserva el estado de su fecha.

**Fecha:** 2026-09-29

Este documento separa deliberadamente **desarrollo pendiente** de **validación LIVE**. Una tarea LIVE no autoriza a reimplementar una etapa cerrada.

## 1. Hallazgos originales todavía pendientes de implementación

Quedan **0/91** hallazgos originales por programar. Los cuatro que quedaban tras Stage 11 (`DNT-RX-001`, `DNT-RX-002`, `DNT-TSK-002`, `DNT-TSK-003`) están implementados en código y pasan a `IMPLEMENTED_PENDING_LIVE_VALIDATION`.

## 2. Validaciones LIVE/operativas pendientes

Hay **100** tareas LIVE pendientes acumuladas de Stages 1–12. Se conservan todas para evitar falsos cierres.

### Stage 1

- [ ] **S1-LIVE-001 — Respaldar y aplicar la migración Stage 1 primero en staging**
- [ ] **S1-LIVE-002 — Migrar/invitar usuarios legacy antes del corte definitivo**
- [ ] **S1-LIVE-003 — Enlazar staff existentes con profiles**
- [ ] **S1-LIVE-004 — Configurar Supabase Auth URLs y plantillas de email**
- [ ] **S1-LIVE-005 — Completar recuperación de contraseña SSR/PKCE**
- [ ] **S1-LIVE-006 — Verificar aislamiento real entre dos clínicas**
- [ ] **S1-LIVE-007 — Verificar login real de staff y paciente**
- [ ] **S1-LIVE-008 — Validar revocación de sesiones en Supabase real**
- [ ] **S1-LIVE-009 — Ejecutar build/typecheck/test completos bajo Node 24**

### Stage 2

- [ ] **S2-LIVE-001 — Aplicar Stage 1 y Stage 2 en Supabase staging**
- [ ] **S2-LIVE-002 — Ejecutar matriz RLS con dos clínicas y cinco roles**
- [ ] **S2-LIVE-003 — Probar rollback transaccional real**
- [ ] **S2-LIVE-004 — Validar audit_log en la misma transacción**
- [ ] **S2-LIVE-005 — Revisar duplicados legacy y validar constraints NOT VALID**
- [ ] **S2-LIVE-006 — Ejecutar suite completa bajo Node 24**

### Stage 3

- [ ] **S3-LIVE-001 — Aplicar migración Realtime Stage 3 en Supabase staging**
- [ ] **S3-LIVE-002 — Probar Broadcast privado entre dos sesiones reales**
- [ ] **S3-LIVE-003 — Probar cambio real de sede**
- [ ] **S3-LIVE-004 — Ejecutar build/typecheck/test completos en Node 24**

### Stage 4

- [ ] **S4-LIVE-001 — Aplicar migración Stage 4 en Supabase staging**
- [ ] **S4-LIVE-002 — Verificar conversión histórica de birth_date**
- [ ] **S4-LIVE-003 — Auditar record_number legacy antes de producción**
- [ ] **S4-LIVE-004 — Probar archive/restore con expediente real completo**
- [ ] **S4-LIVE-005 — Comprobar rechazo de DELETE duro y cascadas**
- [ ] **S4-LIVE-006 — Validar importación con exportaciones reales de clínica**
- [ ] **S4-LIVE-007 — Ejecutar suite completa bajo Node 24**

### Stage 5

- [ ] **S5-LIVE-001 — Aplicar migración Stage 5 en Supabase staging**
- [ ] **S5-LIVE-002 — Probar aislamiento Storage entre dos clínicas con JWT reales**
- [ ] **S5-LIVE-003 — Validar cámara y fallback en navegadores reales**
- [ ] **S5-LIVE-004 — Verificar documentos/versiones con bytes reales**
- [ ] **S5-LIVE-005 — Conectar estado real de Supabase Managed Backups/PITR**
- [ ] **S5-LIVE-006 — Definir retención/backup operativo de objetos Storage**
- [ ] **S5-LIVE-007 — Ejecutar suite completa bajo Node 24**

### Stage 6

- [ ] **S6-LIVE-001 — Aplicar migración Stage 6 en Supabase staging**
- [ ] **S6-LIVE-002 — Validar concurrencia e historial de odontograma/periodoncia**
- [ ] **S6-LIVE-003 — Validar catálogo clínico y snapshots históricos**
- [ ] **S6-LIVE-004 — Ejecutar E2E de consentimientos y firma de presupuesto**
- [ ] **S6-LIVE-005 — Verificar ledger clínico y audit_log con actor real**
- [ ] **S6-LIVE-006 — Ejecutar suite completa y build bajo Node 24**
- [ ] **S6-LIVE-007 — E2E visual temporal/mixta/supernumerarios**
- [ ] **S6-LIVE-008 — Validación clínica de semántica ISO 10394**

### Stage 7

- [ ] **S7-LIVE-001 — Aplicar migración Stage 7 en Supabase staging**
- [ ] **S7-LIVE-002 — Validar concurrencia de reservas y bloqueos**
- [ ] **S7-LIVE-003 — Validar Broadcast de recepción**
- [ ] **S7-LIVE-004 — Validar carrera ausencia↔reserva**
- [ ] **S7-LIVE-005 — Validar no-show, outbox y reagendado**
- [ ] **S7-LIVE-006 — Validar lista de espera y privilegios**
- [ ] **S7-LIVE-007 — Validar métricas operativas**
- [ ] **S7-LIVE-008 — Ejecutar suite completa y build bajo Node 24**
- [ ] **S7-LIVE-009 — Validar solicitudes de cita del portal y aislamiento cross-clinic**

### Stage 8

- [ ] **S8-LIVE-001 — Aplicar migración Stage 8 en Supabase staging**
- [ ] **S8-LIVE-002 — Validar emisión concurrente y cadena fiscal**
- [ ] **S8-LIVE-003 — E2E real de cobros manual, SumUp y Stripe**
- [ ] **S8-LIVE-004 — Validar reconciliación tras fallo de red o callback repetido**
- [ ] **S8-LIVE-005 — Validar matriz RLS y permisos financieros**
- [ ] **S8-LIVE-006 — Validar Realtime financiero con dos sesiones**
- [ ] **S8-LIVE-007 — Validar integración fiscal/VERI\*FACTU real**
- [ ] **S8-LIVE-008 — Revisión fiscal y contable con asesoría**
- [ ] **S8-LIVE-009 — Ejecutar Node 24, typecheck, tests, build y E2E**

### Stage 9

- [ ] **S9-LIVE-001 — Aplicar migración Stage 9 en Supabase staging**
- [ ] **S9-LIVE-002 — Validar paridad de KPIs entre Inicio, Finanzas y Análisis**
- [ ] **S9-LIVE-003 — Validar periodos Mes/Trimestre/Año y DST Madrid**
- [ ] **S9-LIVE-004 — Validar rectificativas, allocations y pendiente neto**
- [ ] **S9-LIVE-005 — Validar reconocimiento de producción y snapshots históricos**
- [ ] **S9-LIVE-006 — Validar atribución por sede y profesional**
- [ ] **S9-LIVE-007 — Validar rendimiento SQL Analytics**
- [ ] **S9-LIVE-008 — Validar Realtime KPI entre dos sesiones**
- [ ] **S9-LIVE-009 — Ejecutar Node 24, typecheck, tests, build y E2E**

### Stage 10

- [ ] **S10-LIVE-001 — Aplicar migraciones Stage 10 en Supabase staging**
- [ ] **S10-LIVE-002 — Validar CRUD y aislamiento de laboratorios**
- [ ] **S10-LIVE-003 — Validar ciclo de trabajo, timeline y reworks**
- [ ] **S10-LIVE-004 — Validar Storage privado de laboratorio**
- [ ] **S10-LIVE-005 — Validar ledger de proveedor e idempotencia**
- [ ] **S10-LIVE-006 — Validar pipeline plan→laboratorio→cita**
- [ ] **S10-LIVE-007 — Validar alertas persistentes y Realtime**
- [ ] **S10-LIVE-008 — Validar margen con coste externo de laboratorio**
- [ ] **S10-LIVE-009 — Validar permisos lab/finance/alerts**
- [ ] **S10-LIVE-010 — Validar auditoría y Broadcast de tablas Stage 10**
- [ ] **S10-LIVE-011 — Ejecutar Node 24, dependencias, typecheck, unit, build y E2E**

### Stage 11

- [ ] **S11-LIVE-001 — Aplicar migraciones Stage 11 en Supabase staging**
- [ ] **S11-LIVE-002 — Validar fichaje y correcciones con dos sesiones**
- [ ] **S11-LIVE-003 — Validar workflow de privacidad y SLA**
- [ ] **S11-LIVE-004 — Validar campaña, origen y atribución histórica**
- [ ] **S11-LIVE-005 — Validar consentimiento y opt-out multicanal**
- [ ] **S11-LIVE-006 — Configurar proveedor externo del communication outbox**
- [ ] **S11-LIVE-007 — Validar permisos de campañas y comunicaciones**
- [ ] **S11-LIVE-008 — Validar tareas persistentes y acciones rápidas**
- [ ] **S11-LIVE-009 — Validar Realtime Stage 11 entre dos sesiones**
- [ ] **S11-LIVE-010 — Validar audit_log y aislamiento cross-clinic**
- [ ] **S11-LIVE-011 — Revisión operativa de privacidad y marketing**
- [ ] **S11-LIVE-012 — Ejecutar Node 24, dependencias, typecheck, lint, build y E2E**

### Stage 12

- [ ] **S12-LIVE-001 — Aplicar migración Stage 12 en Supabase staging**
- [ ] **S12-LIVE-002 — Validar lifecycle completo de receta y persistencia tras reload**
- [ ] **S12-LIVE-003 — Validar evidencia de firma privada e inmutable**
- [ ] **S12-LIVE-004 — Validar recetas en portal del paciente con RLS real**
- [ ] **S12-LIVE-005 — Validar capability gate de Oye Denty**
- [ ] **S12-LIVE-006 — Validar equivalencia UI↔voz y ausencia de escrituras parciales**
- [ ] **S12-LIVE-007 — Validar permisos de recetas por rol**
- [ ] **S12-LIVE-008 — Ejecutar Node 24, dependencias, typecheck, lint, build y E2E**
- [ ] **S12-LIVE-009 — Revisión clínica/legal e integración externa de receta electrónica**

## 3. Pendientes técnicos/operativos detectados en Stage 12

- [ ] La migración/RLS/Storage/RPCs Stage 12 necesitan validación contra Supabase real (`S12-LIVE-001…007`).
- [ ] La suite completa requiere Node 24.x y dependencias instaladas (`S12-LIVE-008`).
- [ ] La persistencia interna de receta no certifica por sí sola interoperabilidad o cumplimiento de un proveedor externo de receta electrónica (`S12-LIVE-009`).

## 4. Regla de handoff

- Stages **1–12**: `DO_NOT_REIMPLEMENT`.
- Las tareas LIVE son validaciones de lo ya implementado.
- La siguiente fase es **Stage 13 — Gate final de integración**.
