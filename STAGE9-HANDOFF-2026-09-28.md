# Stage 9 — Handoff de Inicio, análisis y KPIs reales

**Estado:** `implemented_code_pending_live_gate`  
**Bloqueo:** `DO_NOT_REIMPLEMENT`

## Resultado

Stage 9 deja una única semántica analítica `DENTY-KPI-1` compartida por Inicio, Finanzas y Análisis. La implementación usa vistas/RPC Supabase sobre los ledgers clínico, de agenda y financiero; no hay cifras demo como fallback.

## Qué se ha construido

1. **Diccionario KPI versionado**: fórmula, reconocimiento, timestamp, timezone `Europe/Madrid`, tablas fuente y filtros.
2. **Producción única por tratamiento**: primera cita `COMPLETED` ligada a `clinical_plan_item_id`; múltiples citas no multiplican producción.
3. **Snapshots históricos** de especialidad/categoría además de precio/coste.
4. **Facturado, Cobrado y Pendiente** sobre factura/pago/allocation reales, con rectificativas netas.
5. **Margen y ticket medio** desde la misma fuente canónica.
6. **Conversión y no-show** con cohortes explícitas.
7. **Breakdowns** por tratamiento, profesional, especialidad y mes.
8. **Timezone de negocio** `Europe/Madrid` tanto en límites de periodo como buckets mensuales.
9. **Sede activa**: Inicio y Análisis respetan `activeSiteId`.
10. **Realtime**: cambios clínicos y financieros invalidan Analytics/Inicio.

## Hallazgos nuevos cerrados

- [x] S9-NEW-001 Analytics routes previously claimed as real were not implemented by the Supabase handler and could return 501.
- [x] S9-NEW-002 Dashboard queried financial analytics for roles without finance.read.
- [x] S9-NEW-003 Period boundaries used browser timezone instead of Europe/Madrid.
- [x] S9-NEW-004 Specialty/category were not snapshotted on clinical plan items, allowing historical reclassification after catalog edits.
- [x] S9-NEW-005 Pending receivables floored per invoice instead of netting rectifying invoices across the scope.
- [x] S9-NEW-006 Treatment conversion mixed cohorts and could exceed 100%.
- [x] S9-NEW-007 Treatment breakdown omitted invoiced-only treatments in the selected financial period.
- [x] S9-NEW-008 clinical_plan_items Realtime invalidation did not invalidate Analytics/Dashboard.
- [x] S9-NEW-009 Invoice fallback attribution could use any linked appointment instead of the recognized production event.
- [x] S9-NEW-010 Monthly buckets used server/session timezone instead of Europe/Madrid.
- [x] S9-NEW-011 Analytics endpoints did not share a single cross-field start/end validation contract.
- [x] S9-NEW-012 KPI dictionary omitted timezone from the versioned DB/API contract.
- [x] S9-NEW-013 Dashboard financial KPIs ignored activeSiteId while the operational dashboard was site-scoped.

## Límites/pending que no deben maquillarse

- [ ] S9-PEND-001 Legacy unused analytics resources comparison/losses/events/treatments-drilldown remain exposed but have no canonical Supabase implementation; retire or define semantics in cleanup instead of inventing metrics.
- [ ] S9-PEND-002 purchases/suppliers/cost-recipes/supplier-invoices depend on Stage 10 laboratory/supplier ledger and remain intentionally deferred.
- [ ] S9-PEND-003 PARTIALLY_REFUNDED has no explicit refund-amount ledger; DENTY-KPI-1 Cobrado therefore counts only COMPLETED until a refund ledger exists.
- [ ] S9-PEND-004 Margin DENTY-KPI-1 excludes external laboratory costs until Stage 10 provides attributable lab cost ledger.
- [ ] S9-INHERITED-001 games-integrity fails because scripts/games/legacy-hashes.json expects SHA-256 47fd65e… for public/games/js/app.js while the asset has ee5bb683…; the same mismatch is already present unchanged in Stage 5, 6.1, 7 and 8, so Stage 9 did not mutate the asset.

## Validaciones LIVE

- `S9-LIVE-001…009` permanecen pendientes. Incluyen aplicación en Supabase real, fixtures KPI, DST Madrid, rectificativas, reconocimiento de producción, atribución por sede/profesional, rendimiento SQL, Realtime y Node 24/E2E.

## Estado del inventario original

- Hallazgos originales abordados en código: **72/91**.
- Hallazgos originales pendientes de implementación: **19/91**.
- Stage 9 tiene **0 hallazgos originales pendientes de implementación**.

## Próxima etapa

**Stage 10 — Laboratorios y alertas conectadas.**
