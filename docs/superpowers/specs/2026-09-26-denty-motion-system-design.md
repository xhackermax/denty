# Denty Motion System 1.0 — Design Specification

Date: 2026-09-26
Status: Design approved in principle; implementation pending written-spec review

## 1. Goal

Denty should feel like a modern native clinical product rather than a static web ERP. Motion must communicate hierarchy, focus, state changes, progress and spatial relationships without distracting from clinical work.

The target feel is **Clinical Motion**:

- Apple/iOS 40%: restrained, spatial, tactile and fast.
- Linear 30%: calm, consistent and operationally focused.
- Raycast/Arc 20%: fast navigation, command-driven interaction and compact power-user behavior.
- React Bits 10%: selective visual character where it improves delight without reducing clarity.

The motion system must work across desktop and mobile, preserve accessibility, respect `prefers-reduced-motion`, and avoid introducing a second animation stack when the current project already has `motion@13.4.0` and uses `motion/react`.

## 2. Existing project constraints

The current project uses:

- Next.js / React 19
- Mantine 9.6.1
- CSS Modules
- `motion` 13.4.0
- Existing `motion/react` usage in `FloatingPanel` and Patients
- Mantine `respectReducedMotion: true`
- Existing reduced-motion handling in `FloatingPanel`
- Existing infinite patient carousel behavior in `PatientsPage`
- Existing shell navigation in `src/app/_components/shell/app-shell.tsx`
- Existing `HorizontalSnapNav` and odontogram clinical tab scrollers

React Bits Pro is therefore treated as a **pattern and interaction reference**, not as a parallel visual framework. Components that can be expressed cleanly with `motion/react`, Mantine and CSS Modules should be recreated in Denty-native components.

## 3. Core principles

### 3.1 Functional before decorative

Every recurring motion must answer at least one question:

- What did I just select?
- What changed?
- Where did this item move?
- What is loading or listening?
- What should I look at next?
- What relationship exists between these two surfaces?

Purely decorative motion is limited to analysis, portal, onboarding and marketing-like moments.

### 3.2 Clinical surfaces remain calm

The following areas must use only subtle or normal motion:

- Odontogram
- Periodontogram
- Prescriptions
- Consents and signatures
- Payments
- Forms
- Clinical notes
- Destructive or irreversible actions

No strong parallax, particle effects, looping shaders, glitch effects, cursor trails, spinning cards or persistent animated backgrounds are allowed in these workflows.

### 3.3 Spatial consistency

If an element visually persists between two UI states, Denty should prefer shared-layout motion over fade-out/fade-in. Examples include active navigation indicators, patient cards expanding into detail panels, tabs and selected filters.

### 3.4 Fast interaction

Frequent interactions must finish before they feel like animation for animation's sake.

Motion tokens:

- `instant`: 90–120 ms, press/check/icon feedback.
- `fast`: 150–180 ms, tabs, menus, filters, status changes.
- `panel`: 200–240 ms, drawers, modals, command center expansion.
- `spatialSpring`: drag, shared layout, card reordering, appointment movement.
- `expressiveSpring`: analysis and non-clinical hero moments only.

No bouncy/cartoon spring behavior in clinical work.

## 4. Motion architecture

Create a reusable subsystem under:

```text
src/shared/motion/
  motion-tokens.ts
  motion-provider.tsx
  motion-page.tsx
  motion-pressable.tsx
  motion-list.tsx
  motion-tabs.tsx
  motion-status.tsx
  motion-carousel.tsx
  motion-parallax.tsx
  motion-scroll-reveal.tsx
  motion-scroll-stack.tsx
  motion-metric.tsx
  speeding-metric.tsx
  animated-graph.tsx
  index.ts
```

### Responsibilities

**motion-tokens.ts**
Central durations, easing, spring parameters, distances and intensity presets.

**motion-provider.tsx**
Expose reduced-motion state and the selected motion intensity. It should not duplicate Mantine theme behavior; it should provide Denty-specific semantic settings.

**motion-page.tsx**
Consistent page/content entrance. Default: opacity + 6–8 px translation. Never animate entire long pages repeatedly during scroll.

