# Denty Clinical Surgery + Finance Motion + UX Cohesion Design

**Date:** 2026-09-26  
**Status:** proposed for final user review before implementation planning  
**Baseline:** `DENTY-VERCEL-NODE24-TYPE-FIX-2026-09-26.zip`  
**Runtime target:** Node 24.x / Next.js 16.3.5 / Vercel

## 1. Goal

Evolve Denty so the odontogram becomes the authoritative clinical planning surface for diagnosis, surgery and treatment planning while preserving a clean interface.

The change has five coordinated outcomes:

1. Add a dedicated **Surgery odontogram** that behaves like the existing Endodontics odontogram: select a tooth/site, expose a contextual surgery panel, save structured clinical entities, draw concise visual marks, and write to the same shared patient odontogram/history.
2. Make the recently defined clinical catalogue and compatibility matrix operational instead of documentary, with a central rule engine shared by General, Endodontics, Surgery, voice/Oye Denty, planning and future tools.
3. Separate **implant/prosthetic planning** from **actual surgery data** so a budget can contain every planned billable component before the exact fixture details are known, then enrich the same planned entity with actual manufacturer/diameter/length/torque/ISQ data on the surgery date.
4. Improve Finance/Analysis motion and global navigation motion while keeping Denty sober, professional and fast.
5. Make time-based appearance and document creation behavior deterministic: dark 21:00–07:00 Europe/Madrid by default, and newly created documents immediately open for signing/preview.

The design must preserve current Node 24/Vercel constraints and existing clinical history, consent gates, budget signature gates, undo/redo and local/demo behavior.

## 2. Current State and Gaps

### 2.1 Odontogram

Current clinical tabs are:

`General · Periodonto · Ortodoncia · Pediátrico · Endodoncia · Historial`

There is no Surgery tab.

The existing Endodontics panel already provides the desired interaction pattern:

- selected tooth is always explicit;
- domain diagnosis is edited in a contextual panel;
- a structured `DentalEntity` is committed;
- the clinical mark is rendered visually on the selected tooth.

The current odontogram state reducer only hard-blocks one narrow incompatibility: active implant vs active caries on the same position. The broader clinical catalogue and rules R001–R035 are not enforced centrally.

The current implant surgery panel exists, but it is a special-purpose form opened by an action. It is not a dedicated surgical odontogram and does not expose the broader surgical domain.

### 2.2 Implant planning

`createImplantStack()` currently creates a generic planned implant + abutment + crown stack. This is too opinionated for real treatment planning because it does not distinguish alternative prosthetic designs such as TiBase, Multiunit, bar/overdenture, directly screwed structures, Locator, hybrid All-on-X, provisional components or accessory screws.

The existing surgery reminder correctly separates fields that are known only at surgery (`system`, `diameterMm`, `lengthMm`, `placementDate`, `insertionTorqueNcm`, `primaryIsq`) from the existence of a planned implant.

### 2.3 Finance and Analysis motion

Finance KPIs render as static formatted strings. Doctor production bars render at final width immediately. Analysis already has animated headline metrics but profitability and losses/opportunities `Progress` bars render at their final value without a loading/reveal animation.

### 2.4 Global page transitions

Current route transitions use large Y-axis rotations, blur and long durations (roughly 0.54–0.62 s). This creates visible GPU/compositing cost and makes navigation feel theatrical and laggy.

### 2.5 Appearance

Mantine currently uses `defaultColorScheme="auto"`, which follows operating-system preference. It does not implement Denty's desired schedule of dark mode from 21:00 to 07:00.

### 2.6 Documents

`createDocument()` creates the document and closes the creation modal, but does not select/open the new document. For consents this adds an unnecessary navigation step before signing.

## 3. Architectural Decision

Use **one shared clinical state/history model with multiple odontogram lenses**.

The Surgery odontogram is a distinct UI and workflow, but it must not own a separate patient record. General, Periodontal, Orthodontic, Pediatric, Endodontic and Surgery views all read/write the same clinical entity state.

High-level flow:

