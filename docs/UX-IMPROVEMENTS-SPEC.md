# Denty UX improvements — discovery and implementation brief

## Purpose

Improve the day-to-day experience of the existing Denty web app through small,
verified changes to the clinic's core workflows. The goal is to make frequent
clinical and reception tasks clear, reachable, and reliable on desktop, tablet,
and phone without replacing working product patterns.

## Agreed direction

- Audit first; implement only problems supported by a reproducible observation,
  an accessibility issue, or a clear usability regression.
- Work incrementally across the dashboard, agenda, patient record, and mobile
  shell. Prioritize by user impact and frequency rather than redesigning every
  screen at once.
- Preserve the current Denty design system, Next.js/Mantine stack, role and
  tenant boundaries, and canonical API/Supabase data flow.
- Do not add product features, duplicate business logic, or decorative motion
  without a separately agreed need.
- Preserve existing local edits and skill files. Commit and push only the
  product changes explicitly authorized after reviewing the findings.

## In scope

1. Dashboard: hierarchy and access to today's work and high-frequency actions.
2. Agenda: finding, creating, and progressing appointments across its existing
   views and responsive layouts.
3. Patient record: reachability and clarity of common clinical actions.
4. Mobile shell: navigation, safe areas, touch interactions, and content fit
   where these affect the workflows above.
5. Motion and visual consistency only where they help comprehension,
   responsiveness, or accessibility.

## Out of scope

- Replacing the visual identity, component library, or application architecture.
- New clinical, financial, or administrative capabilities.
- Backend or schema changes unless a verified UX defect cannot be fixed at the
  existing API boundary; any such change needs a separate design approval.
- Removing existing functionality solely to simplify the UI.
- Treating browser emulation as proof of device-specific iOS/Android behavior.

## Discovery

Inspect existing UI, styles, data boundaries, permissions, and tests before
suggesting a change. Use the installed design and motion guidance to assess
frequency, visual hierarchy, touch behavior, reduced-motion preferences, and
worst-case data.

Exercise representative desktop, tablet, and phone widths, including a narrow
360 px viewport; light and dark appearance; keyboard navigation; empty and
single-result states; and realistic long names, descriptions, and amounts
bounded by the product's actual validation/schema limits. Record which results
are browser-verified and which require a physical device.

For each finding, record the affected flow, evidence/reproduction, impact and
frequency, proposed minimal fix, and a regression test. Do not create a
production UI toggle for test-only data.

## Implementation sequence

1. Produce and review the prioritized findings from discovery.
2. Implement the highest-impact, lowest-risk fixes in small, cohesive slices.
3. Add or update focused unit, accessibility, and browser regression coverage
   alongside each slice.
4. Re-run relevant tests, type checking, linting, and production build; inspect
   responsive states and reduced-motion behavior.
5. Report any device-only checks that still need physical hardware.

Do not begin implementation until the findings and slice order are reviewed.
Any finding that implies a new feature, a backend/schema change, or an
architecture change must be brought back for approval before coding.

## Acceptance criteria

- Every implemented change traces to a reviewed finding; no speculative
  redesign or unrelated cleanup is included.
- Core dashboard, agenda, and patient-record tasks remain available within
  existing permissions and use existing canonical data paths.
- No horizontal page overflow at the supported narrow-phone test viewport for
  the changed flows; long descriptions and monetary values remain legible.
- Interactive controls remain keyboard reachable and named, touch targets
  remain usable, and reduced-motion preferences are respected.
- Focused regression tests pass, followed by the repository's required checks
  for the affected files and build.
- The final report separates automated/browser evidence from checks requiring
  real hardware.
