# Denty — Lista de la compra técnica

> **Handoff:** Etapas **1, 2, 3, 4, 5 y 6** están bloqueadas como `DO_NOT_REIMPLEMENT`. El siguiente trabajo de producto empieza en **Etapa 7**. Las tareas `S1-LIVE-*` a `S6-LIVE-*` son validación/migración de infraestructura, no una invitación a reescribir etapas cerradas.

## Estado rápido

- [x] **Etapa 1 — Identidad/Auth/roles:** implementación realizada. `DO_NOT_REIMPLEMENT`.
- [x] **Etapa 2 — RLS/transacciones/auditoría/constraints:** **FINALIZADA**. `DO_NOT_REIMPLEMENT`.
- [x] **Etapa 3 — Fuente única de verdad/Realtime/contratos:** **FINALIZADA**. `DO_NOT_REIMPLEMENT`.
- [x] **Etapa 4 — Paciente maestro/importación/archivo/retención:** **FINALIZADA**. `DO_NOT_REIMPLEMENT`.
- [x] **Etapa 5 — Cámara, Storage, documentos y backups:** **FINALIZADA**. `DO_NOT_REIMPLEMENT`.
- [x] **Etapa 6 — Odontograma, periodoncia y pipeline clínico:** **FINALIZADA EN CÓDIGO**. `DO_NOT_REIMPLEMENT`.
- [ ] **Siguiente etapa de implementación: Etapa 7 — Agenda, recepción, no-show y sala de espera.**
- [ ] Validaciones LIVE de Etapas 1–6 deben ejecutarse al desplegar en Supabase/Node 24, sin rehacer el código ya cerrado.

**Cobertura:** 91 hallazgos originales. Etapa 6 cierra **8 hallazgos nuevos** y conserva 2 ya resueltos por Etapas 2–3. Tras Etapas 1–6, **33 hallazgos siguen realmente pendientes**.

---

## Etapa 1 — Identidad, autenticación, roles y contexto de clínica

**Estado de implementación:** `[x] BLOQUEADA / DO_NOT_REIMPLEMENT`  
Los cambios de identidad ya son dependencia del resto del proyecto. No volver a introducir `denty_users`, `admin/admin`, ficha+DNI como contraseña ni CRUD normal con service-role.

- [x] **DNT-P0-001 · Dos sistemas de identidad incompatibles** — Supabase Auth pasa a ser la identidad de runtime; actor resuelto desde auth user -> profiles -> clinic_members/patient_accounts. Se retiraron PBKDF2 y cookie de actor propia.
- [x] **DNT-P0-002 · Clave privilegiada usada como Bearer para operaciones normales** — CRUD Supabase local ordinario usa publishable key + JWT del usuario. La clave secret/service-role queda limitada a aprovisionamiento administrativo.
- [x] **DNT-P0-003 · denty_users contiene password_hash y no tiene RLS** — La migración conserva solo metadata no secreta en legacy_identity_map y elimina denty_users/password_hash.
- [x] **DNT-P0-004 · Bootstrap administrativo admin/admin** — El bootstrap admin/admin fue eliminado. Se añadió scripts/auth/provision-first-owner.mjs con contraseña fuerte, secret server-only y audit_log.
- [x] **DNT-P0-005 · Número de ficha + DNI se usa como credencial** — Se retiró ficha+DNI como credencial. El rol PATIENT se resuelve por patient_accounts ligado a auth.uid().
- [x] **DNT-P0-006 · Roles DB y dominio no coinciden** — Roles normalizados a ADMIN/RECEPTION/DENTIST/ASSISTANT/PATIENT en app y migración DB.
- [x] **DNT-P0-007 · staff_members no enlaza con profile/auth user** — staff_members.profile_id se exige como vínculo de identidad para dentistas y se añadió unicidad por clínica/perfil activo.
- [x] **DNT-P0-014 · Clinic context puede resolverse por fallback/autocreación** — PatientRepository ya no elige la primera clínica ni autocrea Denty. El clinic_id procede del actor/membership o falla explícitamente.
- [x] **DNT-STF-003 · Sesiones de usuario mostradas son ficticias** — Settings carga app_sessions reales y permite revocar sesiones de aplicación; logout usa scope=local.

### Validaciones LIVE de Etapa 1 (no reimplementar)

- [ ] **S1-LIVE-001 · Respaldar y aplicar la migración Stage 1 primero en staging** `pending`
  - Ejecutar 20260928001000_stage1_identity_auth_cutover.sql contra una copia/staging y revisar errores SQL/RLS antes de producción.
- [ ] **S1-LIVE-002 · Migrar/invitar usuarios legacy antes del corte definitivo** `pending`
  - Los hashes PBKDF2 locales no se pueden reutilizar como contraseña de Supabase Auth. Crear/invitar cada identidad real, vincularla a profile/membership y verificar acceso antes de eliminar el almacén legacy.
- [ ] **S1-LIVE-003 · Enlazar staff existentes con profiles** `pending`
  - Para cada DENTIST existente, staff_members.profile_id debe apuntar a exactamente un profile/auth user activo. Revisar también ADMIN/RECEPTION/ASSISTANT.
- [ ] **S1-LIVE-004 · Configurar Supabase Auth URLs y plantillas de email** `pending`
  - Configurar Site URL/redirect URLs y plantillas de invite/recovery del proyecto real.
- [ ] **S1-LIVE-005 · Completar recuperación de contraseña SSR/PKCE** `pending`
  - El envío de recovery ya usa Supabase Auth, pero falta callback final de recuperación. Preferencia: @supabase/ssr + PKCE siguiendo la guía oficial.
