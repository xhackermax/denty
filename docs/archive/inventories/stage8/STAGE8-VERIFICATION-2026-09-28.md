# Stage 8 — Verificación final

## Resultado ejecutable en este entorno

- `auth:stage1-check`: PASS.
- `security:stage2-check`: PASS.
- `architecture:stage3-check`: PASS.
- `patients:stage4-check`: PASS.
- `storage:stage5-check`: PASS.
- `clinical:stage6-check`: PASS.
- `agenda:stage7-check`: PASS.
- `finance:stage8-check`: PASS.
- Architecture gate: PASS.
- API parity: **208/208 browser contracts represented**, 3 rutas server-only excluidas.
- Pipeline self-check: PASS.
- Payment security/provider/Stripe SDK/efficiency gates: PASS.
- Transpilación sintáctica independiente: **16/16 TS/TSX tocados PASS**.
- Búsqueda de escrituras financieras directas en `src/`: ninguna encontrada.
- Búsqueda de `501`, `TODO` y `Not Implemented` en la capa Stage 8: ninguna encontrada.
- Funciones `SECURITY DEFINER` nuevas revisadas con `search_path=''`.
- Documentación histórica `docs/stage7-inventory/` preservada sin modificación.

## Garantías Stage 8 cubiertas por contrato

- Numeración de facturas por serie bajo bloqueo transaccional.
- Prefijo de serie único por clínica y `full_number` único por clínica.
- Snapshot fiscal del emisor y cliente en factura emitida.
- Facturas/líneas/fiscal_records inmutables después de emisión, salvo transición controlada a `RECTIFIED`.
- Rectificación mediante nuevo documento vinculado al original.
- Cadena fiscal SHA-256 serializada por clínica con `pg_advisory_xact_lock`, evitando bifurcaciones entre series concurrentes.
- Un `payment_attempt` terminal no vuelve a estados intermedios.
- Misma idempotencyKey con datos distintos produce conflicto.
- `post_succeeded_payment_attempt` enlaza exactamente un payment interno.
- Allocations no pueden superar el saldo de factura ni el importe total del payment.
- Rutas estáticas manual/Stripe delegan al flujo canónico y el checkout SumUp legacy sin ledger queda retirado.
- Realtime financiero invalida Finanzas, paciente, dashboard y analytics.

## Gates que NO se certifican aquí

### Node 24 / suite completa

`npm ci --offline --ignore-scripts` falla antes de instalar por `EBADENGINE`:

- requerido por proyecto: Node `24.x`
- disponible en este contenedor: Node `22.16.0`

Por ello quedan pendientes `npm ci`, `typecheck`, suite completa Next, `build` y E2E bajo Node 24 (`S8-LIVE-009`).

### Supabase PostgreSQL real

Este entorno no dispone de una instancia PostgreSQL/Supabase staging sobre la que aplicar la migración. La validación de migración con datos legacy, concurrencia real, RLS multiclínica y Realtime queda en `S8-LIVE-001/002/005/006`.

### Proveedores y fiscalidad oficial

No se certifica aquí un cobro real SumUp/Stripe ni una integración oficial AEAT. La arquitectura implementa idempotencia, ledger y outbox, pero las pruebas de proveedor/certificado/AEAT/QR y revisión fiscal-contable son `S8-LIVE-003/004/007/008`.

**Conclusión:** Stage 8 está cerrada en código y bloqueada `DO_NOT_REIMPLEMENT`; las tareas LIVE son validaciones de despliegue, proveedores y cumplimiento, no una invitación a reconstruir el sistema financiero.
