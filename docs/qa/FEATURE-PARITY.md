# Native / Legacy Feature Parity

This matrix is a release control, not a design wish list. `Evidence` points to executable verification or E2E coverage.

| Feature | Legacy behavior to preserve | Native implementation | Evidence | Status |
|---|---|---|---|---|
| Patients | search, create, open profile, archived state, quick links | `/app/patients`, `/app/patients/[id]` | `apps/web/e2e/parity/native-core.spec.ts`, `tests/verify_tenant_guards_v2.mjs` | Native |
| Agenda | doctor/day views, arrival layer, NPA, move/resize, waiting/cascade | `/app/agenda` | `apps/web/e2e/parity/native-core.spec.ts`, `tests/verify_agenda_v12_*.mjs` | Native |
| Odontogram | multi-treatment display and clinical colors | native patient profile odontogram | `tests/verify_odontogram_v3_*.mjs` | Native |
| Treatment plan | ordered route, dependencies, alternatives | native patient profile treatment section | `tests/verify_clinical_plan_*.mjs` | Native |
| Finance | budgets, invoices, payments | `/app/finance` | `tests/verify_finance_native_actions.mjs` | Native |
| Documents | templates, finalization, signing, delivery | `/app/documents` | `tests/verify_native_operations_ui.mjs` | Native |
| Laboratory | stage timeline, rework, attachments | `/app/laboratory` | `tests/verify_native_operations_ui.mjs` | Native |
| Analysis | admin metrics and drill-down | `/app/analysis` | `tests/verify_analysis_*.mjs` | Native |

No row is considered parity evidence solely because a page renders. The cited test must exercise or verify the preserved behavior.