- [ ] **S1-LIVE-006 · Verificar aislamiento real entre dos clínicas** `pending`
  - Con dos usuarios y dos clínicas, comprobar que modificar clinic_id/patient_id manualmente produce 0 filas/403 y nunca fuga datos.
- [ ] **S1-LIVE-007 · Verificar login real de staff y paciente** `pending`
  - Probar ADMIN, RECEPTION, DENTIST, ASSISTANT y PATIENT con usuarios reales de Supabase Auth y membresías reales.
- [ ] **S1-LIVE-008 · Validar revocación de sesiones en Supabase real** `pending`
  - Confirmar que revocar app_session corta acceso del dispositivo inmediatamente y decidir si se requiere revocación exacta del refresh session en GoTrue además del bloqueo de Denty.
- [ ] **S1-LIVE-009 · Ejecutar build/typecheck/test completos bajo Node 24** `pending`
  - Este contenedor usa Node 22 y npm ci no pudo completarse por timeout de red. Ejecutar npm ci + npm run typecheck + npm test + npm run build en Node 24.
- [x] **S1-LIVE-010 · Migrar el adaptador Auth manual al helper oficial @supabase/ssr** `completed_in_stage3`
  - Cerrado en Etapa 3 con clientes oficiales `@supabase/ssr` y `@supabase/supabase-js`. No reabrir Etapa 1.

---

## Etapa 2 — RLS, transacciones, auditoría y constraints base

**Estado:** `[x] FINALIZADA`  
**Bloqueo:** `DO_NOT_REIMPLEMENT`  
**Migración:** `supabase/migrations/20260928010000_stage2_rls_transactions_audit_constraints.sql`  
**Checks:** `npm run security:stage2-check`

### Hallazgos cerrados

- [x] **DNT-P0-010 · Tablas tenant sin RLS**
  - RLS habilitado en las 44 tablas public efectivas del schema. denty_users ya fue eliminado por Etapa 1; legacy_identity_map queda sin grants authenticated. La prueba stage2-security-contract vigila regresiones.
- [x] **DNT-P0-011 · RLS habilitado pero políticas incompletas**
  - Matriz explícita de policies por clínica/paciente/actor para lectura y escritura. El runtime CRUD ordinario conserva publishable key + JWT del usuario; no usa service-role.
- [x] **DNT-P0-012 · SECURITY DEFINER con search_path=public**
  - Helpers privilegiados movidos al schema private, SECURITY DEFINER con search_path vacío y referencias schema-qualified. Grants/revokes de EXECUTE son explícitos.
- [x] **DNT-P0-013 · Operaciones compuestas carecen de frontera transaccional común**
  - Se creó frontera transaccional con RPC SECURITY INVOKER para save_odontogram_batch, transition_appointment, finalize_budget_signature y record_payment. saveOdontogramBatch ya consume la RPC. RPCs de módulos todavía inexistentes se implementarán en sus propias etapas, sin rehacer esta base.
- [x] **DNT-P0-018 · audit_log no está conectado obligatoriamente a mutaciones**
  - audit_log se convierte en ledger append-only; private.audit_sensitive_mutation registra actor, clinic/patient, before/after y correlation_id dentro de la misma transacción. Triggers cubren mutaciones sensibles clínicas, identidad y pagos.
- [x] **DNT-P0-019 · updated_at no se actualiza automáticamente**
  - private.set_updated_at() + triggers consistentes en tablas mutables. El cliente deja de enviar updated_at manualmente al actualizar paciente.
- [x] **DNT-DAT-002 · Faltan constraints/indexes tenant/natural keys de varios maestros**
  - Añadidos unique indexes tenant/natural keys, índices de rutas RLS/consulta, CHECK temporales y FKs de integridad. Algunas constraints se crean NOT VALID para permitir auditoría de legacy antes de VALIDATE CONSTRAINT en staging.

### Gate de implementación

- [x] **Las operaciones CRUD normales funcionan sin service-role.** `passed_repository`
  - Evidencia: route-handler usa cliente user-scoped para CRUD ordinario; service-role permanece en operaciones administrativas explícitas.
- [x] **Las pruebas de cross-clinic son rechazadas por RLS.** `implemented_pending_live_validation`
  - Evidencia: 44 tablas cubiertas por RLS + policies por tenant/paciente; ejecutar S2-LIVE-002 con dos clínicas reales para prueba JWT allow/deny.
- [x] **Una operación compuesta falla completa o se confirma completa.** `passed_repository`
  - Evidencia: save_odontogram_batch y RPCs compuestas ejecutan la operación en una única función PostgreSQL; el runtime del odontograma ya no encadena escrituras REST.
- [x] **Las mutaciones sensibles dejan audit event en la misma transacción.** `passed_repository`
  - Evidencia: audit triggers llaman private.audit_sensitive_mutation dentro de la transacción de la mutación; audit_log es append-only.

### Validaciones LIVE de Etapa 2 (NO reabrir la implementación)

> Si falla una de estas pruebas, diagnosticar el fallo concreto sobre staging. No reemplazar la arquitectura de Etapa 2 salvo que exista un error reproducible en la migración o RPC.

- [ ] **S2-LIVE-001 · Aplicar Stage 1 y Stage 2 en Supabase staging** `VALIDATION_ONLY`
  - Respaldar staging y aplicar primero 20260928001000_stage1_identity_auth_cutover.sql y después 20260928010000_stage2_rls_transactions_audit_constraints.sql. No reescribir las migraciones salvo error SQL reproducible.