```text
General / Endodontics / Periodontics / Surgery / Oye Denty
                          │
                          ▼
                  typed clinical command
                          │
                          ▼
                  central rule engine
               allow | warn | block | require
                          │
                          ▼
                 shared odontogram state
                          │
          ┌───────────────┼────────────────┐
          ▼               ▼                ▼
       History          Plan            Timeline
                          │
                          ▼
                 Required consents
                          │
                          ▼
                       Budget
                          │
                          ▼
                  Budget signature
                          │
                          ▼
                        Agenda
                          │
                          ▼
                       Surgery
                          │
                          ▼
                 Actual implant data
```

No clinical surface may bypass the rule engine. Voice/Oye Denty and UI actions must call the same typed command path.

## 4. Domain Model Evolution

### 4.1 Preserve `DentalEntity`, expand clinically

Keep `DentalEntity` as the shared persistence envelope. Extend `DentalEntityType` with focused entity types rather than storing everything as freeform status strings.

Proposed additions:

- `SURGERY`
- `BONE_GRAFT`
- `MEMBRANE`
- `SINUS_LIFT`
- `SURGICAL_LESION`
- `IMPLANT_COMPONENT`
- `PROSTHETIC_STRUCTURE`
- `PERIODONTAL_FINDING` if not represented elsewhere

Existing entity types remain valid for backward compatibility.

### 4.2 Cross-cutting treatment state

Every clinical treatment/hallazgo that supports lifecycle must carry a normalized state equivalent to:

- `HALLAZGO_EXISTENTE`
- `PLANIFICADO`
- `REALIZADO`
- `REALIZADO_OTRA_CLINICA`

Legacy `status` strings remain readable, but new commands should expose normalized state through typed attributes/helpers.

### 4.3 Planned implant vs actual implant

A planned implant is valid without fixture details.

At planning time, minimum representation:

- site/tooth position;
- lifecycle state = planned;
- surgical intention if known (immediate post-extraction vs delayed may remain optional);
- linked planned prosthetic design/components.

Do **not** require:

- manufacturer/system;
- diameter;
- length;
- lot/reference;
- insertion torque;
- primary ISQ;
- actual placement date.

Those are actual surgical data and become required only when completing the implant as `REALIZADO` after placement.

## 5. Surgery Odontogram

### 5.1 Clinical tab

Add:

`General · Periodonto · Ortodoncia · Pediátrico · Endodoncia · Cirugía · Historial`

The infinite clinical tab scroller must preserve its current behavior.

### 5.2 Interaction pattern

Surgery intentionally mirrors Endodontics:

1. User selects a tooth/site on the odontogram.
2. Surgery panel displays the selected position.
3. User selects finding/procedure and planned/realized state.
4. Denty validates through the central rule engine.
5. If allowed, a structured entity/command is committed.
6. A compact SVG surgical visual mark is shown on the mouth.
7. Full detail stays behind a contextual disclosure/hidden legend.
8. History immediately reflects the change.

The mouth remains visible while editing. Surgery must not devolve into a disconnected form page.

### 5.3 Surgical action families

The initial Surgery odontogram must support:

#### Extraction / tooth surgery

- simple extraction;
- surgical extraction;
- included/impacted tooth state;
- germectomy;
- alveoloplasty;
- surgical exposure for orthodontic traction;
- apicoectomy/periapical surgery.

#### Soft/hard tissue surgery

- labial/lingual frenectomy;
- soft/hard tissue biopsy;
- associated lesion record where supported.

#### Implant surgery

- planned implant;
- placed implant;
- failed/lost implant;
- immediate post-extraction vs delayed;
- fixture actual-data completion.

#### Regeneration

- bone graft;
- autologous/allograft/xenograft/alloplast where selected;
- simultaneous vs staged;
- guided bone regeneration;
- socket preservation;
- split crest;
- membrane type + titanium reinforcement when relevant.

#### Sinus elevation

- internal/osteotome/Summers;
- external/lateral window.

### 5.4 Surgery visual language

Visual marks must be clinically legible but restrained.

Principles:

