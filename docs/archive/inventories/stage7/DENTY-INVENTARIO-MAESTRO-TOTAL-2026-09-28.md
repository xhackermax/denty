# Denty — Inventario maestro

Checkpoint histórico: tras Etapa 7. Estados y evidencias completas: [inventario JSON](DENTY-INVENTARIO-MAESTRO-TOTAL-2026-09-28.json).

## Estado

- Hallazgos originales: **91**; abordados en código: **67**; sin implementar: **24**.
- Resueltos en código: **49**; implementados pendientes de validación LIVE: **18**.
- Tareas LIVE registradas: **51**; pendientes: **50**; completadas/absorbidas: **1**.
- Etapas 1–7: `DO_NOT_REIMPLEMENT`. Siguiente etapa del checkpoint: **8**.
- Una tarea LIVE no equivale a desarrollo pendiente. Reabrir solo un defecto reproducible.

## Hallazgos originales

Estados: **C** = `RESOLVED_IN_CODE`; **V** = `IMPLEMENTED_PENDING_LIVE_VALIDATION`; **P** = `PENDING_IMPLEMENTATION`.

| ID          | Etapa | Estado | Hallazgo original                                                                            |
| ----------- | ----: | :----: | -------------------------------------------------------------------------------------------- |
| DNT-P0-001  |     1 |   V    | Dos sistemas de identidad incompatibles                                                      |
| DNT-P0-002  |     1 |   V    | Clave privilegiada usada como Bearer para operaciones normales                               |
| DNT-P0-003  |     1 |   V    | denty_users contiene password_hash y no tiene RLS                                            |
| DNT-P0-004  |     1 |   V    | Bootstrap administrativo admin/admin                                                         |
| DNT-P0-005  |     1 |   V    | Número de ficha + DNI se usa como credencial                                                 |
| DNT-P0-006  |     1 |   V    | Roles DB y dominio no coinciden                                                              |
| DNT-P0-007  |     1 |   V    | staff_members no enlaza con profile/auth user                                                |
| DNT-P0-008  |     3 |   C    | Dos backends de verdad: Supabase parcial + API externo                                       |
| DNT-P0-009  |     3 |   C    | Faltan @supabase/supabase-js y @supabase/ssr                                                 |
| DNT-P0-010  |     2 |   C    | Tablas tenant sin RLS                                                                        |
| DNT-P0-011  |     2 |   C    | RLS habilitado pero políticas incompletas                                                    |
| DNT-P0-012  |     2 |   C    | SECURITY DEFINER con search_path=public                                                      |
| DNT-P0-013  |     2 |   C    | Operaciones compuestas carecen de frontera transaccional común                               |
| DNT-P0-014  |     1 |   V    | Clinic context puede resolverse por fallback/autocreación                                    |
| DNT-P0-015  |     5 |   C    | No hay Supabase Storage clínico                                                              |
| DNT-P0-016  |     3 |   C    | Realtime de Supabase no está configurado                                                     |
| DNT-P0-017  |     3 |   C    | Invalidación de caché omite alertas, finanzas, analytics y otros dominios                    |
| DNT-P0-018  |     2 |   C    | audit_log no está conectado obligatoriamente a mutaciones                                    |
| DNT-P0-019  |     2 |   C    | updated_at no se actualiza automáticamente                                                   |
| DNT-P0-020  |     3 |   C    | Analytics y otros outputs usan schemas demasiado permisivos                                  |
| DNT-P0-021  |     3 |   C    | Fixtures demo mezclados con runtime real                                                     |
| DNT-P0-022  |     5 |   C    | UI de backup es ficticia                                                                     |
| DNT-P0-023  |     3 |   C    | Query key factory incompleto                                                                 |
| DNT-PAT-001 |     5 |   C    | La foto se lee pero no se puede crear/actualizar                                             |
| DNT-PAT-002 |     5 |   C    | PatientProfile usa foto del paciente demo                                                    |
| DNT-PAT-003 |     5 |   C    | No existe flujo cámara→preview→Storage→paciente                                              |
| DNT-PAT-004 |     4 |   C    | Importación no cubre JSON/XLSX                                                               |
| DNT-PAT-005 |     4 |   C    | Se detecta ficha legado pero no se conserva                                                  |
| DNT-PAT-006 |     4 |   C    | record_number no tiene constraint único en DB                                                |
| DNT-PAT-007 |     4 |   C    | DNI obligatorio/nullable es inconsistente                                                    |
| DNT-PAT-008 |     4 |   C    | birth_date modelado como timestamptz                                                         |
| DNT-PAT-009 |     4 |   C    | Proyección de paciente devuelve módulos vacíos                                               |
| DNT-PAT-010 |     4 |   C    | No hay comando real archive/restore                                                          |
| DNT-PAT-011 |     4 |   C    | medical_profile mutable sin versión clínica                                                  |
| DNT-PAT-012 |     4 |   C    | Pacientes ficticios siguen codificados en superficies productivas                            |
| DNT-PAT-013 |    11 |   P    | Origen declarado no está conectado a campaña/UTM                                             |
| DNT-CLN-001 |     6 |   C    | Guardado batch no transaccional                                                              |
| DNT-CLN-002 |     6 |   C    | Snapshots del servidor se hidratan con entidades vacías                                      |
| DNT-CLN-003 |     6 |   C    | Historial clínico demo/local convive con historial servidor                                  |
| DNT-CLN-004 |     6 |   C    | Periodoncia carece de persistencia Supabase completa/versionada                              |
| DNT-CLN-005 |     6 |   C    | Plan y presupuesto quedan desfasables hasta sincronización manual                            |
| DNT-CLN-006 |     6 |   C    | Catálogo hardcoded; Editar no persiste                                                       |
| DNT-CLN-007 |     6 |   C    | Plan item usa treatment_code libre sin FK a catálogo                                         |
| DNT-CLN-008 |     6 |   C    | Requirements de consentimiento tienen lógica dual DB/demo-client                             |
| DNT-CLN-009 |     6 |   C    | Firma y precondiciones no están garantizadas en una transacción DB                           |
| DNT-DOC-001 |     5 |   C    | Centro documental mantiene datos/localStorage demo                                           |
| DNT-DOC-002 |     5 |   C    | Versiones/bytes/checksum no están cerrados extremo a extremo                                 |
| DNT-CLN-010 |     6 |   C    | clinical_history_events no es ledger obligatorio                                             |
| DNT-AGD-001 |     7 |   V    | Appointments no están implementadas en el handler Supabase                                   |
| DNT-AGD-002 |     7 |   V    | No hay garantía DB contra doble reserva                                                      |
| DNT-AGD-003 |     7 |   V    | Transiciones ARRIVED/IN_CHAIR/COMPLETED no están cerradas en Supabase                        |
| DNT-AGD-004 |     7 |   V    | Avisos de sala de espera no tienen Broadcast real                                            |
| DNT-AGD-005 |     7 |   V    | Separación/visit gap se guarda en localStorage                                               |
| DNT-AGD-006 |     7 |   V    | Tablas parciales sin pipeline completo de reagendado                                         |
| DNT-AGD-007 |     7 |   V    | Métricas de espera/sillón no tienen proyección DB canónica                                   |
| DNT-FIN-001 |     9 |   C    | Inicio muestra citas/alertas/KPIs demo                                                       |
| DNT-ANL-001 |     9 |   C    | Análisis usa métricas y tratamientos hardcoded                                               |
| DNT-ANL-002 |     9 |   C    | Selector Mes/Trimestre/Año es cosmético                                                      |
| DNT-ANL-003 |     9 |   P    | No hay definiciones canónicas de KPIs                                                        |
| DNT-FIN-002 |     8 |   P    | Faltan tablas de facturas aunque la UI/API las usa                                           |
| DNT-FIN-003 |     8 |   P    | Proveedor de pago y ledger interno no están garantizados como una sola operación idempotente |
| DNT-FIN-004 |     8 |   P    | Eventos financieros no invalidan dashboard/analytics/paciente                                |
| DNT-FIN-005 |     8 |   P    | fiscal_records existe sin cadena de factura completa                                         |
| DNT-LAB-001 |    10 |   P    | No existe maestro de laboratorios en Supabase                                                |
| DNT-LAB-002 |    10 |   P    | No existe tabla lab_works aunque la API y UI la usan                                         |
| DNT-LAB-003 |    10 |   P    | Pestaña Laboratorios no ofrece CRUD real                                                     |
| DNT-LAB-004 |    10 |   P    | Balances reales están incompletos y pagos de laboratorio son demo                            |
| DNT-LAB-005 |    10 |   P    | Suppliers analytics se usa como fuente de laboratorios                                       |
| DNT-LAB-006 |    10 |   P    | Adjuntos se convierten a base64 y se envían por JSON                                         |
| DNT-LAB-007 |    10 |   P    | Trabajo de laboratorio no tiene vínculo DB garantizado con plan/cita/prótesis                |
| DNT-ALT-001 |    10 |   C    | Alertas solo viven en useState demo                                                          |
| DNT-ALT-002 |    10 |   C    | Inicio cuenta una lista distinta de la que se resuelve en Alertas                            |
| DNT-TSK-001 |    11 |   P    | Tareas rápidas son vista previa sin efectos                                                  |
| DNT-MKT-001 |    11 |   P    | Campañas son constantes/useState                                                             |
| DNT-MKT-002 |    11 |   P    | Comunicaciones son useState y pacientes demo                                                 |
| DNT-MKT-003 |    11 |   P    | Consentimiento de marketing es un checkbox local                                             |
| DNT-MKT-004 |    11 |   P    | notifications existe pero no hay outbox unificada de entrega externa                         |
| DNT-STF-001 |    11 |   P    | Fichajes viven en memoria                                                                    |
| DNT-STF-002 |     7 |   V    | Ausencias no tienen modelo Supabase canónico                                                 |
| DNT-STF-003 |     1 |   V    | Sesiones de usuario mostradas son ficticias                                                  |
| DNT-STF-004 |    11 |   P    | Solicitudes de privacidad son estado local                                                   |
| DNT-RX-001  |    12 |   P    | No existe schema Supabase de recetas                                                         |
| DNT-RX-002  |    12 |   P    | Firma de receta vive como data URL en UI antes de persistencia externa                       |
| DNT-PRT-001 |    12 |   C    | Portal es una maqueta basada en DEMO_PATIENTS                                                |
| DNT-PRT-002 |     7 |   V    | Lista de espera del portal es un boolean local                                               |
| DNT-TSK-002 |    12 |   P    | NLU reconoce más acciones de las que el executor puede ejecutar                              |
| DNT-TSK-003 |    12 |   P    | Acciones de voz dependen de rutas que Supabase parcial no implementa                         |
| DNT-LOC-001 |     3 |   C    | El principio local-first no tiene una capa de sincronización demostrable                     |
| DNT-MCL-001 |     3 |   C    | Filtros y preferencias no tienen contexto de site/clinic uniforme                            |
| DNT-DAT-001 |     4 |   C    | FKs ON DELETE CASCADE podrían borrar expediente completo si se permite DELETE de paciente    |
| DNT-DAT-002 |     2 |   C    | Faltan constraints/indexes tenant/natural keys de varios maestros                            |

