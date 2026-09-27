# Denty Payments Multiprovider Integration Spec

**Date:** 2026-09-27  
**Status:** Approved design, implementation pending  
**Target:** Denty Node 24 / Next.js / Supabase

## Goal
Integrate Manual + SumUp + Stripe Terminal behind one secure Denty payment flow. Denty's payment ledger remains authoritative.

## Architecture
The UI uses a provider-neutral service. Provider adapters own provider-specific calls. A durable payment attempt is created before execution with an idempotency key. Only a server-verified `succeeded` attempt may post to the Denty ledger.

## Invariants
1. Starting terminal processing never means paid.
2. Persist provider transaction ID and normalized status.
3. Same idempotency key cannot create duplicate charges or ledger postings.
4. Validate amount, currency, clinic, patient and intent server-side.
5. Never trust browser role, clinic or provider configuration for authorization.
6. Provider secrets are server-only.
7. Refund/reversal actions are permission-gated and audited.
8. Payment completion updates patient balance/history through one ledger path.
9. Failed/cancelled attempts do not alter the financial ledger.
10. Target Node 24.x.

## Data model
- `clinic_payment_settings`: enabled provider and non-secret clinic configuration.
- `payment_attempts`: lifecycle, idempotency key, provider reference, clinic/patient, amount/currency and error metadata.
- Existing payment ledger: authoritative completed financial postings.
- Existing audit facilities: payment lifecycle events.

## Lifecycle
`created -> processing -> requires_action -> succeeded`, with terminal branches `failed | cancelled | expired`. Only `succeeded` posts to the ledger.

## Providers
- **Manual:** authorized staff confirms an externally completed payment.
- **SumUp:** server creates/checks checkout and normalizes the result.
- **Stripe Terminal:** Stripe Node SDK stays server-side; Denty exposes normalized state.

## Security
Supabase identity, clinic membership and permissions are verified server-side and with RLS. Cross-clinic access is rejected. Provider secrets never enter browser bundles. Sensitive raw provider payloads are not copied into audit logs.

## UX
Cobrar shows only enabled providers. Processing, action-required, success, failure and retry are explicit. Successful payment immediately appears in patient history with date, amount, method and appropriate provider reference.

## Verification
Provider contracts, idempotency, failed-payment ledger isolation, cross-clinic authorization, secret leak checks, P0-P4 checks, architecture, typecheck, lint, tests, Next build and Node 24 release gate.
