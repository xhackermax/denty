# Oye Denty Per-Dentist Learning Implementation Plan

**Goal:** Make Denty silently learn operational language and workflow preferences per dentist after three equivalent successful, uncorrected examples, while keeping every learned rule inspectable, editable, reversible, and isolated by clinic/doctor.

**Spec:** [Design](../specs/2026-09-25-oye-denty-assistant-design.md). This is the original implementation scope; consult [current checkpoint](../../archive/stages/CHECKPOINT-STATUS.md) before reopening completed work.

## Global Constraints

- Depends on Plans 01 and 02.
- Learning scope is per dentist, never clinic-global.
- Exactly three equivalent successful, uncorrected evidences activate a rule.
- Learning activation is silent: no toast and no spoken “I learned this”.
- Patient-identifiable content is not stored in learned rules.
- Allowed kinds: `ALIAS`, `DURATION`, `WORKFLOW`, `VOCABULARY`.
- Clinical diagnoses, medical guidance, prescriptions, and universal treatment rules are not learnable kinds.
- Test repository is memory-only; runtime persistence goes through the Denty backend API.
- Rules can be edited, deactivated, deleted, or reset from Settings.

## Review Focus

- Two dentists using the same phrase differently must never share a rule.
- Three evidences from one patient must not accidentally store that patient’s identity in the rule.
- A correction on the third observation must prevent activation.
- An inactive/deleted rule must stop affecting interpretation immediately.
- Reworded equivalent phrases must canonicalize consistently without merging clinically different concepts.

## Tasks

### Task 1: Learning contracts and canonicalization

Files: `src/features/assistant/learning/learning-types.ts`, `src/features/assistant/learning/pattern-canonicalizer.ts`, `src/features/assistant/__tests__/pattern-canonicalizer.test.ts`.

Normalize Spanish triggers with NFD accent stripping, lowercase, punctuation removal and whitespace collapse. Key: scope + kind + normalized trigger + SHA-256 of stable JSON whitelisted value; distinct treatment codes stay distinct and patient metadata is excluded. Scope prefers staffId, then userId.

### Task 2: Three-evidence learner and correction decay

Files: `src/features/assistant/learning/pattern-learner.ts`, `src/features/assistant/__tests__/pattern-learner.test.ts`.

`applyEvidence`: successful+uncorrected increments evidence; corrected increments corrections. `confidence = clamp((evidenceCount - correctionCount * 2) / 3, 0, 1)`; active iff evidenceCount ≥3 and confidence ≥0.67. Test third-use activation, correction on third use and automatic deactivation below threshold.

### Task 3: Repository abstraction and production API contracts

Files: `src/features/assistant/learning/learning-repository.ts`, `src/features/assistant/learning/memory-learning-repository.ts`, `src/features/assistant/learning/learning-data.ts`, `src/shared/api/contracts.ts`, `src/shared/api/resources/assistant.ts`, `src/shared/api/endpoints.ts`, `src/features/assistant/__tests__/learning-repository.test.ts`.

Backend endpoints: `GET /api/assistant/learning`, `POST /api/assistant/feedback/correction`, `PATCH/DELETE /api/assistant/learning/:id`, `POST /api/assistant/learning/reset`. Pattern schema requires id/scope/kind/trigger/value/counts/confidence/active/timestamps. In-memory Map is test-only; test scope isolation and scoped reset.

### Task 4: Collect evidence and corrections from real assistant execution

Files: `src/features/assistant/assistant-provider.tsx`, `src/features/assistant/tools/assistant-tool-executor.ts`, `src/features/assistant/learning/evidence-extractor.ts`, `src/features/assistant/__tests__/learning-evidence.integration.test.ts`.

Collect only successful operational ALIAS, DURATION, WORKFLOW or VOCABULARY evidence. Undo/replacement in the active session records correction for the same key. Reject diagnosis, medication, allergy, prescription, payment amounts, patient identity, note text and document content.

### Task 5: Apply learned patterns before local/Realtime interpretation

Files: `src/features/assistant/learning/apply-learned-patterns.ts`, `src/features/assistant/assistant-provider.tsx`, `src/features/assistant/realtime/assistant-prompt.ts`, `src/features/assistant/__tests__/apply-learned-patterns.test.ts`.

Apply only active rules for the current dentist as structured hints before local/Realtime interpretation. Do not rewrite raw transcripts or send evidence history. Edited/inactive/deleted rules take effect immediately.

### Task 6: Settings → Denty AI → Mi aprendizaje

Files: `src/features/parity/modules/settings-module.tsx`, `src/features/assistant/learning/learning-settings-panel.tsx`, `src/features/assistant/__tests__/learning-settings-panel.test.tsx`.

Add Settings tab `denty-ai`: Mi aprendizaje shows trigger/kind/evidence/confidence/status/update date; edit, deactivate, delete and reset personal rules. Reset uses explicit Mantine confirmation, never window.confirm; no activation toast/voice and no clinical-history reset.

### Task 7: Learning regression gate

Files: `scripts/tests/assistant-learning-regression.mjs`.

Gate browser-storage absence and extraction whitelist; test canonicalization, exact threshold/corrections, scope isolation, hints and UI; run release checks below.

## Verification

Use TDD for implementation changes; run tests beside the affected modules under `src/features/assistant/__tests__/`, Voice or Domain as applicable.

```bash
npm run typecheck
npm run architecture:check
npm test
npm run build
```

A production build and any required authenticated LIVE checks must pass before claiming release readiness.