- planned = existing Denty planned color semantics;
- completed = completed color semantics;
- unsatisfactory/complication = existing warning/error semantics;
- visual glyphs are SVG overlays on tooth/site;
- multiple surgical entities can coexist when clinically valid;
- full textual detail lives in the contextual hidden legend, not permanently on the mouth;
- no icon should obscure tooth surfaces required for other clinical views.

Initial visual mark set:

- extraction planned/completed;
- implant planned/placed/lost;
- graft/GBR;
- membrane;
- sinus elevation;
- included/impacted tooth;
- biopsy/lesion marker;
- surgical exposure;
- apicoectomy.

## 6. Hidden Context Legend

The hidden legend is the depth layer for advanced data.

Default state is collapsed/minimal. It opens when:

- the user selects a tooth with advanced data;
- the user presses `Detalles`;
- the user long-presses/right-clicks the relevant mark;
- a rule requires missing contextual information;
- an implant surgery reminder opens the surgery view.

The legend is contextual, not a giant global form. It displays only fields relevant to the active entity.

Example planned implant legend:

```text
16 · Implante planificado
Restauración prevista: Corona unitaria
Interfaz: TiBase
Tornillo protésico: 1
Provisional: Sí
Guía quirúrgica: Sí
Fixture real: Pendiente de cirugía
```

Example actual implant legend:

```text
16 · Implante realizado
Sistema: Ticare INHEX
Diámetro: 4,25 mm
Longitud: 10 mm
Fecha: 2026-10-02
Torque: 40 Ncm
ISQ: 71
Lote: ...
```

Planning and actual data belong to the same clinical chain, not two independent implant records.

## 7. Implant-Prosthetic Planning and Budget BOM

### 7.1 Principle

A dentist may know the prosthetic design and billable components before knowing the exact fixture dimensions/system.

Denty must therefore maintain a **planned bill of materials (BOM)** linked to the clinical plan.

### 7.2 Billable planned components

The first implementation must support independent planned budget lines for at least:

- implant fixture/procedure;
- straight abutment;
- angled abutment;
- Multiunit;
- TiBase;
- angled screw/access component;
- prosthetic screw;
- provisional crown;
- definitive implant crown;
- Locator;
- ball attachment;
- bar;
- magnet when used;
- directly screwed structure;
- hybrid All-on-X structure/prosthesis;
- access chimney restoration;
- surgical guide;
- maintenance when configured;
- bone graft;
- membrane;
- sinus elevation;
- other configured surgical adjuncts.

Every selected billable component produces a budget line. Removing/changing a component updates the draft budget derivation.

### 7.3 Presets without locking clinical details

Offer fast planning presets, editable before budget generation:

- single implant + TiBase + crown;
- single implant + custom/angled abutment + crown;
- multiple implants + Multiunits + screwed structure;
- implant-retained overdenture with Locator;
- bar-retained overdenture;
- hybrid All-on-X;
- direct-to-implant structure where supported.

Presets are only UI accelerators. The stored plan remains a list of explicit components.

### 7.4 Multi-select planning

Users may select multiple implant positions and apply a shared prosthetic preset. Denty must then allow per-site overrides.

Example:

```text
16, 14, 12, 22, 24, 26 → 6 implants + Multiunit preset
16 → Multiunit 17°
26 → Multiunit 30°
others → straight/unknown angle until later
```

Unknown angle/system is allowed at planning time unless required to define a specific billable component.

## 8. Surgery-Day Completion Gate

### 8.1 Reminder

On the calendar date of an implant surgery appointment, Denty shows:

`Completar datos del implante colocado`

The reminder opens the patient's **Surgery odontogram**, not a disconnected generic form.

### 8.2 Completion requirements

Before an implant entity can transition from planned to placed/realized, require:

- system/manufacturer;
- diameter;
- length;
- placement date;
- insertion torque;
- primary ISQ.

Optional but available:

- connection;
- lot/reference;
- notes;
- bone quality;
- immediate/delayed timing;
- graft/membrane actually used;
- actual prosthetic component details when placed same day.

### 8.3 No fake preoperative data

No preoperative budget or plan workflow may force placeholder system/diameter/length/torque/ISQ values.

## 9. Central Clinical Rule Engine

### 9.1 Result model

Every proposed clinical command returns one of:

