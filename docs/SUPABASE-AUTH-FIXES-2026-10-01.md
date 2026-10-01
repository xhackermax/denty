# Supabase Auth and protected routes — 2026-10-01

Base: xhackermax/denty, main f10ad01ec35c22a5b42107d5feb29ce6f58a8106.
Supabase project: awdqomgbxygtflkwggqb (denty, eu-west-1).

## Changes

- Preserve refreshed session cookies on both the browser response and downstream page request.
- Fail closed with a controlled 503 when the session service sends invalid JSON.
- Handle malformed cookie encoding without throwing a server error.
- Protect legacy /admin routes and canonical /app/clinic-contacts; the legacy contacts URL redirects to the canonical route.
- Initialize a request-scoped official Supabase SDK session before changing a password. The previous implementation failed with `Auth session missing!` because cookies are HttpOnly and SDK storage is disabled.
- Route contact operations through a validated server session, same-origin checks, an RPC allowlist, input validation, clinic scoping and the user's RLS token. No service-role client is used for ordinary contact operations.
- Fix contact lint errors, render-time browser credential access, missing navigation translation and unsupported PostgREST distinct calls.
- Correct the contacts migration's staff identity checks, nonexistent audit trigger and ambiguous SQL column references. Restrict direct table writes; RPCs validate clinic membership.
- Centralize document-template and paginated-patient query keys without changing their cache identities.
- Update stale structural regression checks for extracted camera, task and prescription components, canonical voice tools and the current patient-list animation. Preserve checks for server-derived identity and permissions.

## Applied remotely

The corrected `20261001090941_clinic_contacts.sql` migration was applied to Supabase. Its filename matches the remote migration history. Anonymous users cannot SELECT the table or execute the listing RPC. Auth email login is enabled; one confirmed user and one active ADMIN membership exist.

## Verification

- npm run typecheck: passed.
- npm run lint: passed, zero errors and warnings.
- npm test: 118 files, 994 tests passed.
- npm run build: passed.
- npm run gate:stage13: passed, including auth, RLS contracts, stages 1–13, historical regressions, API parity, architecture, Node 24, and payment security.
- Production-server HTTP check: /api/auth/session returns 401 without cookies; /app, /app/clinic-contacts, /admin/clinic-contacts and /patient/other redirect to login.
- New tests cover malformed cookies, malformed session responses, refreshed downstream cookies, protected admin routes, contact access isolation and actual SDK password update initialization.

The release check rejects generated tsconfig.tsbuildinfo files; the generated cache was removed before that check. It is excluded from the delivery bundle.

## Deployment and limits

The code has not been deployed to Vercel. The connected Vercel app denied access to this project. The existing website therefore does not yet contain these code changes.

A real login, authenticated browser navigation and password change against the live user were not exercised: no user credentials were available. Tests exercise those SDK/session paths using controlled fixtures; they do not prove live end-to-end behavior.

Configure SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY on the hosting environment. User administration also needs SUPABASE_SECRET_KEY (server only); no secret or password is included in this bundle. Preserve existing valid hosting environment variables.

The existing self-service email recovery flow is outside this patch: /api/auth/reset-password still returns 410; a full secure recovery-link callback needs a separate implementation and live verification.

Supabase advisors still report callable SECURITY DEFINER RPCs (intentional for the application's guarded transaction API), the inaccessible legacy_identity_map table without policies, and disabled leaked-password protection. These are not claimed as remediated by this patch. Leaked-password protection is an Auth dashboard setting unavailable through the selected tools:
https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

Review RPC-specific advisories here:
https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
