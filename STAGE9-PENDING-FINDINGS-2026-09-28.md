# Stage 9 — Recopilación única de hallazgos pendientes

> Fuente de continuidad tras Stage 9. Etapas 1–9 están bloqueadas como `DO_NOT_REIMPLEMENT`; sus tareas LIVE son validación/despliegue, no autorización para rehacerlas.

## Reconciliación

- Hallazgos originales pendientes de implementación: **19**.
- Validaciones LIVE/operativas pendientes: **68**.
- Hallazgos técnicos Stage 9 pendientes: **4**.
- Hallazgo heredado de verificación: **1**.

## A. Hallazgos originales todavía pendientes

- [ ] **DNT-LAB-001** — No existe maestro de laboratorios en Supabase (P0_CRITICAL)
  - Etapa 10: Laboratorios y alertas conectadas
- [ ] **DNT-LAB-002** — No existe tabla lab_works aunque la API y UI la usan (P0_CRITICAL)
  - Etapa 10: Laboratorios y alertas conectadas
- [ ] **DNT-LAB-003** — Pestaña Laboratorios no ofrece CRUD real (P1_HIGH)
  - Etapa 10: Laboratorios y alertas conectadas
- [ ] **DNT-LAB-004** — Balances reales están incompletos y pagos de laboratorio son demo (P1_HIGH)
  - Etapa 10: Laboratorios y alertas conectadas
- [ ] **DNT-LAB-005** — Suppliers analytics se usa como fuente de laboratorios (P1_HIGH)
  - Etapa 10: Laboratorios y alertas conectadas
- [ ] **DNT-LAB-006** — Adjuntos se convierten a base64 y se envían por JSON (P1_HIGH)
  - Etapa 10: Laboratorios y alertas conectadas
- [ ] **DNT-LAB-007** — Trabajo de laboratorio no tiene vínculo DB garantizado con plan/cita/prótesis (P1_HIGH)
  - Etapa 10: Laboratorios y alertas conectadas
- [ ] **DNT-MKT-001** — Campañas son constantes/useState (P1_HIGH)
  - Etapa 11: Personal, comunicaciones, campañas, privacidad y tareas
- [ ] **DNT-MKT-002** — Comunicaciones son useState y pacientes demo (P1_HIGH)
  - Etapa 11: Personal, comunicaciones, campañas, privacidad y tareas
- [ ] **DNT-MKT-003** — Consentimiento de marketing es un checkbox local (P1_HIGH)
  - Etapa 11: Personal, comunicaciones, campañas, privacidad y tareas
- [ ] **DNT-MKT-004** — notifications existe pero no hay outbox unificada de entrega externa (P1_HIGH)
  - Etapa 11: Personal, comunicaciones, campañas, privacidad y tareas
- [ ] **DNT-PAT-013** — Origen declarado no está conectado a campaña/UTM (P1_HIGH)
  - Etapa 11: Personal, comunicaciones, campañas, privacidad y tareas
- [ ] **DNT-STF-001** — Fichajes viven en memoria (P1_HIGH)
  - Etapa 11: Personal, comunicaciones, campañas, privacidad y tareas
- [ ] **DNT-STF-004** — Solicitudes de privacidad son estado local (P1_HIGH)
  - Etapa 11: Personal, comunicaciones, campañas, privacidad y tareas
- [ ] **DNT-TSK-001** — Tareas rápidas son vista previa sin efectos (P1_HIGH)
  - Etapa 11: Personal, comunicaciones, campañas, privacidad y tareas
- [ ] **DNT-RX-001** — No existe schema Supabase de recetas (P0_CRITICAL)
  - Etapa 12: Portal del paciente, recetas y Oye Denty
- [ ] **DNT-RX-002** — Firma de receta vive como data URL en UI antes de persistencia externa (P1_HIGH)
  - Etapa 12: Portal del paciente, recetas y Oye Denty
- [ ] **DNT-TSK-002** — NLU reconoce más acciones de las que el executor puede ejecutar (P1_HIGH)
  - Etapa 12: Portal del paciente, recetas y Oye Denty
- [ ] **DNT-TSK-003** — Acciones de voz dependen de rutas que Supabase parcial no implementa (P1_HIGH)
  - Etapa 12: Portal del paciente, recetas y Oye Denty

## B. Validaciones LIVE/operativas pendientes

- [ ] **S1-LIVE-001** — Respaldar y aplicar la migración Stage 1 primero en staging
  - Ejecutar 20260928001000_stage1_identity_auth_cutover.sql contra una copia/staging y revisar errores SQL/RLS antes de producción.
