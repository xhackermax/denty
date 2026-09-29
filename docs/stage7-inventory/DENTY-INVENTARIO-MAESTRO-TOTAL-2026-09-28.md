# Denty — Inventario maestro histórico completo

> Este documento **no filtra solo lo pendiente**. Parte de los 91 hallazgos originales y conserva también lo ya resuelto, las validaciones LIVE, las acciones/gates de control y el estado actual tras la Etapa 7, preservando la extensión 6.1 de dentición real.

## Corrección de conteo

- **91** hallazgos únicos en la auditoría original.
- **49** hallazgos figuran resueltos en código/repositorio.
- **18** hallazgos (Etapas 1 y 7) están implementados en código pero siguen sujetos a validaciones LIVE.
- **24** hallazgos originales siguen sin implementar.
- Por tanto, **67 / 91** ya fueron abordados en código y **24 / 91** siguen pendientes de implementación.
- Existen **51 tareas LIVE/operativas registradas hasta Etapa 7** contando la extensión 6.1: **50 pendientes** y **1 completada/absorbida**.

**Importante:** los **46 pendientes tras Etapa 4** eran 46 *hallazgos originales todavía no implementados en ese momento*. No representaban el total histórico de hallazgos/tareas. Las validaciones LIVE son una categoría separada y no deben provocar reimplementaciones de etapas cerradas.

## Evolución histórica de los 91 hallazgos

| Momento | Hallazgos originales restantes | Cerrados desde el checkpoint anterior |
|---|---:|---:|
| Auditoría inicial | 91 | 0 |
| Tras Etapa 1 | 82 | 9 |
| Tras Etapa 2 | 75 | 7 |
| Tras Etapa 3 | 55 | 20 |
| Tras Etapa 4 | 46 | 9 |
| Tras Etapa 5 | 41 | 5 |
| Tras Etapa 6 | 33 | 8 |
| Tras Etapa 7 | 24 | 9 |

## Estado actual de los 91 hallazgos

- `RESOLVED_IN_CODE`: **49**
- `IMPLEMENTED_PENDING_LIVE_VALIDATION`: **18**
- `PENDING_IMPLEMENTATION`: **24**

Pendientes por prioridad:

- **P0_CRITICAL: 5**
- **P1_HIGH: 19**
- **P2_MEDIUM: 0**

---

# Etapa 0 — Congelar estado y crear línea base

**Estado de etapa:** `control_gate_pending`

**Objetivo:** Poder comparar cada cambio contra un estado reproducible y evitar que una migración destruya datos o esconda regresiones.

Esta etapa es un gate de control y no posee IDs `DNT-*` propios.

## Acciones de la etapa

- Crear rama exclusiva de refactor Supabase.
- Guardar snapshot/export del schema actual y de las migraciones.
- Registrar el estado actual de build, lint, typecheck y tests sin intentar arreglarlo todavía.
- Crear dos clínicas de prueba, dos usuarios staff y dos pacientes para pruebas de aislamiento.
- Separar explícitamente entorno demo/dev del entorno real.
- Documentar variables de entorno permitidas y prohibir secretos privilegiados en cliente.

## Gate de salida

- [ ] El proyecto puede arrancar de forma reproducible.
- [ ] Existe una base de pruebas que permita comprobar cross-clinic access.
- [ ] No existe corpus ficticio en el runtime; Etapa 3 lo eliminó y lo protege con un contrato de regresión.

---

# Etapa 1 — Identidad, autenticación, roles y contexto de clínica

**Estado de etapa:** `implemented_code_pending_live_gate`
**Bloqueo:** `DO_NOT_REIMPLEMENT`

**Objetivo:** Conseguir una identidad única basada en Supabase Auth antes de seguir construyendo encima.

**Hallazgos originales asignados:** 9

- IMPLEMENTED_PENDING_LIVE_VALIDATION: **9**

## Hallazgos

### [x] DNT-P0-001 — Dos sistemas de identidad incompatibles

- **Prioridad:** P0_CRITICAL
- **Módulo:** Auth y roles
- **Estado actual:** `IMPLEMENTED_PENDING_LIVE_VALIDATION` (`implemented_code_pending_live_gate`)
- **Nota de estado:** Supabase Auth pasa a ser la identidad de runtime; actor resuelto desde auth user -> profiles -> clinic_members/patient_accounts. Se retiraron PBKDF2 y cookie de actor propia.
- **Objetivo original:** Supabase debe ser la identidad única: auth.users → profiles → clinic_members/patient_accounts.
- **Problema observado originalmente:** Las migraciones preparan auth.users/profiles/clinic_members, pero el login real usa denty_users, PBKDF2 y cookie propia.
- **Solución Supabase prevista:**
  - Estrategia: Migrar completamente a Supabase Auth SSR.
  - schema: auth.users raíz
  - schema: profiles 1:1
  - schema: clinic_members para tenant/rol
  - schema: patient_accounts para portal
  - backend: @supabase/ssr con cookie session
  - backend: resolver actor por auth.uid()
  - migration: mapear denty_users
  - migration: invitar/resetear passwords
  - migration: eliminar denty_users al cortar
- **Criterios de aceptación originales:**
  - Login staff/paciente produce auth.uid() real.
  - denty_users deja de intervenir.
  - RLS aísla dos clínicas.

### [x] DNT-P0-002 — Clave privilegiada usada como Bearer para operaciones normales

- **Prioridad:** P0_CRITICAL
- **Módulo:** Auth y roles
- **Estado actual:** `IMPLEMENTED_PENDING_LIVE_VALIDATION` (`implemented_code_pending_live_gate`)
- **Nota de estado:** CRUD Supabase local ordinario usa publishable key + JWT del usuario. La clave secret/service-role queda limitada a aprovisionamiento administrativo.
- **Objetivo original:** CRUD de usuario debe usar su JWT para que RLS sea la barrera efectiva.
- **Problema observado originalmente:** resolveSupabaseCredentials prioriza service/secret key y SupabaseRestClient usa esa key como apikey y Authorization.
- **Solución Supabase prevista:**
  - Estrategia: Separar cliente user-scoped y admin-scoped.
  - backend: server/browser clients con JWT usuario para tráfico normal
  - backend: secret client solo provisioning/jobs/webhooks verificados
- **Criterios de aceptación originales:**
  - Las rutas normales funcionan sin secret client.
  - Pruebas RLS fallan correctamente al cruzar tenant.

### [x] DNT-P0-003 — denty_users contiene password_hash y no tiene RLS

- **Prioridad:** P0_CRITICAL
- **Módulo:** Auth y roles
- **Estado actual:** `IMPLEMENTED_PENDING_LIVE_VALIDATION` (`implemented_code_pending_live_gate`)
- **Nota de estado:** La migración conserva solo metadata no secreta en legacy_identity_map y elimina denty_users/password_hash.
- **Objetivo original:** Credenciales no deben almacenarse en tablas de negocio expuestas por Data API.
- **Problema observado originalmente:** public.denty_users guarda password_hash y no se habilita RLS en la migración.
- **Solución Supabase prevista:**
  - Estrategia: Migrar y DROP denty_users.
- **Criterios de aceptación originales:**
  - No existe tabla de negocio con hashes de contraseña.

### [x] DNT-P0-004 — Bootstrap administrativo admin/admin

- **Prioridad:** P0_CRITICAL
- **Módulo:** Auth y roles
- **Estado actual:** `IMPLEMENTED_PENDING_LIVE_VALIDATION` (`implemented_code_pending_live_gate`)
- **Nota de estado:** El bootstrap admin/admin fue eliminado. Se añadió scripts/auth/provision-first-owner.mjs con contraseña fuerte, secret server-only y audit_log.
- **Objetivo original:** No debe existir credencial admin predeterminada.
- **Problema observado originalmente:** Si no hay usuarios locales, admin/admin crea/acepta un Administrador.
- **Solución Supabase prevista:**
  - Estrategia: Eliminar bootstrap fijo.
- **Criterios de aceptación originales:**
  - admin/admin siempre falla.
  - Primer admin solo por proceso seguro.

### [x] DNT-P0-005 — Número de ficha + DNI se usa como credencial

- **Prioridad:** P0_CRITICAL
- **Módulo:** Portal del paciente
- **Estado actual:** `IMPLEMENTED_PENDING_LIVE_VALIDATION` (`implemented_code_pending_live_gate`)
- **Nota de estado:** Se retiró ficha+DNI como credencial. El rol PATIENT se resuelve por patient_accounts ligado a auth.uid().
- **Objetivo original:** El paciente necesita autenticación revocable y no basada en un identificador personal.
- **Problema observado originalmente:** findPatientForPortalLogin busca record_number + dni y crea actor PATIENT.
- **Solución Supabase prevista:**
  - Estrategia: Supabase Auth para pacientes.
  - schema: patient_accounts(profile_id,clinic_id,patient_id)
  - rls: paciente solo rows vinculadas a auth.uid()
- **Criterios de aceptación originales:**
  - Ningún login usa DNI como contraseña.
  - Manipular patient_id no permite ver otro paciente.

### [x] DNT-P0-006 — Roles DB y dominio no coinciden

- **Prioridad:** P1_HIGH
- **Módulo:** Auth y roles
- **Estado actual:** `IMPLEMENTED_PENDING_LIVE_VALIDATION` (`implemented_code_pending_live_gate`)
- **Nota de estado:** Roles normalizados a ADMIN/RECEPTION/DENTIST/ASSISTANT/PATIENT en app y migración DB.
- **Objetivo original:** Rol y permisos deben significar lo mismo en UI, API y RLS.
- **Problema observado originalmente:** Dominio: ADMIN/RECEPTION/DENTIST/ASSISTANT/PATIENT. clinic_members: ADMIN/USER/PATIENT y staff_type DENTIST/SECRETARY.
- **Solución Supabase prevista:**
  - Estrategia: Normalizar un solo vocabulario.
  - schema: rol/membership coherente
  - schema: permisos finos en user_permissions
- **Criterios de aceptación originales:**
  - Mismos roles válidos en DB y app.

### [x] DNT-P0-007 — staff_members no enlaza con profile/auth user

- **Prioridad:** P1_HIGH
- **Módulo:** Personal
- **Estado actual:** `IMPLEMENTED_PENDING_LIVE_VALIDATION` (`implemented_code_pending_live_gate`)
- **Nota de estado:** staff_members.profile_id se exige como vínculo de identidad para dentistas y se añadió unicidad por clínica/perfil activo.
- **Objetivo original:** Toda acción clínica debe atribuirse al profesional autenticado.
- **Problema observado originalmente:** staff_members no tiene profile_id y clinic_members es una entidad paralela.
- **Solución Supabase prevista:**
  - Estrategia: Añadir staff_members.profile_id FK a profiles, único por clínica cuando aplique.
- **Criterios de aceptación originales:**
  - Un DENTIST autenticado resuelve exactamente un staff_member activo.

### [x] DNT-P0-014 — Clinic context puede resolverse por fallback/autocreación

- **Prioridad:** P0_CRITICAL
- **Módulo:** Multi-clínica
- **Estado actual:** `IMPLEMENTED_PENDING_LIVE_VALIDATION` (`implemented_code_pending_live_gate`)
- **Nota de estado:** PatientRepository ya no elige la primera clínica ni autocrea Denty. El clinic_id procede del actor/membership o falla explícitamente.
- **Objetivo original:** Toda mutación debe derivar clinic_id del membership autenticado.
- **Problema observado originalmente:** PatientRepository puede resolver la primera clínica o crear una clínica Denty si falta contexto.
- **Solución Supabase prevista:**
  - Estrategia: Eliminar fallback.
- **Criterios de aceptación originales:**
  - Nunca se selecciona 'primera clínica' ni se autocrea desde alta de paciente.

### [x] DNT-STF-003 — Sesiones de usuario mostradas son ficticias

- **Prioridad:** P1_HIGH
- **Módulo:** Settings / seguridad
- **Estado actual:** `IMPLEMENTED_PENDING_LIVE_VALIDATION` (`implemented_code_pending_live_gate`)
- **Nota de estado:** Settings carga app_sessions reales y permite revocar sesiones de aplicación; logout usa scope=local.
- **Objetivo original:** Sesiones/revocación deben corresponder a Auth real.
- **Problema observado originalmente:** Settings usa INITIAL_SESSIONS y revokeSession filtra useState.
- **Solución Supabase prevista:**
  - Estrategia: Tras Supabase Auth, usar capacidades reales de sign-out/revocation; si se necesita device session registry, mantener app_sessions ligada a auth user y refresh/session metadata.
- **Criterios de aceptación originales:**
  - Revocar invalida sesión real y el dispositivo pierde acceso.

## Acciones de la etapa

- Migrar staff y pacientes a Supabase Auth.
- Eliminar denty_users, password_hash y bootstrap admin/admin.
- Usar profiles + clinic_members + patient_accounts como modelo de identidad.
- Alinear roles de dominio y roles persistidos.
- Vincular staff_members con profile/auth user.
- Eliminar el login por número de ficha + DNI.
- Resolver clinic_id/site_id exclusivamente desde membresías autorizadas, sin autocreación o fallback silencioso.
- Mostrar sesiones reales, no fixtures.

## Gate de salida

- [x] Todo usuario activo tiene auth.uid() real.
- [x] admin/admin falla siempre.
- [x] No se almacenan hashes de contraseña en tablas de negocio.
- [x] Cambiar IDs manualmente no permite saltar de clínica.
- [x] El portal ya no usa DNI como contraseña.

## Validaciones LIVE asociadas

### [ ] S1-LIVE-001 — Respaldar y aplicar la migración Stage 1 primero en staging

- **Estado:** `pending`
- Ejecutar 20260928001000_stage1_identity_auth_cutover.sql contra una copia/staging y revisar errores SQL/RLS antes de producción.

### [ ] S1-LIVE-002 — Migrar/invitar usuarios legacy antes del corte definitivo

- **Estado:** `pending`
- Los hashes PBKDF2 locales no se pueden reutilizar como contraseña de Supabase Auth. Crear/invitar cada identidad real, vincularla a profile/membership y verificar acceso antes de eliminar el almacén legacy.

### [ ] S1-LIVE-003 — Enlazar staff existentes con profiles

- **Estado:** `pending`
- Para cada DENTIST existente, staff_members.profile_id debe apuntar a exactamente un profile/auth user activo. Revisar también ADMIN/RECEPTION/ASSISTANT.

### [ ] S1-LIVE-004 — Configurar Supabase Auth URLs y plantillas de email

- **Estado:** `pending`
- Configurar Site URL/redirect URLs y plantillas de invite/recovery del proyecto real.

### [ ] S1-LIVE-005 — Completar recuperación de contraseña SSR/PKCE

- **Estado:** `pending`
- El envío de recovery ya usa Supabase Auth, pero falta callback final de recuperación. Preferencia: @supabase/ssr + PKCE siguiendo la guía oficial.

### [ ] S1-LIVE-006 — Verificar aislamiento real entre dos clínicas

- **Estado:** `pending`
- Con dos usuarios y dos clínicas, comprobar que modificar clinic_id/patient_id manualmente produce 0 filas/403 y nunca fuga datos.

### [ ] S1-LIVE-007 — Verificar login real de staff y paciente

- **Estado:** `pending`
- Probar ADMIN, RECEPTION, DENTIST, ASSISTANT y PATIENT con usuarios reales de Supabase Auth y membresías reales.

### [ ] S1-LIVE-008 — Validar revocación de sesiones en Supabase real

- **Estado:** `pending`
- Confirmar que revocar app_session corta acceso del dispositivo inmediatamente y decidir si se requiere revocación exacta del refresh session en GoTrue además del bloqueo de Denty.

### [ ] S1-LIVE-009 — Ejecutar build/typecheck/test completos bajo Node 24

- **Estado:** `pending`
- Este contenedor usa Node 22 y npm ci no pudo completarse por timeout de red. Ejecutar npm ci + npm run typecheck + npm test + npm run build en Node 24.

### [x] S1-LIVE-010 — Migrar el adaptador Auth manual al helper oficial @supabase/ssr

- **Estado:** `completed_in_stage3`
- Cerrado por Etapa 3: clientes oficiales @supabase/ssr y @supabase/supabase-js normalizados. No reabrir Etapa 1.

---

# Etapa 2 — RLS, transacciones, auditoría y constraints base

**Estado de etapa:** `completed`
**Bloqueo:** `DO_NOT_REIMPLEMENT`

**Objetivo:** Hacer que PostgreSQL/Supabase sea la barrera de seguridad e integridad, no el código de interfaz.

**Hallazgos originales asignados:** 7

- RESOLVED_IN_CODE: **7**

## Hallazgos

### [x] DNT-P0-010 — Tablas tenant sin RLS

