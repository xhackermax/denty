# Voice as Denty Operating System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn voice into a safe multi-action command layer that can operate patients, agenda, odontogram, treatment plans, budgets and lab through the same application services as the UI.

**Architecture:** ASR produces text. A deterministic parser handles known dental commands. An optional LLM only produces a typed `VoicePlan`; it never mutates state. Resolver + policy + dry-run validate entities, permissions and ambiguity. Executor runs approved actions transactionally and audits them.

**Spec:** `docs/superpowers/specs/2026-09-16-denty-production-platform-design.md`

## Command pipeline

```text
audio
→ ASR adapter
→ normalized transcript
→ deterministic NLU
→ optional LLM fallback
→ entity/date resolver
→ policy + permission check
→ dry-run VoicePlan
→ confirmation if required
→ transactional executor
→ audit/outbox
→ concise readback
```

---

### Task 1: Define typed action union

Create `packages/voice/src/actions.ts` with Zod discriminated union including:

```text
patient.search
appointment.create
appointment.check_in
appointment.move
appointment.mark_no_show
odontogram.set_state
odontogram.set_surface_state
clinical_plan.add_item
clinical_plan.generate_from_odontogram
clinical_plan.approve_alternative
budget.generate_from_plan
payment.record
lab.update_stage
navigation.open
```

Each action uses stable server IDs after resolution.

- [ ] Write schema tests.
- [ ] Implement.
- [ ] Commit.

### Task 2: Preserve and port deterministic V11 parser

Extract useful parsing rules from `apps/legacy-preview/voice-router.js` into focused files under `packages/voice/src/parser/`.

Do not import the legacy file.

Test canonical phrases, especially:

```text
"hay que hacer endodoncia 22"
"endodoncia realizada en 22"
"puente 21 a 23 con 22 ausente"
"repetir perno 14"
"repetir puente 26 a 28"
"Carlos ha llegado"
```

- [ ] Port tests first.
- [ ] Implement parser until parity passes.
- [ ] Commit.

### Task 3: Multi-action planner

Define:

```ts
interface VoicePlan {
  transcript: string;
  patientContextId?: string;
  actions: VoiceAction[];
  clarifications: Clarification[];
  requiresConfirmation: boolean;
  confidence: number;
}
```

Example utterance:

> Carlos ha llegado, tiene que hacerse endodoncia del 22, reconstrucción y corona, pon la endodoncia para el jueves y prepara el presupuesto.

Expected plan:

1. resolve Carlos,
2. `appointment.check_in`,
3. add three clinical plan items for tooth 22,
4. establish endo → reconstruction → crown dependencies,
5. resolve next Thursday,
6. schedule endodontic plan item,
7. generate budget from plan.

- [ ] Test full plan with one matching Carlos.
- [ ] Test two Carlos patients returns clarification and performs zero writes.
- [ ] Commit.

### Task 4: Entity and temporal resolver

Create API-backed resolvers:

```text
PatientResolver
StaffResolver
AppointmentResolver
DentalToothResolver
RelativeDateResolver
```

Date rules use clinic timezone. Ambiguous phrases affecting writes must resolve deterministically or request clarification.

- [ ] Tests for "jueves", "el próximo jueves", dates around midnight, duplicate names.
- [ ] Commit.

### Task 5: Optional LLM provider contract

Implement:

```ts
interface VoiceNluProvider {
  interpret(input: NluInput): Promise<VoicePlanDraft>;
}
```

Adapters:

- `LocalRulesProvider`
- `OllamaProvider`
- optional external provider behind server config.

LLM response must parse through the same Zod schema. Invalid/unknown actions fail closed.

- [ ] Test malicious/freeform output cannot become an executable action.
- [ ] Commit.

### Task 6: Policy and confirmation engine

Rules include:

- navigation/search may execute immediately,
- destructive/financial/clinical writes require confirmation when confidence is low or request is ambiguous,
- irreversible document/fiscal actions always use explicit UI confirmation,
- patient role cannot issue staff commands.

- [ ] Policy matrix tests.
- [ ] Commit.

### Task 7: Transactional executor

**Files:**
- `apps/api/src/modules/voice/executor.ts`
- `apps/api/src/modules/voice/routes.ts`

Endpoint:

```text
POST /api/voice/plan
POST /api/voice/execute
```

`execute` receives a server-generated plan token, not arbitrary client actions. Revalidate permission and entity versions immediately before commit.

- [ ] Test all actions in example execute atomically.
- [ ] Force appointment conflict and verify whole command rolls back.
- [ ] Emit `voice.command_executed`.
- [ ] Commit.

### Task 8: ASR adapters

Keep speech recognition separate from NLU:

```ts
interface AsrProvider {
  transcribe(audio: AudioChunk): AsyncIterable<TranscriptChunk>;
}
```

Support:

- browser speech where available,
- Vosk/local service,
- text input as guaranteed fallback.

- [ ] Adapter contract tests.
- [ ] Commit.

### Task 9: Voice UI and readback

Native global voice control shows:

```text
Listening
Understanding
Needs clarification
Review actions
Executed
```

Before confirmation, display concrete effects, e.g. “Marcar llegada de Carlos Pérez; añadir 3 tratamientos en 22; agendar endodoncia jueves 10:00; generar presupuesto”.

- [ ] Component test for confirmation.
- [ ] E2E complex command.
- [ ] Commit.

## Acceptance criteria

- LLM never writes directly.
- Duplicate patient names trigger clarification.
- Multi-action command is transactional.
- Voice and click flows call the same application services.
- Every execution is auditable with transcript digest and action list.
- Current V11 dental voice regression phrases remain covered.
