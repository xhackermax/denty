# Oye Denty Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the existing Denty voice stack into a reusable assistant core that can be armed, pauses when the page is hidden, detects “Oye Denty” locally, normalizes commands into typed tools, and enforces risk/confirmation before execution.

**Architecture:** Keep `local-nlu.ts` as the deterministic fast path, but introduce a common `AssistantToolCall` contract and a central policy/executor used by local NLU and, in Plan 02, Realtime calls. `AssistantProvider` owns the assistant state machine and visibility lifecycle. `PorcupineWakeWordEngine` implements local wake-word detection behind a provider-neutral interface; if the wake engine is unavailable, the manual microphone remains available.

**Tech Stack:** Next.js 16.3.5, React 19.3.0, TypeScript 5.9.3, Zod 4.6.5, Mantine 9.6.1, Vitest 5.0.1, `@picovoice/porcupine-web@4.0.1`, `@picovoice/web-voice-processor@4.0.10`.

**Spec:** `docs/superpowers/specs/2026-09-25-oye-denty-assistant-design.md`

## Global Constraints

- Node.js stays `24.x`.
- `Asistente activo` is opt-in and off by default.
- Wake-word listening only runs while `document.visibilityState === "visible"`.
- No patient or assistant learning data is persisted with `localStorage`, `sessionStorage`, or app-owned IndexedDB.
- Existing `planLocalVoiceCommand`, patient resolution, odontogram and periodontal API behavior must remain compatible.
- Red actions never execute before explicit confirmation.
- `OPENAI_API_KEY` remains server-only; this plan does not connect to OpenAI yet.
- Demo audit data may live in React memory only.
- If the wake-word engine fails, the manual microphone path remains usable.

## Review Focus

- Rapid hide/show cycles must not leave two microphone consumers alive.
- Clicking an existing voice control while wake-word listening is armed must not double-open the microphone.
- A local NLU plan containing both yellow and red actions must stop at the red action until confirmation.
- A patient route without a selected tooth must not invent `selectedTooth` context.
- Wake-word initialization failure must degrade to manual mic without disabling the rest of Denty.

---

## File Structure

- Create `src/features/assistant/assistant-types.ts` — assistant state, context, tool-call and audit contracts.
- Create `src/features/assistant/assistant-state-machine.ts` — pure state transitions.
- Create `src/features/assistant/assistant-context.tsx` — context broker and patch hook.
- Create `src/features/assistant/tools/assistant-tool-schemas.ts` — Zod schemas for first tool set.
- Create `src/features/assistant/tools/assistant-tool-registry.ts` — risk, permission metadata, descriptions.
- Create `src/features/assistant/tools/local-voice-adapter.ts` — `LocalVoiceAction` → `AssistantToolCall`.
- Create `src/features/assistant/tools/assistant-tool-executor.ts` — execution against existing Denty APIs.
- Create `src/features/assistant/tools/assistant-policy.ts` — GREEN/YELLOW/RED decision logic.
- Create `src/features/assistant/wake-word/wake-word-engine.ts` — interface.
- Create `src/features/assistant/wake-word/porcupine-wake-word-engine.ts` — local browser implementation.
- Create `src/features/assistant/assistant-provider.tsx` — lifecycle, visibility and confirmation queue.
- Create `src/features/assistant/assistant-control.tsx` — shell control/status UI.
- Modify `src/features/voice/voice-executor.ts` — compatibility wrapper through new executor.
- Modify `src/features/voice/voice-command-bar.tsx` — delegate assistant lifecycle and avoid competing microphone owners.
- Modify `src/app/_components/shell/app-shell.tsx` — mount provider/control.
- Modify `next.config.ts` — no COOP/COEP requirement; accept Porcupine single-thread fallback to avoid breaking external app resources.
- Modify `.env.example` and `src/shared/config/env.ts` — authenticated wake-word configuration.
- Create `src/app/api/assistant/wake-word/config/route.ts` — return Picovoice SDK credential only to an authenticated Denty session.
- Create tests beside each new pure module under `src/features/assistant/__tests__/`.

