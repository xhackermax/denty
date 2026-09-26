# Oye Denty Per-Dentist Learning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Denty silently learn operational language and workflow preferences per dentist after three equivalent successful, uncorrected examples, while keeping every learned rule inspectable, editable, reversible, and isolated by clinic/doctor.

**Architecture:** Executed assistant turns emit normalized `LearningEvidence`. A deterministic learner canonicalizes evidence into a key scoped by `clinicId + staffId` (fallback `clinicId + userId`), increments evidence/correction counts, and activates only approved learning kinds at the three-evidence threshold. Demo uses an in-memory repository; production uses explicit Denty API contracts. Learned rules are applied as a pre-interpretation hint layer, never as medical truth and never by modifying model weights.

**Tech Stack:** Existing Denty stack, Zod, React Query, Vitest. No new model/provider dependency.

**Spec:** `docs/superpowers/specs/2026-09-25-oye-denty-assistant-design.md`

## Global Constraints

- Depends on Plans 01 and 02.
- Learning scope is per dentist, never clinic-global.
- Exactly three equivalent successful, uncorrected evidences activate a rule.
- Learning activation is silent: no toast and no spoken “I learned this”.
- Patient-identifiable content is not stored in learned rules.
- Allowed kinds: `ALIAS`, `DURATION`, `WORKFLOW`, `VOCABULARY`.
- Clinical diagnoses, medical guidance, prescriptions, and universal treatment rules are not learnable kinds.
- Demo repository is memory-only; production persistence goes through Denty backend API.
- Rules can be edited, deactivated, deleted, or reset from Settings.

## Review Focus

- Two dentists using the same phrase differently must never share a rule.
- Three evidences from one patient must not accidentally store that patient’s identity in the rule.
- A correction on the third observation must prevent activation.
- An inactive/deleted rule must stop affecting interpretation immediately.
- Reworded equivalent phrases must canonicalize consistently without merging clinically different concepts.

---

## File Structure

- Create `src/features/assistant/learning/learning-types.ts`.
- Create `src/features/assistant/learning/pattern-canonicalizer.ts`.
- Create `src/features/assistant/learning/pattern-learner.ts`.
- Create `src/features/assistant/learning/learning-repository.ts`.
- Create `src/features/assistant/learning/demo-learning-repository.ts`.
- Create `src/features/assistant/learning/learning-data.ts` — React Query/API adapter.
- Modify `src/shared/api/contracts.ts` and resources to add assistant learning contracts.
- Modify `src/features/assistant/assistant-provider.tsx` to collect evidence/corrections.
- Modify local/Realtime routing to apply active learned hints.
- Modify `src/features/parity/modules/settings-module.tsx` to add `Denty AI` and `Mi aprendizaje`.
- Add tests under `src/features/assistant/__tests__/`.

### Task 1: Learning contracts and canonicalization

**Files:**
- Create: `src/features/assistant/learning/learning-types.ts`
- Create: `src/features/assistant/learning/pattern-canonicalizer.ts`
- Test: `src/features/assistant/__tests__/pattern-canonicalizer.test.ts`

**Interfaces:**

```ts
export type LearnedPatternKind = "ALIAS" | "DURATION" | "WORKFLOW" | "VOCABULARY";

export interface LearningScope {
  clinicId: string;
  userId: string;
  staffId?: string;
}

export interface LearningEvidence {
  scope: LearningScope;
  kind: LearnedPatternKind;
  trigger: string;
  value: unknown;
  successful: boolean;
  corrected: boolean;
  sourceTool: string;
}
```

- [ ] **Step 1: Write canonicalization tests**

Assertions:
- `Reconstrucción`, `reconstruccion`, and extra spaces normalize to one trigger;
- patient names/IDs supplied in evidence metadata are not present in canonical key/value;
- different output treatment codes do not merge;
- scope key prefers `staffId` when present.

- [ ] **Step 2: Verify RED**

```bash
npx vitest run src/features/assistant/__tests__/pattern-canonicalizer.test.ts
```

- [ ] **Step 3: Implement deterministic normalization**

Use Unicode NFD accent stripping, Spanish lowercase, punctuation removal, whitespace collapse. Canonical key format:

```ts
`${scope.clinicId}:${scope.staffId ?? `user:${scope.userId}`}:${kind}:${normalizedTrigger}:${stableValueHash}`
```

`stableValueHash` is SHA-256 of a stable JSON serialization containing only whitelisted operational fields.

- [ ] **Step 4: Verify GREEN and commit**

```bash
npx vitest run src/features/assistant/__tests__/pattern-canonicalizer.test.ts
git add src/features/assistant/learning src/features/assistant/__tests__/pattern-canonicalizer.test.ts
git commit -m "feat: define per-dentist learning evidence"
```

### Task 2: Three-evidence learner and correction decay