- [ ] **S2-LIVE-002 · Ejecutar matriz RLS con dos clínicas y cinco roles** `VALIDATION_ONLY`
  - Probar ADMIN/RECEPTION/DENTIST/ASSISTANT/PATIENT con JWT reales. Cada actor debe ver solo clínica/paciente autorizado; IDs manipulados deben producir 0 filas/403.
- [ ] **S2-LIVE-003 · Probar rollback transaccional real** `VALIDATION_ONLY`
  - Forzar un error intermedio en save_odontogram_batch/otra RPC de staging y comprobar que no queda ninguna escritura parcial ni versión avanzada.
- [ ] **S2-LIVE-004 · Validar audit_log en la misma transacción** `VALIDATION_ONLY`
  - Crear/modificar/eliminar datos sensibles en staging; verificar actor, before/after, correlation_id y que UPDATE/DELETE de audit_log sean rechazados.
- [ ] **S2-LIVE-005 · Revisar duplicados legacy y validar constraints NOT VALID** `VALIDATION_ONLY`
  - Buscar datos históricos incompatibles con FKs/CHECKs; corregirlos y ejecutar VALIDATE CONSTRAINT. Los unique indexes harán fallar la migración si hay duplicados y deben resolverse antes de producción.
- [ ] **S2-LIVE-006 · Ejecutar suite completa bajo Node 24** `VALIDATION_ONLY`
  - En entorno con red/dependencias: npm ci && npm run security:stage2-check && npm run typecheck && npm test && npm run build. El contenedor de esta sesión era Node 22 y no permitió certificar la suite completa de Next/TS.

### Archivos clave de Etapa 2

- `supabase/migrations/20260928010000_stage2_rls_transactions_audit_constraints.sql`
- `scripts/stage2-security-contract.test.mjs`
- `scripts/stage2-rpc-runtime-contract.test.mjs`
- `src/server/supabase/rest-client.ts`
- `src/server/denty-supabase/patient-repository.ts`
- `package.json` (`security:stage2-check`)

---

## Etapa 0 — Congelar estado y crear línea base

**Estado:** `control_gate_pending`

### Gate de salida

- [ ] El proyecto puede arrancar de forma reproducible.
- [ ] Existe una base de pruebas que permita comprobar cross-clinic access.
- [x] No existe corpus ficticio en runtime; Etapa 3 lo eliminó y el contrato de regresión impide reintroducirlo.

---

## Etapa 3 — Fuente única de verdad, Realtime y contratos

**Estado:** `[x] FINALIZADA`  
**Bloqueo:** `DO_NOT_REIMPLEMENT`  
**Siguiente implementación:** **Etapa 4**

> La cuenta ficticia no está desactivada: fue **eliminada físicamente del producto**. No reintroducir fixtures, flags, usuarios hardcodeados, assets, rutas, copy ni almacenamiento operativo para simular datos. Cuando falte una integración real, mostrar estado vacío/error explícito.

- [x] **DNT-P0-008 · Dos backends de verdad: Supabase parcial + API externo** — Supabase/Postgres es la fuente canónica; se eliminó el fallback `DENTY_API_URL` y las rutas no migradas fallan explícitamente con `SUPABASE_ROUTE_NOT_IMPLEMENTED`.
- [x] **DNT-P0-009 · Faltan clientes oficiales Supabase** — `@supabase/supabase-js` + `@supabase/ssr` normalizados en browser/server/Auth.
- [x] **DNT-P0-016 · Realtime de Supabase no configurado** — Broadcast privado por `clinic:<clinic_id>` + migración/policies/triggers. Se eliminó SSE `/api/events`.
- [x] **DNT-P0-017 · Invalidación de caché incompleta** — matriz central cubre pacientes, agenda, clínica, documentos, recetas, laboratorio, presupuestos, facturas, pagos, alertas, staff, comunicaciones, campañas, dashboard y analytics.
- [x] **DNT-P0-020 · Outputs API demasiado permisivos** — Analytics endurecido; el contrato impide `catchall/passthrough` arbitrario.
- [x] **DNT-P0-021 · Datos ficticios mezclados con runtime real** — borrados `src/shared/demo`, assets de pacientes ficticios, bypass/flags, rutas/copys, estados iniciales y simulación de Denty Games. Producción usa datos reales o estado vacío/error.
- [x] **DNT-P0-023 · Query key factory incompleto** — query keys centralizadas por dominio y tenant/site; prohibidos arrays manuales en runtime.
- [x] **DNT-LOC-001 · Local-first sin sincronización demostrable** — política explícita server-authoritative; Web Storage solo para apariencia/densidad, nunca para datos operativos.
- [x] **DNT-MCL-001 · Contexto site/clinic inconsistente** — `ActiveContext` canónico; Agenda, Inicio y Análisis comparten sede activa y cache scope.

### Limpieza residual realizada