- [ ] **S1-LIVE-002** — Migrar/invitar usuarios legacy antes del corte definitivo
  - Los hashes PBKDF2 locales no se pueden reutilizar como contraseña de Supabase Auth. Crear/invitar cada identidad real, vincularla a profile/membership y verificar acceso antes de eliminar el almacén legacy.
- [ ] **S1-LIVE-003** — Enlazar staff existentes con profiles
  - Para cada DENTIST existente, staff_members.profile_id debe apuntar a exactamente un profile/auth user activo. Revisar también ADMIN/RECEPTION/ASSISTANT.
- [ ] **S1-LIVE-004** — Configurar Supabase Auth URLs y plantillas de email
  - Configurar Site URL/redirect URLs y plantillas de invite/recovery del proyecto real.
- [ ] **S1-LIVE-005** — Completar recuperación de contraseña SSR/PKCE
  - El envío de recovery ya usa Supabase Auth, pero falta callback final de recuperación. Preferencia: @supabase/ssr + PKCE siguiendo la guía oficial.
- [ ] **S1-LIVE-006** — Verificar aislamiento real entre dos clínicas
  - Con dos usuarios y dos clínicas, comprobar que modificar clinic_id/patient_id manualmente produce 0 filas/403 y nunca fuga datos.
- [ ] **S1-LIVE-007** — Verificar login real de staff y paciente
  - Probar ADMIN, RECEPTION, DENTIST, ASSISTANT y PATIENT con usuarios reales de Supabase Auth y membresías reales.
- [ ] **S1-LIVE-008** — Validar revocación de sesiones en Supabase real
  - Confirmar que revocar app_session corta acceso del dispositivo inmediatamente y decidir si se requiere revocación exacta del refresh session en GoTrue además del bloqueo de Denty.
- [ ] **S1-LIVE-009** — Ejecutar build/typecheck/test completos bajo Node 24
  - Este contenedor usa Node 22 y npm ci no pudo completarse por timeout de red. Ejecutar npm ci + npm run typecheck + npm test + npm run build en Node 24.
- [ ] **S2-LIVE-001** — Aplicar Stage 1 y Stage 2 en Supabase staging
  - Respaldar staging y aplicar primero 20260928001000_stage1_identity_auth_cutover.sql y después 20260928010000_stage2_rls_transactions_audit_constraints.sql. No reescribir las migraciones salvo error SQL reproducible.
- [ ] **S2-LIVE-002** — Ejecutar matriz RLS con dos clínicas y cinco roles
  - Probar ADMIN/RECEPTION/DENTIST/ASSISTANT/PATIENT con JWT reales. Cada actor debe ver solo clínica/paciente autorizado; IDs manipulados deben producir 0 filas/403.
- [ ] **S2-LIVE-003** — Probar rollback transaccional real
  - Forzar un error intermedio en save_odontogram_batch/otra RPC de staging y comprobar que no queda ninguna escritura parcial ni versión avanzada.
- [ ] **S2-LIVE-004** — Validar audit_log en la misma transacción
  - Crear/modificar/eliminar datos sensibles en staging; verificar actor, before/after, correlation_id y que UPDATE/DELETE de audit_log sean rechazados.
- [ ] **S2-LIVE-005** — Revisar duplicados legacy y validar constraints NOT VALID
  - Buscar datos históricos incompatibles con FKs/CHECKs; corregirlos y ejecutar VALIDATE CONSTRAINT. Los unique indexes harán fallar la migración si hay duplicados y deben resolverse antes de producción.
- [ ] **S2-LIVE-006** — Ejecutar suite completa bajo Node 24
  - En entorno con red/dependencias: npm ci && npm run security:stage2-check && npm run typecheck && npm test && npm run build. El contenedor de esta sesión era Node 22 y no permitió certificar la suite completa de Next/TS.
- [ ] **S3-LIVE-001** — Aplicar migración Realtime Stage 3 en Supabase staging
  - Aplicar 20260928030000_stage3_realtime_single_source.sql después de Stage 1/2 y verificar que realtime.messages/policies/triggers se crean sin conflicto.
- [ ] **S3-LIVE-002** — Probar Broadcast privado entre dos sesiones reales
  - Abrir dos clientes de la misma clínica y comprobar invalidación inmediata; repetir con otra clínica y confirmar que no recibe eventos ajenos.
- [ ] **S3-LIVE-003** — Probar cambio real de sede
  - Con una clínica multi-sede, cambiar activeSiteId y comprobar Agenda/Inicio/Análisis, cache e invalidaciones sin mezclar citas/KPIs de otra sede.