**motion-pressable.tsx**
Shared button/card press behavior. Default pressed scale approximately 0.98. Desktop hover motion must remain minimal (`y: -1` or equivalent).

**motion-list.tsx**
Animate insertion, removal and reordering for alerts, lab work, tasks and waiting-room items.

**motion-tabs.tsx**
Shared-layout active indicator for tabs, filters and segmented controls.

**motion-status.tsx**
Small state-transition feedback for saved/completed/arrived/in-chair/etc.

**motion-carousel.tsx**
Reusable carousel behavior for patient cards, lab cards, mobile dashboard modules and image/content groups. Supports center emphasis, subtle depth and reduced-motion fallback.

**motion-parallax.tsx**
Two levels only: `subtle` and `expressive`. Clinical surfaces may only use `subtle` if at all.

**motion-scroll-reveal.tsx**
One-time viewport reveals for dashboard/analysis/portal sections.

**motion-scroll-stack.tsx**
Stacked-card scroll pattern for analysis/onboarding/dashboard narratives. Not for clinical forms.

**motion-metric.tsx / speeding-metric.tsx**
Large-number animation for analysis. `SpeedingMetric` must be opt-in and reserved for protagonist metrics.

**animated-graph.tsx**
One-time graph/bar/line reveal for analysis and dashboard figures.

## 5. Navigation motion

Target files:

- `src/app/_components/shell/app-shell.tsx`
- `src/app/_components/shell/app-shell.module.css`
- shared motion components

### Desktop sidebar

Replace abrupt active-background switching with a shared-layout active capsule/rail using `layoutId`.

Interaction:

- active indicator physically moves to the new route
- icon press gets a minimal tactile scale
- page content enters with 6–8 px translation + fade
- active state must still be fully understandable with animation disabled

### Mobile bottom navigation

Use the same spatial indicator language. Longer-term interaction direction may borrow from React Bits Mobile 3: a compact dock can expand into search/command behavior, but it must remain Denty-native.

## 6. Command Center + Oye Denty

This is one of the highest-priority motion features.

The current voice command interface should evolve toward a unified command center inspired by Raycast/Arc and React Bits command patterns.

Entry points:

- `⌘K` / `Ctrl+K`
- mobile command button
- Oye Denty / microphone action

Example commands:

- patient name
- record number
- “crear cita mañana”
- “hacer receta”
- “cobrar”
- tooth number such as “46” when relevant

Motion behavior:

- command surface expands from a compact trigger
- results enter with very short stagger
- selection indicator uses shared layout
- no-result state can transition into “Preguntar a Oye Denty”
- execution states remain compact and readable

Oye Denty visual states:

1. Idle: still.
2. Listening: soft wave/ripple.
3. Understanding: subtle breathing/thinking motion.
4. Executing: short deterministic transition.

The interface may borrow the visual language of Thinking Dots, Minimal Ripple or agent indicators, but not a permanently animated 3D orb.

## 7. Patients: carousel + shared motion

Target:

- `src/features/patients/patients-page.tsx`
- patient-related CSS/modules

The existing carousel behavior should be preserved and upgraded rather than replaced blindly.

### Carousel behavior

- active/center patient is visually dominant at scale 1
- adjacent cards may sit around 0.96–0.98 depending on viewport
- subtle opacity/depth difference is allowed
- scrolling/dragging feels physical but not elastic or toy-like
- reduced-motion mode removes scale/depth shifts and keeps direct snapping/navigation

### Shared motion into patient detail

Within the same interaction context, avatar, patient name and selected card may morph into a detail panel using `layoutId`.

Do not create large theatrical route-to-route transitions. Shared motion is for local continuity, not page spectacle.

## 8. Agenda motion

Target:

- `src/features/agenda/agenda-page.tsx`
- agenda styles

Agenda motion is spatial and functional.

When moving/dragging an appointment:

- lift approximately 2–3 px
- scale approximately 1.01–1.015
- stronger shadow while held
- destination/time/doctor change remains visually traceable
- dry, controlled spring on release

Status flow:

`Ha llegado → En sala/Gabinete → Finalizada`