- **Prioridad:** P0_CRITICAL
- **Módulo:** Seguridad / RLS
- **Estado actual:** `RESOLVED_IN_CODE` (`completed`)
- **Nota de estado:** RLS habilitado en las 44 tablas public efectivas del schema. denty_users ya fue eliminado por Etapa 1; legacy_identity_map queda sin grants authenticated. La prueba stage2-security-contract vigila regresiones.
- **Objetivo original:** Toda tabla tenant expuesta debe aislarse por clínica.
- **Problema observado originalmente:** Sin ENABLE RLS visible: clinics, staff_members, sites, cabinets, clinical_plan_dependencies, document_templates y denty_users.
- **Solución Supabase prevista:**
  - Estrategia: ENABLE RLS + policies por operación.
  - rls: SELECT por membership
  - rls: INSERT/UPDATE/DELETE por permiso
  - rls: WITH CHECK
- **Criterios de aceptación originales:**
  - Matriz de pruebas confirma aislamiento en todas las tablas tenant.

### [x] DNT-P0-011 — RLS habilitado pero políticas incompletas

- **Prioridad:** P0_CRITICAL
- **Módulo:** Seguridad / RLS
- **Estado actual:** `RESOLVED_IN_CODE` (`completed`)
- **Nota de estado:** Matriz explícita de policies por clínica/paciente/actor para lectura y escritura. El runtime CRUD ordinario conserva publishable key + JWT del usuario; no usa service-role.
- **Objetivo original:** Las rutas productivas deben funcionar con JWT de usuario, no secret key.
- **Problema observado originalmente:** Varias tablas clínicas tienen RLS sin policies visibles; patients/appointments/documents/payments muestran principalmente SELECT policies.
- **Solución Supabase prevista:**
  - Estrategia: Matriz table×action×permission.
- **Criterios de aceptación originales:**
  - Toda operación core tiene allow y deny test.

### [x] DNT-P0-012 — SECURITY DEFINER con search_path=public

- **Prioridad:** P1_HIGH
- **Módulo:** Seguridad / RLS
- **Estado actual:** `RESOLVED_IN_CODE` (`completed`)
- **Nota de estado:** Helpers privilegiados movidos al schema private, SECURITY DEFINER con search_path vacío y referencias schema-qualified. Grants/revokes de EXECUTE son explícitos.
- **Objetivo original:** Funciones privilegiadas deben minimizar resolución de objetos y grants.
- **Problema observado originalmente:** is_clinic_member/is_clinic_admin/can_access_patient usan SECURITY DEFINER SET search_path=public.
- **Solución Supabase prevista:**
  - Estrategia: Preferir SECURITY INVOKER; si DEFINER es imprescindible, search_path='' y nombres schema-qualified.
- **Criterios de aceptación originales:**
  - Ninguna función sensible definer usa search_path mutable.

### [x] DNT-P0-013 — Operaciones compuestas carecen de frontera transaccional común

- **Prioridad:** P1_HIGH
- **Módulo:** Arquitectura global
- **Estado actual:** `RESOLVED_IN_CODE` (`completed`)
- **Nota de estado:** Se creó frontera transaccional con RPC SECURITY INVOKER para save_odontogram_batch, transition_appointment, finalize_budget_signature y record_payment. saveOdontogramBatch ya consume la RPC. RPCs de módulos todavía inexistentes se implementarán en sus propias etapas, sin rehacer esta base.
- **Objetivo original:** Acciones multi-entidad deben ser all-or-nothing.
- **Problema observado originalmente:** Repositorios y UI encadenan varias peticiones REST/mutations independientes.
- **Solución Supabase prevista:**
  - Estrategia: RPC transaccionales security invoker.
- **Criterios de aceptación originales:**
  - Fallo intermedio hace rollback completo.

### [x] DNT-P0-018 — audit_log no está conectado obligatoriamente a mutaciones

- **Prioridad:** P0_CRITICAL
- **Módulo:** Auditoría
- **Estado actual:** `RESOLVED_IN_CODE` (`completed`)
- **Nota de estado:** audit_log se convierte en ledger append-only; private.audit_sensitive_mutation registra actor, clinic/patient, before/after y correlation_id dentro de la misma transacción. Triggers cubren mutaciones sensibles clínicas, identidad y pagos.
- **Objetivo original:** Acciones clínicas/económicas/administrativas deben ser auditables.
- **Problema observado originalmente:** Existe audit_log pero no se encontraron triggers generales ni comandos transaccionales que garanticen insert.
- **Solución Supabase prevista:**
  - Estrategia: Audit append-only en la misma transacción.
- **Criterios de aceptación originales:**
  - Toda mutación sensible crea evento de auditoría inmutable.

### [x] DNT-P0-019 — updated_at no se actualiza automáticamente

- **Prioridad:** P1_HIGH
- **Módulo:** Base de datos
- **Estado actual:** `RESOLVED_IN_CODE` (`completed`)
- **Nota de estado:** private.set_updated_at() + triggers consistentes en tablas mutables. El cliente deja de enviar updated_at manualmente al actualizar paciente.
- **Objetivo original:** updated_at debe ser fiable independientemente del cliente.
- **Problema observado originalmente:** Varias tablas tienen default now() pero no trigger común BEFORE UPDATE.
- **Solución Supabase prevista:**
  - Estrategia: Trigger reusable set_updated_at() en todas las tablas mutables.
- **Criterios de aceptación originales:**
  - Un UPDATE cambia updated_at sin que el cliente lo envíe.

### [x] DNT-DAT-002 — Faltan constraints/indexes tenant/natural keys de varios maestros

- **Prioridad:** P1_HIGH
- **Módulo:** Base de datos
- **Estado actual:** `RESOLVED_IN_CODE` (`completed`)
- **Nota de estado:** Añadidos unique indexes tenant/natural keys, índices de rutas RLS/consulta, CHECK temporales y FKs de integridad. Algunas constraints se crean NOT VALID para permitir auditoría de legacy antes de VALIDATE CONSTRAINT en staging.
- **Objetivo original:** Integridad debe estar en Postgres, no solo Zod.
- **Problema observado originalmente:** Record number y futuros maestros no tienen todavía constraints suficientes; policies dependerán de clinic_id/patient_id.
- **Solución Supabase prevista:**
  - Estrategia: Checklist de constraints/indexes por tabla.
- **Criterios de aceptación originales:**
  - EXPLAIN de queries core usa índices; fixtures de duplicados son rechazados.

## Acciones de la etapa

- Activar y completar RLS en todas las tablas multi-tenant.
- Separar cliente user-scoped de cliente admin/service-role.
- Revisar funciones SECURITY DEFINER y fijar search_path seguro.
- Crear RPC/Database Functions para operaciones compuestas.
- Hacer obligatorio el audit_log dentro de mutaciones sensibles.
- Añadir triggers updated_at consistentes.
- Añadir constraints e índices para claves naturales y tenant.

## Gate de salida

- [x] Las operaciones CRUD normales funcionan sin service-role.
- [x] Las pruebas de cross-clinic son rechazadas por RLS.
- [x] Una operación compuesta falla completa o se confirma completa.
- [x] Las mutaciones sensibles dejan audit event en la misma transacción.

## Validaciones LIVE asociadas

### [ ] S2-LIVE-001 — Aplicar Stage 1 y Stage 2 en Supabase staging

- **Estado:** `pending`
- **Tipo:** `validation_only`
- Respaldar staging y aplicar primero 20260928001000_stage1_identity_auth_cutover.sql y después 20260928010000_stage2_rls_transactions_audit_constraints.sql. No reescribir las migraciones salvo error SQL reproducible.

### [ ] S2-LIVE-002 — Ejecutar matriz RLS con dos clínicas y cinco roles

- **Estado:** `pending`
- **Tipo:** `validation_only`
- Probar ADMIN/RECEPTION/DENTIST/ASSISTANT/PATIENT con JWT reales. Cada actor debe ver solo clínica/paciente autorizado; IDs manipulados deben producir 0 filas/403.

### [ ] S2-LIVE-003 — Probar rollback transaccional real

- **Estado:** `pending`
- **Tipo:** `validation_only`
- Forzar un error intermedio en save_odontogram_batch/otra RPC de staging y comprobar que no queda ninguna escritura parcial ni versión avanzada.

### [ ] S2-LIVE-004 — Validar audit_log en la misma transacción

- **Estado:** `pending`
- **Tipo:** `validation_only`
- Crear/modificar/eliminar datos sensibles en staging; verificar actor, before/after, correlation_id y que UPDATE/DELETE de audit_log sean rechazados.

### [ ] S2-LIVE-005 — Revisar duplicados legacy y validar constraints NOT VALID

- **Estado:** `pending`
- **Tipo:** `validation_only`
- Buscar datos históricos incompatibles con FKs/CHECKs; corregirlos y ejecutar VALIDATE CONSTRAINT. Los unique indexes harán fallar la migración si hay duplicados y deben resolverse antes de producción.

### [ ] S2-LIVE-006 — Ejecutar suite completa bajo Node 24

- **Estado:** `pending`
- **Tipo:** `validation_only`
- En entorno con red/dependencias: npm ci && npm run security:stage2-check && npm run typecheck && npm test && npm run build. El contenedor de esta sesión era Node 22 y no permitió certificar la suite completa de Next/TS.

---

# Etapa 3 — Fuente única de verdad, Realtime y contratos

**Estado de etapa:** `completed`
**Bloqueo:** `DO_NOT_REIMPLEMENT`

**Objetivo:** Eliminar el backend paralelo, los fallbacks demo y la desincronización entre módulos.

**Hallazgos originales asignados:** 9

- RESOLVED_IN_CODE: **9**

## Hallazgos

### [x] DNT-P0-008 — Dos backends de verdad: Supabase parcial + API externo

- **Prioridad:** P0_CRITICAL
- **Módulo:** Arquitectura global
- **Estado actual:** `RESOLVED_IN_CODE` (`done`)
- **Nota de estado:** Supabase/Postgres queda como fuente canónica. request-handler ya no redirige rutas no migradas a DENTY_API_URL: responde SUPABASE_ROUTE_NOT_IMPLEMENTED y obliga a terminar la integración correcta.
- **Objetivo original:** Cada dominio debe tener una fuente de verdad única.
- **Problema observado originalmente:** handleDentyApiRequest intenta pocas rutas Supabase; el resto se proxifica a DENTY_API_URL, cuyo ejemplo es api.example.invalid.
- **Solución Supabase prevista:**
  - Estrategia: Cutover explícito a Supabase Postgres.
  - migration: inventariar todas las rutas
  - migration: eliminar fallback al alcanzar cobertura
- **Criterios de aceptación originales:**
  - Con DENTY_API_URL vacío funcionan todos los flujos core.
  - Ninguna ruta cae silenciosamente al proxy.

### [x] DNT-P0-009 — Faltan @supabase/supabase-js y @supabase/ssr

- **Prioridad:** P1_HIGH
- **Módulo:** Arquitectura global
- **Estado actual:** `RESOLVED_IN_CODE` (`done`)
- **Nota de estado:** @supabase/supabase-js y @supabase/ssr están instalados y normalizados para browser/server/auth. El adaptador Auth manual queda sustituido por clientes oficiales.
- **Objetivo original:** Next.js debe usar clientes oficiales para Auth, Storage y Realtime.
- **Problema observado originalmente:** package.json no incluye los paquetes; existe cliente REST manual.
- **Solución Supabase prevista:**
  - Estrategia: Introducir SDK oficial.
- **Criterios de aceptación originales:**
  - Auth/Storage/Realtime usan SDK oficial.

### [x] DNT-P0-016 — Realtime de Supabase no está configurado

- **Prioridad:** P1_HIGH
- **Módulo:** Realtime
- **Estado actual:** `RESOLVED_IN_CODE` (`done`)
- **Nota de estado:** Realtime usa canales privados de Supabase Broadcast. La migración Stage 3 crea políticas de realtime.messages y triggers que emiten cambios por clinic:<clinic_id>. El SSE /api/events fue eliminado.
- **Objetivo original:** Agenda/recepción/alertas deben reaccionar a commits reales.
- **Problema observado originalmente:** Bridge usa EventSource /api/events; no hay realtime.broadcast_changes en migraciones y realtime está false por defecto.
- **Solución Supabase prevista:**
  - Estrategia: Supabase Broadcast privado.
- **Criterios de aceptación originales:**
  - Dos sesiones de misma clínica convergen sin reload; otra clínica no puede suscribirse.

### [x] DNT-P0-017 — Invalidación de caché omite alertas, finanzas, analytics y otros dominios

- **Prioridad:** P1_HIGH
- **Módulo:** Realtime
- **Estado actual:** `RESOLVED_IN_CODE` (`done`)
- **Nota de estado:** Realtime bridge invalida query roots dependientes para pacientes, agenda, clínica, documentos, recetas, laboratorio, presupuestos, facturas, pagos, alertas, staff, comunicaciones, campañas, dashboard y analytics.
- **Objetivo original:** Un cambio debe actualizar todas sus proyecciones dependientes.
- **Problema observado originalmente:** ROOT_KEYS solo cubre patient/appointment/clinical/odontogram/treatment/document/lab.
- **Solución Supabase prevista:**
  - Estrategia: Mapa de eventos semánticos → múltiples query keys.
- **Criterios de aceptación originales:**
  - Tests verifican invalidaciones por evento.

### [x] DNT-P0-020 — Analytics y otros outputs usan schemas demasiado permisivos

- **Prioridad:** P1_HIGH
- **Módulo:** Contratos API
- **Estado actual:** `RESOLVED_IN_CODE` (`done`)
- **Nota de estado:** Schemas de Analytics dejan de aceptar catchall/passthrough arbitrario. El contrato Stage 3 impide volver a respuestas críticas permisivas.
- **Objetivo original:** Frontend y backend deben fallar ante contratos incorrectos.
- **Problema observado originalmente:** analyticsResultSchema usa z.object({}).passthrough().
- **Solución Supabase prevista:**
  - Estrategia: Schema Zod específico por RPC/endpoint + Database types generados.
- **Criterios de aceptación originales:**
  - Cada analytics endpoint tiene input/output tipado y contract test.

### [x] DNT-P0-021 — Fixtures demo mezclados con runtime real

- **Prioridad:** P1_HIGH
- **Módulo:** Datos demo
- **Estado actual:** `RESOLVED_IN_CODE` (`done`)
- **Nota de estado:** La cuenta y corpus de datos ficticios se eliminaron físicamente del runtime: borrado src/shared/demo, assets de pacientes ficticios, bypass/flags, rutas, copy, datos iniciales y progreso local de Denty Games. Producción muestra datos reales o estado vacío/error.
- **Objetivo original:** Demo debe ser un tenant real aislado, no una segunda implementación.
- **Problema observado originalmente:** Numerosos features importan DEMO_* / INITIAL_*; Dashboard, Alerts, Campaigns, Communications y Tasks operan con ellos.
- **Solución Supabase prevista:**
  - Estrategia: Demo clinic seed en Supabase o proyecto separado.
- **Criterios de aceptación originales:**
  - Build productivo no importa shared/demo desde features.
  - Cuenta demo usa mismas APIs/RLS.

### [x] DNT-P0-023 — Query key factory incompleto

- **Prioridad:** P2_MEDIUM
- **Módulo:** Arquitectura global
- **Estado actual:** `RESOLVED_IN_CODE` (`done`)
- **Nota de estado:** dentyQueryKeys queda centralizado y ampliado por dominios/tenant, incluidos settings y treatmentCatalog. El contrato Stage 3 prohíbe queryKey arrays manuales en runtime.
- **Objetivo original:** Todos los dominios persistentes necesitan keys canónicas.
- **Problema observado originalmente:** No incluye dashboard, alerts, analytics, staff, campaigns, communications, settings, portal ni treatment catalog.
- **Solución Supabase prevista:**
  - Estrategia: Extender key factory y prohibir arrays literales en dominios core.
- **Criterios de aceptación originales:**
  - Eventos/mutations usan únicamente keys canónicas.

### [x] DNT-LOC-001 — El principio local-first no tiene una capa de sincronización demostrable

- **Prioridad:** P1_HIGH
- **Módulo:** Arquitectura local-first
- **Estado actual:** `RESOLVED_IN_CODE` (`done`)
- **Nota de estado:** Se documentó política server-authoritative: datos clínicos/administrativos/financieros solo se consideran guardados tras confirmación de Supabase. Web Storage se limita a preferencias visuales; no se finge soporte offline clínico.
- **Objetivo original:** Si Denty se declara local-first, drafts/offline y reconciliación deben estar definidos.
- **Problema observado originalmente:** No se observó base local durable/outbox de cliente o protocolo de sync; en cambio hay localStorage demo y llamadas online.
- **Solución Supabase prevista:**
  - Estrategia: Definir alcance real.
- **Criterios de aceptación originales:**
  - Modo offline tiene comportamiento documentado; cada draft indica estado pending/synced/conflict.

### [x] DNT-MCL-001 — Filtros y preferencias no tienen contexto de site/clinic uniforme

