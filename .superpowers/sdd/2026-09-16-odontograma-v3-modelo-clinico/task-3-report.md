Task 3 report: Voice Commands Create V3 Entities

Status: implemented

Files changed:
- apps/legacy-preview/voice-router.js
- tests/verify_odontogram_v3_voice.mjs

Red test:
- Command: node tests\verify_odontogram_v3_voice.mjs
- Initial result: failed as expected because bridge speech returned odontogram.set instead of odontogram.entity.create.

Implementation:
- Added odontogram.entity.create as an allowed voice intent.
- Added voice parsing for bridge, implant restoration, removable prosthesis, orthodontics, and pediatric entity commands.
- Routed V3 execution through createOdontogramEntity, syncLegacyOdontogramFromEntities, and odontogramEntityToClinicalItems.
- Did not edit apps/legacy-preview/logic.js; required exports already existed.

Verification:
- node tests\verify_odontogram_v3_voice.mjs: PASS
- node tests\verify_odontogram_v3_model.mjs: PASS
- node tests\verify_odontogram_v3_clinical_plan.mjs: PASS

Commit:
- Not created. git is not available in this shell: "git : El termino 'git' no se reconoce como nombre de un cmdlet..."
- Intended exact message: Route voice commands to odontogram v3 entities

Concerns:
- None from implementation. Commit remains pending until git is available.