- `ALLOW`
- `WARN`
- `BLOCK`
- `REQUIRE_CONTEXT`

Suggested shape:

```ts
interface ClinicalRuleResult {
  outcome: "ALLOW" | "WARN" | "BLOCK" | "REQUIRE_CONTEXT";
  ruleIds: readonly string[];
  messages: readonly string[];
  missingContext?: readonly string[];
}
```

Warnings require explicit clinical confirmation before commit. Blocks cannot commit. `REQUIRE_CONTEXT` opens the contextual hidden legend at the relevant fields.

### 9.2 Rule scope

Implement the catalogue matrix R001–R035 as executable rules, preserving their intended category (`excluye`, `requiere`, `advertencia`, `restringe`, `no_confundir`).

Required rule behaviors:

- R001 absent tooth excludes filling, endodontics, natural crown and sealant;
- R002 implant and natural tooth cannot coexist in the same position;
- R003 crown requires valid support;
- R004 post/core requires prior endodontic treatment;
- R005 access chimney restoration only on screwed implant restoration;
- R006 grade III mobility used as bridge abutment warns;
- R007 sealant incompatible with existing caries/restoration on the surface;
- R008 bridge abutment simultaneously marked for extraction warns;
- R009 removable clasp is not a bridge abutment;
- R010 treatable canal count restricted by tooth/anatomy context;
- R011 pulpotomy/pulpectomy restricted to primary or immature permanent indications;
- R012 SSC restricted to typical primary-dentition use unless confirmed exception policy is added;
- R013 space maintainer requires premature loss + successor not erupted;
- R014 orthodontic TAD must not be persisted as prosthetic implant;
- R015 apexification/apexogenesis require immature apex context;
- R016 ankylosed tooth excludes orthodontic traction and bridge abutment;
- R017 severe external root resorption restricts abutment use;
- R018 surgical extraction requires included/impacted context;
- R019 simultaneous diastema orthodontic/restorative solutions warn;
- R020 pink spot requires internal resorption record;
- R021 sinus elevation restricted to upper posterior region;
- R022 Locator/ball/bar attachment requires implant or prepared tooth context as applicable;
- R023 bar and Locator mutually exclusive on same implant;
- R024 veneer incompatible with full crown on same tooth;
- R025 peri-implantitis only on implant, periodontitis only on natural tooth;
- R026 furcation only on anatomically eligible multirooted teeth;
- R027 immediate loading with low ISQ/torque warns;
- R028 TiBase requires associated crown/structure;
- R029 Multiunit only for multiple/screwed prosthetic context, not a single crown;
- R030 strong angled abutment + incompatible straight screw access combination blocks when connection rules say so;
- R031 membrane without associated graft warns;
- R032 implant diameter/length validated against manufacturer catalogue when available;
- R033 bridge model supports cantilever at either end and must not infer all endpoints as abutments;
- R034 pontic occupies an absent tooth position and must not be treated as natural tooth;
- R035 active retreatment and apicoectomy are mutually exclusive alternatives.

### 9.3 Manufacturer catalogue boundary

R032 cannot pretend to know manufacturer-specific dimensions when Denty does not have that catalogue.

Behavior:

- if manufacturer catalogue exists: validate exact allowed dimensions;
- if no catalogue exists: allow planning and actual entry within global safety/type constraints but show a non-blocking `manufacturer catalogue not configured` validation state;
- never fabricate supported combinations.

## 10. Shared Command Path

All write surfaces must pass through the same application/domain command path:

```text
UI / keyboard / touch / Oye Denty
                ↓
         typed clinical command
                ↓
        permission/context check
                ↓
         clinical rule engine
                ↓
    confirmation if WARN/sensitive
                ↓
       shared odontogram reducer
                ↓
      history + persistence + sync
```

Direct feature-local mutations that bypass validation are not allowed for new clinical work.

## 11. History and Undo/Redo

Surgery writes into the existing odontogram history mechanism.

Requirements:

- planned implant → actual implant is a traceable change, not delete/recreate;
- extraction completion updates the shared tooth existence state and remains visible in history;
- multiple linked implant components preserve parent/relationship IDs;
- undo/redo still operates on committed commands;
- historical snapshots remain read-only when selected;
- surgery-specific attributes are included in snapshot diffing.

