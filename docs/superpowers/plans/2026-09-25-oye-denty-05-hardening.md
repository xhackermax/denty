# Oye Denty Hardening and Production Readiness Implementation Plan

**Goal:** Make Oye Denty production-ready with authoritative permissions, durable audit contracts, cost/rate controls, robust failure recovery, concurrency protection, and end-to-end deployment verification.

**Spec:** [Design](../specs/2026-09-25-oye-denty-assistant-design.md). This is the original implementation scope; consult [current checkpoint](../../../CHECKPOINT-STATUS.md) before reopening completed work.

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

## Tasks

### Task 1: Durable audit contract and redaction

Files: `src/features/assistant/audit/assistant-audit.ts`, `src/shared/api/contracts.ts`, `src/features/assistant/__tests__/assistant-audit.test.ts`.

Each registry tool defines audit normalization (deny by default). Note payload: patientId/textLength/SHA-256, not text; payment payload can retain amount/method/patient ID, never card tokens. No raw audio/transcript. Durable `POST /api/assistant/audit`; test-only ring buffer capped at 200 events.

### Task 2: Authoritative same-origin execution for sensitive tools

Files: `src/app/api/assistant/tool/execute/route.ts`, `src/server/assistant/assistant-server-tools.ts`, `src/features/assistant/tools/assistant-tool-executor.ts`, `src/app/api/assistant/tool/execute/route.test.ts`.

`POST /api/assistant/tool/execute` takes executionId/call/confirmationToken and validates actor/schema/permissions. Responses: unauthenticated 401; unknown/invalid 400; missing permission 403; RED without valid confirmation 409. Replay returns prior result with no second mutation. Initial permissions: finance.write, clinical.write, documents.sign/write and clinical.approve_plan as applicable.

### Task 3: Server-issued confirmation token

Files: `src/app/api/assistant/tool/confirm/route.ts`, `src/server/assistant/confirmation-token.ts`, `src/server/assistant/confirmation-token.test.ts`.

Confirmation token: HMAC-SHA-256 using server `ASSISTANT_CONFIRMATION_SECRET` ≥32 chars; bind executionId/clinicId/userId/tool/normalized-args hash/expiresAt. TTL 60 s, single-use per executionId; confirm route only after explicit UI confirmation. Tampering, expiry, wrong actor/tool/args and replay never mutate.

### Task 4: Cost, rate, and session metrics without clinical transcript retention

Files: `src/features/assistant/metrics/assistant-metrics.ts`, `src/server/assistant/assistant-rate-limit.ts`, `src/app/api/assistant/realtime/session/route.ts`, `src/server/assistant/assistant-rate-limit.test.ts`.

Aggregate clinic/day sessions, seconds, local commands, Realtime/RED/failed calls and limits without utterances. Defaults per user: 120 session creations/hour, 1 active session, 300 tools/hour; positive integer server overrides. 429 keeps local NLU/manual UI available.

### Task 5: Concurrency/version conflict behavior

Files: `src/features/assistant/tools/assistant-tool-executor.ts`, `src/features/assistant/__tests__/assistant-concurrency.test.ts`.

Expected-version conflicts refresh data and require review, with no blind retry. Send `ok:false` via function_call_output; model cannot claim success. Revoked permissions must fail the next protected tool.

### Task 6: Failure recovery matrix

Files: `src/features/assistant/assistant-provider.tsx`, `src/features/assistant/realtime/conversation-session.ts`, `src/features/assistant/__tests__/assistant-failure-recovery.test.tsx`.

Mic denied→text; wake failure→manual mic; secret route 503→local NLU; WebRTC/network/OpenAI error→close and recover; hidden→stop audio; network loss during RED confirmation→no mutation. No repeated toasts or blocking core UI.

### Task 7: End-to-end assistant scenarios

Files: `e2e/assistant/assistant-lifecycle.spec.ts`, `e2e/assistant/assistant-tools.spec.ts`, `e2e/assistant/assistant-learning-proactive.spec.ts`.

Deterministic Playwright: enable/hide/show/wake/45-second timeout/disable; GREEN navigation; YELLOW change+undo; RED confirm/cancel with no earlier mutation; learning isolated by dentist and silent versioned reminders.

### Task 8: Final release gate and operator documentation

Files: `docs/operations/oye-denty-production.md`, `scripts/tests/assistant-security-regression.mjs`, `.env.example`.

Document OPENAI_API_KEY, OPENAI_REALTIME_MODEL=gpt-realtime-2.1-mini, OPENAI_TRANSCRIBE_MODEL=gpt-transcribe, PICOVOICE_ACCESS_KEY, ASSISTANT_CONFIRMATION_SECRET, limit overrides, same-origin Supabase config, model assets and HTTPS mic requirement. Gate public secrets, transcript persistence, direct RED client mutation, missing confirmation and deprecated defaults; release checks below.

## Verification

Use TDD for implementation changes; run tests beside the affected modules under `src/features/assistant/__tests__/`, Voice or Domain as applicable.

```bash
npm run typecheck
npm run architecture:check
npm test
npm run build
```

A production build and any required authenticated LIVE checks must pass before claiming release readiness.