- [x] Eliminado físicamente `src/shared/demo/**`.
- [x] Eliminados pacientes/usuarios hardcodeados y assets asociados.
- [x] Eliminados `NEXT_PUBLIC_DEMO_MODE`, `demoMode`, `DEMO_*` y ramas equivalentes del runtime.
- [x] Eliminado fallback a `DENTY_API_URL`.
- [x] Eliminadas rutas legacy `/api/clinic/demo` y `/api/events`.
- [x] Eliminado SSE/EventSource antiguo.
- [x] Denty Games dejó de usar paciente, ranking, bonos, partidas o vouchers simulados y dejó de persistir progreso operativo en Web Storage.
- [x] Eliminado Web Storage operativo de agenda/laboratorio/documentos/finanzas; solo queda almacenamiento de preferencias visuales explícitamente permitido.
- [x] Eliminadas query keys manuales y centralizadas en `dentyQueryKeys`.
- [x] Limpiados tests, documentación histórica y notas que podían inducir a reintroducir la cuenta ficticia.

### Gate de salida

- [x] Una misma entidad tiene una sola fuente de verdad.
- [x] No existe fallback silencioso a datos ficticios en producción.
- [x] Un cambio relevante invalida las vistas dependientes.
- [x] Las respuestas API críticas se validan con schemas explícitos.
- [x] El repositorio operativo no contiene cuenta ficticia ni corpus de fixtures asociado.

### Hallazgos futuros ya resueltos — NO REIMPLEMENTAR

Etapas 2–3 adelantaron parte de la limpieza. El siguiente agente debe **saltar** estos IDs: `DNT-CLN-001`, `DNT-PAT-012`, `DNT-PAT-002`, `DNT-DOC-001`, `DNT-CLN-003`, `DNT-FIN-001`, `DNT-ANL-001`, `DNT-ANL-002`, `DNT-ALT-001`, `DNT-ALT-002`, `DNT-PRT-001`. Están marcados `[x]` en sus etapas originales; solo validar que sigan funcionando.

### Validaciones LIVE de Etapa 3 — `VALIDATION_ONLY`

Estas comprobaciones **no reabren la implementación** ni autorizan a recrear mecanismos alternativos.

- [ ] **S3-LIVE-001 · Aplicar migración Realtime Stage 3 en Supabase staging**
  - Aplicar `20260928030000_stage3_realtime_single_source.sql` después de Stage 1/2 y comprobar policies/triggers.
- [ ] **S3-LIVE-002 · Probar Broadcast privado entre sesiones reales**
  - Dos sesiones de la misma clínica deben sincronizarse; otra clínica no debe recibir sus eventos.
- [ ] **S3-LIVE-003 · Probar cambio real de sede**
  - Agenda/Inicio/Análisis deben cambiar de scope sin mezclar datos o cache de otra sede.
- [ ] **S3-LIVE-004 · Suite completa bajo Node 24**
  - `npm ci`, typecheck, tests y `next build` en CI/Vercel Node 24. Si aparece un fallo, corregir el defecto concreto sin reintroducir arquitectura retirada.

### Regla para etapas posteriores

- No crear otro backend paralelo.
- No reintroducir usuarios/cuentas ficticias ni fixtures productivos.
- No recrear `/api/events`, SSE propio ni `DENTY_API_URL`.
- No crear query keys manuales.
- No guardar datos clínicos/administrativos/financieros en `localStorage`/`sessionStorage`.
- Extender los clientes, Realtime y contexto tenant existentes en lugar de duplicarlos.

---

# Etapa 4 — Paciente maestro, importación, archivo y retención

**Estado:** `[x] FINALIZADA`  
**Bloqueo:** `DO_NOT_REIMPLEMENT`  
**Migración:** `supabase/migrations/20260928040000_stage4_patient_lifecycle.sql`  
**Checks:** `npm run patients:stage4-check`

### Hallazgos cerrados

- [x] **DNT-PAT-004 · Importación no cubre JSON/XLSX** — CSV/TSV, JSON y XLSX se parsean y **prevalidan por completo antes de escribir**. XLSX soporta shared/inline strings y fechas numéricas de Excel sin añadir una dependencia pesada.
- [x] **DNT-PAT-005 · Se detecta ficha legado pero no se conserva** — `legacyRecordNumber` viaja como `recordNumber` hasta `patients.record_number` y se conserva.
- [x] **DNT-PAT-006 · record_number no tiene constraint único en DB** — `record_number` es NOT NULL y existe unique index `(clinic_id, record_number)`; el importador también detecta duplicados dentro del lote.
- [x] **DNT-PAT-007 · DNI obligatorio/nullable es inconsistente** — DNI queda opcional/nullable de forma uniforme; cadenas vacías se normalizan a NULL.
- [x] **DNT-PAT-008 · birth_date modelado como timestamptz** — migrado a PostgreSQL `DATE`; contratos y formularios usan `YYYY-MM-DD` sin conversiones horarias.
- [x] **DNT-PAT-009 · Proyección de paciente devuelve módulos vacíos** — la proyección carga citas, plan clínico, presupuestos y documentos reales. Recetas siguen explícitamente pendientes de su schema de Etapa 12, sin fabricar datos.
- [x] **DNT-PAT-010 · No hay comando real archive/restore** — RPCs `archive_patient`/`restore_patient`, endpoints, cliente, hooks y acciones UI reales. La lista activa excluye archivados salvo solicitud expresa.
- [x] **DNT-PAT-011 · medical_profile mutable sin versión clínica** — `patient_medical_profile_versions` guarda versiones inmutables mediante trigger y RLS.
- [x] **DNT-PAT-012 · Pacientes ficticios siguen codificados en superficies productivas** — `RESOLVED_BY_STAGE_3`; no se reimplementó.
- [x] **DNT-DAT-001 · FKs ON DELETE CASCADE podrían borrar expediente completo** — DELETE duro de pacientes queda prohibido; `patients.clinic_id` deja de hacer CASCADE y pasa a RESTRICT, y las FK hacia `patients` con CASCADE también se migran a RESTRICT. El ciclo soportado es archivar/restaurar.

