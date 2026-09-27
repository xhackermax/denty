# Denty Payments Multiprovider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Manual + SumUp + Stripe Terminal through one provider-neutral payment flow that posts to Denty's ledger only after verified success.

**Architecture:** Keep provider adapters isolated behind normalized server contracts. Add durable attempt/idempotency state in Supabase and route all successful payments through one ledger-posting path with server-side authorization.

**Tech Stack:** Node 24.x, Next.js 16, TypeScript, Stripe Node SDK, Supabase PostgreSQL/RLS, existing Denty domain/pipeline.

**Spec:** `docs/superpowers/specs/2026-09-27-denty-payments-multiprovider.md`

## Global Constraints
- Node `24.x`.
- Provider secrets server-only.
- Denty ledger authoritative.
- No payment completion before provider success verification.
- RLS + server authorization mandatory.
- Existing P0-P4 behavior stays green.
- No mock success states.

## Review Focus
- Duplicate submit/retry => one charge and one ledger posting.
- Timeout after provider success => safe reconciliation, never double charge.
- Cross-clinic payment IDs => inaccessible.
- Failed/cancelled payment => patient balance unchanged.
- Browser bundles/logs => no provider credentials.

---

### Task 1: Normalize provider contract and lifecycle
**Files:** `src/domain/payment-providers.ts`, `src/features/payments/payment-provider-config.ts`, test `src/domain/__tests__/payment-providers.test.ts`.
- [ ] Write failing lifecycle/provider normalization tests.
- [ ] Run focused test and confirm failure.
- [ ] Implement normalized provider IDs/statuses and transition guard.
- [ ] Run focused tests to PASS.
- [ ] Commit `feat(payments): normalize provider lifecycle`.

### Task 2: Durable attempts, idempotency and RLS
**Files:** migration `supabase/migrations/20260927210000_payment_providers.sql`, create `src/server/payments/payment-attempts.ts`, test `scripts/payments/payment-attempt-contract.test.mjs`.
- [ ] Add failing schema/idempotency/RLS checks.
- [ ] Run and confirm failure.
- [ ] Add payment-attempt persistence, unique idempotency semantics and policies.
- [ ] Implement `createOrGetPaymentAttempt` and `markPaymentAttempt`.
- [ ] Re-run to PASS.
- [ ] Commit `feat(payments): persist idempotent payment attempts`.

### Task 3: Harden Manual, SumUp and Stripe adapters
**Files:** existing manual/SumUp/Stripe routes plus `src/server/payments/stripe-client.ts`, `stripe-terminal.ts`, `_sumup.ts`; test `scripts/payments/provider-adapters-contract.test.mjs`.
- [ ] Add failing validation/status/secret-isolation contracts.
- [ ] Run and confirm failure.
- [ ] Refactor adapters to common contract.
- [ ] Normalize provider errors without leaking sensitive payloads.
- [ ] Run to PASS.
- [ ] Commit `feat(payments): harden provider adapters`.

### Task 4: Single authoritative ledger posting
**Files:** `src/domain/payment-ledger.ts`, create `src/server/payments/post-payment.ts`, test `src/domain/__tests__/payment-ledger-provider.test.ts`.
- [ ] Write failing tests proving non-success cannot post and repeated success posts once.
- [ ] Run and confirm failure.
- [ ] Implement `postSucceededPayment(attemptId)` with audit linkage.
- [ ] Run to PASS.
- [ ] Commit `feat(payments): post verified payments once`.

### Task 5: Connect Cobrar UI and patient history
**Files:** existing Cobrar UI discovered under `src/features`/`src/app`, `src/features/payments/card-terminal.ts`, relevant UI tests.
- [ ] Locate current Cobrar flow and add failing provider-state tests.
- [ ] Run and confirm failure.
- [ ] Connect clinic-enabled providers and normalized states.
- [ ] Success refreshes balance/history; failure does not.
- [ ] Run to PASS.
- [ ] Commit `feat(payments): connect multiprovider cobrar flow`.

### Task 6: Reconciliation and recovery
**Files:** existing P3/P4 reconciliation code, create `src/server/payments/reconcile-provider-payment.ts`, test `scripts/payments/reconciliation-contract.test.mjs`.
- [ ] Add failing timeout-after-success and already-posted recovery tests.
- [ ] Run and confirm failure.
- [ ] Implement provider-reference reconciliation + idempotent posting.
- [ ] Run to PASS.
- [ ] Commit `feat(payments): reconcile interrupted provider payments`.

### Task 7: Security and release gate
**Files:** payment verifier scripts, create `scripts/payments/verify-payment-security.mjs`, update `package.json` and release docs.
- [ ] Check public secret names, RLS, idempotency, routes and ledger isolation.
- [ ] Run payment gates.
- [ ] Run `npm run architecture:check`, `npm run roadmap:p3`, `npm run roadmap:p4`.
- [ ] Under Node 24 run typecheck, lint, tests, build and `node24:check`.
- [ ] Fix every regression and repeat until green.
- [ ] Commit `test(payments): gate multiprovider release`.
