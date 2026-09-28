# Denty Surgery Odontogram + Clinical Rule Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Surgery as a first-class odontogram lens, make R001–R035 executable across all clinical entry points, and connect implant/prosthetic planning to consent, budget and surgery-day completion without creating a second clinical truth.

**Architecture:** Keep `DentalEntity` and the existing odontogram history as the persistence envelope, add typed surgical/planning attributes and a central pure rule engine, then route interactive commits through that engine before state mutation. Surgery mirrors Endodontics in UX while reading/writing the same `OdontogramEntityState`; implant planning stores billable prosthetic intent separately from actual placement data.

**Tech Stack:** TypeScript, React 19, Next.js 16.3.5, Mantine, Vitest, Motion, existing Denty API/query layer.

**Spec:** `docs/superpowers/specs/2026-09-26-denty-clinical-surgery-finance-ux-design.md`

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

---

### Task 1: Extend odontogram domain types and lifecycle

**Files:**
- Modify: `src/domain/odontogram/index.ts`
- Create: `src/domain/odontogram/clinical-rules/types.ts`
- Test: `src/domain/__tests__/odontogram-clinical-types.test.ts`

**Interfaces:**
- Produces `ClinicalLifecycleState = "HALLAZGO_EXISTENTE" | "PLANIFICADO" | "REALIZADO" | "REALIZADO_OTRA_CLINICA"`.
- Adds entity types: `SURGERY`, `BONE_GRAFT`, `MEMBRANE`, `SINUS_LIFT`, `SURGICAL_LESION`, `IMPLANT_COMPONENT`, `PROSTHETIC_STRUCTURE`, `PERIODONTAL_FINDING`.
- Produces `clinicalLifecycleState(entity: DentalEntity): ClinicalLifecycleState | null`.
- Produces rule contracts: `ClinicalAction`, `ClinicalRuleSeverity`, `ClinicalRuleDecision`, `ClinicalRuleContext`, `ClinicalRuleEvaluation`.

- [ ] **Step 1: Write failing tests** for legacy compatibility, lifecycle normalization, and unknown-status `null`.
- [ ] **Step 2: Run RED**: `npm test -- --run src/domain/__tests__/odontogram-clinical-types.test.ts`.
- [ ] **Step 3: Add additive types/helpers** without making new fields mandatory.
- [ ] **Step 4: Run GREEN**.
- [ ] **Step 5: Commit** `feat: extend odontogram clinical domain`.

### Task 2: Implement central rule engine R001–R018

**Files:**
- Create: `src/domain/odontogram/clinical-rules/anatomy.ts`
- Create: `src/domain/odontogram/clinical-rules/rules-r001-r018.ts`
- Create: `src/domain/odontogram/clinical-rules/engine.ts`
- Create: `src/domain/odontogram/clinical-rules/index.ts`
- Test: `src/domain/__tests__/odontogram-clinical-rules-r001-r018.test.ts`

**Interfaces:**
- Produces `evaluateClinicalAction(action, entities, context?): ClinicalRuleEvaluation`.
- Anatomy helpers cover dentition, tooth type, upper-posterior zone and furcation eligibility.

- [ ] **Step 1: Write table-driven failing tests** with allowed + triggered cases for every R001–R018 and no unrelated false positives.
- [ ] **Step 2: Run RED**.
- [ ] **Step 3: Implement pure anatomy helpers** with no React/storage/API access.
- [ ] **Step 4: Implement explicit R001–R018 evaluators** preserving stable IDs/messages.
- [ ] **Step 5: Run GREEN**.
- [ ] **Step 6: Commit** `feat: add odontogram rules r001-r018`.

### Task 3: Implement R019–R035 and batch validation

**Files:**
- Create: `src/domain/odontogram/clinical-rules/rules-r019-r035.ts`
- Modify: `src/domain/odontogram/clinical-rules/engine.ts`
- Test: `src/domain/__tests__/odontogram-clinical-rules-r019-r035.test.ts`
- Test: `src/domain/__tests__/odontogram-clinical-rule-batches.test.ts`

**Interfaces:**
- Produces `evaluateClinicalBatch(actions, entities, context?): ClinicalRuleEvaluation`.
- Batch rules see the aggregate proposed state.