### Gate de salida

- [x] **Crear/importar/archivar/restaurar mantiene los vínculos.** `implemented_pending_live_validation` — archive/restore solo cambia estado del paciente; S4-LIVE-004 valida el expediente remoto completo.
- [x] **No se puede duplicar record_number dentro de una clínica.** `passed_repository` — índice único DB + validación de lote.
- [x] **Un paciente archivado conserva expediente clínico y económico.** `passed_repository` — no existe DELETE clínico y las dependencias no se eliminan.
- [x] **La ficha agregada ya no devuelve módulos vacíos artificialmente.** `passed_repository` — citas/plan/presupuesto/documentos proceden de DB.

### Validaciones LIVE de Etapa 4 (no reimplementar)

- [ ] **S4-LIVE-001 · Aplicar migración Stage 4 en Supabase staging** — backup primero; aplicar después de Etapas 1–3 y revisar locks, RLS, triggers, RPCs e índices.
- [ ] **S4-LIVE-002 · Verificar conversión histórica de birth_date** — comparar muestra real antes/después, especialmente timestamps cercanos a medianoche.
- [ ] **S4-LIVE-003 · Auditar record_number legacy** — confirmar duplicados/conflictos y revisar fichas deterministas generadas para legacy vacío.
- [ ] **S4-LIVE-004 · Probar archive/restore con expediente real completo** — verificar citas, plan, presupuestos, documentos, pagos y datos clínicos sin pérdida de IDs/vínculos.
- [ ] **S4-LIVE-005 · Comprobar rechazo de DELETE duro y cascadas** — confirmar `PATIENT_HARD_DELETE_FORBIDDEN` y ausencia de cascadas destructivas.
- [ ] **S4-LIVE-006 · Validar importación con exportaciones reales** — dry-run sobre CSV/JSON/XLSX de Clinic Cloud/Gesden antes de producción.
- [ ] **S4-LIVE-007 · Suite completa Node 24** — `npm ci`, `patients:stage4-check`, typecheck, tests y `next build` en CI/Vercel. Este contenedor no pudo completar `npm ci` offline por caché incompleta.

### Regla para etapas posteriores

- No volver a introducir DELETE duro de pacientes.
- No convertir `birth_date` otra vez en timestamp.
- No regenerar una ficha importada cuando ya existe `recordNumber`.
- No almacenar nuevas versiones de `medical_profile` sobrescribiendo el historial.
- Etapa 5 debe **extender** este paciente maestro para foto/Storage, no crear una segunda ficha o repositorio.

---

## Etapa 5 — Cámara, Storage, documentos y backups

**Estado de implementación:** `[x] FINALIZADA / DO_NOT_REIMPLEMENT`

> Base canónica: `docs/architecture/storage-and-backup-policy.md`. Las etapas posteriores deben reutilizar estos buckets, rutas y comandos; no crear un segundo almacén binario.

- [x] **DNT-P0-015 · No hay Supabase Storage clínico** — Creados buckets privados `patient-photos` y `clinical-documents`, límites/MIME, rutas `<clinic>/<patient>/<uuid>` y RLS de Storage. El acceso normal usa publishable key + JWT, no service-role.
- [x] **DNT-PAT-001 · La foto se lee pero no se puede crear/actualizar** — Foto mutable únicamente mediante `uploadPhoto` multipart. El servidor calcula SHA-256, guarda metadata y expone `/api/patients/:id/photo`; `create/updatePatient` no aceptan URLs arbitrarias.
- [x] **DNT-PAT-002 · PatientProfile usa una foto ficticia** — `RESOLVED_BY_STAGE_3`: no rehacer.
- [x] **DNT-PAT-003 · No existe flujo cámara→preview→Storage→paciente** — Cámara bajo demanda, preview, repetir, compresión, fallback a archivo y subida contra el ID real del paciente.
- [x] **DNT-DOC-001 · Centro documental mantenía datos/Web Storage ficticios** — `RESOLVED_BY_STAGE_3`: no rehacer.
- [x] **DNT-DOC-002 · Versiones/bytes/checksum no están cerrados extremo a extremo** — Bytes en Storage privado, SHA-256 del lado servidor, MIME/tamaño, `version_series_id`, `version`, `previous_version_id` y objetos inmutables.
- [x] **DNT-P0-022 · UI de backup es ficticia** — Eliminados botones/copias simuladas. Ajustes consulta Supabase Managed Backups/PITR cuando existe configuración y muestra `no conectado` cuando no existe.

### Gate de salida

- [x] **La foto tomada aparece en las superficies del mismo paciente.** Alta y ficha comparten el mismo `uploadPhoto` y una URL privada estable. Validación visual multi-dispositivo queda en `S5-LIVE-003`.
- [x] **Aislamiento Storage implementado.** Buckets privados + RLS por clínica/paciente. La prueba con JWT de dos clínicas queda en `S5-LIVE-002`; es validación remota, no reimplementación.
- [x] **No se almacenan adjuntos clínicos grandes como base64 dentro de JSON.** Foto/documentos usan `multipart/form-data`; Postgres guarda metadata y Storage los bytes.
- [x] **Cada documento tiene metadata/versionado verificable.** SHA-256, MIME, tamaño, serie de versiones y constraints de unicidad.

### Validaciones LIVE de Etapa 5 (no reimplementar)

