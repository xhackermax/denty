# Oye Denty Realtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a secure, contextual 45-second conversational session using OpenAI Realtime while keeping all Denty mutations behind the existing tool registry and risk policy.

**Architecture:** Denty’s server creates short-lived Realtime client secrets after validating the current Denty session. The browser connects directly to OpenAI over WebRTC, publishes the same typed Denty tools used by local NLU, and returns each function call to `AssistantProvider` for policy/confirmation/execution. Local NLU remains the fast path; Realtime is only opened after wake/manual activation and closes on inactivity, hidden visibility, explicit termination, network failure, or assistant disable.

**Tech Stack:** Existing Denty stack plus browser WebRTC/DataChannel APIs and OpenAI Realtime GA API. No OpenAI API key is shipped to the browser. Default model: `gpt-realtime-2.1-mini`.

**Spec:** `docs/superpowers/specs/2026-09-25-oye-denty-assistant-design.md`

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

---

## File Structure

- Create `src/server/denty-session.ts` — shared server-side actor validation.
- Create `src/app/api/assistant/realtime/session/route.ts` — ephemeral OpenAI client secret.
- Create `src/features/assistant/realtime/realtime-types.ts` — narrow event types used by Denty.
- Create `src/features/assistant/realtime/realtime-client.ts` — WebRTC transport/data channel.
- Create `src/features/assistant/realtime/realtime-tools.ts` — convert Denty registry to Realtime function definitions.
- Create `src/features/assistant/realtime/assistant-prompt.ts` — stable Denty assistant instructions.
- Create `src/features/assistant/realtime/conversation-session.ts` — 45-second lifecycle and tool-call loop.
- Modify `src/features/assistant/assistant-provider.tsx` — session orchestration.
- Modify `src/features/assistant/assistant-context.tsx` — context updates from focused screens.
- Modify `src/features/odontogram/odontogram-workspace.tsx`, `src/features/agenda/agenda-page.tsx`, and patient/budget screens to publish selected entities.
- Modify `src/shared/config/env.ts` and `.env.example`.
- Modify `src/app/api/voice/transcribe/route.ts` — use current transcription default.
- Add unit/integration tests under `src/features/assistant/__tests__/` and route tests where possible.

### Task 1: Shared authenticated actor helper and Realtime session endpoint

**Files:**
- Create: `src/server/denty-session.ts`
- Create: `src/app/api/assistant/realtime/session/route.ts`
- Modify: `src/app/api/denty/card-terminal/_sumup.ts`
- Modify: `src/shared/config/env.ts`
- Modify: `.env.example`
- Test: `src/app/api/assistant/realtime/session/route.test.ts`

**Interfaces:**
- Produces: `requireDentyActor(request): Promise<SessionResponse["actor"]>`.
- Route response passes through OpenAI client-secret JSON and never returns the standard API key.

- [ ] **Step 1: Write route tests first**

Test cases:
- no `DENTY_API_URL` → `503`;
- Denty session `401` → `401`;
- valid actor + missing `OPENAI_API_KEY` → `503`;
- valid actor → OpenAI called once with `Authorization: Bearer <server key>` and `OpenAI-Safety-Identifier` set to a SHA-256 hash of `clinicId:userId`;
- response body never contains `OPENAI_API_KEY`.

- [ ] **Step 2: Verify RED**

```bash
npx vitest run src/app/api/assistant/realtime/session/route.test.ts
```

- [ ] **Step 3: Extract the existing session-forwarding logic**

`src/server/denty-session.ts`:

```ts
export async function requireDentyActor(request: Request) {
  const { DENTY_API_URL } = getServerEnv();
  if (!DENTY_API_URL) throw new DentySessionError("DENTY_API_URL no configurado", 503);
  const headers = new Headers({ accept: "application/json" });
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  const response = await fetch(new URL("/api/auth/session", `${DENTY_API_URL.replace(/\/$/, "")}/`), {
    headers,
    cache: "no-store",
    redirect: "manual",
  });
  if (response.status === 401) throw new DentySessionError("Sesión no autenticada", 401);
  if (!response.ok) throw new DentySessionError("No se pudo validar la sesión Denty", 503);
  return sessionResponseSchema.parse(await response.json()).actor;
}
```

