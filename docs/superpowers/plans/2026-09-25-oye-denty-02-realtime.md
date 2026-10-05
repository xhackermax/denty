# Oye Denty Realtime Implementation Plan

**Goal:** Add a secure, contextual 45-second conversational session using OpenAI Realtime while keeping all Denty mutations behind the existing tool registry and risk policy.

**Spec:** [Design](../specs/2026-09-25-oye-denty-assistant-design.md). This is the original implementation scope; consult [current checkpoint](../../archive/stages/CHECKPOINT-STATUS.md) before reopening completed work.

## Global Constraints

- Depends on successful completion of Plan 01 Foundation.
- `OPENAI_API_KEY` remains server-only.
- Default model is `gpt-realtime-2.1-mini`; allow server override through `OPENAI_REALTIME_MODEL`.
- Conversation inactivity timeout is exactly 45 seconds initially.
- Hide/minimize immediately closes the Realtime session and returns to `PAUSED_HIDDEN`.
- Function calls cannot bypass `assistant-tool-registry`, Zod validation, risk classification, permissions, or confirmation.
- Patient history is not dumped wholesale into prompts; context is minimal and tool-driven.
- Local NLU continues to work if Realtime or network is unavailable.
- Current deprecated file-transcription fallback is migrated from `gpt-4o-mini-transcribe` to `gpt-transcribe` while this voice stack is touched.

## Review Focus

- An expired client secret must create a new session rather than retrying forever.
- A model function call with malformed JSON/unknown tool name must not execute anything.
- Multiple tool calls in one model response must preserve order and stop before an unconfirmed RED action.
- Hiding the tab while the model is speaking must stop remote audio and close the peer connection.
- “lo mismo” after changing selected tooth must use session context, not stale tool arguments.

## Tasks

### Task 1: Shared authenticated actor helper and Realtime session endpoint

Files: `src/server/denty-session.ts`, `src/app/api/assistant/realtime/session/route.ts`, `src/app/api/denty/card-terminal/_sumup.ts`, `src/shared/config/env.ts`, `.env.example`, `src/app/api/assistant/realtime/session/route.test.ts`.

`requireDentyActor` validates same-origin session; missing session/service/key returns 401 or 503 as applicable. Reuse in SumUp without weakening finance permission checks. Create client secrets at `https://api.openai.com/v1/realtime/client_secrets`, server Bearer key, SHA-256 `clinicId:userId` safety identifier, `Cache-Control: no-store`. Model `gpt-realtime-2.1-mini` (`OPENAI_REALTIME_MODEL` override); transcription `gpt-transcribe` (`OPENAI_TRANSCRIBE_MODEL`).

### Task 2: Low-level WebRTC client

Files: `src/features/assistant/realtime/realtime-types.ts`, `src/features/assistant/realtime/realtime-client.ts`, `src/features/assistant/__tests__/realtime-client.test.ts`.

WebRTC: attach one local mic track, send SDP offer to `https://api.openai.com/v1/realtime/calls` with ephemeral bearer, apply answer. Parse narrow data-channel events; close tracks, channel, peer and remote audio idempotently. Test expired secrets and transport failures.

### Task 3: Realtime tool definitions and Denty system prompt

Files: `src/features/assistant/realtime/realtime-tools.ts`, `src/features/assistant/realtime/assistant-prompt.ts`, `src/features/assistant/__tests__/realtime-tools.test.ts`.

`buildRealtimeTools(registry)` emits only registered tools; `buildAssistantInstructions(context)` forbids invented IDs, asks on ambiguity and claims success only after successful function output. Include present pathname/patient/tooth; termination phrases close without tools.

### Task 4: Conversation session manager and 45-second lifecycle

Files: `src/features/assistant/realtime/conversation-session.ts`, `src/features/assistant/__tests__/conversation-session.test.ts`.

`startConversation`, `touchConversation`, `endConversation`: close after exactly 45,000 ms idle; transcript/model events/tool completion reset timer. `response.done` function calls are JSON-parsed and Zod-validated in order; unknown/malformed calls return errors without execution. Send `conversation.item.create` with `function_call_output`/call ID, then `response.create`. Hidden/disabled/terminated sessions stop immediately.

### Task 5: Provider orchestration and local-vs-AI routing

Files: `src/features/assistant/assistant-provider.tsx`, `src/features/voice/voice-command-bar.tsx`, `src/features/assistant/__tests__/assistant-routing.test.tsx`.

Local fast path requires high confidence, no ambiguity/context references; conversational/multidomain orders use Realtime. Wake → CONNECTING → LISTENING; mic in an active conversation shares transport. Network/OpenAI failure preserves local NLU and core UI; do not execute RED before confirmation.

### Task 6: Publish live screen context without dumping records

Files: `src/features/odontogram/odontogram-workspace.tsx`, `src/features/agenda/agenda-page.tsx`, `src/features/patients/patient-profile.tsx`, `src/features/parity/modules/finance-module.tsx`, `src/features/assistant/__tests__/assistant-context-integration.test.tsx`.

Screens patch only visible identifiers (patient, tooth, appointment ID), clearing fields on unmount. No medical profile, notes, documents or full appointment objects in context. Test “ahora el 17, lo mismo” against current selection.

### Task 7: Realtime deployment and failure-mode regression

Files: `scripts/tests/assistant-realtime-regression.mjs`, `scripts/verify-vercel-regression-matrix.mjs`.

Gate server-only secrets, current model defaults, no-store and track cleanup. Live test wake, simple/contextual orders, hide/show and rearming with a real Denty session; release checks below.

## Verification

Use TDD for implementation changes; run tests beside the affected modules under `src/features/assistant/__tests__/`, Voice or Domain as applicable.

```bash
npm run typecheck
npm run architecture:check
npm test
npm run build
```

A production build and any required authenticated LIVE checks must pass before claiming release readiness.