## 12. Clinical Pipeline Integration

The already approved patient pipeline remains:

`Odontogram → Plan → Required consents → Budget → Budget signature → Appointments`

Surgery adds execution after scheduling:

`Appointments → Surgery → Complete actual implant data → History/follow-up`

### 12.1 Consent derivation

Required consents continue to derive from planned treatments/components. Surgery procedures must map to required consent categories where configured.

Examples:

- implant planning → implant surgery consent;
- graft/GBR → graft/regeneration consent if separate template exists;
- sinus elevation → sinus/regeneration consent where configured;
- extraction → extraction/surgery consent where configured.

No budget signing if required consents are incomplete. No appointment progression if the budget signature gate is incomplete.

### 12.2 Budget derivation

The draft budget is derived from explicit plan/BOM items. Budget lines are financial snapshots and should not silently mutate after the patient signs.

If the clinical plan changes after budget signature, Denty must require a revised budget/version rather than modifying the signed version in place.

## 13. Finance and Analysis Motion

### 13.1 Motion principles

Motion must communicate loading/reveal, not decorate continuously.

Rules:

- trigger on first meaningful viewport entry after user scroll where applicable;
- one animation per component mount/period selection;
- respect `prefers-reduced-motion`;
- use transforms/clip/scale where possible;
- avoid expensive blur on charts;
- actual numeric value remains accessible to assistive technology.

### 13.2 Finance headline KPIs

Animate:

- Produced;
- Invoiced;
- Collected;
- Pending;
- Margin.

Use a compact count-up/SpeedingMetric-derived numeric reveal, but calmer than the Analysis hero metrics. Target duration roughly 0.8–1.2 s.

### 13.3 Production by dentist

`DoctorBars` bars animate from 0 to target width when the chart enters view.

- stagger rows by ~40–60 ms;
- duration ~500–700 ms;
- label/value remain readable before/during animation;
- reduced motion renders final state immediately.

### 13.4 Production by treatment

The current donut should reveal progressively rather than appear fully rendered. Preferred implementation: animate a conic mask/progress variable or equivalent transform without rebuilding data semantics.

Legend rows may stagger subtly.

### 13.5 Monthly trend

Animate the production line from start to end using SVG path/polyline dash techniques or an equivalent low-cost reveal. Labels remain static/readable.

### 13.6 Analysis profitability / losses / opportunities

Replace static Mantine `Progress value={...}` appearance with an animated wrapper that loads from 0 to target when entering view.

Apply to:

- Rentabilidad por tratamiento;
- Presupuesto no aceptado;
- Repeticiones de laboratorio;
- Huecos no ocupados;
- future loss/opportunity progress bars using the same component.

## 14. Global Navigation Motion Redesign

### 14.1 Remove heavy cube/flip defaults

The current high-angle 3D rotations and blur are removed from normal navigation.

No default route transition may rely on large `rotateY` or blur filters.

### 14.2 Three sober transition families

Use deterministic context-driven transitions:

#### `glide`

Between top-level modules.

- direction follows navigation order;
- x translation ~12–18 px;
- opacity 0→1;
- scale optional 0.995→1;
- 260–320 ms.

#### `lift`

Entering a deeper internal screen/detail.

- y ~10–14 px;
- opacity;
- scale ~0.99→1;
- 260–300 ms.

#### `settle`

Back navigation, sibling utilities or ambiguous transitions.

- very small x/y offset;
- opacity;
- 220–280 ms.

No randomness. The variation comes from navigation semantics so the app feels organic but predictable.

### 14.3 Presence strategy

Avoid long `wait` gaps. Outgoing/incoming surfaces may overlap briefly, but the exiting page should not cause layout jumps.

Keep ambient backdrop independent from page transition.

## 15. Time-Based Appearance

### 15.1 Default schedule

Denty automatic schedule uses **Europe/Madrid**:

- light: `07:00 <= time < 21:00`;
- dark: `21:00 <= time < 07:00`.

### 15.2 Preference modes

