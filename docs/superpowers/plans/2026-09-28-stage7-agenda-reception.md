# Stage 7 Agenda, Reception, No-show and Waiting Room Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make appointments, reception state, availability, absences, recalls and waitlist fully Supabase-native and transaction-safe.

**Architecture:** Keep the existing Stage 2 `transition_appointment` RPC as the canonical transition boundary and extend it. Add one Stage 7 migration for scheduling invariants and operational tables, one `AgendaRepository` for Supabase access, and route-handler coverage for the browser API already present. Realtime invalidates canonical queries from private clinic broadcasts.

**Tech Stack:** Next.js 16, TypeScript, Supabase/Postgres, PostgREST, Supabase Realtime, TanStack Query.

**Spec:** `docs/archive/inventories/stage6/DENTY-INVENTARIO-MAESTRO-TOTAL-2026-09-28.md` section “Etapa 7”.

## Global Constraints

- Do not recreate `transition_appointment`; extend it.
- No localStorage/demo state for canonical appointment, absence, waitlist or scheduling settings.
- Double-booking protection must live in PostgreSQL.
- Existing Stage 1–6.1 contracts must remain green.
- Node 24 is the release runtime; this workspace currently runs Node 22, so full release certification remains LIVE-only.

## Review Focus

- Overlapping appointments for the same staff member and cabinet.
- Updating an appointment into a conflicting interval.
- Invalid reception status jumps or stale expectedVersion.
- Absence overlapping an existing/new appointment.
- Repeated NO_SHOW requests creating duplicate recalls.

---

### Task 1: Canonical scheduling database boundary

**Files:**
- Create: `supabase/migrations/20260928070000_stage7_agenda_reception.sql`
- Test: `scripts/stage7-agenda-contract.test.mjs`

**Interfaces:**
- Produces RPCs `book_appointment`, `update_appointment`, extended `transition_appointment`, `agenda_availability`, `mark_no_show`, and `analytics_wait_times`.
- Produces tables `staff_absences`, `staff_schedules`, `clinic_settings`, `staff_settings`, `patient_waitlist_requests`, `appointment_requests`.

- [ ] Write the failing Stage 7 DB contract test.
- [ ] Run it and observe failure because the Stage 7 migration is absent.
- [ ] Implement the migration with exclusion constraints, RLS, audit/realtime triggers and RPCs.
- [ ] Run the contract test to green.

### Task 2: Supabase agenda repository and routes

**Files:**
- Create: `src/server/denty-supabase/agenda-repository.ts`
- Modify: `src/server/denty-supabase/route-handler.ts`
- Modify: `src/shared/api/contracts.ts`
- Modify: `src/shared/api/schemas/agenda.ts`
- Modify: `src/shared/api/resources/agenda.ts`
- Test: `scripts/stage7-agenda-runtime-contract.test.mjs`

**Interfaces:**
- Consumes Stage 7 RPCs and tables.
- Produces canonical handlers for `/api/appointments`, `/api/agenda/context`, `/api/agenda/availability`, `/api/agenda/waitlist`, `/api/agenda/settings`, and attendance absences.

- [ ] Write failing route/repository contract tests.
- [ ] Run RED.
- [ ] Implement repository and handler routes.
- [ ] Run GREEN.

### Task 3: Realtime reception and lifecycle state

**Files:**
- Modify: `src/shared/query/realtime-bridge.tsx`
- Modify: `src/shared/query/keys.ts`
- Modify: `src/features/agenda/agenda-data.ts`
- Modify: `src/features/agenda/agenda-page.tsx`
- Test: `scripts/stage7-realtime-ui-contract.test.mjs`

**Interfaces:**
- Consumes clinic private Broadcast events emitted by database triggers.
- Invalidates appointment/staff/analytics queries and exposes ARRIVED → WAITING → IN_CHAIR → COMPLETED.

- [ ] Write failing realtime/UI contract test.
- [ ] Run RED.
- [ ] Implement realtime invalidations and WAITING transition support.
- [ ] Run GREEN.

### Task 4: Settings, no-show, absences and waitlist

**Files:**
- Modify: `src/features/agenda/agenda-page.tsx`
- Modify: `src/features/parity/modules/attendance-module.tsx`
- Modify: shared API schemas/resources as required.
- Test: Stage 7 contract/runtime tests.

**Interfaces:**
- Scheduling gap comes from Supabase settings.
- NO_SHOW is idempotently coupled to recall creation.
- Staff absences block availability.
- Patient waitlist requests persist in DB.

- [ ] Add failing assertions for persisted settings/absence/waitlist/no-show behavior.
- [ ] Run RED.
- [ ] Wire UI/API to Stage 7 repository.
- [ ] Run GREEN.

### Task 5: Metrics, inventory and gates

**Files:**
- Modify: `docs/archive/inventories/stage6/DENTY-INVENTARIO-MAESTRO-TOTAL-2026-09-28.md`
- Modify: `docs/archive/inventories/stage6/DENTY-INVENTARIO-MAESTRO-TOTAL-2026-09-28.json`
- Create: `docs/archive/stages/STAGE7-HANDOFF-2026-09-28.md`
- Create: `docs/archive/stages/STAGE7-PENDING-FINDINGS-2026-09-28.md`
- Modify: `package.json`

**Interfaces:**
- `analytics_wait_times` is the DB projection for waiting/chair/punctuality KPIs.
- Inventory marks code-closed items separately from LIVE validation.

- [ ] Add Stage 7 npm gate.
- [ ] Run Stage 1–7 contracts, architecture, API parity and pipeline self-check.
- [ ] Record any LIVE-only validation without reclassifying it as unimplemented code.
- [ ] Package Stage 7 ZIP and updated inventory ZIP.
