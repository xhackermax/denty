# Voice Control Admin Staff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Denty's voice bar a staff/admin-only global control layer that routes voice commands through the assistant tool registry, policy, and executor.

**Architecture:** Keep browser transcription and local NLU in `VoiceCommandBar`, but replace direct execution with `LocalVoicePlan -> AssistantToolCall[] -> policy -> executor`. Use `ActiveTenantProvider` session data to hide voice for `PATIENT` and to pass role/permissions into policy checks. Existing server route checks remain authoritative.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, TanStack Query, Mantine UI, existing Denty browser API.

**Spec:** `docs/superpowers/specs/2026-09-30-voice-control-admin-staff-design.md`

## Global Constraints

- The voice bar is only available to internal roles: `ADMIN`, `DENTIST`, `ASSISTANT`, `RECEPTION`.
- The role `PATIENT` must not see or use the voice bar.
- `GREEN` tools execute directly when policy allows them.
- `YELLOW` tools can execute automatically only when context is clear and there are no ambiguities.
- `RED` tools always require explicit confirmation.
- The frontend is not the only security layer; server route permission checks must remain unchanged.
- User-facing voice errors must be non-technical.

## Review Focus

- A patient portal session must not display the voice controls or execute a tool call.
- A staff route rendered before session data loads must not flash an enabled voice control for `PATIENT`.
- A command that maps to an unknown tool must be blocked, not passed to the executor.
- A patient-scoped command without active or resolved patient context must explain that patient context is missing.
- A red-risk command such as `payment.record` must never execute before explicit confirmation.

---

## File Structure

- Modify `src/features/assistant/tools/assistant-tool-registry.ts`: add role metadata to tool definitions.
- Modify `src/features/assistant/tools/assistant-policy.ts`: evaluate role and permissions in addition to patient context and risk.
- Modify `src/features/assistant/tools/local-voice-adapter.ts`: map all currently supported `LocalVoiceAction` values to assistant tool calls or explicit unsupported items.
- Modify `src/features/assistant/tools/assistant-tool-executor.ts`: keep execution centralized and fix odontogram saves so voice merges with current entities instead of replacing them.
- Modify `src/features/voice/voice-command-bar.tsx`: gate by internal roles, adapt plans to tool calls, evaluate policy, execute allowed calls, and show confirmation for red calls.
- Modify `src/app/_components/shell/app-shell.tsx`: pass no props; voice bar handles role gating internally.
- Test `src/features/assistant/__tests__/roadmap-p2-policy.test.ts`: role/policy coverage.
- Test `src/features/assistant/__tests__/local-voice-adapter.test.ts`: action-to-tool mapping coverage.
- Test `src/features/voice/__tests__/voice-router.test.ts` or create `src/features/voice/__tests__/voice-access.test.tsx`: patient role hides/disables voice.

---

### Task 1: Staff-Only Policy

**Files:**
- Modify: `src/features/assistant/tools/assistant-tool-registry.ts`
- Modify: `src/features/assistant/tools/assistant-policy.ts`
- Test: `src/features/assistant/__tests__/roadmap-p2-policy.test.ts`

**Interfaces:**
- Consumes: `AssistantToolCall` from `src/features/assistant/assistant-types.ts`.
- Produces:
  - `type AssistantRole = "ADMIN" | "DENTIST" | "ASSISTANT" | "RECEPTION" | "PATIENT" | string`
  - `evaluateAssistantCall(call: AssistantToolCall, context: { patientId?: string; role?: string | null; permissions?: readonly string[] }) => AssistantPolicyResult`
  - `isInternalVoiceRole(role: string | null | undefined): boolean`

- [ ] **Step 1: Write failing role and policy tests**

Add assertions to `roadmap-p2-policy.test.ts`:

```ts
expect(isInternalVoiceRole("PATIENT")).toBe(false);
expect(isInternalVoiceRole("ADMIN")).toBe(true);
expect(evaluateAssistantCall(call("navigation.open"), { role: "PATIENT" }).decision).toBe("BLOCK");
expect(evaluateAssistantCall(call("payment.record"), { role: "ADMIN", patientId: "p1" }).decision).toBe("CONFIRM");
expect(evaluateAssistantCall(call("odontogram.set_state"), { role: "DENTIST", patientId: "p1" }).decision).toBe("ALLOW");
```

- [ ] **Step 2: Run policy tests and verify they fail**

Run: `npx vitest run src/features/assistant/__tests__/roadmap-p2-policy.test.ts`