- [ ] **S3-LIVE-004** — Ejecutar build/typecheck/test completos en Node 24
  - Ejecutar npm ci, typecheck, unit/integration y next build en el entorno Node 24 de CI/Vercel. No reabrir Etapa 3 salvo fallo reproducible atribuible a estos cambios.
- [ ] **S4-LIVE-001** — Aplicar migración Stage 4 en Supabase staging
  - Hacer backup/snapshot y aplicar 20260928040000_stage4_patient_lifecycle.sql después de Etapas 1–3. Revisar locks, RLS, triggers, RPCs e índices antes de producción.
- [ ] **S4-LIVE-002** — Verificar conversión histórica de birth_date
  - Comparar una muestra de pacientes reales antes/después de timestamptz→DATE, especialmente fechas almacenadas cerca de medianoche y datos importados de otras zonas horarias.
- [ ] **S4-LIVE-003** — Auditar record_number legacy antes de producción
  - Confirmar que no existen duplicados/conflictos de ficha por clínica y revisar los record_number deterministas generados para filas legacy vacías antes del corte.
- [ ] **S4-LIVE-004** — Probar archive/restore con expediente real completo
  - Archivar y restaurar en staging un paciente con citas, plan, presupuesto, documentos, pagos y datos clínicos; comprobar que todos los IDs/vínculos sobreviven y que la lista activa/archivada cambia correctamente.
- [ ] **S4-LIVE-005** — Comprobar rechazo de DELETE duro y cascadas
  - Intentar DELETE de patients con un contexto autorizado y verificar PATIENT_HARD_DELETE_FORBIDDEN. Revisar que borrar otras entidades/clinic no pueda arrastrar el expediente por cascada accidental.
- [ ] **S4-LIVE-006** — Validar importación con exportaciones reales de clínica
  - Ejecutar dry-run/prevalidación sobre muestras reales de CSV, JSON y XLSX procedentes de Clinic Cloud/Gesden; revisar columnas, fichas, DNI opcional y fechas antes de importar producción.
- [ ] **S4-LIVE-007** — Ejecutar suite completa bajo Node 24
  - En CI/Vercel con dependencias disponibles: npm ci, npm run patients:stage4-check, typecheck, unit/integration y next build. No reabrir Etapa 4 salvo fallo reproducible atribuible a estos cambios.
- [ ] **S5-LIVE-001** — Aplicar migración Stage 5 en Supabase staging
  - Aplicar 20260928050000_stage5_storage_documents_backups.sql después de Etapas 1–4; confirmar buckets privados, columnas, constraints e RLS antes de producción.
- [ ] **S5-LIVE-002** — Probar aislamiento Storage entre dos clínicas con JWT reales
  - Con usuarios de clínicas A/B, verificar que A puede leer sus fotos/documentos y recibe rechazo al intentar acceder a rutas de B; probar también rol patient_account.
- [ ] **S5-LIVE-003** — Validar cámara y fallback en navegadores reales
  - Sobre HTTPS probar permisos, captura, repetir foto y selector de archivo en iOS Safari, Chrome Android y escritorio. Confirmar que denegar cámara no impide crear paciente.
- [ ] **S5-LIVE-004** — Verificar documentos/versiones con bytes reales
  - Subir PDF/imagen, descargar, recalcular SHA-256, crear una segunda versión y comprobar que ambas filas/objetos sobreviven, con previous_version_id y tamaños correctos.
- [ ] **S5-LIVE-005** — Conectar estado real de Supabase Managed Backups/PITR
  - Configurar SUPABASE_PROJECT_REF y SUPABASE_MANAGEMENT_ACCESS_TOKEN en staging/producción y comprobar que Ajustes refleja backups/PITR reales sin filtrar el token al cliente.
- [ ] **S5-LIVE-006** — Definir retención/backup operativo de objetos Storage
  - Documentar y probar la estrategia off-site/retención/export adecuada al despliegue. Los backups de base de datos no restauran objetos borrados de Storage; no reimplementar una tabla ficticia de backups dentro de Denty.
- [ ] **S5-LIVE-007** — Ejecutar suite completa bajo Node 24
  - En CI/Vercel con red/dependencias disponibles: npm ci, npm run storage:stage5-check, typecheck, unit/integration y next build. Este contenedor agotó el tiempo de red durante npm ci; no reabrir Etapa 5 salvo fallo reproducible.
- [ ] **S6-LIVE-001** — Aplicar migración Stage 6 en Supabase staging
  - Aplicar 20260928060000_stage6_clinical_pipeline.sql después de Etapas 1–5 y comprobar creación/RLS/grants de periodontal_exams, treatment_catalog, columnas de snapshots y RPCs antes de producción.