Refactor SumUp to consume this helper without changing its finance permission check.

- [ ] **Step 4: Implement the Realtime client-secret route**

Add env defaults:

```ts
OPENAI_REALTIME_MODEL: z.string().min(1).default("gpt-realtime-2.1-mini"),
OPENAI_TRANSCRIBE_MODEL: z.string().min(1).default("gpt-transcribe"),
```

Server request body:

```ts
const body = {
  session: {
    type: "realtime",
    model: OPENAI_REALTIME_MODEL,
    instructions: "Denty voice session. Tools and detailed instructions are supplied by the client session update.",
  },
};
```

POST to `https://api.openai.com/v1/realtime/client_secrets` with standard API key only on the server. Return OpenAI status/body with `Cache-Control: no-store`.

- [ ] **Step 5: Verify GREEN**

```bash
npx vitest run src/app/api/assistant/realtime/session/route.test.ts
npm run typecheck
```

- [ ] **Step 6: Commit**

```bash
git add src/server/denty-session.ts src/app/api/assistant/realtime/session src/app/api/denty/card-terminal/_sumup.ts src/shared/config/env.ts .env.example src/app/api/voice/transcribe/route.ts
git commit -m "feat: create authenticated Realtime session tokens"
```

### Task 2: Low-level WebRTC client

**Files:**
- Create: `src/features/assistant/realtime/realtime-types.ts`
- Create: `src/features/assistant/realtime/realtime-client.ts`
- Test: `src/features/assistant/__tests__/realtime-client.test.ts`

**Interfaces:**

```ts
export interface DentyRealtimeClient {
  connect(ephemeralKey: string): Promise<void>;
  updateSession(payload: Record<string, unknown>): void;
  sendEvent(event: Record<string, unknown>): void;
  close(): void;
  onEvent(listener: (event: RealtimeServerEvent) => void): () => void;
}
```

- [ ] **Step 1: Write failing transport tests**

Use fake `RTCPeerConnection`, `RTCDataChannel`, and `fetch`. Assert:
- local microphone track added once;
- SDP offer sent to `https://api.openai.com/v1/realtime/calls` with ephemeral bearer key;
- remote SDP answer applied;
- close stops local tracks, closes data channel and peer connection idempotently.

- [ ] **Step 2: Verify RED**

```bash
npx vitest run src/features/assistant/__tests__/realtime-client.test.ts --environment jsdom
```

- [ ] **Step 3: Implement WebRTC transport**

Core sequence:

```ts
const pc = new RTCPeerConnection();
const audio = document.createElement("audio");
audio.autoplay = true;
pc.ontrack = (event) => { audio.srcObject = event.streams[0] ?? null; };

const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
for (const track of stream.getTracks()) pc.addTrack(track, stream);

const channel = pc.createDataChannel("oai-events");
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);

const response = await fetch("https://api.openai.com/v1/realtime/calls", {
  method: "POST",
  body: offer.sdp,
  headers: {
    Authorization: `Bearer ${ephemeralKey}`,
    "Content-Type": "application/sdp",
  },
});
await pc.setRemoteDescription({ type: "answer", sdp: await response.text() });
```

Parse only JSON data-channel messages into the narrow union Denty actually uses: `session.created`, `response.output_audio_transcript.delta`, `response.output_text.delta`, `response.done`, `error`, `rate_limits.updated`.

- [ ] **Step 4: Verify GREEN**

Run the test plus `npm run typecheck`.

- [ ] **Step 5: Commit**

```bash
git add src/features/assistant/realtime src/features/assistant/__tests__/realtime-client.test.ts
git commit -m "feat: add Realtime WebRTC transport"
```

### Task 3: Realtime tool definitions and Denty system prompt

**Files:**
- Create: `src/features/assistant/realtime/realtime-tools.ts`
- Create: `src/features/assistant/realtime/assistant-prompt.ts`
- Test: `src/features/assistant/__tests__/realtime-tools.test.ts`

**Interfaces:**
- Produces: `buildRealtimeTools(registry)`, `buildAssistantInstructions(context)`.

- [ ] **Step 1: Write tests for safety wording and tool parity**