- **Prioridad:** P1_HIGH
- **Módulo:** Multi-clínica
- **Estado actual:** `RESOLVED_IN_CODE` (`done`)
- **Nota de estado:** ActiveContext centraliza activeClinicId/activeSiteId. Agenda, Inicio y Análisis incorporan sede activa en consulta/cache y el cambio de sede invalida proyecciones dependientes.
- **Objetivo original:** Todo dato operativo debe saber clínica y, cuando aplique, sede.
- **Problema observado originalmente:** DB tiene clinic_id/site_id en parte del modelo, pero múltiples módulos demo/local no usan ese contexto y analytics hardcoded no filtra site.
- **Solución Supabase prevista:**
  - Estrategia: Context provider derivado de membership + selected site; query keys incluyen clinic/site cuando aplique; RLS siempre clinic, filtros site en SQL.
- **Criterios de aceptación originales:**
  - Cambiar sede cambia agenda/KPI sin cambiar tenant; jamás cruza clínicas.

## Acciones de la etapa

- Definir Supabase/Postgres como fuente canónica del runtime.
- Eliminar rutas que caen a backend alternativo o fixtures cuando falla Supabase.
- Instalar/normalizar clientes oficiales Supabase SSR/browser.
- Eliminar DEMO_* de superficies productivas.
- Completar query-key factory por dominio y tenant.
- Configurar Realtime/Broadcast y una matriz de invalidación por evento.
- Endurecer schemas de entrada/salida API.
- Definir alcance real del modo local-first y estrategia de sincronización.
- Hacer uniforme el contexto clinic/site en filtros y preferencias.

## Gate de salida

- [x] Una misma entidad tiene una sola fuente de verdad.
- [x] No existe fallback silencioso a datos demo en producción.
- [x] Un cambio relevante invalida todas las vistas dependientes.
- [x] Las respuestas API críticas se validan con schemas explícitos.

## Validaciones LIVE asociadas

### [ ] S3-LIVE-001 — Aplicar migración Realtime Stage 3 en Supabase staging

- **Estado:** `pending`
- **Tipo:** `validation_only`
- Aplicar 20260928030000_stage3_realtime_single_source.sql después de Stage 1/2 y verificar que realtime.messages/policies/triggers se crean sin conflicto.

### [ ] S3-LIVE-002 — Probar Broadcast privado entre dos sesiones reales

- **Estado:** `pending`
- **Tipo:** `validation_only`
- Abrir dos clientes de la misma clínica y comprobar invalidación inmediata; repetir con otra clínica y confirmar que no recibe eventos ajenos.

### [ ] S3-LIVE-003 — Probar cambio real de sede

- **Estado:** `pending`
- **Tipo:** `validation_only`
- Con una clínica multi-sede, cambiar activeSiteId y comprobar Agenda/Inicio/Análisis, cache e invalidaciones sin mezclar citas/KPIs de otra sede.

### [ ] S3-LIVE-004 — Ejecutar build/typecheck/test completos en Node 24

- **Estado:** `pending`
- **Tipo:** `validation_only`
- Ejecutar npm ci, typecheck, unit/integration y next build en el entorno Node 24 de CI/Vercel. No reabrir Etapa 3 salvo fallo reproducible atribuible a estos cambios.

---

# Etapa 4 — Paciente maestro, importación, archivo y retención

**Estado de etapa:** `completed`
**Bloqueo:** `DO_NOT_REIMPLEMENT`

**Objetivo:** Conseguir una ficha de paciente consistente y reutilizable por todos los módulos.

**Hallazgos originales asignados:** 10

- RESOLVED_IN_CODE: **10**

## Hallazgos

### [x] DNT-PAT-004 — Importación no cubre JSON/XLSX

- **Prioridad:** P1_HIGH
- **Módulo:** Pacientes
- **Estado actual:** `RESOLVED_IN_CODE` (`completed`)
- **Resuelto por:** stage4
- **Nota de estado:** Importación ampliada a CSV/TSV, JSON y XLSX con prevalidación completa antes de escribir. XLSX soporta shared strings, inline strings y fechas numéricas de Excel sin añadir dependencia externa.
- **Objetivo original:** Importar CSV/TSV/JSON/XLSX con validación y reporte.
- **Problema observado originalmente:** patient-import.ts cubre CSV/TSV pero no JSON/XLSX.
- **Solución Supabase prevista:**
  - Estrategia: Import jobs server-side.
  - schema: patient_import_jobs
  - schema: patient_import_rows
  - storage: original en bucket privado imports
- **Criterios de aceptación originales:**
  - Fixtures de los cuatro formatos producen mismo resultado normalizado.

### [x] DNT-PAT-005 — Se detecta ficha legado pero no se conserva

- **Prioridad:** P1_HIGH
- **Módulo:** Pacientes
- **Estado actual:** `RESOLVED_IN_CODE` (`completed`)
- **Resuelto por:** stage4
- **Nota de estado:** legacyRecordNumber se preserva extremo a extremo como recordNumber en el payload y se persiste en patients.record_number; ya no se detecta para luego descartarse.
- **Objetivo original:** Preservar número de ficha/external id cuando sea posible.
- **Problema observado originalmente:** El import mapea record_number pero createPatientSchema no lo acepta y la UI indica que backend asigna nueva ficha.
- **Solución Supabase prevista:**
  - Estrategia: Separar record_number canónico y external ids.
  - schema: UNIQUE(clinic_id,record_number)
  - schema: patient_external_ids(clinic_id,patient_id,system,external_id)
- **Criterios de aceptación originales:**
  - Import conserva ficha válida y reporta colisiones.

### [x] DNT-PAT-006 — record_number no tiene constraint único en DB

- **Prioridad:** P1_HIGH
- **Módulo:** Pacientes
- **Estado actual:** `RESOLVED_IN_CODE` (`completed`)
- **Resuelto por:** stage4
- **Nota de estado:** patients_clinic_record_number_uq garantiza unicidad de (clinic_id, record_number); record_number pasa a NOT NULL y los registros legacy vacíos se rellenan de forma determinista antes del constraint.
- **Objetivo original:** La ficha debe ser única incluso con concurrencia.
- **Problema observado originalmente:** record_number es text sin UNIQUE; Node genera DNT-fecha-UUID.
- **Solución Supabase prevista:**
  - Estrategia: UNIQUE(clinic_id,record_number) y generación DB.
- **Criterios de aceptación originales:**
  - Dos altas concurrentes nunca comparten ficha.

### [x] DNT-PAT-007 — DNI obligatorio/nullable es inconsistente

- **Prioridad:** P1_HIGH
- **Módulo:** Pacientes
- **Estado actual:** `RESOLVED_IN_CODE` (`completed`)
- **Resuelto por:** stage4
- **Nota de estado:** DNI queda opcional/nullable de forma coherente en contratos, admisión, importación y repositorio. Los blancos se normalizan a NULL en DB.
- **Objetivo original:** Regla de DNI debe ser única.
- **Problema observado originalmente:** DB y patientSchema permiten null; createPatientSchema exige DNI; imports pueden carecer de él.
- **Solución Supabase prevista:**
  - Estrategia: Recomendado: DNI nullable; validar solo si existe.
  - schema: índice unique parcial por clínica sobre DNI normalizado si negocio lo exige
- **Criterios de aceptación originales:**
  - Alta sin DNI tiene comportamiento definido; duplicados siguen política explícita.

### [x] DNT-PAT-008 — birth_date modelado como timestamptz

- **Prioridad:** P2_MEDIUM
- **Módulo:** Pacientes
- **Estado actual:** `RESOLVED_IN_CODE` (`completed`)
- **Resuelto por:** stage4
- **Nota de estado:** patients.birth_date migra de timestamptz a DATE y los contratos usan YYYY-MM-DD sin conversión horaria.
- **Objetivo original:** Fecha de nacimiento es date civil.
- **Problema observado originalmente:** DB usa timestamptz y contrato exige datetime con offset.
- **Solución Supabase prevista:**
  - Estrategia: Migrar a PostgreSQL date y contrato YYYY-MM-DD.
- **Criterios de aceptación originales:**
  - Mismo cumpleaños en cualquier zona horaria.

### [x] DNT-PAT-009 — Proyección de paciente devuelve módulos vacíos

- **Prioridad:** P0_CRITICAL
- **Módulo:** Pacientes
- **Estado actual:** `RESOLVED_IN_CODE` (`completed`)
- **Resuelto por:** stage4
- **Nota de estado:** PatientRepository.getProjection consulta citas, plan clínico, presupuestos y documentos reales. No fabrica arrays vacíos para módulos ya persistidos; recetas quedan explícitamente para Etapa 12.
- **Objetivo original:** Ficha única debe agregar citas, plan, presupuestos, documentos, recetas y economía.
- **Problema observado originalmente:** getProjection devuelve appointments [], plan null, budgets [], documents [], prescriptions [].
- **Solución Supabase prevista:**
  - Estrategia: patient_overview(patient_id) RLS-safe o queries paralelas reales.
- **Criterios de aceptación originales:**
  - Crear cita/pago/documento actualiza ficha real.

### [x] DNT-PAT-010 — No hay comando real archive/restore

- **Prioridad:** P1_HIGH
- **Módulo:** Pacientes
- **Estado actual:** `RESOLVED_IN_CODE` (`completed`)
- **Resuelto por:** stage4
- **Nota de estado:** Añadidas RPC SECURITY INVOKER archive_patient/restore_patient, endpoints API, cliente/hook React Query y acciones de UI. La lista activa excluye archivados salvo includeArchived=true.
- **Objetivo original:** Limpiar pacientes residuales sin borrar historia clínica.
- **Problema observado originalmente:** patients tiene archived_at, pero handler Supabase implementado no expone archive/restore.
- **Solución Supabase prevista:**
  - Estrategia: RPC archive_patient/restore_patient.
- **Criterios de aceptación originales:**
  - Archivar quita de listados activos y conserva expediente; restaurar lo recupera.

### [x] DNT-PAT-011 — medical_profile mutable sin versión clínica

- **Prioridad:** P1_HIGH
- **Módulo:** Pacientes
- **Estado actual:** `RESOLVED_IN_CODE` (`completed`)
- **Resuelto por:** stage4
- **Nota de estado:** Creada patient_medical_profile_versions con RLS y trigger que añade una versión inmutable al cambiar medical_profile.
- **Objetivo original:** Cambios de alergias/medicación/condiciones deben ser trazables.
- **Problema observado originalmente:** medical_profile es JSONB sobre patients; no hay historial específico obligatorio.
- **Solución Supabase prevista:**
  - Estrategia: medical_profile_versions append-only + current snapshot.
- **Criterios de aceptación originales:**
  - Cada cambio conserva before/after/actor y detecta concurrencia.

### [x] DNT-PAT-012 — Pacientes ficticios siguen codificados en superficies productivas

- **Prioridad:** P1_HIGH
- **Módulo:** Pacientes
- **Estado actual:** `RESOLVED_IN_CODE` (`resolved_by_previous_stage`)
- **Resuelto por:** stage3
- **Nota de estado:** Etapa 3 eliminó físicamente pacientes/usuarios ficticios, fixtures, assets y ramas runtime asociadas.
- **Objetivo original:** Cuenta real vacía no debe mostrar fixtures.
- **Problema observado originalmente:** DEMO_PATIENTS se usa en profile, portal, communications, games, voice.
- **Solución Supabase prevista:**
  - Estrategia: Eliminar imports runtime; demo tenant real seed.
- **Criterios de aceptación originales:**
  - Cuenta real vacía muestra estado vacío, nunca Juan Pérez u otros fixtures.

### [x] DNT-DAT-001 — FKs ON DELETE CASCADE podrían borrar expediente completo si se permite DELETE de paciente

- **Prioridad:** P0_CRITICAL
- **Módulo:** Retención de datos
- **Estado actual:** `RESOLVED_IN_CODE` (`completed`)
- **Resuelto por:** stage4
- **Nota de estado:** DELETE duro de patients queda prohibido por trigger/revoke; patients.clinic_id deja de CASCADE a favor de RESTRICT y todas las FK existentes que apuntaban a patients con ON DELETE CASCADE se reescriben a RESTRICT. El ciclo normal es archive/restore.
- **Objetivo original:** El objetivo es archivo/retención; borrado duro de paciente debe estar fuertemente controlado.
- **Problema observado originalmente:** Muchas tablas clínicas referencian patients ON DELETE CASCADE.
- **Solución Supabase prevista:**
  - Estrategia: Prohibir DELETE a roles app y usar archive.
- **Criterios de aceptación originales:**
  - Ningún rol operativo puede DELETE patient directamente.

## Acciones de la etapa

- Completar importación CSV/XLSX/JSON con validación previa.
- Preservar número de ficha legado y hacerlo único por clínica.
- Unificar reglas de DNI opcional/obligatorio.
- Migrar birth_date a DATE.
- Completar la proyección agregada del paciente.
- Implementar archive/restore en lugar de DELETE clínico.
- Versionar medical_profile/historia relevante.
- Eliminar pacientes ficticios de superficies reales.
- Revisar ON DELETE CASCADE para impedir borrado accidental del expediente.

## Gate de salida

- [x] Crear/importar/archivar/restaurar un paciente mantiene todos sus vínculos.
- [x] No se puede duplicar record_number dentro de una clínica.
- [x] Un paciente archivado conserva expediente clínico y económico.
- [x] La ficha agregada ya no devuelve módulos vacíos artificialmente.

## Validaciones LIVE asociadas

### [ ] S4-LIVE-001 — Aplicar migración Stage 4 en Supabase staging

- **Estado:** `pending`
- **Tipo:** `validation_only`
- Hacer backup/snapshot y aplicar 20260928040000_stage4_patient_lifecycle.sql después de Etapas 1–3. Revisar locks, RLS, triggers, RPCs e índices antes de producción.

### [ ] S4-LIVE-002 — Verificar conversión histórica de birth_date

- **Estado:** `pending`
- **Tipo:** `validation_only`
- Comparar una muestra de pacientes reales antes/después de timestamptz→DATE, especialmente fechas almacenadas cerca de medianoche y datos importados de otras zonas horarias.

### [ ] S4-LIVE-003 — Auditar record_number legacy antes de producción

- **Estado:** `pending`
- **Tipo:** `validation_only`
- Confirmar que no existen duplicados/conflictos de ficha por clínica y revisar los record_number deterministas generados para filas legacy vacías antes del corte.

### [ ] S4-LIVE-004 — Probar archive/restore con expediente real completo

- **Estado:** `pending`
- **Tipo:** `validation_only`
- Archivar y restaurar en staging un paciente con citas, plan, presupuesto, documentos, pagos y datos clínicos; comprobar que todos los IDs/vínculos sobreviven y que la lista activa/archivada cambia correctamente.

### [ ] S4-LIVE-005 — Comprobar rechazo de DELETE duro y cascadas

- **Estado:** `pending`
- **Tipo:** `validation_only`
- Intentar DELETE de patients con un contexto autorizado y verificar PATIENT_HARD_DELETE_FORBIDDEN. Revisar que borrar otras entidades/clinic no pueda arrastrar el expediente por cascada accidental.

### [ ] S4-LIVE-006 — Validar importación con exportaciones reales de clínica

- **Estado:** `pending`
- **Tipo:** `validation_only`
- Ejecutar dry-run/prevalidación sobre muestras reales de CSV, JSON y XLSX procedentes de Clinic Cloud/Gesden; revisar columnas, fichas, DNI opcional y fechas antes de importar producción.

### [ ] S4-LIVE-007 — Ejecutar suite completa bajo Node 24

- **Estado:** `pending`
- **Tipo:** `validation_only`
- En CI/Vercel con dependencias disponibles: npm ci, npm run patients:stage4-check, typecheck, unit/integration y next build. No reabrir Etapa 4 salvo fallo reproducible atribuible a estos cambios.

---

# Etapa 5 — Cámara, Storage, documentos y backups

**Estado de etapa:** `completed`
**Bloqueo:** `DO_NOT_REIMPLEMENT`

**Objetivo:** Cerrar el almacenamiento binario clínico y permitir que la foto/documentos sean entidades reales, no blobs locales.

**Hallazgos originales asignados:** 7

- RESOLVED_IN_CODE: **7**

## Hallazgos

### [x] DNT-P0-015 — No hay Supabase Storage clínico

- **Prioridad:** P0_CRITICAL
- **Módulo:** Storage
- **Estado actual:** `RESOLVED_IN_CODE` (`completed`)
- **Resuelto por:** stage5
- **Nota de estado:** Creados buckets privados patient-photos y clinical-documents, límites/MIME, rutas tenant/patient y RLS de Storage. CRUD clínico binario usa publishable key + JWT de usuario; no service-role.
- **Objetivo original:** Fotos, documentos, radiografías, firmas y adjuntos deben ser privados y RLS-aware.
- **Problema observado originalmente:** No se encontraron buckets/policies storage.objects ni uso del SDK Storage.
- **Solución Supabase prevista:**
  - Estrategia: Buckets privados + metadata DB.
  - rls: storage.objects policy por membership/patient_accounts
- **Criterios de aceptación originales:**
  - Cross-clinic object access denegado.
  - Signed URLs se regeneran y no se guardan como URL permanente.

### [x] DNT-PAT-001 — La foto se lee pero no se puede crear/actualizar

