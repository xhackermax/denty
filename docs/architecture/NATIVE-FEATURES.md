# Denty Native Feature Architecture

Denty production UI is the native Next.js/React application under `apps/web/src/app/app` and `apps/web/src/features`. `/legacy` is a temporary behavior reference only.

## State ownership

- **TanStack Query** owns all server/remote state. Queries are invalidated by server events rather than mirrored into component state.
- **Zustand** may be used only for ephemeral UI state such as a selected panel, drawer, temporary wizard state or unsaved display preferences.
- React local state is appropriate for local form fields before submission.
- The database/API is authoritative. Native features must never use `localStorage` as clinical source of truth.

## Feature boundary

A native feature may use shared API/domain/contracts packages, but **must not import from `apps/legacy-preview`**, `app.js`, `logic.js`, or generated legacy bundles. Business rules belong in `packages/domain`; HTTP composition belongs in `apps/api`; React components render data and issue application commands.

Preferred shape:

```text
features/<feature>/
  api.ts
  queries.ts
  components/
  forms/
  types.ts
  __tests__/
```

Small features may start in one file, but must keep the same dependency direction.

## Concurrency and realtime

Mutations that modify versioned clinical/operational records send the current version. HTTP 409 means the UI refetches and presents the authoritative record instead of silently overwriting it. SSE/outbox events invalidate the relevant TanStack Query keys.

## Migration rule

A production navigation link moves from legacy to native only when its row in `docs/qa/FEATURE-PARITY.md` has test evidence. `/legacy` stays available until the final migrated feature is verified.
