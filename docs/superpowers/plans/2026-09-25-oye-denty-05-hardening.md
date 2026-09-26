# Oye Denty Hardening and Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Oye Denty production-ready with authoritative permissions, durable audit contracts, cost/rate controls, robust failure recovery, concurrency protection, and end-to-end deployment verification.

**Architecture:** Client policy remains the UX safety layer, while production tool execution gains a same-origin BFF boundary that validates the Denty actor and tool schema before invoking existing backend APIs. Every tool result emits an audit event. Session/rate metrics are aggregated without patient transcript storage. Network/OpenAI/wake failures degrade to local NLU/manual operation rather than blocking Denty.

**Tech Stack:** Existing Denty/Next.js stack, Web Crypto, server BFF routes, current Realtime API, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-25-oye-denty-assistant-design.md`

## Global Constraints

- Depends on Plans 01–04.
- Backend/API permission checks remain authoritative; assistant cannot create new privileges.
- Audit logs store normalized tool arguments, not raw audio.
- Raw voice audio is not persisted by Denty in v1.
- Patient transcript text is not retained for analytics after the active session unless it becomes an intentional clinical note through a confirmed tool.
- RED actions remain confirmation-gated even if Realtime asks repeatedly.
- Every rate/cost guard failure degrades gracefully to local NLU/manual UI.
- Vercel production build is a release gate.

## Review Focus

- Replay of a previously confirmed RED call ID must not execute twice.
- Two simultaneous edits to the same odontogram/plan must surface version conflict rather than silently overwrite.
- A user whose permission is revoked mid-session must fail the next protected tool call.
- Realtime rate-limit exhaustion must not disable local commands or normal Denty screens.
- Audit/metrics must not accidentally capture raw transcript or medical-note content.

---

## File Structure

- Create `src/features/assistant/audit/assistant-audit.ts`.
- Create `src/features/assistant/metrics/assistant-metrics.ts`.
- Create `src/app/api/assistant/tool/execute/route.ts`.
- Create `src/app/api/assistant/tool/confirm/route.ts` if confirmation tokens are server-issued.
- Create `src/server/assistant/assistant-server-tools.ts` — authoritative server mapping for high-risk tools.
- Create `src/server/assistant/assistant-rate-limit.ts`.
- Modify `src/features/assistant/tools/assistant-tool-executor.ts` to use server boundary for RED tools and selected YELLOW tools.
- Modify `src/features/assistant/realtime/conversation-session.ts` for rate-limit/failure states.
- Add Playwright scenarios under `e2e/assistant/`.
- Add deployment regression scripts.

### Task 1: Durable audit contract and redaction

**Files:**
- Create: `src/features/assistant/audit/assistant-audit.ts`
- Modify: `src/shared/api/contracts.ts` and assistant API resource
- Test: `src/features/assistant/__tests__/assistant-audit.test.ts`

**Interfaces:**

```ts
export interface AssistantAuditEvent {
  id: string;
  clinicId: string;
  userId: string;
  staffId?: string;
  patientId?: string;
  sessionId?: string;
  source: "LOCAL_NLU" | "REALTIME" | "PROACTIVE";
  tool: string;
  risk: "GREEN" | "YELLOW" | "RED";
  arguments: unknown;
  confirmed: boolean;
  status: "SUCCESS" | "FAILED" | "CANCELLED";
  createdAt: string;
}
```

- [ ] **Step 1: Write redaction tests**

Clinical note tool audit stores `{ patientId, textLength, sha256 }`, not note text. Payment audit stores amount/method/patient ID because those are the action itself, but never card tokens. Realtime transcript/audio is absent.

- [ ] **Step 2: Implement tool-specific audit normalization**

Default to deny: every tool registry entry must define `audit(args)` returning an approved normalized payload. Registry build/test fails if a tool lacks audit normalization.

- [ ] **Step 3: Add backend audit API contract**

Use `POST /api/assistant/audit` in the external Denty API contract. Demo keeps an in-memory ring buffer capped at 200 events.

- [ ] **Step 4: Verify and commit**

Run audit tests/typecheck, then commit.

### Task 2: Authoritative same-origin execution for sensitive tools

**Files:**
- Create: `src/app/api/assistant/tool/execute/route.ts`
- Create: `src/server/assistant/assistant-server-tools.ts`
- Modify: `src/features/assistant/tools/assistant-tool-executor.ts`
- Test: `src/app/api/assistant/tool/execute/route.test.ts`

- [ ] **Step 1: Write permission/replay tests**

Cases:
- unauthenticated → `401`;
- unknown tool → `400`;
- schema-invalid args → `400`;
- missing permission → `403`;
- RED tool without signed confirmation token → `409`;
- repeated same execution ID → returns previous result/no second mutation.

- [ ] **Step 2: Implement server tool mapping**

Initial authoritative server tools:
- `payment.record` requires `finance.write`;
- `clinical.complete_item` requires `clinical.write`;
- document signing requires `documents.sign`; document preparation requires `documents.write`; clinical plan approval/acceptance requires `clinical.approve_plan`.

Each mapping forwards caller cookies to the existing `DENTY_API_URL` route and lets the real backend enforce entity/version permissions too.

- [ ] **Step 3: Move RED client execution to BFF**

Client sends `{ executionId, call, confirmationToken }` to `/api/assistant/tool/execute`. It never calls billing/document mutation directly for RED assistant actions.

- [ ] **Step 4: Verify and commit**

Run route/policy tests and full typecheck.

### Task 3: Server-issued confirmation token

**Files:**
- Create: `src/app/api/assistant/tool/confirm/route.ts`
- Create: `src/server/assistant/confirmation-token.ts`
- Test: `src/server/assistant/confirmation-token.test.ts`

- [ ] **Step 1: Define token payload and tests**

Payload fields: `executionId`, `clinicId`, `userId`, `tool`, SHA-256 hash of normalized args, `expiresAt`. Token TTL: 60 seconds. Test tampering, expiry, wrong user/tool/args, replay.

- [ ] **Step 2: Implement HMAC token**

Use Web Crypto HMAC-SHA-256 and a server env `ASSISTANT_CONFIRMATION_SECRET` of at least 32 characters. The confirm route validates session and returns token only after the user’s explicit UI confirmation POST.

- [ ] **Step 3: Enforce token in execute route**

Consume token once per `executionId` using the idempotency store/backend. Invalid/expired token returns `409` and does not mutate.

- [ ] **Step 4: Verify and commit**

Run focused security tests, then commit.

### Task 4: Cost, rate, and session metrics without clinical transcript retention

**Files:**
- Create: `src/features/assistant/metrics/assistant-metrics.ts`
- Create: `src/server/assistant/assistant-rate-limit.ts`
- Modify: `src/app/api/assistant/realtime/session/route.ts`
- Test: `src/server/assistant/assistant-rate-limit.test.ts`

- [ ] **Step 1: Define counters**

Per clinic/day:
- realtime sessions;
- realtime session seconds;
- local-NLU commands;
- Realtime tool calls;
- confirmed RED calls;
- failed calls;
- rate-limit responses.

Do not store utterance text in metrics.

- [ ] **Step 2: Add initial server limits**

V1 defaults:
- max 120 Realtime session creations per user/hour;
- max 1 active Realtime session per user;
- max 300 assistant tool executions per user/hour.

Make limits server env-overridable with validated positive integers.

- [ ] **Step 3: Handle `429` gracefully**

Realtime session endpoint returns a normalized `429`; provider shows `Denty inteligente ha alcanzado el límite temporal. Los comandos locales siguen disponibles.` and stays usable.

- [ ] **Step 4: Verify and commit**

Run rate-limit tests and provider fallback tests.

### Task 5: Concurrency/version conflict behavior

**Files:**
- Modify: `src/features/assistant/tools/assistant-tool-executor.ts`
- Modify: relevant server tool mappings
- Test: `src/features/assistant/__tests__/assistant-concurrency.test.ts`

- [ ] **Step 1: Write stale-version tests**

Simulate odontogram version changing between context capture and execution. Assert Denty returns a conflict result to Realtime, does not retry blindly, refreshes current data, and tells the user the action needs review.

- [ ] **Step 2: Standardize execution result**

```ts
export type AssistantToolResult =
  | { ok: true; summary: string; effect?: AssistantExecutionEffect; undoToken?: string }
  | { ok: false; code: "VALIDATION" | "PERMISSION" | "CONFLICT" | "NETWORK" | "CANCELLED"; message: string };