**Files:**
- Create: `src/features/assistant/learning/pattern-learner.ts`
- Test: `src/features/assistant/__tests__/pattern-learner.test.ts`

**Interfaces:**
- Produces `applyEvidence(patterns, evidence): LearnedPattern[]`.

- [ ] **Step 1: Write threshold tests**

```ts
it("activates silently after exactly three valid evidences", () => {
  let patterns: LearnedPattern[] = [];
  patterns = applyEvidence(patterns, evidence("reconstruccion", false));
  expect(patterns[0]?.active).toBe(false);
  patterns = applyEvidence(patterns, evidence("reconstruccion", false));
  expect(patterns[0]?.active).toBe(false);
  patterns = applyEvidence(patterns, evidence("reconstruccion", false));
  expect(patterns[0]).toMatchObject({ evidenceCount: 3, correctionCount: 0, active: true });
});

it("a correction prevents the third observation from activating", () => {
  // two successful + one corrected = inactive
});
```

Also test isolation between two `staffId` values.

- [ ] **Step 2: Verify RED**

Run the targeted Vitest file.

- [ ] **Step 3: Implement confidence rules**

Use:

```ts
const validEvidence = evidence.successful && !evidence.corrected;
const evidenceCount = current.evidenceCount + (validEvidence ? 1 : 0);
const correctionCount = current.correctionCount + (evidence.corrected ? 1 : 0);
const confidence = Math.max(0, Math.min(1, (evidenceCount - correctionCount * 2) / 3));
const active = evidenceCount >= 3 && confidence >= 0.67;
```

Repeated corrections automatically deactivate when confidence falls below `0.67`.

- [ ] **Step 4: Verify GREEN and commit**

```bash
npx vitest run src/features/assistant/__tests__/pattern-learner.test.ts
git add src/features/assistant/learning/pattern-learner.ts src/features/assistant/__tests__/pattern-learner.test.ts
git commit -m "feat: learn dentist patterns after three evidences"
```

### Task 3: Repository abstraction and production API contracts

**Files:**
- Create: `src/features/assistant/learning/learning-repository.ts`
- Create: `src/features/assistant/learning/demo-learning-repository.ts`
- Create: `src/features/assistant/learning/learning-data.ts`
- Modify: `src/shared/api/contracts.ts`
- Create: `src/shared/api/resources/assistant.ts`
- Modify: `src/shared/api/endpoints.ts`
- Test: `src/features/assistant/__tests__/learning-repository.test.ts`

**Interfaces:**

```ts
export interface LearningRepository {
  list(scope: LearningScope): Promise<LearnedPattern[]>;
  record(evidence: LearningEvidence): Promise<LearnedPattern>;
  patch(scope: LearningScope, id: string, patch: { trigger?: string; value?: unknown; active?: boolean }): Promise<LearnedPattern>;
  remove(scope: LearningScope, id: string): Promise<void>;
  reset(scope: LearningScope): Promise<void>;
}
```

Production endpoints:
- `GET /api/assistant/learning`
- `POST /api/assistant/feedback/correction`
- `PATCH /api/assistant/learning/:id`
- `DELETE /api/assistant/learning/:id`
- `POST /api/assistant/learning/reset`

- [ ] **Step 1: Test in-memory isolation**

Create two scopes; record three identical aliases in scope A; assert scope B remains empty. Reset A; assert B unchanged.

- [ ] **Step 2: Implement memory repository without browser persistence**

Use a module-level `Map<string, LearnedPattern[]>` only in demo runtime. No storage APIs.

- [ ] **Step 3: Add Zod contracts and browser API resource**

`learnedPatternSchema` must include id/scope/kind/trigger/value/evidenceCount/correctionCount/confidence/active/createdAt/updatedAt. Parsing must use `.passthrough()` only if backend may add metadata; core fields remain required.

- [ ] **Step 4: Verify and commit**

```bash
npx vitest run src/features/assistant/__tests__/learning-repository.test.ts
npm run typecheck
git add src/features/assistant/learning src/shared/api
git commit -m "feat: persist assistant learning through Denty contracts"
```

### Task 4: Collect evidence and corrections from real assistant execution

**Files:**
- Modify: `src/features/assistant/assistant-provider.tsx`
- Modify: `src/features/assistant/tools/assistant-tool-executor.ts`
- Create: `src/features/assistant/learning/evidence-extractor.ts`
- Test: `src/features/assistant/__tests__/learning-evidence.integration.test.ts`

- [ ] **Step 1: Write integration tests**

Cases:
- three successful `clinical.add_item` commands mapping spoken `reconstrucción` to treatment code `reconstruction` record three ALIAS evidences;
- failed tool execution records no positive evidence;
- user undo/correction inside the correction window records a correction;
- payment/diagnosis patient values are not learnable.