- **Prioridad:** P1_HIGH
- **Módulo:** Pacientes
- **Estado actual:** `RESOLVED_IN_CODE` (`completed`)
- **Resuelto por:** stage5
- **Nota de estado:** La foto se modifica únicamente mediante uploadPhoto multipart y endpoint dedicado. El servidor persiste photo_storage_path/MIME/SHA-256 y expone una URL lógica privada; create/updatePatient no aceptan URL arbitraria.
- **Objetivo original:** El alta debe permitir capturar y persistir foto de paciente.
- **Problema observado originalmente:** patientSchema y DB tienen photoUrl/photo_url, pero createPatientSchema/updatePatientSchema y PatientRepository create/update no la escriben.
- **Solución Supabase prevista:**
  - Estrategia: Guardar referencia privada, no URL pública.
  - schema: patient_media(id,clinic_id,patient_id,kind,storage_path,mime_type,size_bytes,checksum,active,created_by,created_at)
  - schema: patients.profile_photo_id opcional
  - storage: patient-media privado
- **Criterios de aceptación originales:**
  - Foto sobrevive reload y aparece en otro dispositivo.
  - Retake/eliminar queda auditado.

### [x] DNT-PAT-002 — PatientProfile usa foto del paciente demo

- **Prioridad:** P1_HIGH
- **Módulo:** Pacientes
- **Estado actual:** `RESOLVED_IN_CODE` (`resolved_by_previous_stage`)
- **Resuelto por:** stage3
- **Nota de estado:** PatientProfile dejó de usar la foto del paciente ficticio; usa photo_url real/PatientAvatar.
- **Objetivo original:** La ficha debe reutilizar la foto real.
- **Problema observado originalmente:** El avatar recibe demoPatient?.photoUrl incluso en componente que puede cargar paciente real.
- **Solución Supabase prevista:**
  - Estrategia: Usar signed URL derivada de profile_photo_id/storage_path y fallback de iniciales.
- **Criterios de aceptación originales:**
  - Modo real no consulta demoPatient para avatar.

### [x] DNT-PAT-003 — No existe flujo cámara→preview→Storage→paciente

- **Prioridad:** P1_HIGH
- **Módulo:** Pacientes
- **Estado actual:** `RESOLVED_IN_CODE` (`completed`)
- **Resuelto por:** stage5
- **Nota de estado:** Añadido flujo cámara bajo demanda → preview → captura/compresión → multipart → Storage privado → patient photo metadata, con repetición y selector de archivo alternativo.
- **Objetivo original:** El permiso de cámara debe estar conectado al alta.
- **Problema observado originalmente:** No hay captura getUserMedia ni upload Storage en alta.
- **Solución Supabase prevista:**
  - Estrategia: Dos fases: crear patient id y después subir imagen privada.
  - frontend: pedir permiso solo al pulsar Tomar foto
  - frontend: preview/repetir/eliminar
  - frontend: comprimir
- **Criterios de aceptación originales:**
  - Permiso bajo interacción del usuario.
  - Fallo de cámara no corrompe alta.

### [x] DNT-DOC-001 — Centro documental mantiene datos/localStorage demo

- **Prioridad:** P0_CRITICAL
- **Módulo:** Documentos
- **Estado actual:** `RESOLVED_IN_CODE` (`resolved_by_previous_stage`)
- **Resuelto por:** stage3
- **Nota de estado:** Centro documental dejó de usar fixtures/Web Storage y consulta/muta exclusivamente la API canónica; Storage/bytes/versionado sigue en DNT-DOC-002/Etapa 5.
- **Objetivo original:** Documentos clínicos deben vivir en repositorio único del paciente.
- **Problema observado originalmente:** documents-module usa datos demo/localStorage y consent-status comparte storage key.
- **Solución Supabase prevista:**
  - Estrategia: DB metadata + Storage privado.
  - schema: documents canónico
  - schema: document_versions por versión
  - schema: template_id/status/storage_path/checksum/signed_at
- **Criterios de aceptación originales:**
  - Documento creado en un puesto aparece en ficha/portal autorizado y persiste tras reload.

### [x] DNT-DOC-002 — Versiones/bytes/checksum no están cerrados extremo a extremo

- **Prioridad:** P1_HIGH
- **Módulo:** Documentos
- **Estado actual:** `RESOLVED_IN_CODE` (`completed`)
- **Resuelto por:** stage5
- **Nota de estado:** Documentos cerrados extremo a extremo con bytes en Storage, SHA-256 servidor, MIME/tamaño, series/versiones inmutables, previous_version_id y constraints únicos.
- **Objetivo original:** Debe probarse qué bytes corresponden a una versión firmada/exportada.
- **Problema observado originalmente:** Hay documents/document_exports pero falta Storage y modelo uniforme de versión de blobs.
- **Solución Supabase prevista:**
  - Estrategia: Objeto inmutable por versión.
  - schema: document_versions(document_id,version,storage_path,sha256,mime,size,created_by,created_at,finalized_at)
- **Criterios de aceptación originales:**
  - Hash DB coincide con bytes descargados; edición finalizada crea N+1.

### [x] DNT-P0-022 — UI de backup es ficticia

- **Prioridad:** P1_HIGH
- **Módulo:** Backups y settings
- **Estado actual:** `RESOLVED_IN_CODE` (`completed`)
- **Resuelto por:** stage5
- **Nota de estado:** Eliminada la UI ficticia de crear/verificar copias. Ajustes consulta el estado real de Supabase Managed Backups/PITR vía Management API o muestra explícitamente no conectado.
- **Objetivo original:** La pantalla debe representar backups verificables o no mostrar acciones falsas.
- **Problema observado originalmente:** INITIAL_BACKUPS y verifyBackup solo alteran useState.
- **Solución Supabase prevista:**
  - Estrategia: Basar continuidad en backups/PITR reales de Supabase y estrategia separada para Storage.
- **Criterios de aceptación originales:**
  - No existe 'backup verificado' sin evidencia real.

## Acciones de la etapa

- Crear buckets privados por dominio clínico.
- Añadir RLS de Storage según clínica, usuario y paciente.
- Completar flujo cámara → preview → compresión → upload → photo_url.
- Permitir crear/editar photo_url desde contratos de paciente.
- Eliminar foto demo de PatientProfile.
- Persistir documentos con versión, checksum, metadata y vínculo a paciente.
- Sustituir UI ficticia de backups por estado real del sistema de backup elegido.

## Gate de salida

- [x] La foto tomada aparece en todas las superficies del mismo paciente.
- [x] Un usuario de otra clínica no puede leer el objeto Storage.
- [x] No se almacenan adjuntos grandes como base64 dentro de JSON.
- [x] Cada documento tiene metadata/versionado verificable.

## Validaciones LIVE asociadas

### [ ] S5-LIVE-001 — Aplicar migración Stage 5 en Supabase staging

- **Estado:** `pending`
- **Tipo:** `validation_only`
- Aplicar 20260928050000_stage5_storage_documents_backups.sql después de Etapas 1–4; confirmar buckets privados, columnas, constraints e RLS antes de producción.

### [ ] S5-LIVE-002 — Probar aislamiento Storage entre dos clínicas con JWT reales

- **Estado:** `pending`
- **Tipo:** `validation_only`
- Con usuarios de clínicas A/B, verificar que A puede leer sus fotos/documentos y recibe rechazo al intentar acceder a rutas de B; probar también rol patient_account.

### [ ] S5-LIVE-003 — Validar cámara y fallback en navegadores reales

- **Estado:** `pending`
- **Tipo:** `validation_only`
- Sobre HTTPS probar permisos, captura, repetir foto y selector de archivo en iOS Safari, Chrome Android y escritorio. Confirmar que denegar cámara no impide crear paciente.

### [ ] S5-LIVE-004 — Verificar documentos/versiones con bytes reales

- **Estado:** `pending`
- **Tipo:** `validation_only`
- Subir PDF/imagen, descargar, recalcular SHA-256, crear una segunda versión y comprobar que ambas filas/objetos sobreviven, con previous_version_id y tamaños correctos.

### [ ] S5-LIVE-005 — Conectar estado real de Supabase Managed Backups/PITR

- **Estado:** `pending`
- **Tipo:** `validation_only`
- Configurar SUPABASE_PROJECT_REF y SUPABASE_MANAGEMENT_ACCESS_TOKEN en staging/producción y comprobar que Ajustes refleja backups/PITR reales sin filtrar el token al cliente.

### [ ] S5-LIVE-006 — Definir retención/backup operativo de objetos Storage

- **Estado:** `pending`
- **Tipo:** `validation_only`
- Documentar y probar la estrategia off-site/retención/export adecuada al despliegue. Los backups de base de datos no restauran objetos borrados de Storage; no reimplementar una tabla ficticia de backups dentro de Denty.

### [ ] S5-LIVE-007 — Ejecutar suite completa bajo Node 24

- **Estado:** `pending`
- **Tipo:** `validation_only`
- En CI/Vercel con red/dependencias disponibles: npm ci, npm run storage:stage5-check, typecheck, unit/integration y next build. Este contenedor agotó el tiempo de red durante npm ci; no reabrir Etapa 5 salvo fallo reproducible.

---

# Etapa 6 — Odontograma, periodoncia y pipeline clínico

**Estado de etapa:** `completed`
**Bloqueo:** `DO_NOT_REIMPLEMENT`

**Objetivo:** Cerrar el flujo odontograma → diagnóstico/plan → consentimientos → presupuesto sin estados intermedios contradictorios.

**Hallazgos originales asignados:** 10

- RESOLVED_IN_CODE: **10**
- Cerrados nuevos en Etapa 6: **8**
- Ya resueltos por etapas previas: **2**

## Hallazgos

### [x] DNT-CLN-001 — Guardado batch no transaccional

- **Prioridad:** P0_CRITICAL
- **Módulo:** Odontograma
- **Estado actual:** `RESOLVED_IN_CODE` (`resolved_by_previous_stage`)
- **Resuelto por:** stage2
- **Nota de estado:** Etapa 2 sustituyó el batch multi-REST por RPC transaccional save_odontogram_batch; Etapa 6 conserva esa frontera y sus contratos siguen verdes.
- **Objetivo original:** Una edición clínica debe ser atómica y con optimistic concurrency.
- **Problema observado originalmente:** saveOdontogramBatch lee versión, desactiva entidades y luego inserta nuevas con varias llamadas REST.
- **Solución implementada / prevista originalmente:**
  - Estrategia: RPC save_odontogram_batch.
  - transaction: lock/version check
  - transaction: insert nueva versión/snapshot+entities
  - transaction: history+audit+event
  - transaction: commit único
  - model: odontograms header con current_version
- **Criterios de aceptación originales:**
  - Fallo a mitad hace rollback; segundo writer con misma versión recibe conflict.

### [x] DNT-CLN-002 — Snapshots del servidor se hidratan con entidades vacías

- **Prioridad:** P1_HIGH
- **Módulo:** Odontograma
- **Estado actual:** `RESOLVED_IN_CODE` (`completed`)
- **Resuelto por:** stage6
- **Nota de estado:** rowToSnapshot valida payload_json real; create_odontogram_snapshot captura entidades activas y periodoncia vigente por sitio. Payload incompatible produce error explícito.
- **Objetivo original:** Snapshot debe reconstruir estado histórico real.
- **Problema observado originalmente:** rowToSnapshot devuelve entities: [] y periodontal: [] aunque conserva payloadJson.
- **Solución implementada / prevista originalmente:**
  - Estrategia: Payload versionado y parser estricto.
  - snapshot: schemaVersion
  - snapshot: odontogramVersion
  - snapshot: entities
  - snapshot: periodontal
  - snapshot: metadata
  - migration: validar/normalizar snapshots existentes
- **Criterios de aceptación originales:**
  - Abrir snapshot reproduce exactamente su estado; payload incompatible da error explícito.

### [x] DNT-CLN-003 — Historial clínico demo/local convive con historial servidor

- **Prioridad:** P1_HIGH
- **Módulo:** Odontograma
- **Estado actual:** `RESOLVED_IN_CODE` (`resolved_by_previous_stage`)
- **Resuelto por:** stage3
- **Nota de estado:** Etapa 3 eliminó el historial clínico paralelo demo/local; OdontogramHistory consume snapshots persistentes.
- **Objetivo original:** Historia clínica debe tener una única fuente persistente.
- **Problema observado originalmente:** odontogram-history habla de historial local demo y periodontogram incluye lecturas demo.
- **Solución implementada / prevista originalmente:**
  - Estrategia: Demo tenant usa mismas tablas; local state solo drafts no guardados.
- **Criterios de aceptación originales:**
  - Mismo mecanismo de snapshots en demo y real.

### [x] DNT-CLN-004 — Periodoncia carece de persistencia Supabase completa/versionada

- **Prioridad:** P1_HIGH
- **Módulo:** Periodoncia
- **Estado actual:** `RESOLVED_IN_CODE` (`completed`)
- **Resuelto por:** stage6
- **Nota de estado:** periodontal_exams conserva revisiones completas y measurements enlaza exam_id/exam_version, incluido suppuration. API y UI usan la misma fuente y rehidratan lecturas persistidas.
- **Objetivo original:** Seis puntos y revisiones deben conservar historial.
- **Problema observado originalmente:** periodontal_measurements existe, pero la ruta periodontal usada por voz no está en el handler Supabase parcial.
- **Solución implementada / prevista originalmente:**
  - Estrategia: periodontal_exams + measurements por examen.
  - rpc: save_periodontal_exam / patch_exam expectedVersion
  - analytics: view de bolsas ≥4/5/6mm
- **Criterios de aceptación originales:**
  - Comparar dos revisiones históricas sin sobrescribir.

### [x] DNT-CLN-005 — Plan y presupuesto quedan desfasables hasta sincronización manual

- **Prioridad:** P1_HIGH
- **Módulo:** Pipeline clínico
- **Estado actual:** `RESOLVED_IN_CODE` (`completed`)
- **Resuelto por:** stage6
- **Nota de estado:** Plan/presupuesto usan source versions canónicas. Un presupuesto no-DRAFT nunca se sobrescribe y un plan cambiado genera nueva revisión; SIGNED se trata como estado inmutable.
- **Objetivo original:** Odontograma→plan→presupuesto debe conocer versiones y estado de vigencia.
- **Problema observado originalmente:** ClinicalSyncCard declara versiones independientes y botones Sync Plan/Sync Budget.
- **Solución implementada / prevista originalmente:**
  - Estrategia: Formalizar dependencias en DB.
  - schema: plan.source_odontogram_version
  - schema: budget.source_plan_version explícito
  - rpc: sync_plan_from_odontogram
  - rpc: sync_budget_from_plan
  - events: odontogram change→plan.outdated
  - events: plan change→budget.outdated+consents recompute
  - rule: firmados inmutables; cambios generan nueva revisión
- **Criterios de aceptación originales:**
  - Nunca se presenta budget vigente con source_plan_version obsoleto.

### [x] DNT-CLN-006 — Catálogo hardcoded; Editar no persiste

- **Prioridad:** P0_CRITICAL
- **Módulo:** Catálogo de tratamientos
- **Estado actual:** `RESOLVED_IN_CODE` (`completed`)
- **Resuelto por:** stage6
- **Nota de estado:** treatment_catalog tenant-versionado con RLS/catalog.manage, CRUD administrativo persistente e invalidación de la query compartida que alimenta selectores del plan.
- **Objetivo original:** Tratamientos configurables deben alimentar plan, presupuesto, factura, lab y analytics.
- **Problema observado originalmente:** AdminPage lista Implante/Corona/Endodoncia/Férula/Higiene y muestra Editar sin CRUD; no hay treatment_catalog en DB.
- **Solución implementada / prevista originalmente:**
  - Estrategia: treatment_catalog tenant versionable.
  - schema: id,clinic_id,code,name,specialty,category,default_price_cents,base_cost_cents,default_duration_min,requires_lab,active,metadata,version
  - schema: UNIQUE(clinic_id,code)
  - rls: clinic read; admin/catalog.manage write
  - lifecycle: deactivate, no hard delete si usado
- **Criterios de aceptación originales:**
  - CRUD aparece en plan inmediatamente; históricos no cambian al editar catálogo.

### [x] DNT-CLN-007 — Plan item usa treatment_code libre sin FK a catálogo

- **Prioridad:** P1_HIGH
- **Módulo:** Plan de tratamiento
- **Estado actual:** `RESOLVED_IN_CODE` (`completed`)
- **Resuelto por:** stage6
- **Nota de estado:** clinical_plan_items referencia treatment_catalog o ad-hoc explícito y guarda snapshots inmutables de código, etiqueta, precio, coste y metadata clínica.
- **Objetivo original:** Plan debe referenciar tratamiento maestro y guardar snapshot histórico.
- **Problema observado originalmente:** clinical_plan_items tiene treatment_code/label/price pero no treatment_catalog_id.
- **Solución implementada / prevista originalmente:**
  - Estrategia: FK + snapshot.
  - schema: treatment_catalog_id FK
  - schema: treatment_code_snapshot
  - schema: label_snapshot
  - schema: price_snapshot_cents
  - schema: cost_snapshot_cents