must animate position/color/state without making the card pulse or bounce excessively.

If appointment reordering or doctor-column movement is added, layout transitions must preserve the user's visual tracking of the appointment.

## 9. Odontogram motion

Target:

- `src/features/odontogram/odontogram-workspace.tsx`
- `clinical-tabs.tsx`
- odontogram styles

Motion remains deliberately constrained.

### Tooth selection

On selection:

- optional single “breath” scale around `1 → 1.025 → 1`
- controlled outline/glow
- contextual controls can enter progressively

### Clinical state changes

When marking caries, crown, implant, endodontic state, etc., animate the actual state transition, not the whole tooth indefinitely.

The user must immediately perceive “this is what changed”.

### Tabs

Odontogram / Periodontics / Endodontics / Orthodontics and equivalent filters should use a shared sliding capsule/indicator rather than abrupt background replacement.

The existing infinite wheel/tab behavior should be retained where useful and visually upgraded.

## 10. Lists: alerts, laboratory, tasks, waiting room

Use Denty's equivalent of an Animated List.

Allowed recurring transitions:

- slide
- fade
- press
- controlled collapse on removal

Mobile-only swipe-to-dismiss can be considered where the underlying action is safe and reversible.

Avoid recurring blur/ripple/scale combinations that make operational lists feel unstable.

## 11. Dashboard and analysis motion

Dashboard should feel alive without becoming a marketing page.

### Data entrance

On first meaningful viewport entry:

- numbers count/reveal once
- bars grow once
- lines draw once
- cards reveal with restrained fade/translate

Do not restart a graph or number animation every time the user scrolls a few pixels.

### Large-number Speeding Text

`SpeedingMetric` is reserved for protagonist analysis numbers such as:

- annual/monthly revenue
- major growth percentage
- active patients total
- remaining target amount
- occupancy percentage
- similarly high-level KPI values

It must not be used for routine counts such as “4 citas”, “3 pendientes” or small badge values.

Rules:

- animate once per section entry/session context
- preserve prefix/suffix/decimal/thousands formatting
- blur/speed effect remains short and legible
- reduced-motion renders the final value immediately
- never obscure the final number or delay decision-making

## 12. Carousel system

Carousel is a first-class Denty motion pattern, not only a Patients feature.

Good uses:

- patient cards
- laboratory jobs
- clinical images where comparison is useful
- mobile dashboard modules
- portal/patient educational content

Behavior:

- snap/drag
- center emphasis
- subtle side-depth
- optional wheel support on desktop where it does not conflict with page scroll
- optional loop only when the data model makes repeated cycling intuitive

Avoid lenticular, holographic or strong refractive carousel effects in staff clinical workflows.

## 13. Parallax system

Two semantic modes:

### `subtle`

Small relative offset between primary and secondary visual layers. Appropriate for:

- patient cards
- dashboard illustration/icon accents
- portal cards
- non-critical image presentations

Magnitude should be low enough that the user perceives depth rather than “the screen is moving”.

### `expressive`

Reserved for:

- analysis highlights
- onboarding
- patient portal hero moments
- future public/marketing surfaces

Not allowed in odontogram editing, prescriptions, consent signing, payments, form entry or dense agenda operation.

## 14. Scroll motion

Scroll motion is used to create hierarchy in long analytical or narrative surfaces.

### Scroll Reveal

Good for:

- analysis sections
- dashboard secondary modules
- portal sections
- onboarding

Default: one-time reveal.

### Scroll Stack

Good for structured sequences such as:

1. Revenue
2. Patients
3. Treatments
4. Conversion
5. Acquisition source
6. Targets

Cards may pin/stack progressively, but scrolling must remain predictable and keyboard/touch accessible.

### Scroll Mask / frame-driven experiences

Only for special visual storytelling, onboarding or future presentation/marketing surfaces. They should not be introduced into routine clinical workflows.

## 15. Microfeedback

Global interaction details:

- buttons: press scale around 0.98
- checkboxes/check confirmation: short draw/reveal
- switches: controlled spring
- copy action: copy icon transitions to check
- save action: state transitions to “Guardado”
- cards on desktop: maximum hover lift around 1 px in routine interfaces
- tooltip/menu transitions remain fast