### Task 1: Assistant state machine and core contracts

**Files:**
- Create: `src/features/assistant/assistant-types.ts`
- Create: `src/features/assistant/assistant-state-machine.ts`
- Test: `src/features/assistant/__tests__/assistant-state-machine.test.ts`

**Interfaces:**
- Produces: `AssistantStatus`, `AssistantEvent`, `AssistantContext`, `AssistantToolCall`, `AssistantRisk`, `AssistantAuditEvent`, `reduceAssistantState()`.

- [ ] **Step 1: Write the failing state-machine tests**

```ts
import { describe, expect, it } from "vitest";
import { initialAssistantState, reduceAssistantState } from "../assistant-state-machine";

describe("assistant state machine", () => {
  it("arms only when enabled and visible", () => {
    const enabled = reduceAssistantState(initialAssistantState, { type: "ENABLE" });
    expect(enabled.status).toBe("ARMED");
    const hidden = reduceAssistantState(enabled, { type: "VISIBILITY", visible: false });
    expect(hidden.status).toBe("PAUSED_HIDDEN");
  });

  it("requires an explicit confirm transition for red actions", () => {
    const armed = { ...initialAssistantState, enabled: true, visible: true, status: "ARMED" as const };
    const confirming = reduceAssistantState(armed, {
      type: "REQUEST_CONFIRMATION",
      callId: "call-1",
    });
    expect(confirming.status).toBe("CONFIRMING");
    expect(confirming.pendingConfirmationId).toBe("call-1");
  });
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run:
```bash
npx vitest run src/features/assistant/__tests__/assistant-state-machine.test.ts
```
Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the contracts and pure reducer**

```ts
export type AssistantStatus =
  | "OFF"
  | "ARMED"
  | "WAKE_DETECTED"
  | "CONNECTING"
  | "LISTENING"
  | "THINKING"
  | "EXECUTING"
  | "CONFIRMING"
  | "PAUSED_HIDDEN"
  | "ERROR";

export type AssistantRisk = "GREEN" | "YELLOW" | "RED";
export type AssistantSource = "LOCAL_NLU" | "REALTIME" | "PROACTIVE";

export interface AssistantContext {
  pathname: string;
  patientId?: string;
  patientName?: string;
  selectedTooth?: string;
  selectedAppointmentId?: string;
  activeBudgetId?: string;
  activePlanVersion?: number;
  lastTool?: string;
  lastEntities?: string[];
}

export interface AssistantToolCall<TArgs = unknown> {
  id: string;
  name: string;
  args: TArgs;
  source: AssistantSource;
}

export interface AssistantState {
  enabled: boolean;
  visible: boolean;
  status: AssistantStatus;
  pendingConfirmationId?: string;
  error?: string;
}

export const initialAssistantState: AssistantState = {
  enabled: false,
  visible: true,
  status: "OFF",
};

export type AssistantEvent =
  | { type: "ENABLE" }
  | { type: "DISABLE" }
  | { type: "VISIBILITY"; visible: boolean }
  | { type: "WAKE" }
  | { type: "CONNECTED" }
  | { type: "THINK" }
  | { type: "EXECUTE" }
  | { type: "LISTEN" }
  | { type: "REQUEST_CONFIRMATION"; callId: string }
  | { type: "CONFIRMATION_FINISHED" }
  | { type: "FAIL"; message: string };
```

Reducer rule: `DISABLE` always returns `OFF`; invisible always returns `PAUSED_HIDDEN`; returning visible while enabled returns `ARMED`; `REQUEST_CONFIRMATION` enters `CONFIRMING` without executing anything.

- [ ] **Step 4: Run the test and verify GREEN**

Run the same Vitest command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/assistant/assistant-types.ts src/features/assistant/assistant-state-machine.ts src/features/assistant/__tests__/assistant-state-machine.test.ts
git commit -m "feat: add Denty assistant state machine"
```

### Task 2: Common tool schemas, registry, and Local NLU adapter