- **Criterios de aceptación originales:**
  - Todo item nuevo referencia catálogo válido o se marca ad-hoc explícitamente.

### [x] DNT-CLN-008 — Requirements de consentimiento tienen lógica dual DB/demo-client

- **Prioridad:** P1_HIGH
- **Módulo:** Consentimientos
- **Estado actual:** `RESOLVED_IN_CODE` (`completed`)
- **Resuelto por:** stage6
- **Nota de estado:** consent_requirements se deriva del snapshot inmutable del plan item, enlaza template/documento y se satisface desde el estado documental; el pipeline deja de calcular requirements con datos demo del navegador.
- **Objetivo original:** El cumplimiento debe decidirse una vez y persistirse.
- **Problema observado originalmente:** Existe consent_requirements en DB, pero consent-status.ts usa DEMO_PLAN_TREATMENTS y Map de firmas en navegador.
- **Solución implementada / prevista originalmente:**
  - Estrategia: requirements persistentes derivados del plan.
  - rpc: recompute_consent_requirements(plan_id)
  - schema: plan_item_id
  - schema: template_id
  - schema: status
  - schema: satisfied_by_document_id
  - schema: rule_version
  - client: solo renderiza estado servidor
- **Criterios de aceptación originales:**
  - Firmar documento satisface requirement en todas las pantallas.

### [x] DNT-CLN-009 — Firma y precondiciones no están garantizadas en una transacción DB

- **Prioridad:** P0_CRITICAL
- **Módulo:** Presupuestos y firmas
- **Estado actual:** `RESOLVED_IN_CODE` (`completed`)
- **Resuelto por:** stage6
- **Nota de estado:** finalize_budget_signature bloquea/valida versión, plan y consentimientos y construye snapshot firmado inmutable desde budget/items/plan/requirements autoritativos de DB en la misma transacción. Existe endpoint autenticado /api/budgets/:id/sign con grant explícito.
- **Objetivo original:** Solo firmar presupuesto vigente con consentimientos satisfechos y dejar snapshot inmutable.
- **Problema observado originalmente:** Hay budget_signed_snapshots, pero la UI coordina varias consultas/mutaciones e invalidaciones.
- **Solución implementada / prevista originalmente:**
  - Estrategia: RPC finalize_budget_signature.
  - transaction: lock budget/plan
  - transaction: check source versions
  - transaction: check consent requirements
  - transaction: crear snapshot+hash+signature metadata
  - transaction: audit+event
  - immutability: cambio posterior crea revisión nueva
- **Criterios de aceptación originales:**
  - API no firma si falta consentimiento o presupuesto outdated.

### [x] DNT-CLN-010 — clinical_history_events no es ledger obligatorio

- **Prioridad:** P1_HIGH
- **Módulo:** Historia clínica
- **Estado actual:** `RESOLVED_IN_CODE` (`completed`)
- **Resuelto por:** stage6
- **Nota de estado:** Los comandos clínicos core de esta etapa escriben clinical_history_events y las mutaciones sensibles quedan bajo audit_log de Etapa 2, compartiendo transacción/correlation_id.
- **Objetivo original:** Cada cambio clínico relevante debe entrar en timeline semántica.
- **Problema observado originalmente:** Tabla existe, pero mutaciones actuales no pasan por una capa que garantice escribirla.
- **Solución implementada / prevista originalmente:**
  - Estrategia: RPC clínica escribe clinical_history_events + audit_log en misma transacción.
  - events: ODONTOGRAM_VERSION_CREATED
  - events: MEDICAL_PROFILE_UPDATED
  - events: PLAN_APPROVED
  - events: TREATMENT_COMPLETED
  - events: PRESCRIPTION_SIGNED
- **Criterios de aceptación originales:**
  - Todo comando clínico core produce evento semántico con actor/paciente.

## Acciones de la etapa

- [x] Mantener `save_odontogram_batch` como única frontera transaccional del odontograma.
- [x] Corregir snapshots para hidratar `entities` y `periodontal` reales.
- [x] Mantener eliminada la historia clínica paralela demo/local.
- [x] Persistir periodoncia de forma versionada y rehidratarla en UI.
- [x] Crear catálogo editable de tratamientos en Supabase y conectarlo al plan.
- [x] Vincular plan items al catálogo con snapshots históricos/ad-hoc explícito.
- [x] Unificar reglas de consentimientos en DB y consumirlas desde el cliente.
- [x] Endurecer `finalize_budget_signature` con vigencia + consentimientos y exponer endpoint canónico.
- [x] Conectar comandos clínicos core con `clinical_history_events` + auditoría.

## Gate de salida

- [x] Un fallo parcial no deja odontograma corrupto.
- [x] Crear/editar un tratamiento actualiza todos los selectores dependientes.
- [x] No se puede firmar un presupuesto saltándose consentimientos obligatorios.
- [x] Plan y presupuesto no pueden divergir silenciosamente.

## Validaciones LIVE de Etapa 6 — NO reimplementar

### [ ] S6-LIVE-001 — Aplicar migración Stage 6 en Supabase staging

- **Estado:** `pending`
- **Tipo:** `validation_only`
- Aplicar 20260928060000_stage6_clinical_pipeline.sql después de Etapas 1–5 y comprobar creación/RLS/grants de periodontal_exams, treatment_catalog, columnas de snapshots y RPCs antes de producción.

### [ ] S6-LIVE-002 — Validar concurrencia e historial de odontograma/periodoncia

- **Estado:** `pending`
- **Tipo:** `validation_only`
- Con dos sesiones reales, provocar escrituras concurrentes y verificar optimistic concurrency/rollback. Crear al menos dos revisiones periodontales y dos snapshots y comprobar que se pueden comparar sin sobrescritura ni pérdida de sitios.

### [ ] S6-LIVE-003 — Validar catálogo clínico y snapshots históricos

- **Estado:** `pending`
- **Tipo:** `validation_only`
- Crear y editar un tratamiento en staging; confirmar que los selectores abiertos se refrescan y que los clinical_plan_items ya creados conservan code/label/price/cost snapshot aunque cambie el catálogo.

### [ ] S6-LIVE-004 — Ejecutar E2E de consentimientos y firma de presupuesto

- **Estado:** `pending`
- **Tipo:** `validation_only`
- Comprobar que falta de consentimiento devuelve rechazo desde DB, que firmar el documento satisface el requirement en todas las superficies y que un cambio posterior del plan vuelve obsoleto el presupuesto firmado y obliga a crear nueva revisión DRAFT.

### [ ] S6-LIVE-005 — Verificar ledger clínico y audit_log con actor real

- **Estado:** `pending`
- **Tipo:** `validation_only`
- Ejecutar guardado de odontograma, snapshot, periodoncia, alta de item, sync de plan/presupuesto y firma; verificar clinical_history_events y audit_log con actor, paciente, correlation_id y payload coherentes en la misma transacción.

### [ ] S6-LIVE-006 — Ejecutar suite completa y build bajo Node 24

- **Estado:** `pending`
- **Tipo:** `validation_only`
- En CI/Vercel con dependencias disponibles: npm ci, npm run clinical:stage6-check, npm run clinical:stage6-runtime-check, npm run typecheck, npm test y npm run build. Este contenedor usa Node 22 y no contiene node_modules, por lo que no certifica la suite completa de Next/TypeScript.

## Verificación observada en este contenedor

- `stage1` a `stage6` contract checks: PASS.
- `verify-api-parity.mjs`: PASS — **201/201** contratos browser representados; 3 server-only excluidos.
- `verify-architecture.mjs`: PASS.
- `pipeline/self-check.mjs`: PASS.
- Transpilación sintáctica TypeScript/TSX de los **17/17** archivos modificados: PASS.
- Suite completa `npm ci` + typecheck + unit + build: **NO CERTIFICADA aquí** por Node 22 y ausencia de `node_modules`; queda en `S6-LIVE-006`.

## Dependencias ya realizadas que NO deben duplicarse

- BASE DE ETAPA 2: `save_odontogram_batch` sigue siendo la RPC transaccional del odontograma.
- BASE DE ETAPA 2: `finalize_budget_signature` fue **extendida**, no duplicada.
- BASE DE ETAPA 3: historial clínico local/demo permanece eliminado.

## Handoff

Etapa 6 queda `DO_NOT_REIMPLEMENT`. Si una validación LIVE falla, corregir solo el fallo reproducible. La siguiente implementación funcional es **Etapa 7 — Agenda, recepción, no-show y sala de espera**.



## Extensión Etapa 6.1 — Motor de dentición real (2026-09-28)

Esta extensión corrige una limitación clínica detectada después del cierre inicial de Etapa 6. **No reabre las fronteras transaccionales anteriores** y no requiere una segunda tabla dental paralela.

### [x] S6-ODO-001 — Dentición mixta modelada como fotografía fija
- **Problema:** `teethForDentition("mixed")` imponía una combinación fija de temporales y permanentes.
- **Corrección:** `MIXED_DENTITION_SITES` representa sitios anatómicos de recambio y permite coexistencia temporal/permanente por sitio.
- **Estado:** RESUELTO EN CÓDIGO.

### [x] S6-ODO-002 — Morfología pediátrica genérica
- **Problema:** incisivos, caninos y molares temporales se dibujaban con prácticamente el mismo SVG.
- **Corrección:** catálogo anatómico por tipo dental, con coronas y raíces diferenciadas para centrales, laterales, caninos, premolares, molares y molares temporales.
- **Estado:** RESUELTO EN CÓDIGO.

### [x] S6-ODO-003 — Edad usada como dentición implícita
- **Problema:** una plantilla sugerida por edad podía aparentar que el paciente tenía piezas concretas.
- **Corrección:** la edad solo sugiere `primary/mixed`; el profesional confirma presencia, erupción, retención, inclusión, exfoliación o ausencia por pieza.
- **Estado:** RESUELTO EN CÓDIGO.

### [x] S6-ODO-004 — Adultos con supernumerarios sin representación
- **Problema:** el odontograma permanente estaba limitado conceptualmente a las 32 posiciones FDI.
- **Corrección:** `SUPERNUMERARY_TOOTH` tiene identidad propia, ancla FDI solo para posición, tipo clínico, morfología y código ISO 10394 opcional; no renumera las piezas normales.
- **Estado:** RESUELTO EN CÓDIGO.

### [x] S6-ODO-005 — Supernumerario sin tratamientos propios
- **Problema:** una pieza adicional no podía ser padre de caries/restauración/endo/corona/extracción.
- **Corrección:** los tratamientos de supernumerario se enlazan por `parentId`/`toothIdentityKey` a la entidad adicional.
- **Estado:** RESUELTO EN CÓDIGO.

### [ ] S6-LIVE-007 — E2E visual de temporal/mixta/supernumerarios
- Probar con navegador real: 20 temporales, sitios de recambio, coexistencia 55+15, cambio de presencia, reload y snapshot histórico.
- Probar adulto con varios supernumerarios en una misma región y tratamientos separados.
- **Tipo:** VALIDACIÓN LIVE; no reimplementar el motor.

### [ ] S6-LIVE-008 — Validación clínica de designación ISO 10394
- El código valida el formato alfanumérico de dos caracteres que publica ISO 10394:2023.
- Validar con acceso al texto normativo/licencia la semántica exacta de los códigos antes de autogenerarlos; mientras tanto Denty los acepta como designación clínica explícita introducida por el profesional.
- **Tipo:** VALIDACIÓN NORMATIVA; no inventar códigos.

### Evidencia de la extensión
- `scripts/stage6-dentition-engine-runtime.test.mjs`: PASS.
- `scripts/stage6-dentition-ui-contract.test.mjs`: PASS.
- `scripts/tests/pediatric-numbering-regression.mjs`: PASS.
- Stage 1–6 contract gates: PASS.
- Architecture gate: PASS.
- API parity: 201/201 PASS.
- Pipeline self-check: PASS.
- Transpilación sintáctica TypeScript de archivos tocados: PASS.
- Suite completa Node 24 sigue pendiente dentro de `S6-LIVE-006`.

# Etapa 7 — Agenda, recepción, no-show y sala de espera

**Estado de etapa:** `implemented_code_pending_live_gate`
**Bloqueo:** `DO_NOT_REIMPLEMENT`

**Objetivo:** Convertir la agenda en un sistema transaccional conectado con recepción, doctores y portal.

**Hallazgos originales asignados:** 9

- IMPLEMENTED_PENDING_LIVE_VALIDATION: **9**

## Hallazgos

### [x] DNT-AGD-001 — Appointments no están implementadas en el handler Supabase

- **Prioridad:** P0_CRITICAL
- **Módulo:** Agenda
- **Estado actual:** `IMPLEMENTED_PENDING_LIVE_VALIDATION` (`implemented_code_pending_live_gate`)
- **Nota de estado:** AgendaRepository y el handler Supabase local cubren lectura/alta/edición/transiciones; DENTY_API_URL deja de ser requisito para el flujo principal de agenda.
- **Objetivo original:** Agenda debe leer/escribir la misma DB Supabase que el resto.
- **Problema observado originalmente:** appointments tiene schema y API client, pero route-handler Supabase no implementa las rutas de citas, por lo que caen al backend externo.
- **Solución Supabase prevista:**
  - Estrategia: Implementar lectura user-scoped y RPC de mutations.
- **Criterios de aceptación originales:**
  - DENTY_API_URL vacío no rompe agenda.

### [x] DNT-AGD-002 — No hay garantía DB contra doble reserva

- **Prioridad:** P0_CRITICAL
- **Módulo:** Agenda
- **Estado actual:** `IMPLEMENTED_PENDING_LIVE_VALIDATION` (`implemented_code_pending_live_gate`)
- **Nota de estado:** PostgreSQL aplica exclusion constraints por profesional/gabinete y RPC con advisory locks; también se cierran carreras cita↔bloqueo y cita↔ausencia.
- **Objetivo original:** Dos usuarios concurrentes no deben reservar el mismo profesional/sillón.
- **Problema observado originalmente:** El objetivo exige disponibilidad atómica; no se observó exclusion constraint o función transaccional de booking en schema.
- **Solución Supabase prevista:**
  - Estrategia: Enforce en Postgres, no solo UI.
- **Criterios de aceptación originales:**
  - Test concurrente: dos reservas del mismo hueco, exactamente una confirma.

### [x] DNT-AGD-003 — Transiciones ARRIVED/IN_CHAIR/COMPLETED no están cerradas en Supabase

- **Prioridad:** P1_HIGH
- **Módulo:** Recepción
- **Estado actual:** `IMPLEMENTED_PENDING_LIVE_VALIDATION` (`implemented_code_pending_live_gate`)
- **Nota de estado:** La state machine transaccional cubre ARRIVED, WAITING, IN_CHAIR, COMPLETED, RUNNING_LATE, NO_SHOW y CANCELLED con timestamps/eventos.
- **Objetivo original:** Estado de recepción debe actualizar cita + timestamps + evento atómicamente.
- **Problema observado originalmente:** Migración añade timestamps/status events, pero las acciones de agenda/reception caen fuera del handler Supabase actual.
- **Solución Supabase prevista:**
  - Estrategia: RPC transition_appointment valida state machine y escribe appointment + appointment_status_events + audit + broadcast.
- **Criterios de aceptación originales:**
  - No se puede saltar transición inválida; todos los puestos ven el estado nuevo.

### [x] DNT-AGD-004 — Avisos de sala de espera no tienen Broadcast real

- **Prioridad:** P1_HIGH
- **Módulo:** Recepción
- **Estado actual:** `IMPLEMENTED_PENDING_LIVE_VALIDATION` (`implemented_code_pending_live_gate`)
- **Nota de estado:** Triggers de Broadcast privado clinic:<id> notifican cambios canónicos de appointments y appointment_status_events al bridge Realtime.
- **Objetivo original:** Doctor debe recibir aviso realtime del paciente esperando.
- **Problema observado originalmente:** No hay triggers Broadcast; notifications existe pero no se conecta al estado de cita en las migraciones revisadas.
- **Solución Supabase prevista:**
  - Estrategia: transition_appointment genera notification/event; trigger Broadcast clinic/topic doctor.
- **Criterios de aceptación originales:**
  - Al marcar ARRIVED aparece en vista del doctor sin recargar.

### [x] DNT-AGD-005 — Separación/visit gap se guarda en localStorage

- **Prioridad:** P2_MEDIUM
- **Módulo:** Agenda
- **Estado actual:** `IMPLEMENTED_PENDING_LIVE_VALIDATION` (`implemented_code_pending_live_gate`)
- **Nota de estado:** clinic_settings/staff_settings persisten default_plan_visit_gap_days y Ajustes/Agenda consumen la preferencia canónica.
- **Objetivo original:** Preferencias de agenda por clínica/profesional deben viajar entre dispositivos.
- **Problema observado originalmente:** Settings usa DEMO_SCHEDULING_STORAGE_KEY/localStorage para planVisitGapDays.
- **Solución Supabase prevista:**
  - Estrategia: clinic_settings + staff_settings JSONB tipado o columnas explícitas, con RLS/admin permission.