Replace OS-driven meaning of `auto` with explicit Denty preference values:

- `time` / “Automático por hora” (default);
- `light` / Claro;
- `dark` / Oscuro.

Manual selection overrides the schedule until the user selects automatic-by-time again.

### 15.3 Runtime updates

The app must:

- resolve mode on client hydration;
- schedule the next boundary transition rather than polling continuously;
- recompute on visibility/focus because a device may have slept across a boundary;
- avoid hydration flashes as far as practical;
- use the configured timezone contract, not arbitrary browser locale text.

## 16. Documents: Create → Open

After `createDocument()`:

- close creation modal;
- insert document into state;
- select the new document;
- if type is `CONSENT`, immediately open the signing surface for that exact document;
- for non-consent document, immediately open its preview/detail surface;
- preserve doctor/site defaults already selected during creation.

No extra click back into the list is required.

When creation is triggered from the clinical consent workflow, the created consent remains scoped to the active patient and contributes to the consent gate only after required signatures are complete.

## 17. Accessibility and Reduced Motion

- Every visual clinical mark has text/ARIA equivalent.
- The Surgery tab is keyboard reachable and uses the same tab carousel semantics.
- Rule warnings/blocks must be announced as text, not color-only.
- Animated finance values expose the final/current semantic value independently of visual tweening.
- `prefers-reduced-motion` disables count-up flourish, bar growth, line drawing and route transforms; content remains immediately usable.
- Hidden legend disclosures are keyboard accessible and preserve focus when opened by a validation requirement.

## 18. Data and Backward Compatibility

- Existing `DentalEntity` records load without migration failure.
- Legacy implant entities lacking the new attributes remain valid.
- New typed helpers interpret old status strings where possible.
- No destructive rewrite of historical snapshots.
- Demo/local persistence remains functional.
- Server-side persistence/API contracts are extended additively where possible.
- Signed budgets/documents remain immutable snapshots; plan evolution creates new versions rather than mutating signed content.

## 19. Expected File/Module Boundaries

Likely production changes include:

### Domain

- `src/domain/odontogram/index.ts`
- `src/domain/odontogram/state.ts`
- new `src/domain/odontogram/clinical-rules/*`
- new implant/prosthetic planning helpers
- existing `src/domain/implant-surgery-reminder.ts`

### Odontogram feature

- `src/features/odontogram/clinical-tabs.tsx`
- new `src/features/odontogram/surgery-panel.tsx`
- new surgical visual helper/library
- `src/features/odontogram/odontogram-workspace.tsx`
- `src/features/odontogram/odontogram.module.css`
- current implant surgery panel reused/refactored into Surgery context rather than deleted

### Finance / Analysis

- `src/features/parity/modules/finance-module.tsx`
- `src/features/parity/modules/finance-charts.tsx`
- `src/features/parity/modules/analysis-module.tsx`
- new/reused shared motion primitives

### Navigation motion

- `src/shared/motion/motion-page.tsx`
- `src/shared/motion/route-transition.ts`
- related CSS/tests

### Theme

- `src/app/providers.tsx`
- `src/app/layout.tsx` if script/default behavior needs adjustment
- `src/app/_components/shell/shell-preferences.tsx`
- new time-scheme resolver/provider helper

### Documents

- `src/features/parity/modules/documents-module.tsx`

### Pipeline / budget

- existing clinical planning/budget derivation modules
- consent requirement derivation
- tests for version immutability and BOM mapping

## 20. Testing Strategy

TDD is required for each implementation slice.

### 20.1 Rule engine

Unit tests for all R001–R035:

- positive allowed case;
- prohibited/warning case;
- missing-context case where applicable;
- no unrelated false positives.

### 20.2 Surgery odontogram

Component/domain tests:

- Surgery tab exists and cycles correctly;
- selected tooth drives Surgery panel;
- committing a surgical entity updates shared state;
- General sees extraction/implant changes committed from Surgery;
- history includes Surgery change;
- hidden legend opens for selected advanced entity;
- planned implant does not require actual fixture fields;
- completing placed implant does require them.

### 20.3 Budget BOM

Tests:

