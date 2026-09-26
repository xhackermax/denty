# Oye Denty Proactivity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Denty proactively surface useful, silent, actionable notifications from deterministic local/business rules without keeping an AI session or microphone active.

**Architecture:** A small event-driven `ProactiveEngine` evaluates a fixed first set of rules when relevant Denty data changes. Rules return normalized `AssistantSuggestion` objects with `Ver`, `Preparar`, and `Descartar` actions. The notification layer is shared with Denty’s existing alerts/notifications surfaces. Realtime is not opened merely to scan for conditions; semantic AI enrichment is deferred unless a user explicitly opens a suggestion that needs interpretation.

**Tech Stack:** Existing Denty APIs, React Query, Zod, Mantine, Vitest. No additional AI dependency.

**Spec:** `docs/superpowers/specs/2026-09-25-oye-denty-assistant-design.md`

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

---

## File Structure

- Create `src/features/assistant/proactive/proactive-types.ts`.
- Create `src/features/assistant/proactive/proactive-engine.ts`.
- Create `src/features/assistant/proactive/proactive-rules.ts`.
- Create `src/features/assistant/proactive/proactive-store.tsx`.
- Create `src/features/assistant/proactive/proactive-notification-card.tsx`.
- Modify `src/features/parity/modules/alerts-module.tsx` to include assistant suggestions.
- Modify relevant patient/agenda/document/budget query adapters to publish normalized rule input.
- Add tests under `src/features/assistant/__tests__/`.

### Task 1: Suggestion contracts and deduplication

**Files:**
- Create: `src/features/assistant/proactive/proactive-types.ts`
- Create: `src/features/assistant/proactive/proactive-engine.ts`
- Test: `src/features/assistant/__tests__/proactive-engine.test.ts`

**Interfaces:**

```ts
export type ProactiveRuleId =
  | "BUDGET_UNSIGNED"
  | "MEDICAL_HISTORY_INCOMPLETE"
  | "WAITING_TOO_LONG"
  | "NEXT_PLAN_STEP_PENDING"
  | "DIAGNOSIS_WITHOUT_PLAN"
  | "DOCUMENT_UNSIGNED";

export interface AssistantSuggestion {
  id: string;
  ruleId: ProactiveRuleId;
  entityKey: string;
  versionKey: string;
  patientId?: string;
  title: string;
  message: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  href: string;
  prepareTool?: { name: string; args: unknown };
  createdAt: string;
}
```

- [ ] **Step 1: Write dedupe/dismissal tests**

Evaluate the same input twice → one suggestion. Dismiss `{ ruleId, entityKey, versionKey }` → hidden. Change `versionKey` → suggestion is eligible again.

- [ ] **Step 2: Verify RED**

```bash
npx vitest run src/features/assistant/__tests__/proactive-engine.test.ts
```

- [ ] **Step 3: Implement pure engine**

`evaluateProactiveRules(snapshot, dismissed)` returns a stable array sorted HIGH → MEDIUM → LOW then created timestamp. Dedup key is `${ruleId}:${entityKey}:${versionKey}`.

- [ ] **Step 4: Verify GREEN and commit**

```bash
npx vitest run src/features/assistant/__tests__/proactive-engine.test.ts
git add src/features/assistant/proactive src/features/assistant/__tests__/proactive-engine.test.ts
git commit -m "feat: add deterministic proactive suggestion engine"
```

### Task 2: Budget and document signature rules

**Files:**
- Create/Modify: `src/features/assistant/proactive/proactive-rules.ts`
- Test: `src/features/assistant/__tests__/proactive-signature-rules.test.ts`
- Modify: `src/features/parity/modules/finance-module.tsx` and `src/features/parity/modules/documents-module.tsx` to expose normalized budget/document status and version to the rule snapshot.

- [ ] **Step 1: Write signature-rule tests**

Budget rule fires only when budget is generated/final and current signature fingerprint is absent/stale. Document rule fires only for documents in a signable pending state. Signed/archived versions do not fire.

- [ ] **Step 2: Implement rule outputs**

Budget suggestion:

```ts
{
  ruleId: "BUDGET_UNSIGNED",
  title: "Presupuesto pendiente de firma",
  message: "El presupuesto actual está preparado pero todavía no tiene la firma del paciente.",
  href: `/app/patients/${patientId}?tab=budget`,
  prepareTool: { name: "budget.prepare_signature", args: { patientId, budgetId } },
  priority: "MEDIUM",
}
```

Document suggestion links to `/app/documents` with patient/document identifiers in the existing navigation mechanism.

- [ ] **Step 3: Verify and commit**

Run targeted tests, typecheck, commit.

### Task 3: Medical-history completeness rule

**Files:**
- Modify: `src/features/assistant/proactive/proactive-rules.ts`
- Test: `src/features/assistant/__tests__/proactive-medical-history.test.ts`

- [ ] **Step 1: Define completeness explicitly**