- **Criterios de aceptación originales:**
  - Cambiar gap en un dispositivo se refleja en otro.

### [x] DNT-AGD-006 — Tablas parciales sin pipeline completo de reagendado

- **Prioridad:** P1_HIGH
- **Módulo:** No-show / recalls
- **Estado actual:** `IMPLEMENTED_PENDING_LIVE_VALIDATION` (`implemented_code_pending_live_gate`)
- **Nota de estado:** NO_SHOW crea recall idempotente, notification y integration_events; el reagendado guarda rescheduled_from_id y appointment_relationships.
- **Objetivo original:** No-show debe producir notificación, recall y reagendado controlado.
- **Problema observado originalmente:** patient_recalls existe, pero rutas core siguen externas y no hay wiring Realtime/outbox completo visible.
- **Solución Supabase prevista:**
  - Estrategia: RPC mark_no_show crea status event + recall + notification/outbox; portal ofrece slots permitidos mediante RPC availability.
- **Criterios de aceptación originales:**
  - NO_SHOW genera recall único/idempotente y aparece en tareas/portal según reglas.

### [x] DNT-AGD-007 — Métricas de espera/sillón no tienen proyección DB canónica

- **Prioridad:** P2_MEDIUM
- **Módulo:** Analytics operativa
- **Estado actual:** `IMPLEMENTED_PENDING_LIVE_VALIDATION` (`implemented_code_pending_live_gate`)
- **Nota de estado:** analytics_wait_times calcula KPIs desde timestamps reales y Analysis los consume mediante API/Query Key canónica.
- **Objetivo original:** Wait time/chair time/puntualidad deben derivarse de timestamps reales.
- **Problema observado originalmente:** Hay timestamps en appointments, pero Analysis usa métricas hardcoded y no hay vistas/RPC visibles para estos KPIs.
- **Solución Supabase prevista:**
  - Estrategia: Views/RPC analytics_wait_times con fórmulas documentadas y filtros clínica/sede/profesional/periodo.
- **Criterios de aceptación originales:**
  - KPI reproduce fixtures SQL conocidos.

### [x] DNT-STF-002 — Ausencias no tienen modelo Supabase canónico

- **Prioridad:** P1_HIGH
- **Módulo:** Personal / ausencias
- **Estado actual:** `IMPLEMENTED_PENDING_LIVE_VALIDATION` (`implemented_code_pending_live_gate`)
- **Nota de estado:** staff_absences/staff_schedules son canónicos; altas/cancelaciones pasan por RPC y disponibilidad excluye ausencias aprobadas.
- **Objetivo original:** Horarios, bajas, vacaciones y ausencias deben afectar agenda.
- **Problema observado originalmente:** attendance-module guarda absences localmente y en no-demo intenta API externa; no hay staff_absences table.
- **Solución Supabase prevista:**
  - Estrategia: staff_absences + staff_schedules.
  - schema: staff_absences(clinic_id,staff_member_id,type,start_at,end_at,status,reason,approved_by)
  - schema: staff_schedules/shift_patterns
- **Criterios de aceptación originales:**
  - Crear ausencia bloquea disponibilidad inmediatamente.

### [x] DNT-PRT-002 — Lista de espera del portal es un boolean local

- **Prioridad:** P1_HIGH
- **Módulo:** Portal del paciente
- **Estado actual:** `IMPLEMENTED_PENDING_LIVE_VALIDATION` (`implemented_code_pending_live_gate`)
- **Nota de estado:** patient_waitlist_requests sustituye el boolean local; alta, retirada y cumplimiento persisten y las transiciones sensibles pasan por RPC.
- **Objetivo original:** Reagendado/avisos deben ser workflow persistente.
- **Problema observado originalmente:** waitingList solo usa useState.
- **Solución Supabase prevista:**
  - Estrategia: patient_waitlist_requests o reuse patient_recalls con type EARLIER_SLOT.
  - schema: patient_id,appointment_id,preferences,status,created_at,fulfilled_at
- **Criterios de aceptación originales:**
  - Opt-in persiste y puede ser atendido/retirado.

## Acciones de la etapa

- [x] Implementar appointments completamente en Supabase.
- [x] Impedir doble reserva a nivel DB.
- [x] Persistir transiciones ARRIVED/IN_CHAIR/COMPLETED.
- [x] Usar Broadcast/Realtime para sala de espera.
- [x] Persistir preferencias de gap/agenda por clínica/doctor.
- [x] Completar pipeline no-show/recall/reagendado.
- [x] Persistir lista de espera del portal.
- [x] Modelar ausencias del personal y bloquear agenda.
- [x] Construir métricas canónicas de espera y sillón.

## Gate de salida

- [ ] Dos clientes concurrentes no pueden reservar el mismo recurso. → `S7-LIVE-002`
- [ ] Recepción y agenda reflejan el mismo estado sin recargar. → `S7-LIVE-003`
- [ ] Una ausencia bloquea correctamente disponibilidad. → `S7-LIVE-004`
- [ ] No-show/recall deja trazabilidad y puede reagendarse. → `S7-LIVE-005`

## Implementación Stage 7 — 2026-09-28

- Migración canónica: `supabase/migrations/20260928070000_stage7_agenda_reception.sql`.
- Escritura de citas por RPC `book_appointment` / `update_appointment`; DML directo revocado.
- Exclusion constraints `tstzrange(..., '[)')` para profesional/gabinete y advisory locks de recursos.
- Bloqueos de agenda por `create_agenda_block`, con conflicto transaccional cita↔bloqueo.
- State machine de recepción ampliada con `WAITING` y eventos/timestamps canónicos.
- Broadcast privado por clínica y bridge Realtime compartido con Stage 3.
- No-show: recall único, notificación, outbox e histórico de reagendado.
- Ausencias y horarios canónicos; disponibilidad respeta ausencias/bloqueos.
- Lista de espera persistente; paciente no puede autoelevar prioridad ni autocompletar solicitudes.
- Solicitudes de cita del portal pasan por RPC: paciente crea/cancela, staff programa reutilizando la reserva transaccional.
- Guardas de integridad tenant impiden enlazar paciente/profesional/sede/gabinete/plan/solicitud de otra clínica.
- Preferencias de separación de visitas persistentes por clínica/profesional.
- Métricas de espera/sillón/puntualidad derivadas de timestamps reales.

### Gates ejecutados

- Stage 1–7 contracts: PASS.
- Architecture gate: PASS.
- API parity: **208/208 PASS**; 3 server-only excluidas.
- Pipeline self-check: PASS.
- Agenda empty-slot regression: PASS bajo loader experimental por Node 22.
- Transpilación sintáctica de TS/TSX tocados: **16/16 PASS**.
- Suite completa Node 24/build/E2E: pendiente en `S7-LIVE-008`.

### Validaciones LIVE nuevas

- `S7-LIVE-001` — Aplicar migración en staging y resolver solapes/duplicados legacy antes de constraints.
- `S7-LIVE-002` — Concurrencia real doble reserva + cita↔bloqueo.
- `S7-LIVE-003` — Broadcast real entre dos sesiones.
- `S7-LIVE-004` — Carrera ausencia↔reserva.
- `S7-LIVE-005` — No-show/recall/outbox/reagendado E2E e idempotencia.
- `S7-LIVE-006` — Lista de espera con cuenta paciente/staff y pruebas de privilegios.
- `S7-LIVE-007` — Fixtures SQL de analytics_wait_times.
- `S7-LIVE-008` — npm ci/typecheck/test/build/E2E bajo Node 24.
- `S7-LIVE-009` — Ciclo de solicitudes de cita del portal + matriz cross-clinic y rechazo de auto-programación.

## Dependencias ya realizadas que NO deben duplicarse

- BASE YA HECHA EN ETAPA 2: transition_appointment existe como RPC transaccional base. Etapa 7 debe completar agenda, disponibilidad, no-show y realtime, no recrear la RPC desde cero.

---

# Etapa 8 — Facturación, pagos y fiscal

**Estado de etapa:** `pending`

**Objetivo:** Cerrar el circuito presupuesto → factura → pago → imputación → fiscal.

**Hallazgos originales asignados:** 4

- PENDING_IMPLEMENTATION: **4**

## Hallazgos

### [ ] DNT-FIN-002 — Faltan tablas de facturas aunque la UI/API las usa

- **Prioridad:** P0_CRITICAL
- **Módulo:** Finanzas
- **Estado actual:** `PENDING_IMPLEMENTATION` (`pending`)
- **Nota de estado:** Pendiente según roadmap.
- **Objetivo original:** Factura/serie/items deben ser fuente canónica del ciclo económico.
- **Problema observado originalmente:** Supabase tiene budgets/payments/fiscal_records, pero no se encontraron invoices/invoice_items/invoice_series; resources sí las consultan.
- **Solución Supabase prevista:**
  - Estrategia: Crear invoice ledger.
  - schema: invoice_series
  - schema: invoices
  - schema: invoice_items
  - schema: credit_notes o tipo documental
  - schema: invoice_payment_allocations si se separa de allocations genéricas
- **Criterios de aceptación originales:**
  - Emitir factura crea número único y snapshot de items/paciente/clinic fiscal.

### [ ] DNT-FIN-003 — Proveedor de pago y ledger interno no están garantizados como una sola operación idempotente

- **Prioridad:** P0_CRITICAL
- **Módulo:** Pagos
- **Estado actual:** `PENDING_IMPLEMENTATION` (`pending`)
- **Nota de estado:** Pendiente según roadmap.
- **Objetivo original:** Un cobro confirmado debe producir exactamente un payment interno y allocations.
- **Problema observado originalmente:** Rutas de proveedores gestionan attempts/response; la persistencia del ledger payments no queda garantizada de forma uniforme en el mismo flujo observado.
- **Solución Supabase prevista:**
  - Estrategia: State machine + webhook/idempotencia.
  - schema: payment_attempts unique idempotency_key/provider_reference
  - schema: payments unique provider_transaction_id cuando aplique
- **Criterios de aceptación originales:**
  - Repetir webhook no duplica pago; fallo después de cobro se reconcilia.

### [ ] DNT-FIN-004 — Eventos financieros no invalidan dashboard/analytics/paciente

- **Prioridad:** P1_HIGH
- **Módulo:** Finanzas
- **Estado actual:** `PENDING_IMPLEMENTATION` (`pending`)
- **Nota de estado:** Pendiente según roadmap.
- **Objetivo original:** Registrar pago debe refrescar saldo, historial y KPIs.
- **Problema observado originalmente:** Realtime ROOT_KEYS no tiene payment/finance/invoice/analytics.
- **Solución Supabase prevista:**
  - Estrategia: Eventos payment.posted/payment.refunded/invoice.issued → invalidación cruzada y Broadcast.
- **Criterios de aceptación originales:**
  - Cobro se ve simultáneamente en ficha, Finanzas, Inicio y Análisis.

### [ ] DNT-FIN-005 — fiscal_records existe sin cadena de factura completa

- **Prioridad:** P1_HIGH
- **Módulo:** Verifactu / fiscal
- **Estado actual:** `PENDING_IMPLEMENTATION` (`pending`)
- **Nota de estado:** Pendiente según roadmap.
- **Objetivo original:** Registro fiscal debe derivarse de factura emitida y estado fiscal, no ser isla.
- **Problema observado originalmente:** Hay fiscal_records y API Verifactu, pero faltan invoices canónicas en Supabase.
- **Solución Supabase prevista:**
  - Estrategia: FK fiscal_records.invoice_id; outbox integration_events; Edge Function para envío externo; estados/idempotencia/checksum.
- **Criterios de aceptación originales:**
  - Cada registro fiscal referencia factura inmutable y respuesta/proveedor.

## Acciones de la etapa

- Crear invoice_series, invoices e invoice_items.
- Vincular facturas con presupuesto/paciente/clínica.
- Garantizar idempotencia entre proveedor de pago y ledger interno.
- Persistir payment_attempts, payments y payment_allocations de forma coherente.
- Conectar fiscal_records/Verifactu con la factura real.
- Emitir eventos/invalidation al registrar, anular o imputar pagos.

## Gate de salida

- [ ] Un webhook repetido no duplica pagos.
- [ ] La suma de allocations no excede el pago.
- [ ] Una factura tiene numeración/serie consistente.
- [ ] Dashboard y cuenta del paciente reaccionan al pago registrado.

## Dependencias ya realizadas que NO deben duplicarse

- BASE YA HECHA EN ETAPA 2: record_payment existe como RPC transaccional base y auditada. Etapa 8 debe construir invoices/idempotencia/fiscal y extenderla si hace falta, no crear otro ledger paralelo.

---

# Etapa 9 — Inicio, análisis y KPIs reales

**Estado de etapa:** `pending`

**Objetivo:** Eliminar cifras decorativas y hacer que todos los KPIs deriven del ledger operativo real.

**Hallazgos originales asignados:** 4

- RESOLVED_IN_CODE: **3**
- PENDING_IMPLEMENTATION: **1**

## Hallazgos

### [x] DNT-FIN-001 — Inicio muestra citas/alertas/KPIs demo

- **Prioridad:** P0_CRITICAL
- **Módulo:** Dashboard
- **Estado actual:** `RESOLVED_IN_CODE` (`resolved_by_previous_stage`)
- **Resuelto por:** stage3
- **Nota de estado:** Inicio ya no usa citas/alertas/KPIs codificados; consulta Agenda, Alerts y Analytics reales.
- **Objetivo original:** Inicio debe ser una proyección de estado real.
- **Problema observado originalmente:** dashboard importa DEMO_ALERTS, DEMO_APPOINTMENTS y FINANCE_KPIS directamente.
- **Solución Supabase prevista:**
  - Estrategia: dashboard_summary RPC/view parametrizada por clínica/sede/fecha.
- **Criterios de aceptación originales:**
  - Cuenta real vacía muestra ceros/empty states; pago/alerta/cita actualizan Inicio.

### [x] DNT-ANL-001 — Análisis usa métricas y tratamientos hardcoded

- **Prioridad:** P0_CRITICAL
- **Módulo:** Análisis
- **Estado actual:** `RESOLVED_IN_CODE` (`resolved_by_previous_stage`)
- **Resuelto por:** stage3
- **Nota de estado:** Análisis dejó de usar métricas/tratamientos hardcodeados y consulta Analytics real.
- **Objetivo original:** KPIs deben derivarse de transacciones reales.
- **Problema observado originalmente:** analysis-module define TREATMENTS y valores como conversión/no-show/reworks/idle slots en código.
- **Solución Supabase prevista:**
  - Estrategia: SQL views/RPC de analytics con definiciones documentadas.
- **Criterios de aceptación originales:**
  - Ningún KPI productivo procede de constante frontend.

### [x] DNT-ANL-002 — Selector Mes/Trimestre/Año es cosmético

- **Prioridad:** P1_HIGH
- **Módulo:** Análisis
- **Estado actual:** `RESOLVED_IN_CODE` (`resolved_by_previous_stage`)
- **Resuelto por:** stage3
- **Nota de estado:** Mes/Trimestre/Año modifica realmente start/end de las consultas Analytics.
- **Objetivo original:** Periodo seleccionado debe cambiar query/resultado.
- **Problema observado originalmente:** El módulo cambia estado/etiqueta pero los valores siguen siendo constantes.
- **Solución Supabase prevista:**
  - Estrategia: Inputs start_date/end_date/timezone/site_id/staff_id en RPC; query key incluye filtros.
- **Criterios de aceptación originales:**
  - Cambiar periodo modifica request y resultado con fixtures SQL.

### [ ] DNT-ANL-003 — No hay definiciones canónicas de KPIs

- **Prioridad:** P1_HIGH
- **Módulo:** Análisis
- **Estado actual:** `PENDING_IMPLEMENTATION` (`pending`)
- **Nota de estado:** Pendiente según roadmap.
- **Objetivo original:** Producción, facturación, cobrado, pendiente, margen y conversión necesitan fórmulas únicas.
- **Problema observado originalmente:** UI/API nombran KPIs pero schema no documenta reglas de reconocimiento ni sources transaccionales.
- **Solución Supabase prevista:**
  - Estrategia: Crear data dictionary versionado.
- **Criterios de aceptación originales:**
  - Mismo KPI devuelve igual en Dashboard, Finanzas y Análisis para mismos filtros.

## Acciones de la etapa

- Eliminar KPIs, citas, tratamientos y alertas hardcoded del Inicio/Análisis.
- Definir formalmente cada KPI: fórmula, rango temporal, timezone y filtros.
- Hacer funcional Mes/Trimestre/Año.
- Calcular producción, cobrado, pendiente, ticket, no-show, margen y tratamientos desde tablas reales.
- Cachear/proyectar solo cuando aporte rendimiento, manteniendo fuente canónica.

## Gate de salida

- [ ] Un pago real modifica el KPI correspondiente.
- [ ] Cambiar rango temporal cambia consultas/resultados.
- [ ] No quedan valores FINANCE_KPIS o tratamientos fijos en runtime real.
- [ ] Dos pantallas que muestran el mismo KPI devuelven el mismo valor.

