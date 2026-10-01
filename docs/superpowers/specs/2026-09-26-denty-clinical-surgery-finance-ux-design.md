# Denty Clinical Surgery + Finance Motion + UX Cohesion Design

Date: 2026-09-26. Scope: Surgery odontogram, clinical rules, implant planning, finance motion, navigation, appearance and document opening.

## Architecture and compatibility

- General, Endodontics, Surgery and other clinical lenses share `DentalEntity`, state and history; no separate surgical patient record.
- UI, keyboard, touch and Oye Denty use typed commands → permissions/context → rules → confirmation → shared reducer → history/persistence/sync.
- Outcomes: `ALLOW`, `WARN`, `BLOCK`, `REQUIRE_CONTEXT`; return rule IDs/messages and missing fields. Warnings require explicit clinical confirmation; blocks cannot commit; context requests focus relevant fields.
- Preserve legacy entities/status strings, snapshots, history and undo/redo. One accepted batch is one undo step; historical snapshots are read-only.
- New entity types: `SURGERY`, `BONE_GRAFT`, `MEMBRANE`, `SINUS_LIFT`, `SURGICAL_LESION`, `IMPLANT_COMPONENT`, `PROSTHETIC_STRUCTURE`, and `PERIODONTAL_FINDING` if needed.
- Lifecycle: `HALLAZGO_EXISTENTE`, `PLANIFICADO`, `REALIZADO`, `REALIZADO_OTRA_CLINICA` through typed helpers; old statuses remain readable.

## Surgery lens and legend

Mirror Endodontics: explicit tooth/site selection, contextual editor, structured commit and SVG mark in shared state.

| Family           | Initial procedures                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Tooth surgery    | Simple/surgical extraction, impacted/included tooth, germectomy, alveoloplasty, orthodontic exposure, apicoectomy/periapical surgery |
| Soft/hard tissue | Labial/lingual frenectomy, biopsy and supported lesion records                                                                       |
| Implant          | Planned, placed, failed/lost; immediate post-extraction or delayed                                                                   |
| Regeneration     | Graft types, simultaneous/staged, GBR, socket preservation, split crest, membrane and titanium reinforcement                         |
| Sinus            | Internal/osteotome/Summers or external/lateral window                                                                                |

- SVG overlays respect existing planned/completed/warning colors and do not obscure surfaces.
- Full detail in a collapsed contextual legend, opened by selection, `Detalles`, long-press/right-click, missing-context rule or surgery reminder.
- Planning and actual placement stay linked in the same chain; completion updates shared existence/state rather than deleting and recreating records.
- Snapshot diffs include surgery attributes and component relationship IDs.

## Implant planning and completion

- Planned implant needs site, planned lifecycle and explicit prosthetic intent/components. Immediate/delayed timing may remain unknown.
- Planning does **not** require system/manufacturer, diameter, length, lot, torque, ISQ or actual placement date; do not fabricate placeholders.
- Completing as `REALIZADO` requires **system/manufacturer, diameter, length, placement date, insertion torque and primary ISQ**.
- Optional actual fields: connection, lot/reference, notes, bone quality, timing, graft/membrane and same-day prosthetic components.
- On surgery date show `Completar datos del implante colocado`; open Surgery and the linked planned implant.

### Bill of materials

Every selected billable component creates an explicit draft budget line; removing/changing it updates draft derivation.

- Fixture/procedure, straight/angled abutment, Multiunit, TiBase, angled screw/access and prosthetic screw.
- Provisional/definitive implant crown, Locator, ball attachment, bar, magnet, directly screwed structure and hybrid All-on-X.
- Access chimney restoration, surgical guide, configured maintenance, graft, membrane, sinus lift and other configured adjuncts.
- Editable presets: unit+TiBase+crown, unit+custom/angled abutment+crown, multiple+Multiunits+screwed structure, Locator/bar overdenture, hybrid All-on-X and direct-to-implant.
- Multi-site preset application allows per-site overrides; unknown angles/system stay unknown unless needed to define a billable component.

## Clinical rule catalogue R001–R035

Implement as executable rules from `odontograma_catalogo.json`, preserving exclusions, requirements, warnings, restrictions and distinctions.

