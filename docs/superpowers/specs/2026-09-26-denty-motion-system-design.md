# Denty Motion System 1.0 — Design Specification

Date: 2026-09-26. Original status: design approved in principle; written-spec review required before implementation.

## Goal and stack

Motion communicates focus, hierarchy, progress and object continuity while keeping clinical work calm.
Use existing Next.js/React 19, Mantine 9.6.1, CSS Modules and `motion@13.4.0` / `motion/react`.
React Bits is an interaction reference, not another animation framework.

## Tokens and intensity

| Token              | Timing/use                                     |
| ------------------ | ---------------------------------------------- |
| `instant`          | 90–120 ms; press/check/icon feedback           |
| `fast`             | 150–180 ms; tabs, menus, filters and statuses  |
| `panel`            | 200–240 ms; drawers, modals and command center |
| `spatialSpring`    | Controlled drag, shared layout and reordering  |
| `expressiveSpring` | Analysis and non-clinical highlights only      |

- `subtle`: clinical operation; `normal`: shell, patients and routine cards; `expressive`: analysis, portal and onboarding.
- Odontogram, periodontogram, prescriptions, signatures, payments, forms and notes never inherit expressive effects.
- Press scale ≈0.98; routine desktop hover lift ≤1 px. Avoid bouncy/cartoon springs in clinical work.

## Shared subsystem

Under `src/shared/motion/`, keep tokens/provider and reusable primitives:

| Component                                   | Responsibility                                                            |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| `motion-tokens.ts`                          | Durations, easing, springs, distances and intensity presets               |
| `motion-provider.tsx`                       | Denty reduced-motion and intensity settings; reuse Mantine theme behavior |
| `motion-page.tsx`                           | Fade + 6–8 px entrance; do not repeatedly animate long pages              |
| `motion-pressable.tsx`                      | Shared tactile press/hover behavior                                       |
| `motion-list.tsx`                           | Insertion, removal, reordering and focus continuity                       |
| `motion-tabs.tsx`                           | Shared-layout active indicator                                            |
| `motion-status.tsx`                         | Saved/completed/arrived/in-chair feedback                                 |
| `motion-carousel.tsx`                       | Snap/drag, center emphasis and reduced-motion fallback                    |
| `motion-parallax.tsx`                       | Only subtle and expressive semantic modes                                 |
| `motion-scroll-reveal.tsx`                  | One-time viewport entrance                                                |
| `motion-scroll-stack.tsx`                   | Analytical/onboarding narratives, never clinical forms                    |
| `motion-metric.tsx` / `speeding-metric.tsx` | Opt-in number motion; stronger treatment only for protagonist KPIs        |
| `animated-graph.tsx`                        | One-time bar/line/chart reveal                                            |

## Interaction requirements

| Surface                       | Behavior                                                                                                                                           |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sidebar/mobile navigation     | Active rail/capsule moves with `layoutId`; route state remains clear with motion disabled.                                                         |
| Command center                | `⌘K`/`Ctrl+K`, mobile and mic entry; expand from trigger, short result stagger, shared selection; no-results may offer Oye Denty.                  |
| Assistant                     | Idle still; listening soft ripple; understanding subtle breathing; executing short deterministic feedback. No permanent 3D orb.                    |
| Patients                      | Preserve carousel; center scale 1, adjacent ≈0.96–0.98; local avatar/name/card continuity into detail. No theatrical route morphing.               |
| Agenda                        | Held appointment lifts 2–3 px, scales 1.01–1.015 and gains shadow; time/doctor/destination stay traceable. Controlled release and status movement. |
| Odontogram                    | Optional single tooth breath `1 → 1.025 → 1`, selection outline and contextual controls; animate the changed state, not a looping tooth.           |
| Clinical tabs                 | Shared sliding indicator; preserve useful existing wheel/tab scrolling.                                                                            |
| Alerts/lab/tasks/waiting room | Slide/fade/press/collapse; retain focus. Swipe dismiss only if safe and reversible.                                                                |
| Dashboard/analysis            | Numbers, bars, lines and cards reveal once on meaningful viewport entry, not on every scroll movement.                                             |

Primary targets: `src/app/_components/shell/app-shell.tsx`, Patients, Agenda and Odontogram workspaces and their CSS Modules.

## Metrics, carousel and scroll

- `SpeedingMetric` only for major revenue/growth/patient/target/occupancy figures, not small counts or badges.
- Animate once per section/session context; preserve prefixes, suffixes, decimals and thousands; final value stays legible.
- Reduced motion displays final values immediately.
- Carousel supports snap/drag and subtle depth; optional desktop wheel must not hijack page scroll; loop only when sensible for the data.
- Carousel can serve lab work, images, mobile dashboard and portal education; no holographic/lenticular effects in clinical workflows.
- Subtle parallax uses small offsets for non-critical cards/images; expressive reserved for analysis, portal, onboarding or future marketing.
- One-time Scroll Reveal for analytical/narrative sections. Scroll Stack may sequence revenue, patients, treatments, conversion, acquisition and targets.
- Pinning/stacking must preserve predictable keyboard/touch scrolling. Frame-driven masks only for special storytelling.

## Accessibility and performance

- Honor Mantine `respectReducedMotion` and `prefers-reduced-motion` in every primitive.
- Disabled animation preserves content, ARIA selection, focus and every interaction.
- Reduced motion uses immediate states/opacity and direct carousel snapping without depth/scale shifts.
- Prefer transform/opacity, viewport observation and stable layout; avoid heavy raw scroll handlers or high-frequency React renders.
- No WebGL dependency for the core system.
- No autoplay/looping clinical effects, strong parallax, full-screen zoom, spinning cards, particles, glitch, cursor trails or animated shader backgrounds.

## Implementation order

1. Tokens/provider, reduced motion, pressables, page transitions and indicators.
2. Command center, Oye Denty, shell navigation, tabs and filters.
3. Patient carousel/local continuity and agenda movement/status.
4. One-time dashboard/chart reveals, major KPIs and selective Scroll Stack.
5. Approved subtle parallax and lab/mobile/portal reuse.

## Verification and acceptance

- Unit/component: children usable without animation, deterministic reduced-motion final states, numeric formatting, ARIA and keyboard/focus continuity.
- Regressions: shell, carousel, clinical tabs, agenda state flow and voice entry points.
- Playwright desktop/mobile: navigation, touch drag/snap, reduced-motion emulation, command open/search/close, appointment continuity and metrics settling once.
- Accept when selections and changes are easier to follow, clinical work stays stable, reduced motion is complete and no second framework is introduced.
