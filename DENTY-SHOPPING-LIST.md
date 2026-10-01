# Denty — Lista técnica

Este documento resume el checkpoint histórico tras Etapa 6. El estado posterior está en el [inventario maestro](DENTY-INVENTARIO-MAESTRO-TOTAL-2026-09-28.md).

## Checkpoint Etapa 6

- 91 hallazgos originales: 58 abordados en código y 33 todavía pendientes en ese momento.
- Etapas 1–6: `DO_NOT_REIMPLEMENT`. Las comprobaciones LIVE no autorizan rediseñar lo cerrado.
- Siguiente implementación de ese checkpoint: Etapa 7, agenda y recepción.
- Detalle por ID, migraciones y evidencia: [inventario Stage 6](docs/stage6-inventory/DENTY-INVENTARIO-MAESTRO-TOTAL-2026-09-28.json).

| Etapa | Base implementada                                               | Check                               |
| ----- | --------------------------------------------------------------- | ----------------------------------- |
| 1     | Supabase Auth, perfiles, membresías, roles y sesiones reales    | `npm run auth:stage1-check`         |
| 2     | RLS, transacciones, auditoría y constraints                     | `npm run security:stage2-check`     |
| 3     | Supabase canónico, Broadcast privado y query keys centralizadas | `npm run architecture:stage3-check` |
| 4     | Importación, ficha/fechas, archivo y restauración               | `npm run patients:stage4-check`     |
| 5     | Cámara, Storage privado, documentos y backups                   | `npm run storage:stage5-check`      |
| 6     | Odontograma, periodoncia, catálogo, plan y firma                | `npm run clinical:stage6-check`     |

## Validación antes de producción

- Aplicar migraciones en orden sobre staging respaldado; revisar datos legacy antes de validar constraints.
- Probar dos clínicas y los roles ADMIN, RECEPTION, DENTIST, ASSISTANT y PATIENT con JWT reales.
- Verificar rollback, auditoría, revocación de sesiones, Broadcast y cambio de sede.
- Comprobar importación, archivo/restauración, bytes/checksums y aislamiento de Storage.
- Probar concurrencia clínica, snapshots y consentimientos → presupuesto → firma.
- Validar dentición temporal/mixta y supernumerarios; comprobar la semántica ISO 10394.
- Ejecutar checks, TypeScript, tests y build con Node 24. Un check local no certifica LIVE.

## Invariantes

- CRUD ordinario con publishable key + JWT; service-role solo en operaciones administrativas explícitas.
- No reintroducir `denty_users`, `admin/admin`, ficha+DNI como contraseña ni clínica por fallback.
- Sin backend paralelo, SSE propio, corpus ficticio ni datos operativos en Web Storage.
- `clinic_id` y sede proceden del actor/contexto autorizado; query keys e invalidaciones compartidas.
- No borrar pacientes físicamente: archivar/restaurar preservando el expediente.
- Presupuestos y documentos firmados son inmutables; un cambio de plan requiere nueva revisión.
- Backups de PostgreSQL no restauran objetos borrados de Storage; validar una estrategia separada.
