# Reusable subagent roster - Odontograma V3

These are reusable role briefs for relaunching equivalent agents later. The multi-agent tool exposes resumable agent ids during this session, but not permanent named agents. To reuse later, spawn a worker/reviewer with the same task brief and report contract.

## Worker 1 - Entity Core
- Agent id this session: 01a0a8bb-858a-7bd0-b31b-6ad6ca3f09af
- Brief: task-1-brief.md
- Owns: apps/legacy-preview/logic.js, tests/verify_odontogram_v3_model.mjs
- Responsibility: migration, CRUD helpers, legacy sync.

## Future workers
- Worker 2 - Clinical Plan Integration: task-2-brief.md
- Worker 3 - Voice Integration: task-3-brief.md
- Worker 4 - Snapshots And Perio Summary: task-4-brief.md
- Worker 5 - UI Controls: task-5-brief.md
- Worker 6 - Bundle Docs Verification Push Prep: task-6-brief.md

## Worker 2 - Clinical Plan Integration
- Agent id this session: 01a0a8c4-c41c-7560-9a5b-9b0149810614
- Brief: task-2-brief.md
- Owns: apps/legacy-preview/logic.js, tests/verify_odontogram_v3_clinical_plan.mjs
- Responsibility: derive clinicalPlanItems from V3 entities.

## Worker 3 - Voice Integration
- Agent id this session: 01a0a8c9-4afa-7b91-838b-1278d679bfab
- Brief: task-3-brief.md
- Owns: apps/legacy-preview/voice-router.js, tests/verify_odontogram_v3_voice.mjs
- Responsibility: parse and execute V3 entity voice commands.

## Worker 4 - Snapshots And Periodontal Summary
- Agent id this session: 01a0a8ce-578e-7761-b07b-36721b89a9af
- Brief: task-4-brief.md
- Owns: apps/legacy-preview/logic.js, tests/verify_odontogram_v3_snapshots_perio.mjs
- Responsibility: temporal snapshots, before/after diff, periodontal visual summary.

## Worker 5 - UI Controls
- Agent id this session: 01a0a8d1-f9ec-70b1-9c73-a35e20bb2583
- Brief: task-5-brief.md
- Owns: apps/legacy-preview/app.js, apps/legacy-preview/styles/styles.css, tests/verify_odontogram_v3_ui.mjs
- Responsibility: V3 panel, entity controls, snapshot controls, visual styles.
