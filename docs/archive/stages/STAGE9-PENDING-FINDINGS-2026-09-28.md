# Stage 9 — Recopilación única de hallazgos pendientes

Procedimientos y evidencias: [inventario JSON](../../../DENTY-INVENTARIO-MAESTRO-TOTAL-2026-09-28.json). Este informe conserva el estado de su fecha.

> Fuente de continuidad tras Stage 9. Etapas 1–9 están bloqueadas como `DO_NOT_REIMPLEMENT`; sus tareas LIVE son validación/despliegue, no autorización para rehacerlas.

## Reconciliación

- Hallazgos originales pendientes de implementación: **19**.
- Validaciones LIVE/operativas pendientes: **68**.
- Hallazgos técnicos Stage 9 pendientes: **4**.
- Hallazgo heredado de verificación: **1**.

## A. Hallazgos originales todavía pendientes

- [ ] **DNT-LAB-001** — No existe maestro de laboratorios en Supabase (P0_CRITICAL)
- [ ] **DNT-LAB-002** — No existe tabla lab_works aunque la API y UI la usan (P0_CRITICAL)
- [ ] **DNT-LAB-003** — Pestaña Laboratorios no ofrece CRUD real (P1_HIGH)
- [ ] **DNT-LAB-004** — Balances reales están incompletos y pagos de laboratorio son demo (P1_HIGH)
- [ ] **DNT-LAB-005** — Suppliers analytics se usa como fuente de laboratorios (P1_HIGH)
- [ ] **DNT-LAB-006** — Adjuntos se convierten a base64 y se envían por JSON (P1_HIGH)
- [ ] **DNT-LAB-007** — Trabajo de laboratorio no tiene vínculo DB garantizado con plan/cita/prótesis (P1_HIGH)
- [ ] **DNT-MKT-001** — Campañas son constantes/useState (P1_HIGH)
- [ ] **DNT-MKT-002** — Comunicaciones son useState y pacientes demo (P1_HIGH)
- [ ] **DNT-MKT-003** — Consentimiento de marketing es un checkbox local (P1_HIGH)
- [ ] **DNT-MKT-004** — notifications existe pero no hay outbox unificada de entrega externa (P1_HIGH)
- [ ] **DNT-PAT-013** — Origen declarado no está conectado a campaña/UTM (P1_HIGH)
- [ ] **DNT-STF-001** — Fichajes viven en memoria (P1_HIGH)
- [ ] **DNT-STF-004** — Solicitudes de privacidad son estado local (P1_HIGH)
- [ ] **DNT-TSK-001** — Tareas rápidas son vista previa sin efectos (P1_HIGH)
- [ ] **DNT-RX-001** — No existe schema Supabase de recetas (P0_CRITICAL)
- [ ] **DNT-RX-002** — Firma de receta vive como data URL en UI antes de persistencia externa (P1_HIGH)
- [ ] **DNT-TSK-002** — NLU reconoce más acciones de las que el executor puede ejecutar (P1_HIGH)
- [ ] **DNT-TSK-003** — Acciones de voz dependen de rutas que Supabase parcial no implementa (P1_HIGH)

## B. Validaciones LIVE/operativas pendientes

