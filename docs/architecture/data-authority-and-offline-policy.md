# Denty data authority and offline policy

## Status

This policy is binding for runtime code after Stage 3. Supabase/PostgreSQL is the canonical source of truth for identity, clinical records, scheduling, finance, documents, laboratory state, alerts, analytics inputs and operational configuration.

## What "local" means today

Denty is **online-first with local presentation caches**, not an offline-write clinical system.

Allowed browser-local state:

- transient React component state;
- React Query cache that can always be reconstructed from Supabase/API data;
- visual preferences such as color scheme and density.

Forbidden browser-local authority:

- patients, appointments or waiting-room state;
- odontograms, periodontal records or treatment plans;
- consents, prescriptions or clinical documents;
- invoices, payments, laboratory work or alerts;
- staff attendance, campaigns, communications or tenant configuration.

A network failure must surface as unavailable/stale data. It must never trigger a fallback to fixtures, a second backend, localStorage clinical data, or a silently writable in-memory substitute.

## Mutation rule

Every business mutation must reach the canonical backend and receive a confirmed result before the UI treats it as durable. Optimistic UI is allowed only when it can be rolled back and does not create a second source of truth.

Realtime invalidation is a projection mechanism, not persistence. Database changes are authoritative; Broadcast tells other clients which cached projections to refresh.

## Future offline-write mode

Offline clinical or financial writes are explicitly out of scope until Denty implements all of the following as one designed subsystem:

1. durable encrypted outbox with operation UUID/idempotency key;
2. entity version or server revision on every mutable aggregate;
3. deterministic conflict policy and a human-review path for irreconcilable conflicts;
4. ordered replay with dependency tracking;
5. server-side authorization/RLS re-evaluation on replay;
6. audit event for queued, accepted, rejected and conflicted operations;
7. deletion/retention rules for local encrypted data;
8. tests for multi-device and multi-clinic conflict scenarios.

Until that subsystem exists, no feature may describe itself as offline-capable merely because React Query or browser storage retains a copy.