- [ ] **Step 2: Implement whitelist-only extractor**

Only produce evidence for:
- treatment phrase → configured treatment code (`ALIAS`);
- spoken duration phrase → duration minutes (`DURATION`);
- accepted repeated navigation/workflow sequence → tool-name sequence (`WORKFLOW`);
- non-clinical vocabulary synonym → normalized token (`VOCABULARY`).

Return `null` for diagnosis, medication, allergy, prescription, payment amount, patient identity, clinical note free text, and document content.

- [ ] **Step 3: Wire corrections**

A user action that undoes or replaces an assistant-generated yellow action within the active session sends `corrected: true` evidence for that same canonical key.

- [ ] **Step 4: Verify and commit**

Run integration test, local NLU tests, typecheck, then commit.

### Task 5: Apply learned patterns before local/Realtime interpretation

**Files:**
- Create: `src/features/assistant/learning/apply-learned-patterns.ts`
- Modify: `src/features/assistant/assistant-provider.tsx`
- Modify: `src/features/assistant/realtime/assistant-prompt.ts`
- Test: `src/features/assistant/__tests__/apply-learned-patterns.test.ts`

- [ ] **Step 1: Write deterministic alias tests**

An active dentist rule `reconstrucción -> reconstruction` injects a structured hint; an inactive rule does nothing; another dentist’s active rule does nothing.

- [ ] **Step 2: Implement hint layer**

Do not rewrite the raw transcript destructively. Produce:

```ts
interface LearnedHints {
  aliases: Array<{ trigger: string; treatmentCode: string }>;
  durations: Array<{ trigger: string; durationMin: number }>;
  workflows: Array<{ trigger: string; tools: string[] }>;
  vocabulary: Array<{ trigger: string; normalized: string }>;
}
```

Local NLU may consult aliases before treatment matching. Realtime prompt receives only active hints for the current dentist, never evidence history.

- [ ] **Step 3: Verify and commit**

```bash
npx vitest run src/features/assistant/__tests__/apply-learned-patterns.test.ts src/features/voice/__tests__/local-nlu.test.ts
git add src/features/assistant/learning src/features/assistant/assistant-provider.tsx src/features/assistant/realtime/assistant-prompt.ts
git commit -m "feat: apply dentist-specific assistant learning"
```

### Task 6: Settings → Denty AI → Mi aprendizaje

**Files:**
- Modify: `src/features/parity/modules/settings-module.tsx`
- Create: `src/features/assistant/learning/learning-settings-panel.tsx`
- Test: `src/features/assistant/__tests__/learning-settings-panel.test.tsx`

- [ ] **Step 1: Write UI tests**

Assert the panel lists trigger/kind/evidence/confidence/status/updated date, can deactivate/edit/delete, and reset requires explicit in-app confirmation. Learning activation itself does not display a toast.

- [ ] **Step 2: Add `denty-ai` settings tab**

Extend `SettingsTab` and `HorizontalSnapNav` with `{ label: "Denty AI", value: "denty-ai" }`. Render `LearningSettingsPanel` with current scope.

- [ ] **Step 3: Implement edit/delete/reset UI**

Use Mantine modal/buttons; no `window.confirm`. Reset text must say it removes the current dentist’s learned preferences only, not clinical history.

- [ ] **Step 4: Verify and commit**

```bash
npx vitest run src/features/assistant/__tests__/learning-settings-panel.test.tsx --environment jsdom
npm run architecture:check
npm run typecheck
git add src/features/parity/modules/settings-module.tsx src/features/assistant/learning src/features/assistant/__tests__/learning-settings-panel.test.tsx
git commit -m "feat: manage personal Denty AI learning"
```

### Task 7: Learning regression gate

**Files:**
- Create: `scripts/tests/assistant-learning-regression.mjs`

- [ ] **Step 1: Assert privacy invariants**

Script fails if assistant learning source contains browser storage APIs, or if allowed evidence extractor begins accepting fields named `patientName`, `dni`, `medicalProfile`, `medication`, `allergy`, `note`, `amountCents`.

- [ ] **Step 2: Full verification**

```bash
node scripts/tests/assistant-learning-regression.mjs
npm run typecheck
npm run test -- --run
npm run architecture:check
npm run vercel:regressions
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add scripts/tests/assistant-learning-regression.mjs
git commit -m "test: lock per-dentist learning invariants"
```

## Learning Acceptance Gate

Learning is complete only when:
1. a rule activates after exactly three valid examples;
2. a correction can prevent/deactivate a rule;
3. dentist scopes are isolated;
4. learning is silent;
5. Settings can inspect/edit/deactivate/delete/reset rules;
6. patient-identifiable/clinical free text is excluded from learning;
7. active rules affect only the owning dentist’s future interpretation;
8. production build passes.