Microfeedback must confirm actions, not delay them.

## 16. Motion intensity levels

Every reusable motion primitive should map to a semantic intensity:

### `subtle`

Clinical operation. Minimum movement.

### `normal`

Navigation, shell, patients, routine cards.

### `expressive`

Analysis, portal, onboarding, selected showcase moments.

Clinical components must never inherit `expressive` motion accidentally.

## 17. Accessibility and reduced motion

Requirements:

- honor Mantine `respectReducedMotion`
- also use Denty semantic reduced-motion behavior inside motion primitives
- no interaction may depend on motion alone
- no hidden content should become unavailable if motion is disabled
- no autoplay/loop animation in clinical work
- avoid vestibular-risk motion: large zoom, strong parallax, persistent full-screen movement
- reduced-motion mode should prefer immediate state changes or opacity-only transitions where useful

## 18. Explicitly excluded from clinical UI

Do not introduce these into staff clinical workflows:

- cursor trails
- Black Hole/Vortex-style effects
- Glitter Warp
- large WebGL shader backgrounds
- strong parallax
- spinning cards
- glitch text
- permanent particles
- cursor-following spectacle
- looping 3D agent orb
- lenticular/holographic carousel effects

These can be reconsidered only for future marketing/public presentation surfaces.

## 19. Initial implementation priority

### Priority 1 — Foundation

- motion tokens/provider
- pressable primitives
- reduced-motion semantics
- page transitions
- shared tab/navigation indicator

### Priority 2 — Highest perceived impact

- Command Center + Oye Denty motion states
- sidebar/bottom-nav shared indicator
- tabs and filters shared indicator

### Priority 3 — Spatial workflows

- Patients carousel refinement + local shared motion
- Agenda appointment lift/reposition/status motion

### Priority 4 — Data and scroll

- Dashboard/analysis one-time reveals
- Animated graph primitives
- SpeedingMetric for protagonist KPIs only
- selective Scroll Stack

### Priority 5 — Depth and polish

- subtle parallax in approved surfaces
- lab/mobile carousel reuse
- portal/onboarding expressive motion

## 20. Testing strategy

### Unit/component tests

Verify:

- motion primitives render children without requiring animation
- reduced-motion returns deterministic final states
- tabs/navigation keep correct ARIA state
- SpeedingMetric preserves numeric formatting
- carousel active item is keyboard reachable
- list removal/insertion does not break focus management

### Regression tests

Extend existing Denty regression scripts for:

- shell navigation behavior
- Patients carousel
- odontogram clinical tabs
- agenda state flow
- command/voice entry points

### Browser tests

Use Playwright for:

- desktop navigation active-indicator continuity
- mobile bottom-nav behavior
- carousel touch/drag/snap behavior
- reduced-motion media emulation
- command center open/search/close
- agenda move/status continuity
- analysis metrics animate once and settle correctly

### Performance guardrails

- prefer transform/opacity for frequent motion
- avoid layout thrash on scroll
- use intersection/viewport observation instead of raw heavy scroll handlers where practical
- parallax must not create permanent high-frequency React re-renders
- no WebGL dependency for the core motion system

## 21. Success criteria

Denty Motion System 1.0 succeeds when:

1. Navigation feels spatial and continuous instead of abruptly switching states.
2. Patients and agenda interactions visibly preserve object continuity.
3. Oye Denty clearly communicates idle/listening/understanding/executing.
4. Odontogram changes are easier to perceive, not harder to perform.
5. Dashboard and analysis feel premium, with protagonist metrics receiving stronger data motion.
6. Carousel, parallax and scroll effects are reusable but constrained by semantic intensity.
7. Speeding Text is only used for major analytical figures.
8. `prefers-reduced-motion` produces a complete, stable and usable interface.
9. No second animation framework is required for the core implementation.
10. The result feels closer to a native premium product while remaining unmistakably a clinical tool.

## 22. Implementation boundary

This document defines behavior and architecture only. Product code should not be modified until this written specification has been reviewed. After review, create the implementation plan with file-by-file changes and execute in staged, testable slices.
