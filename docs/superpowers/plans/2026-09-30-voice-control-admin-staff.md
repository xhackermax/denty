# Voice Control Admin Staff Implementation Plan

**Goal:** Make Denty's voice bar a staff/admin-only global control layer that routes voice commands through the assistant tool registry, policy, and executor.

**Spec:** [Design](../specs/2026-09-30-voice-control-admin-staff-design.md). This is the original implementation scope; consult [current checkpoint](../../archive/stages/CHECKPOINT-STATUS.md) before reopening completed work.

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

## Tasks

### Task 1: Staff-Only Policy

Files: `src/features/assistant/tools/assistant-tool-registry.ts`, `src/features/assistant/tools/assistant-policy.ts`, `src/features/assistant/__tests__/roadmap-p2-policy.test.ts`.

`isInternalVoiceRole` permits ADMIN/DENTIST/ASSISTANT/RECEPTION; missing, unknown and PATIENT denied. `evaluateAssistantCall` checks role/permissions, tool, patient context and RED confirmation; backend stays authoritative.

### Task 2: Complete Local Voice To Tool Adaptation

Files: `src/features/assistant/tools/local-voice-adapter.ts`, `src/features/assistant/__tests__/local-voice-adapter.test.ts`.

`localVoicePlanToToolCalls` returns calls+unsupported. Map appointment.reschedule with patientId/dateText/optional time/duration/staff; no_show with patientId; navigation.open with destination. Keep schedule, lab.transition and unsupported clinical actions explicit until execution exists.

### Task 3: Centralized Voice Execution In The Bar

Files: `src/features/voice/voice-command-bar.tsx`, `src/features/assistant/tools/assistant-tool-executor.ts`, `src/features/voice/__tests__/voice-router.test.ts`, `src/features/assistant/__tests__/roadmap-p2-policy.test.ts`.

Voice bar uses adapter→policy→executeAssistantCalls, never direct legacy execution. Reject unsupported/BLOCK before mutation; RED remains pending until explicit confirm. YELLOW automatic only when unambiguous. Merge odontogram edits with existing entities/expected version; apply UI effects and invalidate queries.

### Task 4: Hide Voice For Patient Accounts

Files: `src/features/voice/voice-command-bar.tsx`, `src/features/voice/__tests__/voice-access.test.tsx`.

`useActiveTenant`: return null while loading or for non-internal role, with no enabled-control flash. Component tests cover all allowed roles, PATIENT, unknown and loading; user-facing errors remain non-technical.

### Task 5: Verification, Build, Push, Deploy

Targeted policy/adapter/NLU/router/access tests, typecheck and production build must pass. Push to xhackermax/denty main, deploy with `npx vercel --prod --yes`, and verify https://denty-repo.vercel.app/app returns unauthenticated redirect or authenticated response. Git push alone is not deployment verification.

## Verification

Use TDD for implementation changes; run tests beside the affected modules under `src/features/assistant/__tests__/`, Voice or Domain as applicable.

```bash
npm run typecheck
npm run architecture:check
npm test
npm run build
```

A production build and any required authenticated LIVE checks must pass before claiming release readiness.