**Files:**
- Create: `src/features/assistant/tools/assistant-tool-schemas.ts`
- Create: `src/features/assistant/tools/assistant-tool-registry.ts`
- Create: `src/features/assistant/tools/local-voice-adapter.ts`
- Test: `src/features/assistant/__tests__/local-voice-adapter.test.ts`
- Modify: `src/features/voice/local-nlu.ts` only if an exported type must become public; do not change parsing behavior.

**Interfaces:**
- Consumes: `LocalVoiceAction`.
- Produces: `assistantToolRegistry`, `localVoicePlanToToolCalls(plan)`.

- [ ] **Step 1: Write failing adapter tests**

```ts
import { describe, expect, it } from "vitest";
import { localVoicePlanToToolCalls } from "../tools/local-voice-adapter";

it("maps odontogram actions without losing surfaces", () => {
  const calls = localVoicePlanToToolCalls({
    raw: "caries OD 16",
    actions: [{
      type: "odontogram.set_state",
      patientRef: "actual",
      tooth: "16",
      status: "CARIES",
      surfaces: ["O", "D"],
    }],
    ambiguities: [],
    requiresConfirmation: false,
    readback: "",
    confidence: 1,
    contextPatientId: "p1",
    source: "rules",
  });
  expect(calls[0]).toMatchObject({
    name: "odontogram.set_state",
    source: "LOCAL_NLU",
    args: { patientId: "p1", tooth: "16", status: "CARIES", surfaces: ["O", "D"] },
  });
});
```

- [ ] **Step 2: Verify RED**

```bash
npx vitest run src/features/assistant/__tests__/local-voice-adapter.test.ts
```
Expected: module missing.

- [ ] **Step 3: Define the initial Zod schemas and risk registry**

Use exact names for the first executable set:

```ts
export const assistantToolSchemas = {
  "navigation.open": z.object({ destination: z.string().min(1) }),
  "navigation.patient": z.object({ patientId: z.string().min(1) }),
  "odontogram.select_tooth": z.object({ tooth: z.string().regex(/^\d{2}$/) }),
  "odontogram.set_state": z.object({
    patientId: z.string().min(1),
    tooth: z.string().regex(/^\d{2}$/),
    status: z.enum(["CARIES", "HEALTHY", "MISSING"]),
    surfaces: z.array(z.enum(["M", "D", "O", "V", "L", "I"])).default([]),
  }),
  "periodontal.update": z.object({
    patientId: z.string().min(1),
    tooth: z.string().regex(/^\d{2}$/),
    site: z.string().min(1),
    probingDepth: z.number().int().min(0).max(15).optional(),
    recession: z.number().int().min(-10).max(20).optional(),
    mobility: z.number().int().min(0).max(3).optional(),
    bleeding: z.boolean().optional(),
    suppuration: z.boolean().optional(),
    plaque: z.boolean().optional(),
  }),
  "clinical.note": z.object({ patientId: z.string().min(1), text: z.string().min(1).max(4000) }),
  "budget.sync": z.object({ patientId: z.string().min(1) }),
  "payment.record": z.object({
    patientId: z.string().min(1),
    amountCents: z.number().int().positive(),
    method: z.enum(["CARD", "CASH", "TRANSFER", "FINANCING"]),
  }),
} as const;
```

Registry risk rules:
- navigation/query/select → GREEN
- odontogram, periodontal, clinical note, budget sync → YELLOW
- payment record → RED

- [ ] **Step 4: Implement `localVoicePlanToToolCalls`**

It must resolve `plan.contextPatientId` once, reject action types that require a patient but have no resolved ID, and preserve the original action type in a deterministic tool name. Unsupported actions return an `unsupported` list rather than being silently dropped.

- [ ] **Step 5: Verify GREEN plus legacy NLU regressions**

```bash
npx vitest run src/features/assistant/__tests__/local-voice-adapter.test.ts src/features/voice/__tests__/local-nlu.test.ts src/features/voice/__tests__/voice-router.test.ts
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/assistant/tools src/features/assistant/__tests__/local-voice-adapter.test.ts
git commit -m "feat: normalize voice actions as assistant tools"
```

### Task 3: Policy engine, executor, and confirmation boundary