- [ ] **Step 1: Write failing tests** for R019–R035 including sinus zone, TiBase, Multiunit, bar/Locator, membrane, dimensions, cantilever, retratamiento/apicectomía.
- [ ] **Step 2: Write failing order-independence tests** for TiBase+structure and implant+components.
- [ ] **Step 3: Run RED**.
- [ ] **Step 4: Implement R019–R035 + aggregate evaluator**.
- [ ] **Step 5: Run GREEN**.
- [ ] **Step 6: Commit** `feat: complete odontogram clinical rule engine`.

### Task 4: Route odontogram mutations through validation

**Files:**
- Modify: `src/domain/odontogram/state.ts`
- Modify: `src/domain/__tests__/odontogram-state.test.ts`
- Create: `src/domain/__tests__/odontogram-rule-state-integration.test.ts`

**Interfaces:**
- Produces `executeValidatedOdontogramCommand(...)` and `executeValidatedOdontogramBatch(...)`.
- Returns `{ history, evaluation }`.
- Keeps low-level `applyOdontogramCommand` for replay/internal use.

- [ ] **Step 1: Write failing tests**: blocks do not mutate; warnings commit; batch is one undo step; old implant/caries branch is not duplicated.
- [ ] **Step 2: Run RED**.
- [ ] **Step 3: Implement validated wrappers** and remove duplicate policy from `assertEntityConflict`.
- [ ] **Step 4: Run GREEN**.
- [ ] **Step 5: Commit** `refactor: centralize odontogram validation`.

### Task 5: Add Surgery odontogram matching Endodontics

**Files:**
- Modify: `src/features/odontogram/clinical-tabs.tsx`
- Create: `src/features/odontogram/surgery-panel.tsx`
- Create: `src/features/odontogram/surgery-visuals.tsx`
- Modify: `src/features/odontogram/odontogram-workspace.tsx`
- Modify: `src/features/odontogram/odontogram.module.css`
- Modify: `src/features/odontogram/odontogram-workspace.test.tsx`
- Create: `src/features/odontogram/surgery-panel.test.tsx`

**Interfaces:**
- Adds `ClinicalTab = "surgery"`.
- Produces `SurgeryPanel({ selectedTooth, entities, readOnly, onCommitBatch, onWarning })`.
- Produces `surgicalVisualsForTooth(tooth, entities)`.
- Writes the same shared state/history as General/Endodontics.

- [ ] **Step 1: Write failing tab/workspace tests**: Surgery cycles correctly; selected tooth drives panel; changes are visible in General/shared state.
- [ ] **Step 2: Run RED**.
- [ ] **Step 3: Implement surgical families**: extraction/simple/surgical, impacted, germectomy, alveoloplasty, exposure, apicoectomy, frenectomy, biopsy, implant states, graft/GBR/socket/split crest, membrane, internal/external sinus lift.
- [ ] **Step 4: Add restrained SVG overlays + ARIA labels**.
- [ ] **Step 5: Run GREEN**.
- [ ] **Step 6: Commit** `feat: add surgery odontogram`.

### Task 6: Add hidden contextual surgery legend

**Files:**
- Create: `src/features/odontogram/surgery-legend.tsx`
- Modify: `src/features/odontogram/surgery-panel.tsx`
- Modify: `src/features/odontogram/odontogram.module.css`
- Test: `src/features/odontogram/surgery-legend.test.tsx`

**Interfaces:**
- Closed by default; opens selected advanced details.
- Can be opened/focused by a validation requirement.

- [ ] **Step 1: Write failing accessibility/behavior tests**.
- [ ] **Step 2: Run RED**.
- [ ] **Step 3: Implement disclosure and focus handoff**.
- [ ] **Step 4: Run GREEN**.
- [ ] **Step 5: Commit** `feat: add surgery hidden legend`.

### Task 7: Add explicit implant-prosthetic planning/BOM

**Files:**
- Create: `src/domain/odontogram/implant-planning.ts`
- Modify: `src/domain/odontogram/index.ts`
- Modify: `src/shared/api/schemas/clinical.ts`
- Modify: `src/features/odontogram/surgery-panel.tsx`
- Test: `src/domain/__tests__/implant-planning.test.ts`
- Test: `src/domain/__tests__/implant-budget-bom.test.ts`

