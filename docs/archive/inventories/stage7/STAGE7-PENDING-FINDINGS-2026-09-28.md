# Denty — Recopilación única de hallazgos pendientes

**Checkpoint:** Etapa 7 implementada en código  
**Siguiente etapa funcional:** Etapa 8 — Facturación, pagos y fiscal

Este archivo reúne una sola vez el trabajo que sigue abierto. Los elementos `S*-LIVE-*` son validaciones de implementaciones ya realizadas y **no autorizan reimplementar esas etapas**.

## Etapa 1 — Identidad, autenticación, roles y contexto de clínica

- [ ] S1-LIVE-001 — Respaldar y aplicar la migración Stage 1 primero en staging
- [ ] S1-LIVE-002 — Migrar/invitar usuarios legacy antes del corte definitivo
- [ ] S1-LIVE-003 — Enlazar staff existentes con profiles
- [ ] S1-LIVE-004 — Configurar Supabase Auth URLs y plantillas de email
- [ ] S1-LIVE-005 — Completar recuperación de contraseña SSR/PKCE
- [ ] S1-LIVE-006 — Verificar aislamiento real entre dos clínicas
- [ ] S1-LIVE-007 — Verificar login real de staff y paciente
- [ ] S1-LIVE-008 — Validar revocación de sesiones en Supabase real
- [ ] S1-LIVE-009 — Ejecutar build/typecheck/test completos bajo Node 24

## Etapa 2 — RLS, transacciones, auditoría y constraints base

- [ ] S2-LIVE-001 — Aplicar Stage 1 y Stage 2 en Supabase staging
- [ ] S2-LIVE-002 — Ejecutar matriz RLS con dos clínicas y cinco roles
- [ ] S2-LIVE-003 — Probar rollback transaccional real
- [ ] S2-LIVE-004 — Validar audit_log en la misma transacción
- [ ] S2-LIVE-005 — Revisar duplicados legacy y validar constraints NOT VALID
- [ ] S2-LIVE-006 — Ejecutar suite completa bajo Node 24

## Etapa 3 — Fuente única de verdad, Realtime y contratos

- [ ] S3-LIVE-001 — Aplicar migración Realtime Stage 3 en Supabase staging
- [ ] S3-LIVE-002 — Probar Broadcast privado entre dos sesiones reales
- [ ] S3-LIVE-003 — Probar cambio real de sede
- [ ] S3-LIVE-004 — Ejecutar build/typecheck/test completos en Node 24

## Etapa 4 — Paciente maestro, importación, archivo y retención

- [ ] S4-LIVE-001 — Aplicar migración Stage 4 en Supabase staging
- [ ] S4-LIVE-002 — Verificar conversión histórica de birth_date
- [ ] S4-LIVE-003 — Auditar record_number legacy antes de producción
- [ ] S4-LIVE-004 — Probar archive/restore con expediente real completo
- [ ] S4-LIVE-005 — Comprobar rechazo de DELETE duro y cascadas
- [ ] S4-LIVE-006 — Validar importación con exportaciones reales de clínica
- [ ] S4-LIVE-007 — Ejecutar suite completa bajo Node 24

## Etapa 5 — Cámara, Storage, documentos y backups

- [ ] S5-LIVE-001 — Aplicar migración Stage 5 en Supabase staging
- [ ] S5-LIVE-002 — Probar aislamiento Storage entre dos clínicas con JWT reales
- [ ] S5-LIVE-003 — Validar cámara y fallback en navegadores reales
- [ ] S5-LIVE-004 — Verificar documentos/versiones con bytes reales
- [ ] S5-LIVE-005 — Conectar estado real de Supabase Managed Backups/PITR
- [ ] S5-LIVE-006 — Definir retención/backup operativo de objetos Storage
- [ ] S5-LIVE-007 — Ejecutar suite completa bajo Node 24

## Etapa 6 — Odontograma, periodoncia y pipeline clínico

- [ ] S6-LIVE-001 — Aplicar migración Stage 6 en Supabase staging
- [ ] S6-LIVE-002 — Validar concurrencia e historial de odontograma/periodoncia
- [ ] S6-LIVE-003 — Validar catálogo clínico y snapshots históricos
- [ ] S6-LIVE-004 — Ejecutar E2E de consentimientos y firma de presupuesto
- [ ] S6-LIVE-005 — Verificar ledger clínico y audit_log con actor real
- [ ] S6-LIVE-006 — Ejecutar suite completa y build bajo Node 24
- [ ] S6-LIVE-007 — E2E visual de temporal/mixta/supernumerarios
- [ ] S6-LIVE-008 — Validación clínica de designación ISO 10394

## Etapa 7 — Agenda, recepción, no-show y sala de espera

Los 9 `DNT-*` originales de esta etapa están implementados en código y quedan bloqueados contra reimplementación. Solo faltan estas validaciones:

- [ ] S7-LIVE-001 — Aplicar la migración Stage 7 en Supabase staging y resolver de forma explícita solapes/duplicados legacy que impidan crear constraints
- [ ] S7-LIVE-002 — Probar dos reservas concurrentes y carrera cita↔bloqueo; exactamente una operación incompatible debe confirmar
- [ ] S7-LIVE-003 — Probar Broadcast privado con dos sesiones: `ARRIVED → WAITING → IN_CHAIR` sin recargar
- [ ] S7-LIVE-004 — Probar carrera ausencia↔reserva y disponibilidad inmediata
- [ ] S7-LIVE-005 — Validar no-show → recall → notification/outbox → reagendado vinculado e idempotente
- [ ] S7-LIVE-006 — Validar lista de espera con cuenta paciente/staff y rechazo de escalada de prioridad/estado
- [ ] S7-LIVE-007 — Validar métricas de espera/sillón/puntualidad contra fixtures SQL conocidos
- [ ] S7-LIVE-008 — Ejecutar `npm ci`, typecheck, tests, build y E2E bajo Node 24
- [ ] S7-LIVE-009 — Validar solicitudes de cita del portal y aislamiento cross-clinic: paciente crea/cancela pero no se auto-programa; staff programa; referencias de otra clínica son rechazadas

## Etapa 8 — Facturación, pagos y fiscal

- [ ] DNT-FIN-002 — Faltan tablas de facturas aunque la UI/API las usa
- [ ] DNT-FIN-003 — Proveedor de pago y ledger interno no están garantizados como una sola operación idempotente
- [ ] DNT-FIN-004 — Eventos financieros no invalidan dashboard/analytics/paciente
- [ ] DNT-FIN-005 — fiscal_records existe sin cadena de factura completa

## Etapa 9 — Inicio, análisis y KPIs reales

- [ ] DNT-ANL-003 — No hay definiciones canónicas de KPIs

## Etapa 10 — Laboratorios y alertas conectadas

- [ ] DNT-LAB-001 — No existe maestro de laboratorios en Supabase
- [ ] DNT-LAB-002 — No existe tabla lab_works aunque la API y UI la usan
- [ ] DNT-LAB-003 — Pestaña Laboratorios no ofrece CRUD real
- [ ] DNT-LAB-004 — Balances reales están incompletos y pagos de laboratorio son demo
- [ ] DNT-LAB-005 — Suppliers analytics se usa como fuente de laboratorios
- [ ] DNT-LAB-006 — Adjuntos se convierten a base64 y se envían por JSON
- [ ] DNT-LAB-007 — Trabajo de laboratorio no tiene vínculo DB garantizado con plan/cita/prótesis

## Etapa 11 — Personal, comunicaciones, campañas, privacidad y tareas

- [ ] DNT-STF-001 — Fichajes viven en memoria
- [ ] DNT-STF-004 — Solicitudes de privacidad son estado local
- [ ] DNT-MKT-001 — Campañas son constantes/useState
- [ ] DNT-MKT-002 — Comunicaciones son useState y pacientes demo
- [ ] DNT-MKT-003 — Consentimiento de marketing es un checkbox local
- [ ] DNT-MKT-004 — notifications existe pero no hay outbox unificada de entrega externa
- [ ] DNT-TSK-001 — Tareas rápidas son vista previa sin efectos
- [ ] DNT-PAT-013 — Origen declarado no está conectado a campaña/UTM

## Etapa 12 — Portal del paciente, recetas y Oye Denty

- [ ] DNT-RX-001 — No existe schema Supabase de recetas
- [ ] DNT-RX-002 — Firma de receta vive como data URL en UI antes de persistencia externa
- [ ] DNT-TSK-002 — NLU reconoce más acciones de las que el executor puede ejecutar
- [ ] DNT-TSK-003 — Acciones de voz dependen de rutas que Supabase parcial no implementa

## Conteo reconciliado

- **24** hallazgos originales siguen pendientes de implementación: Etapas 8–12.
- **50** validaciones LIVE/operativas siguen pendientes: Etapas 1–7 y extensión 6.1.
- **74** elementos abiertos únicos en esta recopilación.
- Dentro de los **91 hallazgos originales**, **67/91** ya han sido abordados en código y **24/91** siguen pendientes de implementación.

## Regla de continuidad

- No reabrir Etapas 1–7 salvo un fallo reproducible de sus gates o validaciones LIVE.
- Continuar funcionalmente por **Etapa 8**.
- Stage 7 mantiene una única fuente de estado en Supabase: no volver a introducir citas, ausencias, lista de espera o preferencias en estado local como fuente canónica.
- Toda mutación que pueda crear solapamientos debe atravesar las RPC transaccionales; no restaurar DML directo de citas/bloqueos/ausencias.