Expected: FAIL because role helpers/context are not implemented.

- [ ] **Step 3: Add role-aware policy**

In `assistant-policy.ts`, add `INTERNAL_VOICE_ROLES` and `isInternalVoiceRole`. Update `evaluateAssistantCall` to block when `role` is missing or not internal. Preserve existing unknown-tool, patient-required, and red-confirmation behavior.

- [ ] **Step 4: Add optional role metadata to registry definitions**

In `assistant-tool-registry.ts`, add optional `roles?: readonly string[]` to `AssistantToolDefinition`. Do not overfit per-tool roles yet; default to internal roles from policy.

- [ ] **Step 5: Run policy tests and verify they pass**

Run: `npx vitest run src/features/assistant/__tests__/roadmap-p2-policy.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/assistant/tools/assistant-tool-registry.ts src/features/assistant/tools/assistant-policy.ts src/features/assistant/__tests__/roadmap-p2-policy.test.ts
git commit -m "Enforce staff-only voice assistant policy"
```

---

### Task 2: Complete Local Voice To Tool Adaptation

**Files:**
- Modify: `src/features/assistant/tools/local-voice-adapter.ts`
- Test: `src/features/assistant/__tests__/local-voice-adapter.test.ts`

**Interfaces:**
- Consumes: `LocalVoicePlan` and `LocalVoiceAction` from `src/features/voice/local-nlu.ts`.
- Produces: `localVoicePlanToToolCalls(plan: LocalVoicePlan): { calls: AssistantToolCall[]; unsupported: string[] }`.

- [ ] **Step 1: Write failing mapping tests**

Add tests for:

```ts
appointment.schedule -> unsupported or mapped explicitly, but never silently dropped
appointment.reschedule -> AssistantToolCall name "appointment.reschedule" when patientId exists
appointment.no_show -> AssistantToolCall name "appointment.mark_no_show"
lab.transition -> unsupported until executor support exists
clinical.add_item -> unsupported until executor support exists
```

- [ ] **Step 2: Run adapter tests and verify they fail**

Run: `npx vitest run src/features/assistant/__tests__/local-voice-adapter.test.ts`

Expected: FAIL for missing mappings or unsupported reporting.

- [ ] **Step 3: Implement explicit mappings and unsupported behavior**

Update `toArgs` so every `LocalVoiceAction` is either mapped or appears in `unsupported`. Map:

- `appointment.reschedule` to `{ patientId, dateText, timeText?, durationMin?, staffRef? }`
- `appointment.no_show` to `{ patientId }`
- `navigation.open` to `{ destination }`
- existing clinical/odontogram/payment mappings unchanged

Keep `appointment.schedule`, `lab.transition`, `clinical.add_item`, `clinical.complete_item`, `clinical.mark_unsatisfactory`, `clinical.add_dependency`, `clinical.alert`, `clinical.prosthesis_options` as explicit unsupported until executor support is built.

- [ ] **Step 4: Run adapter tests and verify they pass**

Run: `npx vitest run src/features/assistant/__tests__/local-voice-adapter.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/assistant/tools/local-voice-adapter.ts src/features/assistant/__tests__/local-voice-adapter.test.ts
git commit -m "Map local voice plans to assistant tools"
```

---

### Task 3: Centralized Voice Execution In The Bar

**Files:**
- Modify: `src/features/voice/voice-command-bar.tsx`
- Modify: `src/features/assistant/tools/assistant-tool-executor.ts`
- Test: `src/features/voice/__tests__/voice-router.test.ts`
- Test: `src/features/assistant/__tests__/roadmap-p2-policy.test.ts`

**Interfaces:**
- Consumes:
  - `localVoicePlanToToolCalls(plan)`
  - `evaluateAssistantCall(call, { patientId, role, permissions })`
  - `executeAssistantCalls(calls, { confirmedCallIds })`
- Produces:
  - `executeResolvedPreview(next: VoicePreview)` uses assistant calls as the primary execution path.
  - Red calls set pending confirmation instead of executing.

- [ ] **Step 1: Write failing tests for red confirmation and patient context**

In policy/router tests, assert:

```ts
payment.record with ADMIN + patientId returns CONFIRM
odontogram.set_state with DENTIST + patientId returns ALLOW
odontogram.set_state with DENTIST and no patientId returns BLOCK
```

- [ ] **Step 2: Run tests and verify failures where current behavior differs**

