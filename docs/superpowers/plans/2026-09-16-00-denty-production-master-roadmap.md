# Denty Production Master Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Denty V11 into a server-authoritative, multi-user, auditable clinic platform while preserving the validated clinical behavior of the legacy preview.

**Architecture:** Fastify becomes the single write boundary; Prisma/SQLite is the first authoritative clinic database; React/Next modules migrate incrementally to API-backed features; all mutations use permissions, optimistic concurrency, audit and domain outbox events.

**Tech Stack:** pnpm 9, TypeScript 5.7, Next.js 15, React 19, Fastify 5, Zod 3, Prisma, SQLite first, TanStack Query 5, Zustand only for UI state, Vitest, Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-16-denty-production-platform-design.md`

## Global Constraints

- Never use browser `localStorage` as authoritative production clinical storage.
- Keep `apps/legacy-preview` available under `/legacy` until native feature parity is verified.
- Money persists as integer cents.
- Every meaningful mutation writes audit + domain outbox in the same DB transaction.
- Every mutable API update uses optimistic `version` checks.
- Server authorization is mandatory even when the UI hides a feature.
- Clinical alternative selection always requires clinician approval.
- Issued invoices and signed documents are immutable.
- No automatic deletion of clinical records for privacy requests.
- Follow TDD: failing test, verify failure, minimal implementation, verify green, then refactor.
- Run `pnpm typecheck`, `pnpm test`, and retained `pnpm legacy:test` at every migration checkpoint.

---

## Execution order

The user's original list contains twelve major workstreams: the unnumbered backend/database foundation plus eleven numbered areas. They should not be executed in the order they were written because several depend on shared foundations.

### Wave A — foundation

1. `01-backend-database-multiuser.md`
2. `02-auth-permissions.md`
3. Start the server-side baseline portions of `12-security-backup-audit.md`

**Exit:** server-authoritative identity, patients and agenda primitives; sessions; permissions; audit; concurrency; event stream.

### Wave B — native application shell and core operations

4. `03-react-next-migration.md`
5. `10-agenda-v12.md`

**Exit:** staff can log in, manage patients and work the daily agenda on multiple devices without relying on legacy localStorage.

### Wave C — clinical source of truth

6. `07-odontogram-v3.md`
7. `06-treatment-plan-v2.md`
8. `05-voice-operating-system.md`

**Exit:** odontogram, treatment plan and voice share typed server-backed clinical commands and data.

### Wave D — documents, patient access and finance

9. `09-documents-signatures.md`
10. `08-real-patient-portal.md`
11. `04-billing-verifactu.md`

**Exit:** secure remote patient workflows, immutable documents and production-grade billing core.

### Wave E — laboratory + hardening

12. `11-laboratory-prosthetics.md`
13. Complete `12-security-backup-audit.md`

**Exit:** lab lifecycle is linked to treatment and agenda; backup/restore and security gates are production-ready.

## Cross-module interfaces that must remain stable

### ActorContext

```ts
export interface ActorContext {
  userId: string;
  clinicId: string;
  role: Role;
  staffId?: string;
  patientId?: string;
  permissions: Permission[];
  sessionId: string;
}
```

### Mutation command metadata

```ts
export interface CommandMeta {
  actor: ActorContext;
  correlationId: string;
  idempotencyKey?: string;
  expectedVersion?: number;
  source: "web" | "voice" | "patient_portal" | "system";
}
```

### Domain event

```ts
export interface DomainEvent<T = unknown> {
  id: string;
  clinicId: string;
  type: string;
  entityType: string;
  entityId: string;
  occurredAt: string;
  actorUserId?: string;
  correlationId: string;
  payload: T;
}
```

### API conflict response

```json
{
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "El registro ha cambiado en otro dispositivo.",
    "correlationId": "..."
  },
  "current": {}
}
```

## Feature parity rule

Before removing a legacy feature from the main flow, create a parity test matrix:

| Legacy behavior | Native route | API endpoint | Native test | Status |
|---|---|---|---|---|

Do not delete the legacy code merely because a new screen exists.

## Analytics hooks

Do not build the `Análisis` dashboard in these plans, but every new module must emit traceable events. At minimum preserve fields needed to compute:

- production by doctor/treatment/site,
- invoice and payment totals,
- no-show opportunity loss,
- rework count and cost,
- lab cost,
- material/supplier cost when the purchasing module arrives,
- appointment chair time and waiting time.

This prevents later analytics from relying on fragile inference.

## Completion command set

At the end of every plan:

```bash
pnpm typecheck
pnpm test
pnpm legacy:test
```

When Playwright is introduced:

```bash
pnpm --filter @denty/web test:e2e
```

## Recommended Codex execution pattern

Execute one plan at a time in a git worktree. Do not dispatch workstreams that edit the Prisma schema in parallel. After each database migration, regenerate Prisma client, run migration tests, commit, then allow dependent tasks to begin.
