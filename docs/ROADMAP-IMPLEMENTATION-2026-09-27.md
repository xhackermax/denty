# Denty roadmap implementation — 2026-09-27

## Implemented in this increment
- Appointment lifecycle domain state machine with operational timestamps and waiting/chair metrics.
- Pure availability engine that rejects busy and blocked intervals and limits offered slots.
- Treatment scheduling gate requiring signed budget and all required consents.
- Payment ledger primitive for partial payments and overpayment prevention.
- Deterministic document-export manifest that excludes previous export bundles.
- P1 database migration for appointment blocks, payment allocations and patient recalls with RLS.
- Structural verifier and focused domain contract tests.

## Architecture decisions
- Domain rules remain pure and framework-independent.
- Authorization remains server/database enforced; UI permissions are not a security boundary.
- Rebooking must be revalidated and committed atomically on the server/database layer before production use.
- Export PDF rendering stays outside the domain; the domain owns selection/integrity manifest semantics.
- Realtime is a projection/notification mechanism, not the source of truth.

## Still intentionally future work
- Provider-backed notification delivery (SMS/WhatsApp/email).
- Production payment-provider adapter and webhook reconciliation.
- Remote signatures and legally qualified workflows where applicable.
- Radiographic AI and fiscal integrations.

## P2 assistant safety increment
- Added explicit assistant tools for rescheduling, no-show, document export and recalls.
- Unknown tools are fail-closed.
- Patient-scoped tools are blocked without an active patient context.
- Consequential RED actions require explicit confirmation.
- The assistant remains an action interface over deterministic domain services rather than a source of clinical truth.