Run: `npx vitest run src/features/assistant/__tests__/roadmap-p2-policy.test.ts src/features/voice/__tests__/voice-router.test.ts`

Expected: FAIL until voice execution uses policy role context.

- [ ] **Step 3: Update `VoiceCommandBar` to use active tenant**

Import `useActiveTenant` and `isInternalVoiceRole`. If `loading` is true, render no voice actions. If role is not internal, return `null`.

- [ ] **Step 4: Replace direct plan execution with assistant tool pipeline**

Inside `executeResolvedPreview`, call `localVoicePlanToToolCalls(next.plan)`. If `unsupported.length > 0`, show a user-facing error. For each call, run `evaluateAssistantCall(call, { patientId: next.plan.contextPatientId, role, permissions })`. If any decision is `BLOCK`, show a readable message. If any decision is `CONFIRM`, keep the existing modal open and require the user to press confirm again before executing that call.

- [ ] **Step 5: Apply execution effects**

After `executeAssistantCalls`, invalidate queries. For `NAVIGATE`, use `router.push(effect.href)`. For `SELECT_TOOTH`, update assistant context with `selectedTooth`. For `NONE`, do nothing.

- [ ] **Step 6: Preserve existing auto-execute rules**

Keep `shouldAutoExecuteSpokenPreview` as the gate for yellow clinical auto-execution. Red calls must bypass auto-execute and stay in preview/confirmation.

- [ ] **Step 7: Run voice and policy tests**

Run: `npx vitest run src/features/assistant/__tests__/roadmap-p2-policy.test.ts src/features/assistant/__tests__/local-voice-adapter.test.ts src/features/voice/__tests__/local-nlu.test.ts src/features/voice/__tests__/voice-router.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/features/voice/voice-command-bar.tsx src/features/assistant/tools/assistant-tool-executor.ts src/features/assistant/__tests__/roadmap-p2-policy.test.ts src/features/voice/__tests__/voice-router.test.ts
git commit -m "Route voice execution through assistant policy"
```

---

### Task 4: Hide Voice For Patient Accounts

**Files:**
- Modify: `src/features/voice/voice-command-bar.tsx`
- Test: Create `src/features/voice/__tests__/voice-access.test.tsx` if no existing component test fits.

**Interfaces:**
- Consumes: `useActiveTenant()` returning `{ role, loading, permissions }`.
- Produces: `VoiceCommandBar` returns `null` for `PATIENT`, unknown role, or loading state.

- [ ] **Step 1: Write failing render tests**

Create tests that mock `useActiveTenant`:

```ts
role "PATIENT" -> queryByLabelText("Escuchar comando") is null
role "ADMIN" -> getByLabelText("Escuchar comando") exists
role null/loading true -> queryByLabelText("Escuchar comando") is null
```

- [ ] **Step 2: Run access tests and verify they fail**

Run: `npx vitest run src/features/voice/__tests__/voice-access.test.tsx`

Expected: FAIL before role gating is implemented or test harness mocks are wired.

- [ ] **Step 3: Implement or refine role gating**

Use `isInternalVoiceRole(role)` in `VoiceCommandBar`. Do not show placeholder UI while session is loading.

- [ ] **Step 4: Run access tests and verify they pass**

Run: `npx vitest run src/features/voice/__tests__/voice-access.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/voice/voice-command-bar.tsx src/features/voice/__tests__/voice-access.test.tsx
git commit -m "Hide voice controls from patient accounts"
```

---

### Task 5: Verification, Build, Push, Deploy

**Files:**
- No planned source changes.

**Interfaces:**
- Consumes all previous tasks.
- Produces deployed production URL with staff-only voice control.

- [ ] **Step 1: Run focused tests**

Run:

```bash
npx vitest run src/features/assistant/__tests__/roadmap-p2-policy.test.ts src/features/assistant/__tests__/local-voice-adapter.test.ts src/features/voice/__tests__/local-nlu.test.ts src/features/voice/__tests__/voice-router.test.ts src/features/voice/__tests__/voice-access.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 4: Push to GitHub**

Run: `git push origin main`

Expected: main updates on `xhackermax/denty`.

- [ ] **Step 5: Deploy to Vercel**

Run: `npx vercel --prod --yes`

Expected: production alias updates to `https://denty-repo.vercel.app`.

- [ ] **Step 6: Verify production responds**

Run: `Invoke-WebRequest -Uri 'https://denty-repo.vercel.app/app' -Method Head -MaximumRedirection 0`

Expected: `307 Temporary Redirect` or authenticated app response.

