# Oye Denty Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved Oye Denty assistant as five independently testable increments: assistant foundation, Realtime conversation, per-dentist learning, silent proactivity, and production hardening.

**Architecture:** The project keeps the current local NLU as a deterministic fast path and adds a provider-neutral assistant core. Realtime is an optional conversational layer that can only invoke typed Denty tools. Learning and proactive behavior consume normalized execution events, never raw patient histories, and the final hardening phase makes sensitive execution authoritative on the server boundary.

**Tech Stack:** Next.js 16.3.5, React 19.3.0, TypeScript 5.9.3, Zod 4.6.5, Mantine 9.6.1, Vitest 5.0.1, Playwright 1.63.0, Porcupine Web 4.0.1, Web Voice Processor 4.0.10, OpenAI Realtime GA with `gpt-realtime-2.1-mini` default.

**Spec:** `docs/superpowers/specs/2026-09-25-oye-denty-assistant-design.md`

## Global Constraints

- Implement the five plans in order; do not start a later plan while the previous plan’s acceptance gate is red.
- Preserve all existing local NLU, patient-resolution, odontogram, agenda, budget-signature and Vercel deployment regressions.
- `Asistente activo` is explicit opt-in and wake listening only runs while Denty is visible.
- Standard OpenAI credentials remain server-only.
- Assistant learning is per dentist after exactly three valid, uncorrected evidences and activates silently.
- Proactivity is notification-first and never opens voice by itself.
- No assistant module persists patient/learning data in browser storage.
- Red actions require explicit confirmation; production hardening makes their server boundary authoritative.
- The core Denty app remains usable when wake word, OpenAI, audio permission, or network is unavailable.

## Review Focus

- Cross-plan interfaces must stay stable: tool names/schemas defined in Plan 01 are the same names exposed to Realtime, learning, proactivity and audit.
- No later plan may bypass the Plan 01 risk policy to “make AI work”.
- Learning/proactivity must consume normalized events, not raw transcripts or patient records.
- Realtime model/API defaults must remain on the current 2.1 family rather than deprecated legacy aliases.
- Every phase must pass `npm run build` before the next phase begins.

---

## Execution Order

### Plan 01 — Foundation

Path: `docs/superpowers/plans/2026-09-25-oye-denty-01-foundation.md`

Deliverable: `Asistente activo`, assistant state machine, visibility pause, common typed tool registry/policy, local NLU adapter, local “Oye Denty” engine, manual-mic fallback.

- [ ] Implement all Plan 01 tasks with TDD.
- [ ] Run Plan 01 acceptance gate.
- [ ] Review tool schemas and risk levels before proceeding.

### Plan 02 — Realtime

Path: `docs/superpowers/plans/2026-09-25-oye-denty-02-realtime.md`

Deliverable: authenticated ephemeral OpenAI sessions, WebRTC conversation, 45-second context window, function calling through Denty tools, local-vs-AI routing, graceful local fallback.

- [ ] Implement all Plan 02 tasks with TDD.
- [ ] Run Plan 02 acceptance gate.
- [ ] Perform Vercel Preview microphone/WebRTC smoke test before proceeding.

### Plan 03 — Learning

Path: `docs/superpowers/plans/2026-09-25-oye-denty-03-learning.md`

Deliverable: per-dentist memory, silent three-evidence activation, correction decay, learnable-field whitelist, `Ajustes > Denty AI > Mi aprendizaje`.

- [ ] Implement all Plan 03 tasks with TDD.
- [ ] Run Plan 03 acceptance gate.
- [ ] Verify two dentist accounts remain isolated before proceeding.

### Plan 04 — Proactivity

Path: `docs/superpowers/plans/2026-09-25-oye-denty-04-proactivity.md`

Deliverable: six deterministic proactive rule families integrated into silent Denty notifications with `Ver`, `Preparar`, `Descartar`.

- [ ] Implement all Plan 04 tasks with TDD.
- [ ] Run Plan 04 acceptance gate.
- [ ] Verify no proactive module starts Realtime/audio before proceeding.

### Plan 05 — Hardening

Path: `docs/superpowers/plans/2026-09-25-oye-denty-05-hardening.md`

Deliverable: authoritative server execution for sensitive tools, single-use confirmation tokens, redacted audit, rate/cost controls, concurrency handling, failure matrix, Playwright coverage, production operations guide.

- [ ] Implement all Plan 05 tasks with TDD.
- [ ] Run complete release matrix.
- [ ] Produce a Vercel-ready ZIP only after the production build and assistant E2E gates are green.

## Cross-Plan Interface Lock

These names are shared contracts and require an explicit reviewed migration if changed:

```ts
export type AssistantRisk = "GREEN" | "YELLOW" | "RED";
export type AssistantSource = "LOCAL_NLU" | "REALTIME" | "PROACTIVE";

export interface AssistantToolCall<TArgs = unknown> {
  id: string;
  name: string;
  args: TArgs;
  source: AssistantSource;
}

export type AssistantToolResult =
  | { ok: true; summary: string; effect?: AssistantExecutionEffect; undoToken?: string }
  | { ok: false; code: "VALIDATION" | "PERMISSION" | "CONFLICT" | "NETWORK" | "CANCELLED"; message: string };
```

Initial stable tool names:

```text
navigation.open
navigation.patient
patient.search
patient.summary
odontogram.select_tooth
odontogram.set_state
odontogram.set_surfaces
odontogram.bridge
odontogram.removable
periodontal.update
clinical.add_item
clinical.complete_item
clinical.mark_unsatisfactory
clinical.add_dependency
clinical.note
appointment.schedule
appointment.reschedule
appointment.arrive
appointment.no_show
budget.sync
budget.open
budget.prepare_signature
payment.prepare
payment.record
lab.transition
```

Plan 01 may initially execute only the currently supported subset, but the registry must reserve these names and Plans 02/05 add the missing executors without renaming the contract.

## Self-Review Result

- Spec coverage: every approved requirement is assigned to at least one of the five plans.
- Placeholder scan: no unresolved implementation markers remain.
- Type consistency: `AssistantToolCall`, `AssistantRisk`, `AssistantSource`, `AssistantToolResult`, `LearningScope`, and the five assistant states/risk boundaries use the same names across plans.
- Review Focus coverage: each master failure mode has a concrete test in the owning plan.
- External dependency note: local wake-word detection requires the custom Spanish `Oye Denty` Web WASM model and a Picovoice AccessKey; Realtime requires server-side `OPENAI_API_KEY`. Both degrade safely when unavailable.
