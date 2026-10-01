# Denty Surgery Odontogram + Clinical Rule Engine Implementation Plan

**Goal:** Add Surgery as a first-class odontogram lens, make R001–R035 executable across all clinical entry points, and connect implant/prosthetic planning to consent, budget and surgery-day completion without creating a second clinical truth.

**Spec:** [Design](../specs/2026-09-26-denty-clinical-surgery-finance-ux-design.md). This is the original implementation scope; consult [current checkpoint](../../../CHECKPOINT-STATUS.md) before reopening completed work.

## Global Constraints

- Node `24.x`; Vercel build stays `node scripts/pipeline/run.mjs vercel-build`.
- No separate Surgery database or duplicated odontogram truth.
- Existing snapshots and legacy status strings remain readable.
- Planned implants do not require manufacturer, diameter, length, lot, torque, ISQ or actual placement date.
- Completing a placed implant requires system, diameter, length, placement date, insertion torque and primary ISQ.
- UI/Oye Denty share one validation path.
- Signed budgets/documents remain immutable snapshots.
- R001–R035 from `odontograma_catalogo.json` are canonical for this release.

## Review Focus

- Unknown legacy status values must load without false blocking.
- Multi-entity actions validate against the aggregate proposed state, not insertion order.
- Warnings permit commit; blocks never mutate state/history.
- One accepted surgical batch is one undo step.
- Plan edits after signature create/revise drafts and never rewrite a signed budget.

## Tasks

### Task 1: Extend odontogram domain types and lifecycle

Files: `src/domain/odontogram/index.ts`, `src/domain/odontogram/clinical-rules/types.ts`, `src/domain/__tests__/odontogram-clinical-types.test.ts`.

Extend DentalEntity/lifecycle without mandatory new fields. `clinicalLifecycleState` returns normalized state or null for unknown legacy values; add typed rule contracts. Test legacy compatibility.

### Task 2: Implement central rule engine R001–R018

Files: `src/domain/odontogram/clinical-rules/anatomy.ts`, `src/domain/odontogram/clinical-rules/rules-r001-r018.ts`, `src/domain/odontogram/clinical-rules/engine.ts`, `src/domain/odontogram/clinical-rules/index.ts`, `src/domain/__tests__/odontogram-clinical-rules-r001-r018.test.ts`.

Pure `evaluateClinicalAction` plus anatomy helpers implement R001–R018 with triggered/allowed cases and no unrelated false positives. No React/storage/API in domain rules.

### Task 3: Implement R019–R035 and batch validation

Files: `src/domain/odontogram/clinical-rules/rules-r019-r035.ts`, `src/domain/odontogram/clinical-rules/engine.ts`, `src/domain/__tests__/odontogram-clinical-rules-r019-r035.test.ts`, `src/domain/__tests__/odontogram-clinical-rule-batches.test.ts`.

Complete R019–R035 and `evaluateClinicalBatch` against aggregate proposed state. Test sinus region, attachments, membranes/dimensions, cantilevers and retreatment/apicoectomy.

### Task 4: Route odontogram mutations through validation

Files: `src/domain/odontogram/state.ts`, `src/domain/__tests__/odontogram-state.test.ts`, `src/domain/__tests__/odontogram-rule-state-integration.test.ts`.

`executeValidatedOdontogramCommand/Batch` returns history/evaluation; blocks do not mutate and accepted batch is one undo step. Low-level apply remains for replay; remove duplicate local conflict policy.

### Task 5: Add Surgery odontogram matching Endodontics

Files: `src/features/odontogram/clinical-tabs.tsx`, `src/features/odontogram/surgery-panel.tsx`, `src/features/odontogram/surgery-visuals.tsx`, `src/features/odontogram/odontogram-workspace.tsx`, `src/features/odontogram/odontogram.module.css`, `src/features/odontogram/odontogram-workspace.test.tsx`, `src/features/odontogram/surgery-panel.test.tsx`.

Surgery tab/panel/SVG uses the same state as General/Endodontics. Support procedures listed in the linked spec, explicit selection, read-only history and batch commit.

### Task 6: Add hidden contextual surgery legend

Files: `src/features/odontogram/surgery-legend.tsx`, `src/features/odontogram/surgery-panel.tsx`, `src/features/odontogram/odontogram.module.css`, `src/features/odontogram/surgery-legend.test.tsx`.

Legend collapsed by default, opening only selected advanced details or focused missing-context fields. Test selection and required-field focus.

### Task 7: Add explicit implant-prosthetic planning/BOM

Files: `src/domain/odontogram/implant-planning.ts`, `src/domain/odontogram/index.ts`, `src/shared/api/schemas/clinical.ts`, `src/features/odontogram/surgery-panel.tsx`, `src/domain/__tests__/implant-planning.test.ts`, `src/domain/__tests__/implant-budget-bom.test.ts`.

Explicit ImplantPlanComponent code/label/quantity/tooth?/billable/attributes. Designs: UNIT_TIBASE, MULTIUNIT_FIXED, DIRECT_SCREWED, BAR_OVERDENTURE, LOCATOR_OVERDENTURE, HYBRID_ALL_ON_X, CUSTOM. `createPlannedImplant` omits actual fixture data; `deriveImplantBudgetBom` emits each billable component; keep createImplantStack compatibility.

### Task 8: Connect surgery planning to consent and budget invariants

Files: `src/domain/consent-requirements.ts`, `src/domain/implant-budget-versioning.ts`, `src/shared/api/schemas/clinical.ts`, `src/shared/clinical/clinical-pipeline-card.tsx`, `src/domain/__tests__/consent-requirements.test.ts`, `src/domain/__tests__/implant-budget-versioning.test.ts`.

Deterministic surgical consent mapping and `shouldCreateBudgetRevision` compare signed/current plan fingerprints. No rewrite of signed budget; preserve consent/signature gates.

### Task 9: Integrate surgery-day reminder and actual implant completion

Files: `src/domain/implant-surgery-reminder.ts`, `src/features/odontogram/implant-surgery-panel.tsx`, `src/features/odontogram/odontogram-workspace.tsx`, `src/features/odontogram/surgery-panel.tsx`, `src/domain/__tests__/implant-surgery-reminder.test.ts`, `src/features/odontogram/implant-surgery-panel.test.tsx`, `scripts/tests/implant-surgery-exact-optional-regression.mjs`.

Reminder selects planned implant in Surgery. REALIZADO requires system, diameter, length, date, torque and ISQ; optional lot/connection/notes omitted when unknown. Test exact optional properties and completion gate.

### Task 10: Clinical release gates

Files: `scripts/tests/odontogram-clinical-rules-regression.mjs`, `scripts/tests/surgery-odontogram-regression.mjs`, `scripts/verify-vercel-regression-matrix.mjs`.

Run all rules, shared-state/undo/BOM/consent/reminder tests and existing history/API/games/Supabase gates; Node 24 production pipeline remains release requirement.

## Verification

Use TDD for implementation changes; run affected tests under `src/domain/__tests__/` and `src/features/odontogram/`, plus the clinical regression scripts in Task 10.

```bash
npm run typecheck
npm run architecture:check
npm test
npm run build
```

A production build and any required authenticated LIVE checks must pass before claiming release readiness.