## Validaciones LIVE

El JSON conserva cada ID, estado y procedimiento. Resumen por etapa:

| Etapa | Pendientes | Verificar                                                                          |
| ----- | ---------: | ---------------------------------------------------------------------------------- |
| 1     |          9 | Migración de identidades, perfiles, Auth/PKCE, roles, aislamiento y revocación.    |
| 2     |          6 | Migraciones, RLS con dos clínicas, rollback, auditoría y constraints legacy.       |
| 3     |          4 | Broadcast privado, cambio de sede e invalidación de caché.                         |
| 4     |          7 | Fechas/fichas legacy, archivo/restauración, rechazo de borrado e importación.      |
| 5     |          7 | Storage privado, cámara, versiones/checksums y backup independiente de objetos.    |
| 6     |          8 | Concurrencia e historial clínico, catálogo, consentimientos/firma y dentición.     |
| 7     |          9 | Reservas/bloqueos/ausencias, recepción, no-show, outbox, lista de espera y portal. |

Todas las etapas requieren sus checks bajo Node 24; las pruebas LIVE necesitan usuarios/JWT reales de dos clínicas.
`S1-LIVE-010` fue absorbida por Stage 3 (`@supabase/ssr`); no es un pendiente.

## Dentición y pendientes adicionales

- Extensión 6.1: `S6-ODO-001`–`S6-ODO-005`, dentición temporal/mixta y supernumerarios; validar `S6-LIVE-007/008` según el checkpoint.

## Gates de control

- Etapa 0: snapshot del esquema, entorno reproducible, línea base de checks y pruebas de aislamiento.
- Etapa 13: E2E clínico-financiero, roles/clínicas, Realtime, restauración y checks de release.
- Producción: sin corpus ficticio ni almacenamiento clínico en navegador; CRUD con JWT del usuario y RLS/RPC/auditoría.
- Conservar los 91 IDs y justificar cualquier aceptación de riesgo; no declarar LIVE aprobado solo por tests locales.