Assert every exposed function name exists in `assistantToolRegistry`; unknown registry entries are never emitted; prompt explicitly says:
- never invent patient IDs;
- use tools for mutations;
- ask when ambiguous;
- never claim a mutation succeeded until function output reports success;
- RED actions may be proposed but require Denty confirmation.

- [ ] **Step 2: Implement function definitions**

Each emitted tool object:

```ts
{
  type: "function",
  name: entry.name,
  description: entry.description,
  parameters: entry.jsonSchema,
}
```

The registry, not the model prompt, is the source of truth for available tools.

- [ ] **Step 3: Implement minimal-context instructions**

Prompt includes current pathname/patient/tooth only when present. It includes Spanish clinical interaction rules and a termination rule: phrases `gracias Denty`, `terminar`, `fin Denty` should end the session without calling a tool.

- [ ] **Step 4: Verify and commit**

```bash
npx vitest run src/features/assistant/__tests__/realtime-tools.test.ts
git add src/features/assistant/realtime src/features/assistant/__tests__/realtime-tools.test.ts
git commit -m "feat: publish Denty tools to Realtime"
```

### Task 4: Conversation session manager and 45-second lifecycle

**Files:**
- Create: `src/features/assistant/realtime/conversation-session.ts`
- Test: `src/features/assistant/__tests__/conversation-session.test.ts`

**Interfaces:**
- Produces: `startConversation()`, `touchConversation()`, `endConversation(reason)` and tool-call events.

- [ ] **Step 1: Write fake-timer tests**

Assert:
- session closes exactly after 45,000 ms without activity;
- any user transcript/model event/tool completion resets timeout;
- explicit termination closes immediately;
- hidden visibility closes immediately;
- close is idempotent.

- [ ] **Step 2: Verify RED**

```bash
npx vitest run src/features/assistant/__tests__/conversation-session.test.ts
```

- [ ] **Step 3: Implement lifecycle**

After connection, send:

```ts
client.updateSession({
  type: "session.update",
  session: {
    type: "realtime",
    model,
    instructions: buildAssistantInstructions(context),
    tools: buildRealtimeTools(assistantToolRegistry),
    tool_choice: "auto",
  },
});
```

On `response.done`, inspect every output item. For `type === "function_call"`, parse `arguments` with `JSON.parse`, validate through registry Zod schema, then emit `toolRequested({ callId, toolCall })`. Malformed/unknown calls emit an error result to the model and never execute.

- [ ] **Step 4: Return function outputs to the model**

After Denty executes or rejects a tool, send:

```ts
client.sendEvent({
  type: "conversation.item.create",
  item: {
    type: "function_call_output",
    call_id: callId,
    output: JSON.stringify(result),
  },
});
client.sendEvent({ type: "response.create" });
```

- [ ] **Step 5: Verify GREEN and commit**

```bash
npx vitest run src/features/assistant/__tests__/conversation-session.test.ts
git add src/features/assistant/realtime/conversation-session.ts src/features/assistant/__tests__/conversation-session.test.ts
git commit -m "feat: manage Denty conversational sessions"
```

### Task 5: Provider orchestration and local-vs-AI routing

**Files:**
- Modify: `src/features/assistant/assistant-provider.tsx`
- Modify: `src/features/voice/voice-command-bar.tsx`
- Test: `src/features/assistant/__tests__/assistant-routing.test.tsx`

**Interfaces:**
- Fast path decision: local plan executes without Realtime when confidence is high, no ambiguity exists, and the utterance has no contextual-reference markers.

- [ ] **Step 1: Write routing tests**

Examples:
- `caries oclusal 16` → local fast path;
- `ahora el 17, lo mismo` → Realtime;
- multi-step sentence with two domains → Realtime;
- local parser ambiguity → Realtime;
- Realtime unavailable + local parsable → local succeeds;
- Realtime unavailable + complex phrase → non-blocking “Denty inteligente no está disponible ahora”.

- [ ] **Step 2: Implement one routing predicate**

```ts
export function shouldUseLocalFastPath(plan: LocalVoicePlan, raw: string): boolean {
  if (plan.confidence < 0.9 || plan.ambiguities.length > 0 || plan.actions.length === 0) return false;
  return !/\b(lo mismo|igual que antes|ese|esa|anterior|también|después|luego)\b/i.test(raw);
}
```

The predicate may become stricter, not looser, if regressions show unsafe routing.

