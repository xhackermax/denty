# Stage 8 — Handoff de facturación, pagos y fiscal

**Estado:** `implemented_code_pending_live_gate`  
**Bloqueo:** `DO_NOT_REIMPLEMENT`

## Qué se ha construido

1. **Factura canónica en Supabase**: `invoice_series`, `billing_settings`, `invoices`, `invoice_lines`, vínculo a paciente/presupuesto/cita y allocations a factura.
2. **Emisión transaccional**: serie bloqueada, número único, snapshot de emisor/cliente, factura y líneas inmutables tras emisión.
3. **Rectificativas**: factura nueva vinculada a la original; el original pasa a `RECTIFIED` sin reescribir su contenido.
4. **Pago exactamente una vez**: `payment_attempt` conserva proveedor, idempotencia, método, invoice/budget y termina en un único `payments` + `payment_allocations`.
5. **Proveedores**: manual, SumUp y Stripe reutilizan el intento existente y no vuelven a disparar el proveedor con la misma clave. Las rutas antiguas que podían cobrar sin ledger se delegan o retiran.
6. **Seguridad**: RLS financiera + permisos en RPC; `finance.read/write`, `billing.issue`, `billing.settings.manage`; aislamiento por clínica.
7. **Fiscal**: cada factura emitida genera `fiscal_records` inmutable, encadenado SHA-256; un advisory lock por clínica evita bifurcaciones entre series. `VERIFACTU` usa `integration_events` como outbox idempotente.
8. **Realtime**: invoices, lines, payments, allocations y fiscal records invalidan Finanzas, paciente, Inicio y Analytics.
9. **Exportación/PDF**: ruta de PDF usa el snapshot fiscal congelado y existe CSV contable básico.

## Decisiones que deben conservarse

- No crear un segundo ledger de pagos. Se reutilizan `payments` y `payment_allocations`.
- No permitir escrituras financieras directas desde cliente; mutaciones pasan por RPC.
- No reutilizar una factura emitida como borrador. Los cambios posteriores se resuelven con una nueva factura/rectificativa.
- No inventar cumplimiento legal: la arquitectura VERI*FACTU queda pendiente de validación oficial LIVE.
- No restaurar los endpoints SumUp legacy que no tenían `patientId`/`payment_attempt`/ledger.

## Hallazgos originales Stage 8

- [x] DNT-FIN-002 — invoice ledger canónico.
- [x] DNT-FIN-003 — proveedor y ledger idempotentes.
- [x] DNT-FIN-004 — invalidación financiera cruzada.
- [x] DNT-FIN-005 — factura ↔ fiscal_records/outbox/chain.

## Validaciones LIVE

Ver `STAGE8-PENDING-FINDINGS-2026-09-28.md`, especialmente `S8-LIVE-001…009`.

## Próxima etapa

**Stage 9 — Inicio, análisis y KPIs reales.**
