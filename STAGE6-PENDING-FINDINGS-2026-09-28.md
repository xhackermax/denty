# Denty — Recopilación única de hallazgos pendientes

**Checkpoint:** Etapa 6.1 corregida

Este archivo reúne una sola vez los hallazgos que siguen abiertos. Los elementos `S6-LIVE-*` son validaciones de una implementación ya hecha y **no deben provocar una reimplementación de Etapa 6**.

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

- [ ] DNT-AGD-001 — Appointments no están implementadas en el handler Supabase
- [ ] DNT-AGD-002 — No hay garantía DB contra doble reserva
- [ ] DNT-AGD-003 — Transiciones ARRIVED/IN_CHAIR/COMPLETED no están cerradas en Supabase
- [ ] DNT-AGD-004 — Avisos de sala de espera no tienen Broadcast real
- [ ] DNT-AGD-005 — Separación/visit gap se guarda en localStorage
- [ ] DNT-AGD-006 — Tablas parciales sin pipeline completo de reagendado
- [ ] DNT-AGD-007 — Métricas de espera/sillón no tienen proyección DB canónica
- [ ] DNT-STF-002 — Ausencias no tienen modelo Supabase canónico
- [ ] DNT-PRT-002 — Lista de espera del portal es un boolean local

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

**Total único pendiente listado:** 74

- **33** son hallazgos funcionales todavía por implementar (Etapas 7–12).
- **41** son validaciones LIVE/operativas de Etapas ya implementadas (1–6).

## Regla de continuidad

- No reabrir Etapas 1–6 salvo un fallo reproducible de sus gates o validaciones LIVE.
- Continuar funcionalmente por Etapa 7.
- En odontograma: no volver a usar dentición mixta fija ni numeración FDI inventada para supernumerarios.
- Mantener identidad dental y tratamientos de supernumerarios enlazados por entidad padre.
