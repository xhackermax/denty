Task 2 report

Status: implemented.

Red test:
- `node tests\verify_odontogram_v3_clinical_plan.mjs`
- Failed as expected because `odontogramEntityToClinicalItems` was not exported.

Implementation:
- Added clinical canonicalization and procedure matching for `pilar sobre implante`.
- Added implant-to-abutment and abutment-to-crown dependency explanations.
- Added `odontogramEntityToClinicalItems(db, patientId, entityId)` using V3 entity storage and `createClinicalPlanItem`.
- Added mappings for implant restorations, bridges, removable prostheses, orthodontics, pediatric, and periodontal chart entities.

Verification:
- `node tests\verify_odontogram_v3_clinical_plan.mjs` passed.
- `node tests\verify_odontogram_v3_model.mjs` passed.

Commit:
- Not created: `git` is not available on PATH in this environment.
- Required commit message when available: `Connect odontogram v3 entities to clinical plan`

Concerns:
- None beyond the local Git availability blocker.