---

# Etapa 10 — Laboratorios y alertas conectadas

**Estado de etapa:** `pending`

**Objetivo:** Sustituir mocks de laboratorio/alertas por entidades persistentes y enlazadas al resto de Denty.

**Hallazgos originales asignados:** 9

- PENDING_IMPLEMENTATION: **7**
- RESOLVED_IN_CODE: **2**

## Hallazgos

### [ ] DNT-LAB-001 — No existe maestro de laboratorios en Supabase

- **Prioridad:** P0_CRITICAL
- **Módulo:** Laboratorio
- **Estado actual:** `PENDING_IMPLEMENTATION` (`pending`)
- **Nota de estado:** Pendiente según roadmap.
- **Objetivo original:** Múltiples laboratorios deben ser entidades editables y compartidas.
- **Problema observado originalmente:** La UI deriva cuentas desde lab works/analytics suppliers; no hay public.laboratories.
- **Solución Supabase prevista:**
  - Estrategia: Crear laboratories.
  - schema: id,clinic_id,name,tax_id,phone,email,address,default_turnaround_days,active,created_at,updated_at,version
  - rls: clinic read; lab.manage write
- **Criterios de aceptación originales:**
  - CRUD persiste y aparece en selector de trabajo.

### [ ] DNT-LAB-002 — No existe tabla lab_works aunque la API y UI la usan

- **Prioridad:** P0_CRITICAL
- **Módulo:** Laboratorio
- **Estado actual:** `PENDING_IMPLEMENTATION` (`pending`)
- **Nota de estado:** Pendiente según roadmap.
- **Objetivo original:** Trabajo de laboratorio debe ser una entidad persistente conectada al paciente/plan.
- **Problema observado originalmente:** El cliente tiene labWorkSchema y mutations, pero no se encontró lab_works en migrations.
- **Solución Supabase prevista:**
  - Estrategia: Crear lab_works + events.
  - schema: lab_works(id,clinic_id,patient_id,laboratory_id,clinical_plan_item_id,appointment_id,title,category,tooth_or_zone,status,sent_at,eta_at,received_at,placed_at,cost_cents,version,created_at,updated_at)
  - schema: lab_work_status_events
  - schema: lab_reworks(parent_lab_work_id,reason,cost_cents)
- **Criterios de aceptación originales:**
  - Crear/transicionar/rework funciona sin DENTY_API_URL y queda en timeline.

### [ ] DNT-LAB-003 — Pestaña Laboratorios no ofrece CRUD real

- **Prioridad:** P1_HIGH
- **Módulo:** Laboratorio
- **Estado actual:** `PENDING_IMPLEMENTATION` (`pending`)
- **Nota de estado:** Pendiente según roadmap.
- **Objetivo original:** Usuario debe poder crear/editar laboratorios.
- **Problema observado originalmente:** Vista lista cuentas derivadas; no hay mutation/UI de create/edit laboratory.
- **Solución Supabase prevista:**
  - Estrategia: CRUD contra laboratories con React Query keys dedicadas y audit.
- **Criterios de aceptación originales:**
  - Crear/editar/desactivar lab actualiza lista y selector sin reload.

### [ ] DNT-LAB-004 — Balances reales están incompletos y pagos de laboratorio son demo

- **Prioridad:** P1_HIGH
- **Módulo:** Laboratorio
- **Estado actual:** `PENDING_IMPLEMENTATION` (`pending`)
- **Nota de estado:** Pendiente según roadmap.
- **Objetivo original:** Saldo por laboratorio debe derivarse de obligaciones/pagos reales.
- **Problema observado originalmente:** El módulo conserva pagos demo en localStorage y el modo real no tiene un ledger de pagos a proveedor equivalente.
- **Solución Supabase prevista:**
  - Estrategia: Supplier finance ledger.
  - schema: supplier_invoices o lab_supplier_charges
  - schema: supplier_payments
  - schema: supplier_payment_allocations
- **Criterios de aceptación originales:**
  - Balance = cargos confirmados - allocations; pago real reduce saldo y queda auditado.

### [ ] DNT-LAB-005 — Suppliers analytics se usa como fuente de laboratorios

- **Prioridad:** P1_HIGH
- **Módulo:** Laboratorio
- **Estado actual:** `PENDING_IMPLEMENTATION` (`pending`)
- **Nota de estado:** Pendiente según roadmap.
- **Objetivo original:** El maestro de laboratorio no debe inferirse desde analytics.
- **Problema observado originalmente:** supplierAccounts convierte registros genéricos de analytics suppliers en LaboratoryAccount mediante regex de nombre/categoría.
- **Solución Supabase prevista:**
  - Estrategia: Laboratory id FK canónico; analytics consume laboratories, nunca al revés.
- **Criterios de aceptación originales:**
  - No hay regex para descubrir laboratorios.

### [ ] DNT-LAB-006 — Adjuntos se convierten a base64 y se envían por JSON

- **Prioridad:** P1_HIGH
- **Módulo:** Laboratorio
- **Estado actual:** `PENDING_IMPLEMENTATION` (`pending`)
- **Nota de estado:** Pendiente según roadmap.
- **Objetivo original:** Archivos de laboratorio deben ir a Storage privado.
- **Problema observado originalmente:** fileAsBase64 lee File y mutation envía base64 al API.
- **Solución Supabase prevista:**
  - Estrategia: Upload directo/autorizado a lab-attachments privado + metadata lab_attachments.
  - schema: lab_attachments(id,clinic_id,lab_work_id,storage_path,file_name,mime,size,sha256,created_by)
- **Criterios de aceptación originales:**
  - JSON de lab work no contiene bytes base64; descarga respeta RLS.

### [ ] DNT-LAB-007 — Trabajo de laboratorio no tiene vínculo DB garantizado con plan/cita/prótesis

- **Prioridad:** P1_HIGH
- **Módulo:** Laboratorio
- **Estado actual:** `PENDING_IMPLEMENTATION` (`pending`)
- **Nota de estado:** Pendiente según roadmap.
- **Objetivo original:** El pipeline tratamiento→laboratorio→cita debe ser navegable.
- **Problema observado originalmente:** Al no existir lab_works DB, tampoco existen FKs a clinical_plan_item/appointment/dental entity.
- **Solución Supabase prevista:**
  - Estrategia: FK clinical_plan_item_id obligatorio cuando proviene de plan; appointment_id opcional; dental_entity_id/prosthetic_entity_id cuando proceda.
- **Criterios de aceptación originales:**
  - Desde plan se abre trabajo; desde trabajo se navega al item/cita/paciente.

### [x] DNT-ALT-001 — Alertas solo viven en useState demo

- **Prioridad:** P0_CRITICAL
- **Módulo:** Alertas
- **Estado actual:** `RESOLVED_IN_CODE` (`resolved_by_previous_stage`)
- **Resuelto por:** stage3
- **Nota de estado:** Alertas dejó INITIAL/useState y consume engagement.alerts persistente.
- **Objetivo original:** Alertas deben ser persistentes, asignables, snoozable y resolubles.
- **Problema observado originalmente:** alerts-module inicializa INITIAL_ALERTS y muta state; aunque el API client define list/resolve/review/snooze/assign, no hay alerts table.
- **Solución Supabase prevista:**
  - Estrategia: Crear alerts ledger.
  - schema: id,clinic_id,patient_id,source_type,source_id,dedupe_key,priority,status,category,title,message,assignee_member_id,due_at,snoozed_until,resolved_at,resolved_by,created_at,updated_at
- **Criterios de aceptación originales:**
  - Reload conserva estado; acciones auditadas.

### [x] DNT-ALT-002 — Inicio cuenta una lista distinta de la que se resuelve en Alertas

- **Prioridad:** P0_CRITICAL
- **Módulo:** Alertas
- **Estado actual:** `RESOLVED_IN_CODE` (`resolved_by_previous_stage`)
- **Resuelto por:** stage3
- **Nota de estado:** Resolver/revisar alerta invalida alerts + dashboard; Inicio y Alertas comparten fuente.
- **Objetivo original:** Una alerta resuelta debe desaparecer/cambiar en todos los consumidores.
- **Problema observado originalmente:** Dashboard usa DEMO_ALERTS mientras AlertsModule mantiene INITIAL_ALERTS independiente.
- **Solución Supabase prevista:**
  - Estrategia: Una query alerts(open) compartida; dashboard_summary cuenta la misma tabla; Broadcast alert.changed invalida ambas.
- **Criterios de aceptación originales:**
  - Resolver alerta reduce contador de Inicio en otra pestaña sin reload.

## Acciones de la etapa

- Crear maestro laboratories con CRUD y estado activo/inactivo.
- Crear lab_works y sus relaciones con paciente, plan, cita y prótesis.
- Persistir balances/costes/pagos de laboratorio.
- Mover adjuntos a Storage y guardar referencias.
- Eliminar suppliers analytics como sustituto del maestro de laboratorios.
- Crear alerts persistentes con lifecycle resolve/review/snooze/assign.
- Hacer que Inicio consuma exactamente la misma fuente de alertas.
- Invalidar contadores y superficies al resolver una alerta.

## Gate de salida

- [ ] Se puede crear y editar un laboratorio y usarlo inmediatamente.
- [ ] Un trabajo tiene trazabilidad clínica y económica.
- [ ] Resolver una alerta cambia Inicio sin inconsistencias.
- [ ] No quedan trabajos/laboratorios demo en cuentas reales.

---

# Etapa 11 — Personal, comunicaciones, campañas, privacidad y tareas

**Estado de etapa:** `pending`

**Objetivo:** Persistir los subsistemas operativos que aún viven en useState/fixtures.

**Hallazgos originales asignados:** 8

- PENDING_IMPLEMENTATION: **8**

## Hallazgos

### [ ] DNT-STF-001 — Fichajes viven en memoria

- **Prioridad:** P1_HIGH
- **Módulo:** Personal / fichaje
- **Estado actual:** `PENDING_IMPLEMENTATION` (`pending`)
- **Nota de estado:** Pendiente según roadmap.
- **Objetivo original:** Entrada/salida debe persistir con correcciones auditadas.
- **Problema observado originalmente:** attendance-module inicializa punches con useState y punch() solo añade fila local.
- **Solución Supabase prevista:**
  - Estrategia: attendance_punches append-only.
  - schema: id,clinic_id,staff_member_id,type,occurred_at,source,created_by,corrects_punch_id,correction_reason
- **Criterios de aceptación originales:**
  - Reload conserva fichajes; corrección deja rastro.

### [ ] DNT-STF-004 — Solicitudes de privacidad son estado local

- **Prioridad:** P1_HIGH
- **Módulo:** Privacidad
- **Estado actual:** `PENDING_IMPLEMENTATION` (`pending`)
- **Nota de estado:** Pendiente según roadmap.
- **Objetivo original:** Solicitudes acceso/rectificación/supresión deben tener workflow persistente.
- **Problema observado originalmente:** Settings usa INITIAL_PRIVACY y añade filas con useState.
- **Solución Supabase prevista:**
  - Estrategia: privacy_requests.
  - schema: id,clinic_id,patient_id,type,status,requested_at,due_at,assigned_to,notes,resolution_document_id,closed_at
- **Criterios de aceptación originales:**
  - Solicitud persiste, tiene SLA/estado/actor y export asociado cuando corresponda.

### [ ] DNT-MKT-001 — Campañas son constantes/useState

- **Prioridad:** P1_HIGH
- **Módulo:** Campañas
- **Estado actual:** `PENDING_IMPLEMENTATION` (`pending`)
- **Nota de estado:** Pendiente según roadmap.
- **Objetivo original:** Campañas deben persistir y alimentar atribución/ROI.
- **Problema observado originalmente:** campaigns-module usa INITIAL_CAMPAIGNS y setState; no hay campaigns table.
- **Solución Supabase prevista:**
  - Estrategia: campaigns tenant table + attribution.
  - schema: id,clinic_id,name,provider,status,budget_cents,start/end,external_campaign_id,utm defaults,created_by
- **Criterios de aceptación originales:**
  - Campaña persiste y puede vincular pacientes/ingresos.

### [ ] DNT-MKT-002 — Comunicaciones son useState y pacientes demo

- **Prioridad:** P1_HIGH
- **Módulo:** Comunicaciones
- **Estado actual:** `PENDING_IMPLEMENTATION` (`pending`)
- **Nota de estado:** Pendiente según roadmap.
- **Objetivo original:** Mensajes y estado de entrega deben persistir.
- **Problema observado originalmente:** communications-module usa INITIAL_ROWS, DEMO_PATIENTS y estado local.
- **Solución Supabase prevista:**
  - Estrategia: communication_messages/outbox + provider delivery events.
  - schema: clinic_id,patient_id,channel,category,subject,body,status,provider_message_id,scheduled_at,sent_at,delivered_at,failed_at,created_by
- **Criterios de aceptación originales:**
  - Mensaje enviado tiene estado persistente y delivery update idempotente.

### [ ] DNT-MKT-003 — Consentimiento de marketing es un checkbox local

- **Prioridad:** P1_HIGH
- **Módulo:** Comunicaciones
- **Estado actual:** `PENDING_IMPLEMENTATION` (`pending`)
- **Nota de estado:** Pendiente según roadmap.
- **Objetivo original:** Preferencias/consentimiento deben ser persistentes y auditables.
- **Problema observado originalmente:** communications-module mantiene marketingConsent en useState.
- **Solución Supabase prevista:**
  - Estrategia: communication_consents append/history.
  - schema: patient_id,channel,purpose,status,source,captured_at,revoked_at,evidence_document_id,created_by
- **Criterios de aceptación originales:**
  - Opt-out bloquea envío desde cualquier dispositivo y queda auditado.

### [ ] DNT-MKT-004 — notifications existe pero no hay outbox unificada de entrega externa

- **Prioridad:** P1_HIGH
- **Módulo:** Notificaciones
- **Estado actual:** `PENDING_IMPLEMENTATION` (`pending`)
- **Nota de estado:** Pendiente según roadmap.
- **Objetivo original:** Notificaciones internas y mensajes externos deben tener estados de entrega/reintento.
- **Problema observado originalmente:** Existe notifications e integration_events, pero Campaigns/Communications siguen locales y no se ve una unión de outbox→provider.
- **Solución Supabase prevista:**
  - Estrategia: Transactional outbox.
- **Criterios de aceptación originales:**
  - Reintentos no duplican mensajes; estado final es observable.

### [ ] DNT-TSK-001 — Tareas rápidas son vista previa sin efectos

- **Prioridad:** P1_HIGH
- **Módulo:** Tareas
- **Estado actual:** `PENDING_IMPLEMENTATION` (`pending`)
- **Nota de estado:** Pendiente según roadmap.
- **Objetivo original:** Crear paciente/cobrar/citar/recibir lab/receta deben ejecutar flujos reales.
- **Problema observado originalmente:** TasksPage recorre DEMO_TASKS, muestra 'Vista previa en modo demo' y Confirmar solo cierra modal.
- **Solución Supabase prevista:**
  - Estrategia: Task launcher no necesita tabla si es navegación/comando; cada acción llama el RPC/módulo real. Si hay tareas asignables, crear tasks.
  - schema: tasks solo para work items persistentes: clinic_id,patient_id,type,status,assignee,due_at,source_type/source_id
- **Criterios de aceptación originales:**
  - Confirmar Cobrar produce payment o navega a cobro real; ningún botón es no-op.

### [ ] DNT-PAT-013 — Origen declarado no está conectado a campaña/UTM

- **Prioridad:** P1_HIGH
- **Módulo:** Marketing / atribución
- **Estado actual:** `PENDING_IMPLEMENTATION` (`pending`)
- **Nota de estado:** Pendiente según roadmap.
- **Objetivo original:** Medir origen declarado y atribución observada.
- **Problema observado originalmente:** patients guarda declared_source/detail, pero no hay tablas campaigns/attribution en Supabase.
- **Solución Supabase prevista:**
  - Estrategia: campaigns + patient_attribution/touchpoints.
  - schema: campaigns
  - schema: patient_attribution(first_touch,last_touch,campaign_id,utm_source,utm_medium,utm_campaign,captured_at)
- **Criterios de aceptación originales:**
  - Paciente de campaña se conecta a leads→presupuesto→ingreso.

## Acciones de la etapa

- Persistir fichajes de empleados.
- Persistir solicitudes de privacidad y su lifecycle.
- Crear campañas reales y atribución UTM/origen.
- Crear comunicaciones persistentes.
- Persistir consentimiento de marketing.
- Crear outbox de notificaciones para entrega externa e idempotencia.
- Convertir tareas rápidas en comandos reales con permisos/auditoría.

## Gate de salida

- [ ] Recargar la página no borra fichajes, campañas ni tareas.
- [ ] Una comunicación tiene destinatario, consentimiento y estado de entrega.
- [ ] La atribución de paciente puede enlazarse a campaña/origen.
- [ ] Solicitudes de privacidad son auditables.

---

# Etapa 12 — Portal del paciente, recetas y Oye Denty

**Estado de etapa:** `pending`