- [ ] **S5-LIVE-001 · Aplicar migración Stage 5 en Supabase staging** — Ejecutar `20260928050000_stage5_storage_documents_backups.sql` tras Etapas 1–4 y verificar buckets privados, RLS, columnas y constraints.
- [ ] **S5-LIVE-002 · Probar aislamiento Storage entre dos clínicas con JWT reales** — Clínica A no debe poder leer rutas de B; probar también acceso paciente.
- [ ] **S5-LIVE-003 · Validar cámara/fallback en navegadores reales** — HTTPS en iOS Safari, Chrome Android y escritorio; permiso denegado no debe impedir crear el paciente.
- [ ] **S5-LIVE-004 · Verificar documentos/versiones con bytes reales** — Subir, descargar, recalcular SHA-256 y crear segunda versión conservando la anterior.
- [ ] **S5-LIVE-005 · Conectar Supabase Managed Backups/PITR** — Configurar `SUPABASE_PROJECT_REF` + `SUPABASE_MANAGEMENT_ACCESS_TOKEN` solo en servidor y comprobar el estado real en Ajustes.
- [ ] **S5-LIVE-006 · Definir retención/backup operativo de objetos Storage** — La copia de Postgres no sustituye una política de resiliencia de objetos. No recrear una tabla ficticia de backups dentro de Denty.
- [ ] **S5-LIVE-007 · Suite completa Node 24** — Ejecutar `npm ci`, `npm run storage:stage5-check`, typecheck, tests y `next build` en CI/Vercel. Este contenedor agotó el tiempo de red durante `npm ci`.

### Verificación observada en este paquete

- [x] Contratos Stage 1–5.
- [x] RLS: **45 tablas `public` cubiertas**.
- [x] Architecture gate.
- [x] Deployable package: **317 archivos fuente**.
- [x] API parity: **196/196** contratos browser + 3 server-only.
- [x] BFF policy.
- [x] Historical regressions.
- [x] Vercel regression matrix: **0 warnings**.
- [x] Node 24 release config.
- [x] P0 schema + Roadmap P1/P2/P3/P4.
- [ ] `npm ci` + typecheck + `next build`: no certificado en este contenedor por timeout de red; queda como `S5-LIVE-007`.

### Regla para etapas posteriores

- No añadir `photoUrl` arbitrario a `createPatient`/`updatePatient`; usar el comando dedicado.
- No sobrescribir objetos de documentos clínicos. Una nueva versión crea nueva fila + nuevo objeto.
- No usar service-role para cargas/descargas clínicas ordinarias.
- No transportar binarios como base64 JSON.
- No reintroducir botones o registros ficticios de backup.
- Consentimientos/recetas/documentos futuros deben reutilizar o especializar esta política, no crear un segundo sistema Storage.

---

## Etapa 6 — Odontograma, periodoncia y pipeline clínico

**Estado de implementación:** `[x] FINALIZADA / DO_NOT_REIMPLEMENT`  
**Migración:** `supabase/migrations/20260928060000_stage6_clinical_pipeline.sql`

> ✅ Se conserva `save_odontogram_batch` de Etapa 2. `finalize_budget_signature` se endurece en esta etapa sin crear una frontera paralela.

- [x] **DNT-CLN-001 · Guardado batch no transaccional** — `RESOLVED_BY_STAGE_2`; la RPC existente sigue siendo la única frontera.
- [x] **DNT-CLN-002 · Snapshots del servidor se hidratan con entidades vacías** — Parser estricto + payload clínico real de entidades/periodoncia.
- [x] **DNT-CLN-003 · Historial clínico local coexistía con servidor** — `RESOLVED_BY_STAGE_3`; sigue eliminado.
- [x] **DNT-CLN-004 · Periodoncia carece de persistencia Supabase completa/versionada** — `periodontal_exams` versionado + sitios persistidos + rehidratación UI.
- [x] **DNT-CLN-005 · Plan y presupuesto quedan desfasables hasta sincronización manual** — source versions canónicas; firmados/no-DRAFT generan nueva revisión, nunca se reescriben.
- [x] **DNT-CLN-006 · Catálogo hardcoded; Editar no persiste** — `treatment_catalog` por clínica + RLS + CRUD `catalog.manage` + selector compartido.
- [x] **DNT-CLN-007 · Plan item usa treatment_code libre sin FK a catálogo** — FK + snapshots históricos de código/etiqueta/precio/coste/metadata + ad-hoc explícito.
- [x] **DNT-CLN-008 · Requirements de consentimiento tienen lógica dual DB/demo-client** — requirements persistentes derivados del snapshot del plan item y satisfechos por documentos firmados; cliente solo renderiza servidor.
- [x] **DNT-CLN-009 · Firma y precondiciones no están garantizadas en una transacción DB** — RPC bloquea budget/plan, valida versión+consentimientos y crea snapshot inmutable con budget/items/plan/requirements desde DB; endpoint `/api/budgets/:id/sign`.
- [x] **DNT-CLN-010 · clinical_history_events no es ledger obligatorio** — comandos core escriben eventos semánticos; audit_log heredado de Etapa 2 permanece activo.

### Gate de salida

- [x] Un fallo parcial no deja odontograma corrupto.
- [x] Crear/editar un tratamiento actualiza todos los selectores dependientes.
- [x] No se puede firmar un presupuesto saltándose consentimientos obligatorios.
- [x] Plan y presupuesto no pueden divergir silenciosamente.

### Validaciones LIVE de Etapa 6 (no reimplementar)