**Files:**
- Create: `src/features/assistant/tools/assistant-policy.ts`
- Create: `src/features/assistant/tools/assistant-tool-executor.ts`
- Test: `src/features/assistant/__tests__/assistant-policy.test.ts`
- Test: `src/features/assistant/__tests__/assistant-tool-executor.test.ts`
- Modify: `src/features/voice/voice-executor.ts`

**Interfaces:**
- Produces: `classifyAssistantTool(name)`, `executeAssistantTool(call, context)`, `executeAssistantCalls(calls, options)`.

- [ ] **Step 1: Write tests that prove red actions cannot execute pre-confirmation**

```ts
it("blocks red tools until confirmed", async () => {
  const calls = [{
    id: "pay-1",
    name: "payment.record",
    source: "LOCAL_NLU" as const,
    args: { patientId: "p1", amountCents: 5000, method: "CARD" },
  }];
  const result = await executeAssistantCalls(calls, { confirmedCallIds: new Set() });
  expect(result.pendingConfirmation?.id).toBe("pay-1");
  expect(result.executed).toEqual([]);
});
```

Mock `getBrowserApi()` only at the module boundary and assert `billing.payments.record` is not called.

- [ ] **Step 2: Verify RED**

```bash
npx vitest run src/features/assistant/__tests__/assistant-policy.test.ts src/features/assistant/__tests__/assistant-tool-executor.test.ts
```

- [ ] **Step 3: Implement executor for currently supported tools**

Move the existing API bodies from `voice-executor.ts` into `assistant-tool-executor.ts`. Keep:
- odontogram batch with expected version;
- periodontal API call;
- clinical encounter note;
- budget sync;
- payment record.

Navigation tools return a typed UI effect instead of calling `router` from the executor:

```ts
export type AssistantExecutionEffect =
  | { type: "NAVIGATE"; href: string }
  | { type: "SELECT_TOOTH"; tooth: string }
  | { type: "NONE" };
```

`executeVoicePlan()` becomes a compatibility wrapper: adapt the local plan, execute through policy, and throw the same explicit unsupported-action message used today.

- [ ] **Step 4: Verify GREEN and payment boundary**

```bash
npx vitest run src/features/assistant/__tests__/assistant-policy.test.ts src/features/assistant/__tests__/assistant-tool-executor.test.ts src/features/voice/__tests__
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/assistant/tools src/features/voice/voice-executor.ts src/features/assistant/__tests__
git commit -m "feat: enforce assistant tool risk policy"
```

### Task 4: Context broker, provider, and visibility lifecycle

**Files:**
- Create: `src/features/assistant/assistant-context.tsx`
- Create: `src/features/assistant/assistant-provider.tsx`
- Test: `src/features/assistant/__tests__/assistant-provider.test.tsx`
- Modify: `src/app/(staff)/app/layout.tsx`

**Interfaces:**
- Produces: `useAssistant()`, `useAssistantContext()`, `useAssistantContextPatch(patch)`.

- [ ] **Step 1: Write tests for visibility and microphone ownership**

Render the provider with a fake wake engine exposing `start`/`stop` spies. Assert:
- enabling while visible starts once;
- `visibilitychange` to hidden stops once and status becomes `PAUSED_HIDDEN`;
- returning visible restarts once;
- disabling stops and returns `OFF`.

- [ ] **Step 2: Verify RED**

```bash
npx vitest run src/features/assistant/__tests__/assistant-provider.test.tsx --environment jsdom
```

- [ ] **Step 3: Implement context inference and provider**

`assistant-context.tsx` derives `patientId` from `/app/patients/:id` using the existing `patientIdFromPathname()` helper and allows focused screens to patch selected entities.

Provider lifecycle pseudocode must be implemented literally:

```ts
useEffect(() => {
  if (!state.enabled || document.visibilityState !== "visible") {
    void wakeWord.stop();
    return;
  }
  void wakeWord.start();
  return () => void wakeWord.stop();
}, [state.enabled, state.visible, wakeWord]);
```

Use an idempotent engine so React Strict Mode does not create duplicate listeners.

