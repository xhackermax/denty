# Denty KPI Dictionary — DENTY-KPI-1

Este documento fija las fórmulas canónicas usadas por **Inicio**, **Finanzas** y **Análisis**. Una pantalla no puede redefinir estos KPI localmente. Los rangos son `start` inclusivo y `end` exclusivo.

| KPI | Fórmula canónica | Momento de reconocimiento | Filtros |
|---|---|---|---|
| **Producción** | Suma del `price_snapshot_cents` de cada ítem clínico reconocido una sola vez | Primera cita `COMPLETED` vinculada al `clinical_plan_item_id`, usando `completed_at` | periodo, sede, profesional, especialidad/categoría en breakdown |
| **Facturado** | Suma de `invoices.total_cents` con estado `ISSUED`/`RECTIFIED` | `issued_at` | periodo; sede/profesional cuando la factura es atribuible a cita/ítem |
| **Cobrado** | Suma de `payments.amount_cents` con estado `COMPLETED` | `paid_at` | periodo; con sede/profesional se usa la parte imputada a facturas atribuibles |
| **Pendiente** | `max(0, suma neta de facturas − suma de imputaciones)` | Saldo vivo de facturas reconocidas en el periodo | mismos filtros de Facturado |
| **Margen** | Producción − coste snapshot de los ítems reconocidos | `completed_at` | mismos filtros de Producción |
| **Ticket medio** | Cobrado / número de pagos `COMPLETED` | `paid_at` | mismos filtros de Cobrado |
| **Conversión** | Presupuestos creados en el periodo y firmados dentro del mismo periodo / presupuestos creados en el periodo | cohorte `budgets.created_at`, firma por `budget_signed_snapshots.signed_at` | periodo; sede/profesional si el plan puede atribuirse |
| **No-show** | `NO_SHOW / (NO_SHOW + COMPLETED)` | cohorte por `appointments.starts_at` | periodo, sede, profesional |


## Convención temporal canónica

- **Timezone de negocio:** `Europe/Madrid`.
- `start` es inclusivo y `end` exclusivo.
- Los límites Mes/Trimestre/Año se calculan en `Europe/Madrid` y se envían como instantes ISO con offset.
- Los buckets mensuales del servidor se construyen también en `Europe/Madrid`, para que una operación alrededor de medianoche no cambie de mes por el timezone del servidor.
- El timezone forma parte del contrato versionado `DENTY-KPI-1`; cambiarlo exige una nueva versión del diccionario.

## Reglas de reconocimiento

1. **No duplicar producción.** Si un tratamiento tiene varias citas completadas, se reconoce una sola vez: la primera cita completada vinculada al ítem del plan.
2. **Los snapshots mandan.** Precio y coste proceden de los snapshots del ítem clínico, no del catálogo actual.
3. **Facturas borrador no cuentan.** Solo documentos emitidos o rectificados forman parte de Facturado/Pendiente.
4. **Pagos no completados no cuentan.** `PENDING`, `FAILED` y `REFUNDED` no entran en Cobrado v1. `PARTIALLY_REFUNDED` requiere un ledger de devoluciones netas antes de poder representarse con exactitud.
5. **Pendiente es saldo vivo.** Un cobro realizado después del periodo puede reducir el pendiente de una factura emitida dentro del periodo.
6. **Atribución de sede/profesional.** Producción se atribuye por cita. Facturas se atribuyen por `appointment_id` o, si no existe, por el primer ítem clínico de factura que tenga producción reconocida. Pagos sin imputación no se inventan en una sede/profesional.
7. **Margen clínico bruto.** Stage 9 usa el coste snapshot clínico. Los costes externos de laboratorio se incorporarán cuando Stage 10 disponga de su ledger real.
8. **Versionado.** Cualquier cambio material de fórmula debe crear `DENTY-KPI-2`; no se edita silenciosamente el significado histórico de `DENTY-KPI-1`.

## Limitaciones registradas

- Las devoluciones parciales no tienen todavía un ledger de importes reembolsados; por eso no se mezclan silenciosamente con Cobrado.
- Las compras/laboratorios todavía pertenecen a Stage 10 y no se incluyen en Margen v1.
- Un pago sin imputación puede contarse a nivel clínica pero no puede atribuirse honestamente a sede/profesional.