- [ ] **S6-LIVE-001 · Aplicar migración Stage 6 en Supabase staging** `VALIDATION_ONLY`
- [ ] **S6-LIVE-002 · Validar concurrencia e historial de odontograma/periodoncia** `VALIDATION_ONLY`
- [ ] **S6-LIVE-003 · Validar catálogo clínico y snapshots históricos** `VALIDATION_ONLY`
- [ ] **S6-LIVE-004 · Ejecutar E2E de consentimientos y firma de presupuesto** `VALIDATION_ONLY`
- [ ] **S6-LIVE-005 · Verificar ledger clínico y audit_log con actor real** `VALIDATION_ONLY`
- [ ] **S6-LIVE-006 · Ejecutar suite completa y build bajo Node 24** `VALIDATION_ONLY`

### Verificación observada

- `stage1`–`stage6` contract checks: PASS.
- API parity: **201/201** browser contracts; 3 server-only excluidos.
- Architecture gate + pipeline self-check: PASS.
- 17/17 archivos TS/TSX modificados transpilan sintácticamente.
- Suite completa Node24/Next: pendiente de `S6-LIVE-006` porque este contenedor es Node22 y no trae `node_modules`.

### Regla para etapas posteriores

No recrear catálogo, requirements, snapshots, periodoncia versionada ni otra RPC de firma. Si staging descubre un fallo, corregir el caso reproducible sobre estas fronteras.

---

## Etapa 7 — Agenda, recepción, no-show y sala de espera

**Estado:** `pending`

> ✅ BASE YA HECHA EN ETAPA 2: transition_appointment existe como RPC transaccional base. Etapa 7 debe completar agenda, disponibilidad, no-show y realtime, no recrear la RPC desde cero.

- [ ] **DNT-AGD-001 · Appointments no están implementadas en el handler Supabase** — Pendiente según roadmap.
- [ ] **DNT-AGD-002 · No hay garantía DB contra doble reserva** — Pendiente según roadmap.
- [ ] **DNT-AGD-003 · Transiciones ARRIVED/IN_CHAIR/COMPLETED no están cerradas en Supabase** — Pendiente según roadmap.
- [ ] **DNT-AGD-004 · Avisos de sala de espera no tienen Broadcast real** — Pendiente según roadmap.
- [ ] **DNT-AGD-005 · Separación/visit gap se guarda en localStorage** — Pendiente según roadmap.
- [ ] **DNT-AGD-006 · Tablas parciales sin pipeline completo de reagendado** — Pendiente según roadmap.
- [ ] **DNT-AGD-007 · Métricas de espera/sillón no tienen proyección DB canónica** — Pendiente según roadmap.
- [ ] **DNT-STF-002 · Ausencias no tienen modelo Supabase canónico** — Pendiente según roadmap.
- [ ] **DNT-PRT-002 · Lista de espera del portal es un boolean local** — Pendiente según roadmap.

### Gate de salida

- [ ] Dos clientes concurrentes no pueden reservar el mismo recurso.
- [ ] Recepción y agenda reflejan el mismo estado sin recargar.
- [ ] Una ausencia bloquea correctamente disponibilidad.
- [ ] No-show/recall deja trazabilidad y puede reagendarse.

---

## Etapa 8 — Facturación, pagos y fiscal

**Estado:** `pending`

> ✅ BASE YA HECHA EN ETAPA 2: record_payment existe como RPC transaccional base y auditada. Etapa 8 debe construir invoices/idempotencia/fiscal y extenderla si hace falta, no crear otro ledger paralelo.

- [ ] **DNT-FIN-002 · Faltan tablas de facturas aunque la UI/API las usa** — Pendiente según roadmap.
- [ ] **DNT-FIN-003 · Proveedor de pago y ledger interno no están garantizados como una sola operación idempotente** — Pendiente según roadmap.
- [ ] **DNT-FIN-004 · Eventos financieros no invalidan dashboard/analytics/paciente** — Pendiente según roadmap.
- [ ] **DNT-FIN-005 · fiscal_records existe sin cadena de factura completa** — Pendiente según roadmap.

### Gate de salida

- [ ] Un webhook repetido no duplica pagos.
- [ ] La suma de allocations no excede el pago.
- [ ] Una factura tiene numeración/serie consistente.
- [ ] Dashboard y cuenta del paciente reaccionan al pago registrado.

---

## Etapa 9 — Inicio, análisis y KPIs reales

**Estado:** `pending`

- [x] **DNT-FIN-001 · Inicio mostraba citas/alertas/KPIs ficticios** — `RESOLVED_BY_STAGE_3`: Inicio consume Agenda, Alerts y Analytics reales.
- [x] **DNT-ANL-001 · Análisis usaba métricas y tratamientos hardcoded** — `RESOLVED_BY_STAGE_3`: consulta Analytics real.
- [x] **DNT-ANL-002 · Selector Mes/Trimestre/Año era cosmético** — `RESOLVED_BY_STAGE_3`: modifica start/end de la consulta real.
- [ ] **DNT-ANL-003 · No hay definiciones canónicas de KPIs** — Pendiente según roadmap.

### Gate de salida

- [ ] Un pago real modifica el KPI correspondiente.
- [ ] Cambiar rango temporal cambia consultas/resultados.
- [ ] No quedan valores FINANCE_KPIS o tratamientos fijos en runtime real.
- [ ] Dos pantallas que muestran el mismo KPI devuelven el mismo valor.

---

## Etapa 10 — Laboratorios y alertas conectadas

**Estado:** `pending`