- [ ] **S6-LIVE-002** — Validar concurrencia e historial de odontograma/periodoncia
  - Con dos sesiones reales, provocar escrituras concurrentes y verificar optimistic concurrency/rollback. Crear al menos dos revisiones periodontales y dos snapshots y comprobar que se pueden comparar sin sobrescritura ni pérdida de sitios.
- [ ] **S6-LIVE-003** — Validar catálogo clínico y snapshots históricos
  - Crear y editar un tratamiento en staging; confirmar que los selectores abiertos se refrescan y que los clinical_plan_items ya creados conservan code/label/price/cost snapshot aunque cambie el catálogo.
- [ ] **S6-LIVE-004** — Ejecutar E2E de consentimientos y firma de presupuesto
  - Comprobar que falta de consentimiento devuelve rechazo desde DB, que firmar el documento satisface el requirement en todas las superficies y que un cambio posterior del plan vuelve obsoleto el presupuesto firmado y obliga a crear nueva revisión DRAFT.
- [ ] **S6-LIVE-005** — Verificar ledger clínico y audit_log con actor real
  - Ejecutar guardado de odontograma, snapshot, periodoncia, alta de item, sync de plan/presupuesto y firma; verificar clinical_history_events y audit_log con actor, paciente, correlation_id y payload coherentes en la misma transacción.
- [ ] **S6-LIVE-006** — Ejecutar suite completa y build bajo Node 24
  - En CI/Vercel con dependencias disponibles: npm ci, npm run clinical:stage6-check, npm run clinical:stage6-runtime-check, npm run typecheck, npm test y npm run build. Este contenedor usa Node 22 y no contiene node_modules, por lo que no certifica la suite completa de Next/TypeScript.
- [ ] **S6-LIVE-007** — E2E visual temporal/mixta/supernumerarios
  - Validación añadida por la extensión 6.1 de dentición real.
- [ ] **S6-LIVE-008** — Validación clínica de semántica ISO 10394
  - Validación añadida por la extensión 6.1 de dentición real.
- [ ] **S7-LIVE-001** — Aplicar migración Stage 7 en Supabase staging
  - Revisar solapes/duplicados legacy antes de crear exclusion/unique constraints; aplicar la migración sin eliminar historia silenciosamente.
- [ ] **S7-LIVE-002** — Validar concurrencia de reservas y bloqueos
  - Con dos sesiones reales, reservar el mismo profesional/gabinete y provocar carrera cita↔bloqueo; exactamente una operación incompatible debe confirmar.
- [ ] **S7-LIVE-003** — Validar Broadcast de recepción
  - Con dos sesiones reales de la misma clínica, comprobar ARRIVED→WAITING→IN_CHAIR sin recargar y aislamiento cross-clinic.
- [ ] **S7-LIVE-004** — Validar carrera ausencia↔reserva
  - Crear ausencia y reserva concurrentes para el mismo profesional; la disponibilidad final no puede contener una cita sobre ausencia aprobada.
- [ ] **S7-LIVE-005** — Validar no-show, outbox y reagendado
  - Repetir mark_no_show/reintentos y comprobar un único recall, notification/outbox idempotente, relación de sustitución y recall booked.
- [ ] **S7-LIVE-006** — Validar lista de espera y privilegios
  - Cuenta paciente puede alta/retirada pero no elevar prioridad ni autocompletar; cuenta staff puede cumplir y vincular una cita válida.
- [ ] **S7-LIVE-007** — Validar métricas operativas
  - Comparar analytics_wait_times contra fixtures SQL conocidos de espera, sillón, puntualidad y retraso por periodo/sede/profesional.
- [ ] **S7-LIVE-008** — Ejecutar suite completa y build bajo Node 24
  - En CI/Vercel con dependencias: npm ci, agenda:stage7-check, typecheck, tests, build y E2E. El contenedor actual usa Node 22 y no contiene node_modules.
- [ ] **S7-LIVE-009** — Validar solicitudes de cita del portal y aislamiento cross-clinic
  - Con cuentas reales de paciente/staff y dos clínicas: paciente crea/cancela pero no puede auto-programarse; staff programa mediante RPC; paciente/profesional/sede/gabinete/plan o solicitud de otra clínica deben ser rechazados.
- [ ] **S8-LIVE-001** — Aplicar migración Stage 8 en Supabase staging
  - Revisar datos legacy de payments/payment_attempts/fiscal_records, backup previo y aplicar constraints/RLS sin destruir historia.