**Interfaces:**
- `ImplantProstheticDesign = "UNIT_TIBASE" | "MULTIUNIT_FIXED" | "DIRECT_SCREWED" | "BAR_OVERDENTURE" | "LOCATOR_OVERDENTURE" | "HYBRID_ALL_ON_X" | "CUSTOM"`.
- `ImplantPlanComponent` has stable `code`, `label`, `quantity`, optional `tooth`, `billable`, `attributes`.
- `createPlannedImplant(tooth, design?)` stores no actual fixture data.
- `deriveImplantBudgetBom(plan)` returns explicit billable components.
- `createImplantStack()` remains as a compatibility wrapper until callers migrate.

- [ ] **Step 1: Write failing BOM tests**: unit+TiBase, Multiunit multiple, bar/Locator exclusion, no fabricated fixture data.
- [ ] **Step 2: Run RED**.
- [ ] **Step 3: Implement planning model + compatibility wrapper**.
- [ ] **Step 4: Add preset/design controls to hidden legend**.
- [ ] **Step 5: Run GREEN**.
- [ ] **Step 6: Commit** `feat: add implant prosthetic planning bom`.

### Task 8: Connect surgery planning to consent and budget invariants

**Files:**
- Modify: `src/domain/consent-requirements.ts`
- Create: `src/domain/implant-budget-versioning.ts`
- Modify: `src/shared/api/schemas/clinical.ts`
- Modify: `src/shared/clinical/clinical-pipeline-card.tsx`
- Test: `src/domain/__tests__/consent-requirements.test.ts`
- Test: `src/domain/__tests__/implant-budget-versioning.test.ts`

**Interfaces:**
- Deterministic consent mapping for implant, extraction, graft/GBR, periapical surgery and biopsy.
- Produces `shouldCreateBudgetRevision({ signedFingerprint, currentPlanFingerprint }): boolean`.

- [ ] **Step 1: Write failing consent tests** for surgical treatment codes.
- [ ] **Step 2: Write failing budget immutability/version tests**.
- [ ] **Step 3: Run RED**.
- [ ] **Step 4: Implement additive mappings/version helper**.
- [ ] **Step 5: Run GREEN**.
- [ ] **Step 6: Commit** `feat: connect surgery planning to consent and budget gates`.

### Task 9: Integrate surgery-day reminder and actual implant completion

**Files:**
- Modify: `src/domain/implant-surgery-reminder.ts`
- Modify: `src/features/odontogram/implant-surgery-panel.tsx`
- Modify: `src/features/odontogram/odontogram-workspace.tsx`
- Modify: `src/features/odontogram/surgery-panel.tsx`
- Test: `src/domain/__tests__/implant-surgery-reminder.test.ts`
- Test: `src/features/odontogram/implant-surgery-panel.test.tsx`
- Test: `scripts/tests/implant-surgery-exact-optional-regression.mjs`

**Interfaces:**
- Reminder deep-link opens Surgery and selects a planned implant when possible.
- `REALIZADO` gate requires system, diameter, length, placement date, torque and primary ISQ.
- Optional lot/connection/notes remain optional and omitted when unknown.

- [ ] **Step 1: Write failing deep-link/completion tests**.
- [ ] **Step 2: Run RED**.
- [ ] **Step 3: Refactor existing implant form into Surgery context**.
- [ ] **Step 4: Run reminder/exact-optional/component tests GREEN**.
- [ ] **Step 5: Commit** `feat: integrate surgery day implant completion`.

### Task 10: Clinical release gates

**Files:**
- Create: `scripts/tests/odontogram-clinical-rules-regression.mjs`
- Create: `scripts/tests/surgery-odontogram-regression.mjs`
- Modify: `scripts/verify-vercel-regression-matrix.mjs` only for stable architecture/source invariants.

- [ ] **Step 1: Add regressions that fail on the pre-feature baseline**.
- [ ] **Step 2: Run RED**.
- [ ] **Step 3: Wire only required release invariants**.
- [ ] **Step 4: Run full clinical suite + existing implant regressions**.
- [ ] **Step 5: Commit** `test: gate surgery odontogram release`.