| ID   | Required behavior                                                                                |
| ---- | ------------------------------------------------------------------------------------------------ |
| R001 | Absent tooth excludes filling, endodontics, natural crown and sealant.                           |
| R002 | Implant and natural tooth cannot coexist at one position.                                        |
| R003 | Crown requires valid support.                                                                    |
| R004 | Post/core requires prior endodontic treatment.                                                   |
| R005 | Access chimney restoration only on screwed implant restoration.                                  |
| R006 | Grade III mobile bridge abutment warns.                                                          |
| R007 | Sealant incompatible with caries/restoration on that surface.                                    |
| R008 | Bridge abutment simultaneously planned for extraction warns.                                     |
| R009 | Removable clasp is not a bridge abutment.                                                        |
| R010 | Canal count restricted by tooth/anatomy context.                                                 |
| R011 | Pulpotomy/pulpectomy restricted to primary or immature permanent indications.                    |
| R012 | SSC for typical primary dentition unless a confirmed exception policy exists.                    |
| R013 | Space maintainer requires premature loss and unerupted successor.                                |
| R014 | Orthodontic TAD must not be persisted as prosthetic implant.                                     |
| R015 | Apexification/apexogenesis require immature apex.                                                |
| R016 | Ankylosis excludes orthodontic traction and bridge abutment.                                     |
| R017 | Severe external root resorption restricts abutment use.                                          |
| R018 | Surgical extraction requires included/impacted context.                                          |
| R019 | Simultaneous diastema orthodontic/restorative solutions warn.                                    |
| R020 | Pink spot requires internal resorption record.                                                   |
| R021 | Sinus elevation restricted to upper posterior region.                                            |
| R022 | Locator/ball/bar needs implant or prepared-tooth context as applicable.                          |
| R023 | Bar and Locator mutually exclusive on the same implant.                                          |
| R024 | Veneer incompatible with full crown on the same tooth.                                           |
| R025 | Peri-implantitis only on implant; periodontitis only on natural tooth.                           |
| R026 | Furcation only on anatomically eligible multirooted teeth.                                       |
| R027 | Immediate loading with low ISQ/torque warns.                                                     |
| R028 | TiBase requires associated crown/structure.                                                      |
| R029 | Multiunit requires multiple/screwed prosthesis, not a single crown.                              |
| R030 | Strong angled abutment + incompatible straight screw access blocks when connection rules say so. |
| R031 | Membrane without associated graft warns.                                                         |
| R032 | Validate diameter/length against manufacturer catalogue when available.                          |
| R033 | Cantilever allowed at either end; endpoints are not automatically abutments.                     |
| R034 | Pontic occupies an absent position, not a natural tooth.                                         |
| R035 | Active retreatment and apicoectomy are mutually exclusive alternatives.                          |

R032 without a catalogue: global safety/type validation plus non-blocking `manufacturer catalogue not configured`; never invent supported combinations.
Batch validation evaluates the aggregate proposed state, independent of insertion order.

## Clinical pipeline

Odontogram → plan → required consents → budget → budget signature → appointments → surgery → actual implant data → follow-up.

- Map implant, graft/GBR, sinus and extraction procedures to configured required consents.
- No budget signing with incomplete required consents; no appointment progression with incomplete budget signature.
- Signed budget lines are immutable financial snapshots. A later plan/BOM change requires a revised version, not mutation of the signed budget.

## Finance and analysis motion

- Use existing `motion/react` and shared primitives, one-time reveal on meaningful viewport entry.
- Animate headline revenue/collected/pending/target KPIs with correct currency/decimal formatting; reduced motion renders final values.
- Doctor/treatment production bars and monthly lines reveal once; profitability/loss/opportunity progress bars settle at final values.
- No continuous decoration, repeated scroll restarts or extra animation stack.

## Navigation and appearance

Remove default cube/flip, large `rotateY` and heavy blur. Choose deterministic transition from route semantics:

| Family   | Behavior                                                                                 |
| -------- | ---------------------------------------------------------------------------------------- |
| `glide`  | Top-level modules: order-driven x 12–18 px, opacity, optional scale 0.995→1; 260–320 ms. |
| `lift`   | Deeper details: y 10–14 px, opacity, scale 0.99→1; 260–300 ms.                           |
| `settle` | Back/sibling/ambiguous route: tiny x/y, opacity; 220–280 ms.                             |

- Avoid long `wait` gaps/layout jumps; keep ambient backdrop separate.
- Appearance timezone **Europe/Madrid**: light `[07:00,21:00)`, dark `[21:00,07:00)`.
- Preferences: `time` (default automatic schedule), `light`, `dark`; manual override lasts until automatic selected again.
- Resolve hydration safely, schedule the next boundary and recalculate on focus/visibility; no continuous polling or browser-locale timezone inference.

## Documents: Create → Open

After successful creation, select/open the returned document. Consents open for signing; other types open preview. Handle failure without opening a stale document.

## Boundaries and verification

- Domain: odontogram entities/lifecycle/rules, anatomy, implant planning, consent requirements and budget versioning.
- Features: shared clinical tabs/workspace, Surgery panel/legend/visuals, surgery reminder, finance/analysis, shell transitions, theme and document flow.
- Unit tests: triggered/allowed case for every R001–R035, aggregate batches, unknown legacy statuses, blocked history, undo, BOM and signature revision.
- UI/browser: Surgery matches shared state, contextual legend, reminder/required actual fields, one-time finance motion, deterministic navigation, scheduled/manual theme and document opening.
- Accessibility: reduced motion preserves final state, keyboard/focus, ARIA and usable content. Prefer opacity/transform and avoid expensive loops/layout thrash.
- Release: existing history, API, games, Supabase, architecture and consent/budget gates remain green; Node 24 and `node scripts/pipeline/run.mjs vercel-build`.

## Rollout and acceptance

Domain/rules → validated commands → Surgery/legend → implant BOM/consents/versioning → actual completion → motion/navigation/theme/documents → release checks.
Accept only when rules execute, all lenses share truth, planned implants need no fake surgical data, signed budgets stay immutable and the production build passes.

## Non-goals

Separate Surgery database; fabricated manufacturer catalogue or fixture details; radiographic AI/CBCT/DICOM guide engine; autonomous clinical commits; continuous clinical/finance animation.