- [ ] **Step 4: Mount provider once in staff layout**

```tsx
<AssistantProvider>
  <DentyAppShell demoMode={publicEnv.NEXT_PUBLIC_DEMO_MODE === "true"}>{children}</DentyAppShell>
</AssistantProvider>
```

- [ ] **Step 5: Verify GREEN**

Run provider tests plus `npm run architecture:check`.

- [ ] **Step 6: Commit**

```bash
git add src/features/assistant/assistant-context.tsx src/features/assistant/assistant-provider.tsx 'src/app/(staff)/app/layout.tsx' src/features/assistant/__tests__/assistant-provider.test.tsx
git commit -m "feat: add assistant lifecycle provider"
```

### Task 5: Local “Oye Denty” wake-word engine

**Files:**
- Modify: `package.json`, `package-lock.json`
- Modify: `.env.example`
- Modify: `src/shared/config/env.ts`
- Create: `src/features/assistant/wake-word/wake-word-engine.ts`
- Create: `src/features/assistant/wake-word/porcupine-wake-word-engine.ts`
- Create: `src/app/api/assistant/wake-word/config/route.ts`
- Add binary assets: `public/assistant/oye-denty_es_wasm_v1.ppn`, `public/assistant/porcupine_params_es.pv`
- Test: `src/features/assistant/__tests__/wake-word-engine.test.ts`

**Interfaces:**
- Produces exactly:

```ts
export interface WakeWordEngine {
  start(): Promise<void>;
  stop(): Promise<void>;
  onWake(callback: () => void): () => void;
  readonly running: boolean;
}
```

- [ ] **Step 1: Add exact package versions**

```bash
npm install --save-exact @picovoice/porcupine-web@4.0.1 @picovoice/web-voice-processor@4.0.10
```

- [ ] **Step 2: Add authenticated runtime configuration**

Add server env `PICOVOICE_ACCESS_KEY` to `serverEnvSchema` and `.env.example`. Do not add any `NEXT_PUBLIC_PICOVOICE_*` variable.

`GET /api/assistant/wake-word/config` must first validate the Denty session by forwarding the caller cookie to `${DENTY_API_URL}/api/auth/session`; return `401` for unauthenticated, `503` if server configuration is missing, and `{ accessKey }` only after a valid actor is parsed.

- [ ] **Step 3: Acquire the exact Spanish Web WASM models**

Using Picovoice Console:
1. Create custom keyword phrase `Oye Denty`.
2. Language: Spanish.
3. Target: `Web (WASM)`.
4. Save the downloaded keyword as `public/assistant/oye-denty_es_wasm_v1.ppn`.
5. Download the Spanish Porcupine parameter model and save it as `public/assistant/porcupine_params_es.pv`.

These files are application assets, not patient data.

- [ ] **Step 4: Write failing idempotency test**

Test a fake Porcupine worker and voice processor: two `start()` calls subscribe only once; two `stop()` calls unsubscribe only once; detected label `oye-denty` emits exactly one wake event.

- [ ] **Step 5: Implement `PorcupineWakeWordEngine`**

Initialization values:

```ts
const keyword = {
  publicPath: "/assistant/oye-denty_es_wasm_v1.ppn",
  label: "oye-denty",
  sensitivity: 0.55,
};
const model = { publicPath: "/assistant/porcupine_params_es.pv" };
```

Use `PorcupineWorker.create(accessKey, [keyword], callback, model)` and `WebVoiceProcessor.subscribe/unsubscribe`. On `stop()`, stop microphone processing but keep the worker reusable for the current page session; on provider unmount, release/terminate.

Do not add COOP/COEP headers globally. Version 4.0.1 can fall back to standard ArrayBuffers when SharedArrayBuffer is unavailable; avoiding global cross-origin isolation protects existing Denty resources.

- [ ] **Step 6: Verify GREEN and browser fallback**

```bash
npx vitest run src/features/assistant/__tests__/wake-word-engine.test.ts
npm run architecture:check
```