- [ ] **S1-LIVE-001** — Respaldar y aplicar la migración Stage 1 primero en staging
- [ ] **S1-LIVE-002** — Migrar/invitar usuarios legacy antes del corte definitivo
- [ ] **S1-LIVE-003** — Enlazar staff existentes con profiles
- [ ] **S1-LIVE-004** — Configurar Supabase Auth URLs y plantillas de email
- [ ] **S1-LIVE-005** — Completar recuperación de contraseña SSR/PKCE
- [ ] **S1-LIVE-006** — Verificar aislamiento real entre dos clínicas
- [ ] **S1-LIVE-007** — Verificar login real de staff y paciente
- [ ] **S1-LIVE-008** — Validar revocación de sesiones en Supabase real
- [ ] **S1-LIVE-009** — Ejecutar build/typecheck/test completos bajo Node 24
- [ ] **S2-LIVE-001** — Aplicar Stage 1 y Stage 2 en Supabase staging
- [ ] **S2-LIVE-002** — Ejecutar matriz RLS con dos clínicas y cinco roles
- [ ] **S2-LIVE-003** — Probar rollback transaccional real
- [ ] **S2-LIVE-004** — Validar audit_log en la misma transacción
- [ ] **S2-LIVE-005** — Revisar duplicados legacy y validar constraints NOT VALID
- [ ] **S2-LIVE-006** — Ejecutar suite completa bajo Node 24
- [ ] **S3-LIVE-001** — Aplicar migración Realtime Stage 3 en Supabase staging
- [ ] **S3-LIVE-002** — Probar Broadcast privado entre dos sesiones reales
- [ ] **S3-LIVE-003** — Probar cambio real de sede
- [ ] **S3-LIVE-004** — Ejecutar build/typecheck/test completos en Node 24
- [ ] **S4-LIVE-001** — Aplicar migración Stage 4 en Supabase staging
- [ ] **S4-LIVE-002** — Verificar conversión histórica de birth_date
- [ ] **S4-LIVE-003** — Auditar record_number legacy antes de producción
- [ ] **S4-LIVE-004** — Probar archive/restore con expediente real completo
- [ ] **S4-LIVE-005** — Comprobar rechazo de DELETE duro y cascadas
- [ ] **S4-LIVE-006** — Validar importación con exportaciones reales de clínica
- [ ] **S4-LIVE-007** — Ejecutar suite completa bajo Node 24
- [ ] **S5-LIVE-001** — Aplicar migración Stage 5 en Supabase staging
- [ ] **S5-LIVE-002** — Probar aislamiento Storage entre dos clínicas con JWT reales
- [ ] **S5-LIVE-003** — Validar cámara y fallback en navegadores reales
- [ ] **S5-LIVE-004** — Verificar documentos/versiones con bytes reales
- [ ] **S5-LIVE-005** — Conectar estado real de Supabase Managed Backups/PITR
- [ ] **S5-LIVE-006** — Definir retención/backup operativo de objetos Storage
- [ ] **S5-LIVE-007** — Ejecutar suite completa bajo Node 24
- [ ] **S6-LIVE-001** — Aplicar migración Stage 6 en Supabase staging
- [ ] **S6-LIVE-002** — Validar concurrencia e historial de odontograma/periodoncia
- [ ] **S6-LIVE-003** — Validar catálogo clínico y snapshots históricos
- [ ] **S6-LIVE-004** — Ejecutar E2E de consentimientos y firma de presupuesto
- [ ] **S6-LIVE-005** — Verificar ledger clínico y audit_log con actor real
- [ ] **S6-LIVE-006** — Ejecutar suite completa y build bajo Node 24
- [ ] **S6-LIVE-007** — E2E visual temporal/mixta/supernumerarios
- [ ] **S6-LIVE-008** — Validación clínica de semántica ISO 10394
- [ ] **S7-LIVE-001** — Aplicar migración Stage 7 en Supabase staging
- [ ] **S7-LIVE-002** — Validar concurrencia de reservas y bloqueos
- [ ] **S7-LIVE-003** — Validar Broadcast de recepción
- [ ] **S7-LIVE-004** — Validar carrera ausencia↔reserva
- [ ] **S7-LIVE-005** — Validar no-show, outbox y reagendado
- [ ] **S7-LIVE-006** — Validar lista de espera y privilegios
- [ ] **S7-LIVE-007** — Validar métricas operativas
- [ ] **S7-LIVE-008** — Ejecutar suite completa y build bajo Node 24
- [ ] **S7-LIVE-009** — Validar solicitudes de cita del portal y aislamiento cross-clinic
- [ ] **S8-LIVE-001** — Aplicar migración Stage 8 en Supabase staging
- [ ] **S8-LIVE-002** — Validar emisión concurrente y cadena fiscal
- [ ] **S8-LIVE-003** — E2E real de cobros manual, SumUp y Stripe
- [ ] **S8-LIVE-004** — Validar reconciliación tras fallo de red o callback repetido
- [ ] **S8-LIVE-005** — Validar matriz RLS y permisos financieros
- [ ] **S8-LIVE-006** — Validar Realtime financiero con dos sesiones
- [ ] **S8-LIVE-007** — Validar integración fiscal/VERI*FACTU real
- [ ] **S8-LIVE-008** — Revisión fiscal y contable con asesoría
- [ ] **S8-LIVE-009** — Ejecutar Node 24, typecheck, tests, build y E2E
- [ ] **S9-LIVE-001** — Aplicar migración Stage 9 en Supabase staging
- [ ] **S9-LIVE-002** — Validar paridad de KPIs entre Inicio, Finanzas y Análisis
- [ ] **S9-LIVE-003** — Validar periodos Mes/Trimestre/Año y DST Madrid
- [ ] **S9-LIVE-004** — Validar rectificativas, allocations y pendiente neto
- [ ] **S9-LIVE-005** — Validar reconocimiento de producción y snapshots históricos
- [ ] **S9-LIVE-006** — Validar atribución por sede y profesional
- [ ] **S9-LIVE-007** — Validar rendimiento SQL Analytics
- [ ] **S9-LIVE-008** — Validar Realtime KPI entre dos sesiones
- [ ] **S9-LIVE-009** — Ejecutar Node 24, typecheck, tests, build y E2E

## C. Hallazgos técnicos Stage 9 pendientes

- [ ] S9-PEND-001 Legacy unused analytics resources comparison/losses/events/treatments-drilldown remain exposed but have no canonical Supabase implementation; retire or define semantics in cleanup instead of inventing metrics.
- [ ] S9-PEND-002 purchases/suppliers/cost-recipes/supplier-invoices depend on Stage 10 laboratory/supplier ledger and remain intentionally deferred.
- [ ] S9-PEND-003 PARTIALLY_REFUNDED has no explicit refund-amount ledger; DENTY-KPI-1 Cobrado therefore counts only COMPLETED until a refund ledger exists.
- [ ] S9-PEND-004 Margin DENTY-KPI-1 excludes external laboratory costs until Stage 10 provides attributable lab cost ledger.

## D. Hallazgos heredados detectados por verificación

- [ ] S9-INHERITED-001 games-integrity fails because scripts/games/legacy-hashes.json expects SHA-256 47fd65e… for public/games/js/app.js while the asset has ee5bb683…; the same mismatch is already present unchanged in Stage 5, 6.1, 7 and 8, so Stage 9 did not mutate the asset.

## Regla de continuidad

- No reabrir Stage 1–9 por una validación LIVE salvo fallo reproducible atribuible al código de esa etapa.
- Stage 10 puede cerrar `S9-PEND-002` y mejorar `S9-PEND-004` al crear el ledger real de laboratorios/proveedores.
- La limpieza de endpoints Analytics legacy debe retirar rutas sin uso o definir semántica explícita, nunca inventar valores para hacer pasar UI.
