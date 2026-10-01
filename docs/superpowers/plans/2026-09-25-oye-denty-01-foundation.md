# Oye Denty Foundation Implementation Plan

**Goal:** Convert the existing Denty voice stack into a reusable assistant core that can be armed, pauses when the page is hidden, detects “Oye Denty” locally, normalizes commands into typed tools, and enforces risk/confirmation before execution.

**Spec:** [Design](../specs/2026-09-25-oye-denty-assistant-design.md). This is the original implementation scope; consult [current checkpoint](../../../CHECKPOINT-STATUS.md) before reopening completed work.

## Global Constraints

- Node.js stays `24.x`.
- `Asistente activo` is opt-in and off by default.
- Wake-word listening only runs while `document.visibilityState === "visible"`.
- No patient or assistant learning data is persisted with `localStorage`, `sessionStorage`, or app-owned IndexedDB.
- Existing `planLocalVoiceCommand`, patient resolution, odontogram and periodontal API behavior must remain compatible.
- Red actions never execute before explicit confirmation.
- `OPENAI_API_KEY` remains server-only; this plan does not connect to OpenAI yet.
- Synthetic assistant test data is test-only and must never become runtime state.
- If the wake-word engine fails, the manual microphone path remains usable.

## Review Focus

- Rapid hide/show cycles must not leave two microphone consumers alive.
- Clicking an existing voice control while wake-word listening is armed must not double-open the microphone.
- A local NLU plan containing both yellow and red actions must stop at the red action until confirmation.
- A patient route without a selected tooth must not invent `selectedTooth` context.
- Wake-word initialization failure must degrade to manual mic without disabling the rest of Denty.

## Tasks

### Task 1: Assistant state machine and core contracts

Files: `src/features/assistant/assistant-types.ts`, `src/features/assistant/assistant-state-machine.ts`, `src/features/assistant/__tests__/assistant-state-machine.test.ts`.

Reducer: `DISABLE` → `OFF`; hidden → `PAUSED_HIDDEN`; visible+enabled → `ARMED`; confirmation enters `CONFIRMING` without mutation. Test every transition.

### Task 2: Common tool schemas, registry, and Local NLU adapter

Files: `src/features/assistant/tools/assistant-tool-schemas.ts`, `src/features/assistant/tools/assistant-tool-registry.ts`, `src/features/assistant/tools/local-voice-adapter.ts`, `src/features/assistant/__tests__/local-voice-adapter.test.ts`, `src/features/voice/local-nlu.ts`.

Adapt `LocalVoiceAction` with `localVoicePlanToToolCalls`; resolve patient once, require it where needed, and report unsupported actions instead of dropping them. Registry: navigation/query/select GREEN; clinical/periodontal/note/budget sync YELLOW; payment RED.

### Task 3: Policy engine, executor, and confirmation boundary

Files: `src/features/assistant/tools/assistant-policy.ts`, `src/features/assistant/tools/assistant-tool-executor.ts`, `src/features/assistant/__tests__/assistant-policy.test.ts`, `src/features/assistant/__tests__/assistant-tool-executor.test.ts`, `src/features/voice/voice-executor.ts`.

Move existing API bodies into the executor with expected versions. Return typed UI effects (`NAVIGATE`, `SELECT_TOOTH`, `NONE`), not router calls. Stop a mixed batch at unconfirmed RED; test no pre-confirmation billing mutation.

### Task 4: Context broker, provider, and visibility lifecycle

Files: `src/features/assistant/assistant-context.tsx`, `src/features/assistant/assistant-provider.tsx`, `src/features/assistant/__tests__/assistant-provider.test.tsx`, `src/app/(staff)/app/layout.tsx`.

Provider/context derive patient from the route and allow focused selection patches. Start/stop the microphone idempotently across Strict Mode, hide/show and disable; never invent a selected tooth. One owner for wake and manual capture.

### Task 5: Local “Oye Denty” wake-word engine

Files: `package.json`, `package-lock.json`, `.env.example`, `src/shared/config/env.ts`, `src/features/assistant/wake-word/wake-word-engine.ts`, `src/features/assistant/wake-word/porcupine-wake-word-engine.ts`, `src/app/api/assistant/wake-word/config/route.ts`, `public/assistant/oye-denty_es_wasm_v1.ppn`, `public/assistant/porcupine_params_es.pv`, `src/features/assistant/__tests__/wake-word-engine.test.ts`.

Porcupine 4.0.1 + WebVoiceProcessor 4.0.10; authenticated `GET /api/assistant/wake-word/config` returns `accessKey`, unauthenticated returns 401. Server env `PICOVOICE_ACCESS_KEY`, no `NEXT_PUBLIC_` equivalent. Spanish Web/WASM assets: `public/assistant/oye-denty_es_wasm_v1.ppn` and `public/assistant/porcupine_params_es.pv`; keyword label `oye-denty`. Subscribe/unsubscribe once, reuse worker on stop, release on unmount. No global COOP/COEP; denied mic exposes manual fallback without prompt loops.

### Task 6: Assistant control UI and legacy voice integration

Files: `src/features/assistant/assistant-control.tsx`, `src/features/assistant/assistant-control.module.css`, `src/app/_components/shell/app-shell.tsx`, `src/features/voice/voice-command-bar.tsx`, `src/features/assistant/__tests__/assistant-control.test.tsx`.

Compact Mantine control: toggle, status, mic and Confirmar/Cancelar with readable action summary. States: Asistente apagado, Denty activo, Escuchando, Entendiendo, Ejecutando, Esperando confirmación/Pausado. Stop wake before capture; rearm after processing/cancel if visible.

### Task 7: Foundation regression and deployment gate

Files: `scripts/tests/assistant-foundation-regression.mjs`, `scripts/verify-vercel-regression-matrix.mjs`.

Gate provider mounting, opt-in control, visibility handling, absence of browser storage/provider secrets in public env and unchanged manual voice/clinical commands. Run targeted tests and release checks below.

## Verification

Use TDD for implementation changes; run tests beside the affected modules under `src/features/assistant/__tests__/`, Voice or Domain as applicable.

```bash
npm run typecheck
npm run architecture:check
npm test
npm run build
```

A production build and any required authenticated LIVE checks must pass before claiming release readiness.
