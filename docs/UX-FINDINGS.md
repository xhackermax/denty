# Denty UX Audit Findings

Audit date: 2026-10-05
Scope: dashboard and app shell, agenda, patient record, and phone-width workflows.
Constraints: discovery only; no UI, API, database, or dependency changes.

## Prioritized findings

### P1 — Light-mode text contrast fails WCAG 2.1 AA

**Evidence:** Playwright + axe reported `color-contrast` violations in four of 27 browser tests:

- `/app`, desktop, light appearance: page subtitle, dashboard-calendar subtitle, and an outside-month day.
- `/app/patients`, desktop, light appearance: page subtitle, the “Nuevo paciente” button label, and section description.
- `/app/finance`, desktop, light appearance: page subtitle and metric labels.
- `/app/patients`, 390 × 844 phone viewport, light appearance: patient-card metadata.

The affected styles include the light-mode muted token and its uses in [tokens.css](../src/styles/tokens.css), [global.css](../src/styles/global.css), [dashboard-calendar.module.css](../src/features/dashboard/dashboard-calendar.module.css), [patients-page.module.css](../src/features/patients/patients-page.module.css), and [parity.module.css](../src/shared/ui/parity.module.css). The primary patient action also needs its foreground/background contrast checked.

**Impact / frequency:** Secondary information and one primary action are harder to read in light mode across the dashboard, patient list, and finance. Dark-mode checks passed.

**Smallest proposed fix:** Adjust only the failing light-theme foreground/background pairs to meet at least 4.5:1 for normal text; preserve the current layout and palette intent. Rerun the full axe matrix, including phone width.

**Regression test:** Keep the existing WCAG 2.1 AA Playwright checks for all routes and both appearance schemes. Assert the patient-list phone case as part of that matrix.

**Confidence:** High; directly reproduced by the existing browser accessibility test.

### P1 — Dashboard reports empty/zero operational data alongside query errors

**Evidence:** The `/app` accessibility run rendered the “No se pudieron cargar todos los datos operativos” warning and, at the same time, “Jornada despejada”, “Sin paciente”, and “0 alertas”. The fallback expressions in [dashboard.tsx](../src/features/dashboard/dashboard.tsx) convert missing query data to empty labels and zero counts.

**Impact / frequency:** Staff can read unavailable operational information as a quiet schedule or as a real zero, especially during an outage or while requests are unresolved.

**Smallest proposed fix:** Render a loading state while queries are pending; on error, show unavailable values rather than empty/zero claims. Show “Jornada despejada” only after a successful appointment response confirms no matching appointment.

**Regression test:** Use the fake Supabase harness to delay and fail each dashboard query; assert loading/error states do not claim zero alerts or an empty schedule. Preserve the successful, genuinely empty case.

**Confidence:** High; the error state and misleading values appeared together in the Playwright page snapshot.

### P1 — Finance renders zero metrics and empty sections when data is unavailable

**Evidence:** `/app/finance` displayed “Hay datos financieros no disponibles” while the metric cards showed `0 €` / `0` and the invoice/payment sections said “Sin facturas” / “Sin pagos”. In [finance-module.tsx](../src/features/parity/modules/finance-module.tsx), metrics default missing response fields to zero and list sections default missing items to empty arrays, independently of `hasError`.

**Impact / frequency:** An outage can look like a financially empty clinic despite the error banner; this is especially consequential for billing and collections.

**Smallest proposed fix:** Distinguish pending, failed, and successfully empty results per query. Use an unavailable marker for failed metrics and reserve empty-list messages for successful responses.

**Regression test:** Make the fake summary, invoice, payment, and Verifactu requests fail independently; assert failed data is not displayed as zero or as a confirmed empty list.

**Confidence:** High; the combined error and zero/empty state appeared in the browser snapshot and is supported by the component fallbacks.

### P2 — Patient overview can present projection failures as a genuine empty record

**Evidence:** In [patient-profile.tsx](../src/features/patients/patient-profile.tsx), the projection error warning (“Resumen incompleto”) does not prevent the summary from rendering “Sin próxima cita”, €0, and `0 presupuestos abiertos` from absent projection data. In [patient-clinical-summary.tsx](../src/features/patients/patient-clinical-summary.tsx), unresolved workflow data is initially treated as empty arrays.

**Impact / frequency:** A delayed or failed projection can briefly, or persistently after an error, imply that a patient has no upcoming visit, budget, problem, or clinical note.

**Smallest proposed fix:** Distinguish pending and failed projections from a successful empty response; retain genuine empty states only after successful loading.

**Regression test:** Delay and fail the patient projection and clinical workflow endpoints independently; assert no empty-history or zero-budget claim is shown for unavailable data.

**Verification status:** Code-path risk identified; this failure mode was not forced in the browser during this audit.

**Confidence:** Medium-high.

## Areas with no confirmed defect

- Agenda: its light-, dark-, and phone-width accessibility checks passed. The agenda unit suite passed 41/41 tests. The browser checks for the mobile “Nueva cita” placement and booking from the next-slot finder passed. No agenda interaction or responsive defect was reproduced.
- Patient record and adversarial content: the existing worst-case browser scenarios passed 3/3, including long names/contact data and large budget content. The ficha accessibility checks passed in the audited schemes and phone viewport.
- Dashboard/navigation unit suite: 9/9 tests passed.

## Verification and limits

- Browser accessibility/mobile/agenda run: 27 tests; 23 passed and 4 failed, all four for `color-contrast` in light mode as detailed above. The failures were `/app`, `/app/patients` desktop, `/app/finance`, and `/app/patients` at 390 × 844. The dark-mode matrix and the agenda checks passed.
- Dashboard/navigation unit tests: 9/9 passed.
- Agenda unit tests: 41/41 passed.
- Worst-case browser tests: 3/3 passed.
- Browser emulation does not establish physical iOS/Android behavior. The tablet layout was not separately verified in this pass.
- No application UI or backend code has been changed. The accessibility failures were pre-existing and remain to be addressed after review.

## Proposed implementation order

1. Correct light-mode contrast and make the WCAG matrix pass.
2. Separate unavailable from empty/zero dashboard and finance data.
3. Apply the same pending/error distinction to patient projections and clinical summaries.

Please review these findings before implementation; no UI changes are included in this audit.