Also test in a browser with mic denied: provider enters `ERROR`, then exposes manual mic without looping permission prompts.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json .env.example src/shared/config/env.ts src/features/assistant/wake-word src/app/api/assistant/wake-word public/assistant src/features/assistant/__tests__/wake-word-engine.test.ts
git commit -m "feat: add local Oye Denty wake word"
```

### Task 6: Assistant control UI and legacy voice integration

**Files:**
- Create: `src/features/assistant/assistant-control.tsx`
- Create: `src/features/assistant/assistant-control.module.css`
- Modify: `src/app/_components/shell/app-shell.tsx`
- Modify: `src/features/voice/voice-command-bar.tsx`
- Test: `src/features/assistant/__tests__/assistant-control.test.tsx`

**Interfaces:**
- Consumes `useAssistant()`.
- Produces user-visible `Asistente apagado`, `Denty activo`, `Escuchando`, `Entendiendo`, `Ejecutando`, `Esperando confirmación`.

- [ ] **Step 1: Write UI tests**

Assert toggle enables/disables assistant, hidden status renders `Pausado`, and a pending RED call renders Confirmar/Cancelar buttons without executing until clicked.

- [ ] **Step 2: Verify RED**

```bash
npx vitest run src/features/assistant/__tests__/assistant-control.test.tsx --environment jsdom
```

- [ ] **Step 3: Implement compact shell control**

Use Mantine `Popover`, `Switch`, `Badge`, `Button`, and a single `ActionIcon`. The main status remains compact in the header. Confirmation content includes the normalized action summary and never displays raw model JSON.

- [ ] **Step 4: Refactor `VoiceCommandBar` microphone ownership**

When assistant is enabled:
- wake engine owns idle microphone;
- wake callback stops wake engine before starting the existing one-shot command capture;
- when command processing finishes or is cancelled, provider rearms the wake engine if visible.

When assistant is disabled, the existing manual mic behavior remains unchanged.

- [ ] **Step 5: Verify GREEN and no regression**

```bash
npx vitest run src/features/assistant/__tests__/assistant-control.test.tsx src/features/voice/__tests__ --environment jsdom
npm run typecheck
```

- [ ] **Step 6: Commit**

```bash
git add src/features/assistant/assistant-control.tsx src/features/assistant/assistant-control.module.css src/app/_components/shell/app-shell.tsx src/features/voice/voice-command-bar.tsx src/features/assistant/__tests__/assistant-control.test.tsx
git commit -m "feat: expose active Denty assistant controls"
```

### Task 7: Foundation regression and deployment gate

**Files:**
- Create: `scripts/tests/assistant-foundation-regression.mjs`
- Modify: `scripts/verify-vercel-regression-matrix.mjs` only to add checks for server-only secrets and no `NEXT_PUBLIC_OPENAI_API_KEY`/`NEXT_PUBLIC_PICOVOICE_ACCESS_KEY`.

- [ ] **Step 1: Add dependency-free regression assertions**

The script must fail if:
- `AssistantProvider` is not mounted in staff layout;
- `Asistente activo` text disappears;
- assistant source contains `localStorage`/`sessionStorage`;
- OpenAI or Picovoice standard credentials use `NEXT_PUBLIC_`;
- the wake engine no longer responds to `visibilitychange`.

- [ ] **Step 2: Run full foundation verification**

```bash
node scripts/tests/assistant-foundation-regression.mjs
npm run typecheck
npm run test -- --run
npm run architecture:check
npm run api:parity
npm run vercel:regressions
npm run build
```
Expected: all commands exit `0`.

- [ ] **Step 3: Commit**

```bash
git add scripts/tests/assistant-foundation-regression.mjs scripts/verify-vercel-regression-matrix.mjs
git commit -m "test: lock Oye Denty foundation regressions"
```

## Foundation Acceptance Gate

Foundation is complete only when:
1. assistant opt-in controls microphone lifecycle;
2. hidden tab always pauses wake listening;
3. “Oye Denty” is detected locally through the wake engine;
4. local NLU actions flow through the common tool registry;
5. RED action tests prove no pre-confirmation mutation;
6. the old manual voice path still works;
7. production build passes.