- [ ] **DNT-LAB-001 · No existe maestro de laboratorios en Supabase** — Pendiente según roadmap.
- [ ] **DNT-LAB-002 · No existe tabla lab_works aunque la API y UI la usan** — Pendiente según roadmap.
- [ ] **DNT-LAB-003 · Pestaña Laboratorios no ofrece CRUD real** — Pendiente según roadmap.
- [ ] **DNT-LAB-004 · Balances reales están incompletos y pagos de laboratorio son demo** — Pendiente según roadmap.
- [ ] **DNT-LAB-005 · Suppliers analytics se usa como fuente de laboratorios** — Pendiente según roadmap.
- [ ] **DNT-LAB-006 · Adjuntos se convierten a base64 y se envían por JSON** — Pendiente según roadmap.
- [ ] **DNT-LAB-007 · Trabajo de laboratorio no tiene vínculo DB garantizado con plan/cita/prótesis** — Pendiente según roadmap.
- [x] **DNT-ALT-001 · Alertas vivían solo en estado local** — `RESOLVED_BY_STAGE_3`: Alerts usa API persistente.
- [x] **DNT-ALT-002 · Inicio contaba una lista distinta de Alertas** — `RESOLVED_BY_STAGE_3`: misma fuente + invalidación alerts/dashboard.

### Gate de salida

- [ ] Se puede crear y editar un laboratorio y usarlo inmediatamente.
- [ ] Un trabajo tiene trazabilidad clínica y económica.
- [ ] Resolver una alerta cambia Inicio sin inconsistencias.
- [ ] No quedan trabajos/laboratorios demo en cuentas reales.

---

## Etapa 11 — Personal, comunicaciones, campañas, privacidad y tareas

**Estado:** `pending`

- [ ] **DNT-STF-001 · Fichajes viven en memoria** — Pendiente según roadmap.
- [ ] **DNT-STF-004 · Solicitudes de privacidad son estado local** — Pendiente según roadmap.
- [ ] **DNT-MKT-001 · Campañas son constantes/useState** — Pendiente según roadmap.
- [ ] **DNT-MKT-002 · Comunicaciones son useState y pacientes demo** — Pendiente según roadmap.
- [ ] **DNT-MKT-003 · Consentimiento de marketing es un checkbox local** — Pendiente según roadmap.
- [ ] **DNT-MKT-004 · notifications existe pero no hay outbox unificada de entrega externa** — Pendiente según roadmap.
- [ ] **DNT-TSK-001 · Tareas rápidas son vista previa sin efectos** — Pendiente según roadmap.
- [ ] **DNT-PAT-013 · Origen declarado no está conectado a campaña/UTM** — Pendiente según roadmap.

### Gate de salida

- [ ] Recargar la página no borra fichajes, campañas ni tareas.
- [ ] Una comunicación tiene destinatario, consentimiento y estado de entrega.
- [ ] La atribución de paciente puede enlazarse a campaña/origen.
- [ ] Solicitudes de privacidad son auditables.

---

## Etapa 12 — Portal del paciente, recetas y Oye Denty

**Estado:** `pending`

- [x] **DNT-PRT-001 · Portal dependía de pacientes ficticios** — `RESOLVED_BY_STAGE_3`: usa proyección real patient-scoped.
- [ ] **DNT-RX-001 · No existe schema Supabase de recetas** — Pendiente según roadmap.
- [ ] **DNT-RX-002 · Firma de receta vive como data URL en UI antes de persistencia externa** — Pendiente según roadmap.
- [ ] **DNT-TSK-002 · NLU reconoce más acciones de las que el executor puede ejecutar** — Pendiente según roadmap.
- [ ] **DNT-TSK-003 · Acciones de voz dependen de rutas que Supabase parcial no implementa** — Pendiente según roadmap.

### Gate de salida

- [ ] El paciente solo ve sus propios datos.
- [ ] Una receta queda persistida y reproducible después de recargar.
- [ ] La voz no anuncia acciones que el backend no puede ejecutar.
- [ ] UI y voz producen el mismo resultado y audit trail.

---

## Etapa 13 — Gate final de integración

**Estado:** `control_gate_pending`

### Gate de salida

- [ ] Los 91 findings están cerrados o explícitamente aceptados con justificación.
- [ ] No existen datos demo mezclados con runtime real.
- [ ] No hay escrituras clínicas/financieras sensibles fuera de RLS/RPC/audit.
- [ ] Los módulos reaccionan a la misma fuente de verdad.
- [ ] Los criterios globales de aceptación del informe original pasan.

---

## Regla para el siguiente agente

1. **No modificar Etapas 1–6 para “mejorarlas” de nuevo.** Son dependencias cerradas; solo tocar una etapa cerrada si una validación LIVE reproduce un fallo concreto.
2. Ejecutar las validaciones LIVE cuando exista acceso al Supabase real/staging; arreglar solo fallos reproducibles.
3. Empezar implementación nueva en **Etapa 7**.
4. No reintroducir `DENTY_API_URL`, fixtures runtime, bypass ficticio, SSE propio, Web Storage operativo, query keys manuales, URLs arbitrarias de foto ni binarios base64 clínicos.
5. Cuando una etapa futura necesite `save_odontogram_batch`, `transition_appointment`, `finalize_budget_signature` o `record_payment`, **extender la RPC existente** en vez de crear una segunda fuente de verdad.
6. Mantener los IDs `DNT-*` en tests/commits/PRs y actualizar este MD + JSON al cerrar cada etapa.