- [ ] **S8-LIVE-002** — Validar emisión concurrente y cadena fiscal
  - Emitir concurrentemente desde dos series; números únicos, prefijos únicos y cadena previous_hash sin bifurcaciones por clínica.
- [ ] **S8-LIVE-003** — E2E real de cobros manual, SumUp y Stripe
  - Misma idempotencyKey no debe invocar dos veces al proveedor ni crear dos payments/allocations; éxito confirmado produce exactamente un ledger payment.
- [ ] **S8-LIVE-004** — Validar reconciliación tras fallo de red o callback repetido
  - Repetir polling/callback después de cobro confirmado y comprobar convergencia exactamente una vez hacia ledger_payment_id.
- [ ] **S8-LIVE-005** — Validar matriz RLS y permisos financieros
  - Con dos clínicas y roles ADMIN/RECEPTION/DENTIST/ASSISTANT/PATIENT comprobar finance.read/write, billing.issue/settings y aislamiento cross-clinic.
- [ ] **S8-LIVE-006** — Validar Realtime financiero con dos sesiones
  - Cobro/factura debe refrescar ficha paciente, Finanzas, Inicio y Analytics sin recarga y sin fugas entre clínicas.
- [ ] **S8-LIVE-007** — Validar integración fiscal/VERI*FACTU real
  - Configurar certificado/credenciales y entorno oficial de pruebas; validar altas/rectificaciones, respuestas, errores, QR/representación exigible y reintentos antes de afirmar cumplimiento de producción.
- [ ] **S8-LIVE-008** — Revisión fiscal y contable con asesoría
  - Validar series, contenido PDF, identidad fiscal, IVA/exenciones aplicables a tratamientos dentales y tipos rectificativos R1–R5. No hardcodear tratamiento fiscal sin validación.
- [ ] **S8-LIVE-009** — Ejecutar Node 24, typecheck, tests, build y E2E
  - El contenedor actual usa Node 22.16.0 y npm ci falla EBADENGINE; ejecutar npm ci/typecheck/test/build bajo Node 24 en CI/Vercel.
- [ ] **S9-LIVE-001** — Aplicar migración Stage 9 en Supabase staging
  - Aplicar 20260928090000_stage9_canonical_analytics.sql con backup; validar vistas, RPC, RLS, backfill de specialty/category snapshots y permisos finance.read.
- [ ] **S9-LIVE-002** — Validar paridad de KPIs entre Inicio, Finanzas y Análisis
  - Con fixtures conocidos y mismos filtros, las tres superficies deben devolver exactamente los mismos valores DENTY-KPI-1 para producción, facturado, cobrado, pendiente, margen, ticket, conversión y no-show.
- [ ] **S9-LIVE-003** — Validar periodos Mes/Trimestre/Año y DST Madrid
  - Probar límites inclusivo/exclusivo alrededor de cambios CET/CEST y desde navegador en otra zona horaria; la consulta debe usar Europe/Madrid.
- [ ] **S9-LIVE-004** — Validar rectificativas, allocations y pendiente neto
  - Con factura, rectificativa negativa, pagos parciales/completos y cobros no imputados, verificar Facturado/Cobrado/Pendiente y que el saldo neto nunca se infle por flooring por factura.
- [ ] **S9-LIVE-005** — Validar reconocimiento de producción y snapshots históricos
  - Múltiples citas COMPLETED del mismo clinical_plan_item deben producir una sola vez; editar catálogo después no debe cambiar precio/coste/especialidad/categoría históricos.
- [ ] **S9-LIVE-006** — Validar atribución por sede y profesional
  - Probar factura con appointment explícita, atribución derivada por clinical_plan_item y pagos no imputados; los importes no atribuibles no deben inventar sede/profesional.
- [ ] **S9-LIVE-007** — Validar rendimiento SQL Analytics
  - Ejecutar EXPLAIN/ANALYZE con volumen realista para summary/treatments/doctors/monthly y ajustar índices solo si el plan lo exige.
- [ ] **S9-LIVE-008** — Validar Realtime KPI entre dos sesiones
  - Completar tratamiento, emitir/rectificar factura y registrar pago en una sesión; Inicio, Finanzas y Análisis de la misma clínica deben refrescar sin recarga y sin fuga cross-clinic.
- [ ] **S9-LIVE-009** — Ejecutar Node 24, typecheck, tests, build y E2E
  - El contenedor actual usa Node 22.16.0 y no tiene node_modules; ejecutar npm ci, typecheck, suites completas, build y E2E bajo Node 24.x en CI/Vercel.

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
