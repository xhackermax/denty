# Oye Denty Proactivity Implementation Plan

**Goal:** Make Denty proactively surface useful, silent, actionable notifications from deterministic local/business rules without keeping an AI session or microphone active.

**Spec:** [Design](../specs/2026-09-25-oye-denty-assistant-design.md). This is the original implementation scope; consult [current checkpoint](../../../CHECKPOINT-STATUS.md) before reopening completed work.

## Global Constraints

- Depends on Plans 01–03.
- Proactivity is visual-only by default; it never speaks spontaneously.
- Proactivity must not start Realtime or wake the microphone.
- First release is deterministic and limited to six approved rule families.
- Dismissed suggestions are scoped to the relevant entity/version so a materially changed condition may surface again.
- No diagnosis or treatment recommendation is generated from general medical knowledge.
- Suggestions must link to the underlying source screen/data.

## Review Focus

- A dismissed budget reminder must not reappear every render, but must reappear if a new budget version becomes unsigned.
- A signed budget must never produce “pending signature”.
- Waiting-room thresholds must use Europe/Madrid time and not stale browser clocks where server timestamps exist.
- A caries-without-plan rule must distinguish missing treatment from a deliberately dismissed/alternative plan state.
- Duplicate rule triggers from multiple React Query refreshes must coalesce into one suggestion.

## Tasks

### Task 1: Suggestion contracts and deduplication

Files: `src/features/assistant/proactive/proactive-types.ts`, `src/features/assistant/proactive/proactive-engine.ts`, `src/features/assistant/__tests__/proactive-engine.test.ts`.

`evaluateProactiveRules(snapshot, dismissed)` returns stable suggestions sorted HIGH→MEDIUM→LOW then timestamp. Key `${ruleId}:${entityKey}:${versionKey}`; duplicate triggers coalesce, dismissal suppresses that version and material version change restores eligibility. Suggestion includes id/rule/entity/version, optional patient, title/message/priority/href/prepareTool/createdAt.

### Task 2: Budget and document signature rules

Files: `src/features/assistant/proactive/proactive-rules.ts`, `src/features/assistant/__tests__/proactive-signature-rules.test.ts`, `src/features/parity/modules/finance-module.tsx`, `src/features/parity/modules/documents-module.tsx`.

Budget reminder only for generated/final budget with absent/stale signature fingerprint; document reminder only for a signable pending document. Signed/archived versions do not fire. Link to underlying patient/budget/document.

### Task 3: Medical-history completeness rule

Files: `src/features/assistant/proactive/proactive-rules.ts`, `src/features/assistant/__tests__/proactive-medical-history.test.ts`.

Medical profile completeness requires arrays `allergies`, `medications`, `conditions`, `dentalRisks`; empty arrays and empty notes are valid. Missing profile before clinical workflow is HIGH; informational only, with patient Clinical-tab link and no automatic tool.

### Task 4: Waiting-room threshold rule

Files: `src/features/assistant/proactive/proactive-rules.ts`, `src/features/assistant/proactive/proactive-time.ts`, `src/features/assistant/__tests__/proactive-waiting.test.ts`.

Inject now and use domain dates/Europe/Madrid/server timestamps. `DEFAULT_WAITING_ALERT_MINUTES = 20`: 19 minutes no alert, 20 alert; in-chair/completed no alert. Threshold changes are outside v1.

### Task 5: Next-plan-step and diagnosis-without-plan rules

Files: `src/features/assistant/proactive/proactive-rules.ts`, `src/features/assistant/__tests__/proactive-clinical-plan.test.ts`.

`NEXT_PLAN_STEP_PENDING` follows explicit existing dependencies after completion. `DIAGNOSIS_WITHOUT_PLAN` reports diagnosis without an open/approved matching tooth plan; approved alternative/planned restoration suppresses it. Offer Ver plan, never invent a filling/crown.

### Task 6: Store, notification UI, and quick actions

Files: `src/features/assistant/proactive/proactive-store.tsx`, `src/features/assistant/proactive/proactive-notification-card.tsx`, `src/features/parity/modules/alerts-module.tsx`, `src/features/assistant/assistant-provider.tsx`, `src/features/assistant/__tests__/proactive-notification-card.test.tsx`.

Denty AI section integrates existing alerts. Ver navigates; Preparar uses assistant policy; Descartar hides current version. Dismissal is session-scoped; memory only in isolated tests, no browser storage/durable preferences in v1. No mic/audio/Realtime activation.

### Task 7: Proactivity regression gate

Files: `scripts/tests/assistant-proactive-regression.mjs`.

Gate that proactive modules import no Realtime client, microphone API or OpenAI URL. Test all six rule families, dedupe/version dismissal, thresholds and quick actions; release checks below.

## Verification

Use TDD for implementation changes; run tests beside the affected modules under `src/features/assistant/__tests__/`, Voice or Domain as applicable.

```bash
npm run typecheck
npm run architecture:check
npm test
npm run build
```

A production build and any required authenticated LIVE checks must pass before claiming release readiness.