```

Realtime receives this exact result through `function_call_output` and must not claim success on `ok:false`.

- [ ] **Step 3: Verify and commit**

Run concurrency + existing odontogram tests.

### Task 6: Failure recovery matrix

**Files:**
- Modify: `src/features/assistant/assistant-provider.tsx`
- Modify: `src/features/assistant/realtime/conversation-session.ts`
- Test: `src/features/assistant/__tests__/assistant-failure-recovery.test.tsx`

- [ ] **Step 1: Encode failure cases in tests**

- mic permission denied → manual text input remains;
- wake engine init fails → manual mic remains;
- Realtime secret route 503 → local NLU remains;
- WebRTC connection fails → session closes/rearms wake;
- OpenAI `error` event → no app crash, local fallback;
- network loss during RED confirmation → no mutation;
- hidden tab → audio tracks stop.

- [ ] **Step 2: Implement one user-facing fallback message per class**

No repeated toasts. Keep the status control in `ERROR` only until user dismisses/retries; normal Denty UI remains interactive.

- [ ] **Step 3: Verify and commit**

Run failure tests, then commit.

### Task 7: End-to-end assistant scenarios

**Files:**
- Create: `e2e/assistant/assistant-lifecycle.spec.ts`
- Create: `e2e/assistant/assistant-tools.spec.ts`
- Create: `e2e/assistant/assistant-learning-proactive.spec.ts`

- [ ] **Step 1: Lifecycle E2E**

Use deterministic mocked wake/Realtime transport in CI:
- enable assistant;
- hide/show page;
- wake;
- 45-second fake session timeout hook;
- disable.

- [ ] **Step 2: Tool-risk E2E**

- GREEN navigation executes;
- YELLOW odontogram change executes and exposes undo UI;
- RED payment displays confirmation and no network mutation before confirm;
- cancel leaves payment unchanged.

- [ ] **Step 3: Learning/proactivity E2E**

Three identical allowed evidence events for doctor A → active rule in settings; doctor B has none. Unsigned budget → one silent alert; dismiss → gone for version.

- [ ] **Step 4: Run E2E**

```bash
npm run test:e2e -- e2e/assistant
```
Expected: PASS.

### Task 8: Final release gate and operator documentation

**Files:**
- Create: `docs/operations/oye-denty-production.md`
- Create: `scripts/tests/assistant-security-regression.mjs`
- Modify: `.env.example`

- [ ] **Step 1: Document exact production variables**

Document:
- `OPENAI_API_KEY`
- `OPENAI_REALTIME_MODEL=gpt-realtime-2.1-mini`
- `OPENAI_TRANSCRIBE_MODEL=gpt-transcribe`
- `PICOVOICE_ACCESS_KEY`
- `ASSISTANT_CONFIRMATION_SECRET`
- rate-limit overrides
- `DENTY_API_URL`

Also document custom Porcupine model asset paths and microphone HTTPS requirement.

- [ ] **Step 2: Security regression script**

Fail on:
- any `NEXT_PUBLIC_OPENAI_*` standard key;
- any patient transcript persistence;
- RED tool direct client mutation path;
- missing confirmation token enforcement;
- assistant browser storage outside existing UI allowlist;
- model defaults from the deprecated Realtime family.

- [ ] **Step 3: Run complete release matrix**

```bash
node scripts/tests/assistant-security-regression.mjs
npm run typecheck
npm run lint
npm run lint:styles
npm run test -- --run
npm run architecture:check
npm run api:parity
npm run vercel:regressions
npm run build
npm run test:e2e -- e2e/assistant
```
Expected: every command exits `0`.

- [ ] **Step 4: Commit**

```bash
git add docs/operations/oye-denty-production.md scripts/tests/assistant-security-regression.mjs .env.example e2e/assistant
git commit -m "chore: harden Oye Denty for production"
```

## Production Acceptance Gate

Oye Denty is production-ready only when:
1. standard provider secrets never reach browser bundles;
2. RED assistant mutations cross the authoritative server boundary with single-use confirmation;
3. replay/stale-version/permission-revocation tests pass;
4. audit is durable and redacted;
5. metrics contain no raw clinical transcript/audio;
6. rate limits degrade to local NLU/manual Denty;
7. wake/OpenAI/network failure never blocks core Denty;
8. assistant Playwright scenarios pass;
9. Vercel production build passes.