- single implant + TiBase creates explicit implant/TiBase/screw/crown lines according to catalogue configuration;
- Multiunit multiple-prosthesis plan creates explicit components;
- bar/Locator exclusivity validated;
- modifying unsigned plan updates draft derivation;
- signed budget snapshot is not silently changed by later plan edits.

### 20.4 Finance motion

Regression tests assert:

- headline KPI uses animated numeric primitive;
- doctor bars animate target width;
- treatment production visualization has reveal motion;
- Analysis profitability and losses/opportunities use animated progress;
- reduced-motion path renders final state without tween.

### 20.5 Navigation motion

- route resolver returns `glide`, `lift` or `settle` appropriately;
- page transition source contains no default high-angle cube/flip/blur path;
- reduced motion remains available;
- no route blank-frame regression.

### 20.6 Appearance

Timezone resolver unit tests around boundaries:

- 06:59 Madrid → dark;
- 07:00 → light;
- 20:59 → light;
- 21:00 → dark;
- manual override wins;
- auto/time mode re-evaluates on focus.

### 20.7 Documents

- creating consent opens signing for the newly created document ID;
- creating non-consent opens preview;
- selected patient/doctor/site preserved;
- consent completion still controls pipeline gate.

### 20.8 Release gates

Run existing gates plus new regressions:

- history regression;
- pipeline self-check;
- games integrity;
- deployable package;
- API parity;
- BFF policy;
- Supabase link;
- Vercel regression matrix;
- domain smoke;
- architecture;
- new odontogram clinical rules regression;
- new Surgery odontogram regression;
- implant surgery reminder/exact optional regressions;
- finance motion regression;
- route motion regression;
- appearance schedule regression;
- documents auto-open regression;
- full `npm ci` + `npm run build`/Vercel build under Node 24 before release.

## 21. Rollout Order

Implementation should be staged to reduce risk:

1. **Clinical rule engine foundation** with R001–R035 and compatibility tests.
2. **Surgery odontogram shell** matching Endodontics interaction, shared state/history.
3. **Surgical entities and visual marks**.
4. **Implant planning + BOM** and budget derivation.
5. **Surgery-day completion integration** and reminder deep-link into Surgery.
6. **Consent/budget version invariants** for new surgery types.
7. **Finance/Analysis motion**.
8. **Navigation transition redesign**.
9. **Time-based appearance**.
10. **Documents create→open behavior**.
11. Full Node 24/Vercel verification and final ZIP.

The clinical foundation is intentionally first because implant planning, consent derivation and budget generation depend on it.

## 22. Acceptance Criteria

The change is accepted only when all of the following are true:

- Surgery appears as a first-class odontogram beside Endodontics.
- Surgery behaves like Endodontics: tooth/site selection, contextual panel, visual mark, shared state, history.
- General and Surgery never maintain contradictory independent tooth states.
- All R001–R035 exist as executable rule-engine behavior with tests.
- Planned implants can be budgeted without actual manufacturer/dimensions/torque/ISQ.
- Every selected billable implant/prosthetic component is independently represented for budget derivation.
- On surgery day the user is directed into Surgery and cannot mark the placed implant complete without required actual data.
- Consent → budget → budget signature → appointments gates remain enforced.
- Finance KPIs and requested charts/bars visibly animate on reveal without continuous distraction.
- Route changes no longer use heavy cube/flip blur by default and feel smooth at normal mobile/desktop frame rates.
- Automatic appearance is dark 21:00–07:00 Europe/Madrid and light otherwise, with manual overrides.
- Creating a consent opens it immediately for signing; other documents open immediately for preview.
- Existing historical, API, games, Supabase and architecture gates remain green.
- Production build completes under Node 24 in the Vercel-equivalent pipeline.

## 23. Explicit Non-Goals for This Release

- No separate surgical patient database.
- No automatic inference of exact implant manufacturer/diameter/length before surgery.
- No fabricated manufacturer dimension catalogue.
- No radiographic AI diagnosis.
- No CBCT/DICOM surgical guide design engine.
- No autonomous Oye Denty clinical commit that bypasses confirmation/rules.
- No continuous decorative animation in Finance or the odontogram.