For v1, “complete” means the patient has a medical profile object and each of the four groups `allergies`, `medications`, `conditions`, `dentalRisks` exists as an array, plus medical `notes` may be empty. The rule is informational; it does not infer whether the values themselves are medically sufficient.

- [ ] **Step 2: Test incomplete/complete cases**

No profile → HIGH before a clinical workflow screen; profile with all arrays (including empty/“none” selections) → no suggestion.

- [ ] **Step 3: Implement and commit**

Suggestion href points to patient Clinical tab and has no auto-executing clinical tool.

### Task 4: Waiting-room threshold rule

**Files:**
- Modify: `src/features/assistant/proactive/proactive-rules.ts`
- Create: `src/features/assistant/proactive/proactive-time.ts`
- Test: `src/features/assistant/__tests__/proactive-waiting.test.ts`

- [ ] **Step 1: Write clock-safe tests**

Inject `now` into the pure rule. Appointment waiting 19 min with threshold 20 → no suggestion; 20 min → suggestion; appointment moved to chair/completed → no suggestion.

- [ ] **Step 2: Implement default threshold**

Default `20` minutes. V1 uses the named constant `DEFAULT_WAITING_ALERT_MINUTES = 20`; changing the threshold is outside this plan.

- [ ] **Step 3: Verify and commit**

Use domain date helpers/Europe-Madrid rules instead of raw `new Date()` inside `src/domain`.

### Task 5: Next-plan-step and diagnosis-without-plan rules

**Files:**
- Modify: `src/features/assistant/proactive/proactive-rules.ts`
- Test: `src/features/assistant/__tests__/proactive-clinical-plan.test.ts`

- [ ] **Step 1: Write plan consistency tests**

Cases:
- completed endodontic item with an explicit dependent planned crown → `NEXT_PLAN_STEP_PENDING`;
- caries entity on tooth 16 and no open/approved clinical-plan item for tooth 16 → `DIAGNOSIS_WITHOUT_PLAN`;
- an approved alternative or existing planned restoration for tooth 16 → no diagnosis-without-plan suggestion.

- [ ] **Step 2: Implement data-only rules**

Do not invent a treatment. `DIAGNOSIS_WITHOUT_PLAN` says only that a diagnosis has no associated plan item and offers `Ver plan`, not “add crown/filling”.

`NEXT_PLAN_STEP_PENDING` names the already-existing next plan item and may offer `Ver`/`Preparar` if preparation is a safe existing tool.

- [ ] **Step 3: Verify and commit**

Run targeted tests and clinical-plan regressions.

### Task 6: Store, notification UI, and quick actions

**Files:**
- Create: `src/features/assistant/proactive/proactive-store.tsx`
- Create: `src/features/assistant/proactive/proactive-notification-card.tsx`
- Modify: `src/features/parity/modules/alerts-module.tsx`
- Modify: `src/features/assistant/assistant-provider.tsx`
- Test: `src/features/assistant/__tests__/proactive-notification-card.test.tsx`

- [ ] **Step 1: Write UI tests**

`Ver` navigates to `href`; `Preparar` routes through assistant tool policy; `Descartar` removes only current version; no audio API or Realtime start is called when suggestions appear.

- [ ] **Step 2: Implement in-memory demo dismissal**

Dismissals live in provider memory in demo. V1 production also treats dismissals as session-scoped; durable dismissal preferences are outside this plan. Do not use browser storage.

- [ ] **Step 3: Merge into AlertsModule**

Render a `Denty AI` subsection above existing alert rows when assistant suggestions exist. Preserve existing alert workflow unchanged.

- [ ] **Step 4: Verify and commit**

```bash
npx vitest run src/features/assistant/__tests__/proactive-notification-card.test.tsx --environment jsdom
npm run architecture:check
git add src/features/assistant/proactive src/features/parity/modules/alerts-module.tsx src/features/assistant/assistant-provider.tsx src/features/assistant/__tests__/proactive-notification-card.test.tsx
git commit -m "feat: surface proactive Denty notifications"
```

### Task 7: Proactivity regression gate

**Files:**
- Create: `scripts/tests/assistant-proactive-regression.mjs`

- [ ] **Step 1: Lock no-background-AI invariant**

Script fails if proactive modules import Realtime client, microphone APIs, `navigator.mediaDevices`, or OpenAI URLs.

- [ ] **Step 2: Full verification**

```bash
node scripts/tests/assistant-proactive-regression.mjs
npm run typecheck
npm run test -- --run
npm run architecture:check
npm run vercel:regressions
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add scripts/tests/assistant-proactive-regression.mjs
git commit -m "test: lock silent proactive assistant behavior"
```

## Proactivity Acceptance Gate

Proactivity is complete only when:
1. all six approved rule families are deterministic;
2. duplicate suggestions coalesce;
3. dismissed entity versions stay dismissed;
4. changed versions can surface again;
5. no proactive rule starts audio or Realtime;
6. suggestions never invent a clinical treatment;
7. `Ver`, `Preparar`, `Descartar` behave through existing navigation/tool policy;
8. production build passes.