- [ ] **Step 3: Integrate wake activation**

Wake detection starts a Realtime session and moves state `WAKE_DETECTED → CONNECTING → LISTENING`. Manual mic inside an already active conversation sends speech to the same Realtime transport rather than launching the old recorder.

- [ ] **Step 4: Verify GREEN and commit**

```bash
npx vitest run src/features/assistant/__tests__/assistant-routing.test.tsx --environment jsdom
npm run typecheck
git add src/features/assistant/assistant-provider.tsx src/features/voice/voice-command-bar.tsx src/features/assistant/__tests__/assistant-routing.test.tsx
git commit -m "feat: route Denty voice between local NLU and Realtime"
```

### Task 6: Publish live screen context without dumping records

**Files:**
- Modify: `src/features/odontogram/odontogram-workspace.tsx`
- Modify: `src/features/agenda/agenda-page.tsx`
- Modify: `src/features/patients/patient-profile.tsx`
- Modify: `src/features/parity/modules/finance-module.tsx`
- Test: `src/features/assistant/__tests__/assistant-context-integration.test.tsx`

- [ ] **Step 1: Add focused context tests**

Verify selecting tooth 16 publishes `{ selectedTooth: "16" }`; selecting an agenda appointment publishes only its ID; leaving the screen clears screen-specific fields. Patient name may be published, but medical profile, notes, documents and full appointment objects are not placed in assistant context.

- [ ] **Step 2: Wire `useAssistantContextPatch`**

Each screen patches only identifiers already visible to the user. Use cleanup to clear stale selections on unmount.

- [ ] **Step 3: Verify context + Realtime tests**

```bash
npx vitest run src/features/assistant/__tests__/assistant-context-integration.test.tsx src/features/assistant/__tests__/conversation-session.test.ts --environment jsdom
```

- [ ] **Step 4: Commit**

```bash
git add src/features/odontogram/odontogram-workspace.tsx src/features/agenda/agenda-page.tsx src/features/patients/patient-profile.tsx src/features/parity/modules/finance-module.tsx src/features/assistant/__tests__/assistant-context-integration.test.tsx
git commit -m "feat: publish minimal live context to Denty assistant"
```

### Task 7: Realtime deployment and failure-mode regression

**Files:**
- Create: `scripts/tests/assistant-realtime-regression.mjs`
- Modify: `scripts/verify-vercel-regression-matrix.mjs`

- [ ] **Step 1: Dependency-free assertions**

Fail if:
- `OPENAI_API_KEY` appears in public env;
- deprecated `gpt-realtime` or `gpt-realtime-mini` is the configured default;
- `OPENAI_TRANSCRIBE_MODEL` still defaults to the deprecated `gpt-4o-mini-transcribe`;
- route is missing `Cache-Control: no-store`;
- Realtime client lacks close/track-stop logic.

- [ ] **Step 2: Full verification**

```bash
node scripts/tests/assistant-realtime-regression.mjs
npm run typecheck
npm run test -- --run
npm run architecture:check
npm run api:parity
npm run vercel:regressions
npm run build
```
Expected: all commands exit `0`.

- [ ] **Step 3: Manual WebRTC smoke test on Vercel Preview**

With `OPENAI_API_KEY` configured and a valid Denty session:
1. enable assistant;
2. say “Oye Denty”;
3. ask “abre el paciente actual”;
4. say “caries oclusal en el 16”;
5. say “ahora el 17, lo mismo”;
6. hide the tab and confirm audio/session stops;
7. return and confirm wake mode rearms.

- [ ] **Step 4: Commit**

```bash
git add scripts/tests/assistant-realtime-regression.mjs scripts/verify-vercel-regression-matrix.mjs
git commit -m "test: lock Realtime assistant regressions"
```

## Realtime Acceptance Gate

Realtime is complete only when:
1. browser never receives the standard OpenAI key;
2. `gpt-realtime-2.1-mini` session connects through ephemeral credentials;
3. 45-second inactivity closes the session;
4. tools are Zod-validated before execution;
5. RED calls wait for confirmation;
6. context carries across turns such as “ahora el 17 / lo mismo”;
7. hidden tabs close remote audio;
8. local NLU remains operational during OpenAI/network failure;
9. production build passes.