**Objetivo:** Conectar las superficies finales que dependen de casi toda la infraestructura anterior.

**Hallazgos originales asignados:** 5

- RESOLVED_IN_CODE: **1**
- PENDING_IMPLEMENTATION: **4**

## Hallazgos

### [x] DNT-PRT-001 — Portal es una maqueta basada en DEMO_PATIENTS

- **Prioridad:** P0_CRITICAL
- **Módulo:** Portal del paciente
- **Estado actual:** `RESOLVED_IN_CODE` (`resolved_by_previous_stage`)
- **Resuelto por:** stage3
- **Nota de estado:** Portal dejó el corpus de pacientes ficticios y consume la proyección real patient-scoped.
- **Objetivo original:** Paciente debe ver sus datos reales bajo RLS.
- **Problema observado originalmente:** patient-portal.tsx busca el paciente en DEMO_PATIENTS y renderiza contenido estático por tabs.
- **Solución Supabase prevista:**
  - Estrategia: Portal queries con JWT paciente + patient_accounts/RLS.
- **Criterios de aceptación originales:**
  - Paciente real ve solo sus filas; cambios staff aparecen al portal.

### [ ] DNT-RX-001 — No existe schema Supabase de recetas

- **Prioridad:** P0_CRITICAL
- **Módulo:** Recetas
- **Estado actual:** `PENDING_IMPLEMENTATION` (`pending`)
- **Nota de estado:** Pendiente según roadmap.
- **Objetivo original:** Recetas, items, firma, cancelación e historial deben persistir.
- **Problema observado originalmente:** API/UI de prescriptions existe y alterna demo/real, pero no se encontraron prescriptions tables en migrations.
- **Solución Supabase prevista:**
  - Estrategia: Crear prescription ledger.
  - schema: prescriptions(id,clinic_id,patient_id,prescriber_staff_id,status,issued_at,cancelled_at,cancellation_reason,document_id,signature_hash,version)
  - schema: prescription_items(medication,dose,route,frequency,duration,instructions)
  - schema: prescription_events
  - storage: PDF/firma en buckets privados
- **Criterios de aceptación originales:**
  - Crear/firma/cancelación persiste y aparece en ficha/portal autorizado.

### [ ] DNT-RX-002 — Firma de receta vive como data URL en UI antes de persistencia externa

- **Prioridad:** P1_HIGH
- **Módulo:** Recetas
- **Estado actual:** `PENDING_IMPLEMENTATION` (`pending`)
- **Nota de estado:** Pendiente según roadmap.
- **Objetivo original:** La firma final debe convertirse en evidencia inmutable asociada a receta/version.
- **Problema observado originalmente:** prescriptions-module mantiene signatureDataUrl local y la persistencia depende del API externo.
- **Solución Supabase prevista:**
  - Estrategia: Al firmar, subir evidencia a signatures privado, generar hash del documento y finalizar receta vía RPC atómica.
- **Criterios de aceptación originales:**
  - Una receta SIGNED referencia document/version/hash y no puede mutar clínicamente.

### [ ] DNT-TSK-002 — NLU reconoce más acciones de las que el executor puede ejecutar

- **Prioridad:** P1_HIGH
- **Módulo:** Voice / IA
- **Estado actual:** `PENDING_IMPLEMENTATION` (`pending`)
- **Nota de estado:** Pendiente según roadmap.
- **Objetivo original:** La voz no debe confirmar acciones no soportadas.
- **Problema observado originalmente:** LocalVoiceAction incluye schedule/reschedule/arrive/no_show, dependencies, alerts, prosthesis, lab, etc.; executeAction solo implementa un subconjunto y el resto retorna false.
- **Solución Supabase prevista:**
  - Estrategia: Capability registry generado desde comandos reales.
- **Criterios de aceptación originales:**
  - Test de cobertura: todo intent habilitado tiene executor y contract test.

### [ ] DNT-TSK-003 — Acciones de voz dependen de rutas que Supabase parcial no implementa

- **Prioridad:** P1_HIGH
- **Módulo:** Voice / IA
- **Estado actual:** `PENDING_IMPLEMENTATION` (`pending`)
- **Nota de estado:** Pendiente según roadmap.
- **Objetivo original:** Dispatcher de voz debe usar los mismos comandos transaccionales que UI.
- **Problema observado originalmente:** Executor llama clinical workflow, periodontal, budget sync, billing payments; muchas rutas caen al backend externo.
- **Solución Supabase prevista:**
  - Estrategia: Voice executor llama los mismos RPC/command endpoints canónicos; nunca escribe una ruta alternativa.
- **Criterios de aceptación originales:**
  - Misma acción por voz o UI produce exactamente mismos rows/audit/events.

## Acciones de la etapa

- Sustituir DEMO_PATIENTS del portal por proyecciones patient-scoped con RLS.
- Crear schema de recetas, versionado y persistencia de firma.
- Guardar firma/artefactos de receta en Storage cuando corresponda.
- Alinear intents reconocidos por voz con acciones realmente implementadas.
- Hacer que Oye Denty use los mismos comandos/RPC que la UI.
- Exigir confirmación y auditoría en acciones sensibles de voz.

## Gate de salida

- [ ] El paciente solo ve sus propios datos.
- [ ] Una receta queda persistida y reproducible después de recargar.
- [ ] La voz no anuncia acciones que el backend no puede ejecutar.
- [ ] UI y voz producen el mismo resultado y audit trail.

---

# Etapa 13 — Gate final de integración

**Estado de etapa:** `control_gate_pending`

**Objetivo:** Verificar que Denty ya funciona como un único sistema conectado antes de dar el refactor por terminado.

Esta etapa es un gate de control y no posee IDs `DNT-*` propios.

## Acciones de la etapa

- Ejecutar todos los criterios globales del audit original.
- Hacer pruebas E2E de dos clínicas y múltiples roles.
- Probar create/edit/archive patient, odontograma, plan, consentimiento, presupuesto, cita, factura, pago, laboratorio y alerta.
- Probar Realtime con dos sesiones abiertas.
- Probar restauración/recuperación según estrategia de backup.
- Buscar nuevamente DEMO_, fixtures productivos, localStorage clínico y service-role en CRUD normal.
- Repetir build, lint, typecheck y suites de integración.

## Gate de salida

- [ ] Los 91 findings están cerrados o explícitamente aceptados con justificación.
- [ ] No existen datos demo mezclados con runtime real.
- [ ] No hay escrituras clínicas/financieras sensibles fuera de RLS/RPC/audit.
- [ ] Los módulos reaccionan a la misma fuente de verdad.
- [ ] Los criterios globales de aceptación del informe original pasan.

---

# Resumen de trabajo todavía pendiente

## A. Hallazgos originales sin implementar

### Etapa 7 — Agenda, recepción, no-show y sala de espera (9)

- [ ] **DNT-AGD-001** — Appointments no están implementadas en el handler Supabase (P0_CRITICAL)
- [ ] **DNT-AGD-002** — No hay garantía DB contra doble reserva (P0_CRITICAL)
- [ ] **DNT-AGD-003** — Transiciones ARRIVED/IN_CHAIR/COMPLETED no están cerradas en Supabase (P1_HIGH)
- [ ] **DNT-AGD-004** — Avisos de sala de espera no tienen Broadcast real (P1_HIGH)
- [ ] **DNT-AGD-005** — Separación/visit gap se guarda en localStorage (P2_MEDIUM)
- [ ] **DNT-AGD-006** — Tablas parciales sin pipeline completo de reagendado (P1_HIGH)
- [ ] **DNT-AGD-007** — Métricas de espera/sillón no tienen proyección DB canónica (P2_MEDIUM)
- [ ] **DNT-STF-002** — Ausencias no tienen modelo Supabase canónico (P1_HIGH)
- [ ] **DNT-PRT-002** — Lista de espera del portal es un boolean local (P1_HIGH)

### Etapa 8 — Facturación, pagos y fiscal (4)

- [ ] **DNT-FIN-002** — Faltan tablas de facturas aunque la UI/API las usa (P0_CRITICAL)
- [ ] **DNT-FIN-003** — Proveedor de pago y ledger interno no están garantizados como una sola operación idempotente (P0_CRITICAL)
- [ ] **DNT-FIN-004** — Eventos financieros no invalidan dashboard/analytics/paciente (P1_HIGH)
- [ ] **DNT-FIN-005** — fiscal_records existe sin cadena de factura completa (P1_HIGH)

### Etapa 9 — Inicio, análisis y KPIs reales (1)

- [ ] **DNT-ANL-003** — No hay definiciones canónicas de KPIs (P1_HIGH)

### Etapa 10 — Laboratorios y alertas conectadas (7)

- [ ] **DNT-LAB-001** — No existe maestro de laboratorios en Supabase (P0_CRITICAL)
- [ ] **DNT-LAB-002** — No existe tabla lab_works aunque la API y UI la usan (P0_CRITICAL)
- [ ] **DNT-LAB-003** — Pestaña Laboratorios no ofrece CRUD real (P1_HIGH)
- [ ] **DNT-LAB-004** — Balances reales están incompletos y pagos de laboratorio son demo (P1_HIGH)
- [ ] **DNT-LAB-005** — Suppliers analytics se usa como fuente de laboratorios (P1_HIGH)
- [ ] **DNT-LAB-006** — Adjuntos se convierten a base64 y se envían por JSON (P1_HIGH)
- [ ] **DNT-LAB-007** — Trabajo de laboratorio no tiene vínculo DB garantizado con plan/cita/prótesis (P1_HIGH)

### Etapa 11 — Personal, comunicaciones, campañas, privacidad y tareas (8)

- [ ] **DNT-STF-001** — Fichajes viven en memoria (P1_HIGH)
- [ ] **DNT-STF-004** — Solicitudes de privacidad son estado local (P1_HIGH)
- [ ] **DNT-MKT-001** — Campañas son constantes/useState (P1_HIGH)
- [ ] **DNT-MKT-002** — Comunicaciones son useState y pacientes demo (P1_HIGH)
- [ ] **DNT-MKT-003** — Consentimiento de marketing es un checkbox local (P1_HIGH)
- [ ] **DNT-MKT-004** — notifications existe pero no hay outbox unificada de entrega externa (P1_HIGH)
- [ ] **DNT-TSK-001** — Tareas rápidas son vista previa sin efectos (P1_HIGH)
- [ ] **DNT-PAT-013** — Origen declarado no está conectado a campaña/UTM (P1_HIGH)

### Etapa 12 — Portal del paciente, recetas y Oye Denty (4)

- [ ] **DNT-RX-001** — No existe schema Supabase de recetas (P0_CRITICAL)
- [ ] **DNT-RX-002** — Firma de receta vive como data URL en UI antes de persistencia externa (P1_HIGH)
- [ ] **DNT-TSK-002** — NLU reconoce más acciones de las que el executor puede ejecutar (P1_HIGH)
- [ ] **DNT-TSK-003** — Acciones de voz dependen de rutas que Supabase parcial no implementa (P1_HIGH)

## B. Validaciones LIVE aún pendientes de Etapas 1–6

### Etapa 1 (9)

- [ ] **S1-LIVE-001** — Respaldar y aplicar la migración Stage 1 primero en staging
- [ ] **S1-LIVE-002** — Migrar/invitar usuarios legacy antes del corte definitivo
- [ ] **S1-LIVE-003** — Enlazar staff existentes con profiles
- [ ] **S1-LIVE-004** — Configurar Supabase Auth URLs y plantillas de email
- [ ] **S1-LIVE-005** — Completar recuperación de contraseña SSR/PKCE
- [ ] **S1-LIVE-006** — Verificar aislamiento real entre dos clínicas
- [ ] **S1-LIVE-007** — Verificar login real de staff y paciente
- [ ] **S1-LIVE-008** — Validar revocación de sesiones en Supabase real
- [ ] **S1-LIVE-009** — Ejecutar build/typecheck/test completos bajo Node 24

### Etapa 2 (6)

- [ ] **S2-LIVE-001** — Aplicar Stage 1 y Stage 2 en Supabase staging
- [ ] **S2-LIVE-002** — Ejecutar matriz RLS con dos clínicas y cinco roles
- [ ] **S2-LIVE-003** — Probar rollback transaccional real
- [ ] **S2-LIVE-004** — Validar audit_log en la misma transacción
- [ ] **S2-LIVE-005** — Revisar duplicados legacy y validar constraints NOT VALID
- [ ] **S2-LIVE-006** — Ejecutar suite completa bajo Node 24

### Etapa 3 (4)

- [ ] **S3-LIVE-001** — Aplicar migración Realtime Stage 3 en Supabase staging
- [ ] **S3-LIVE-002** — Probar Broadcast privado entre dos sesiones reales
- [ ] **S3-LIVE-003** — Probar cambio real de sede
- [ ] **S3-LIVE-004** — Ejecutar build/typecheck/test completos en Node 24

### Etapa 4 (7)

- [ ] **S4-LIVE-001** — Aplicar migración Stage 4 en Supabase staging
- [ ] **S4-LIVE-002** — Verificar conversión histórica de birth_date
- [ ] **S4-LIVE-003** — Auditar record_number legacy antes de producción
- [ ] **S4-LIVE-004** — Probar archive/restore con expediente real completo
- [ ] **S4-LIVE-005** — Comprobar rechazo de DELETE duro y cascadas
- [ ] **S4-LIVE-006** — Validar importación con exportaciones reales de clínica
- [ ] **S4-LIVE-007** — Ejecutar suite completa bajo Node 24

### Etapa 5 (7)

- [ ] **S5-LIVE-001** — Aplicar migración Stage 5 en Supabase staging
- [ ] **S5-LIVE-002** — Probar aislamiento Storage entre dos clínicas con JWT reales
- [ ] **S5-LIVE-003** — Validar cámara y fallback en navegadores reales
- [ ] **S5-LIVE-004** — Verificar documentos/versiones con bytes reales
- [ ] **S5-LIVE-005** — Conectar estado real de Supabase Managed Backups/PITR
- [ ] **S5-LIVE-006** — Definir retención/backup operativo de objetos Storage
- [ ] **S5-LIVE-007** — Ejecutar suite completa bajo Node 24

### Etapa 6 (6)

- [ ] **S6-LIVE-001** — Aplicar migración Stage 6 en Supabase staging
- [ ] **S6-LIVE-002** — Validar concurrencia e historial de odontograma/periodoncia
- [ ] **S6-LIVE-003** — Validar catálogo clínico y snapshots históricos
- [ ] **S6-LIVE-004** — Ejecutar E2E de consentimientos y firma de presupuesto
- [ ] **S6-LIVE-005** — Verificar ledger clínico y audit_log con actor real
- [ ] **S6-LIVE-006** — Ejecutar suite completa y build bajo Node 24

## C. Gates de control pendientes

### Etapa 0

- [ ] Crear rama exclusiva de refactor Supabase.
- [ ] Guardar snapshot/export del schema actual y de las migraciones.
- [ ] Registrar el estado actual de build, lint, typecheck y tests sin intentar arreglarlo todavía.
- [ ] Crear dos clínicas de prueba, dos usuarios staff y dos pacientes para pruebas de aislamiento.
- [ ] Separar explícitamente entorno demo/dev del entorno real.
- [ ] Documentar variables de entorno permitidas y prohibir secretos privilegiados en cliente.
- [ ] Gate: El proyecto puede arrancar de forma reproducible.
- [ ] Gate: Existe una base de pruebas que permita comprobar cross-clinic access.
- [ ] Gate: No existe corpus ficticio en el runtime; Etapa 3 lo eliminó y lo protege con un contrato de regresión.

### Etapa 13

- [ ] Ejecutar todos los criterios globales del audit original.
- [ ] Hacer pruebas E2E de dos clínicas y múltiples roles.
- [ ] Probar create/edit/archive patient, odontograma, plan, consentimiento, presupuesto, cita, factura, pago, laboratorio y alerta.
- [ ] Probar Realtime con dos sesiones abiertas.
- [ ] Probar restauración/recuperación según estrategia de backup.
- [ ] Buscar nuevamente DEMO_, fixtures productivos, localStorage clínico y service-role en CRUD normal.
- [ ] Repetir build, lint, typecheck y suites de integración.
- [ ] Gate: Los 91 findings están cerrados o explícitamente aceptados con justificación.
- [ ] Gate: No existen datos demo mezclados con runtime real.
- [ ] Gate: No hay escrituras clínicas/financieras sensibles fuera de RLS/RPC/audit.
- [ ] Gate: Los módulos reaccionan a la misma fuente de verdad.
- [ ] Gate: Los criterios globales de aceptación del informe original pasan.

# Regla de handoff

- Etapas 1–5 siguen siendo `DO_NOT_REIMPLEMENT`.
- Sus tareas LIVE se validan después sin reescribir esas etapas.
- La siguiente implementación funcional es **Etapa 7**.
- Los IDs marcados `resolved_by_previous_stage` no deben recrearse en su etapa original.
- Este inventario conserva **los 91 IDs originales**: cualquier documento futuro que contenga menos debe explicar explícitamente el filtro aplicado.
