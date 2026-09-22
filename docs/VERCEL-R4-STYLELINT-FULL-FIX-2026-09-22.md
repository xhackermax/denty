# Denty V3 R4 — Stylelint full fix

Date: 2026-09-22

## Root cause confirmed

The Vercel build command is `node scripts/pipeline/run.mjs vercel-build`. It intentionally runs quality gates before `next build`. R3 was blocked in the Stylelint gate, so Vercel never reached the production Next.js build.

## Fixes in R4

- Removed duplicate selectors in `src/shared/ui/parity.module.css` by consolidating the patient carousel viewport/card declarations.
- Removed duplicate selectors in `src/app/_components/shell/app-shell.module.css` by separating responsive visibility declarations from component-specific declarations.
- Reordered dark-mode shell overrides after responsive base overrides to avoid descending-specificity violations while preserving the same visual result.
- Moved the mobile `.quickAction` base override before its state selectors.
- Expanded and separated compact tone rules so Stylelint's rule-spacing requirements remain stable after Prettier.
- Added `npm run lint:styles:fix` for intentional local auto-fix. The Vercel build still uses Stylelint as a strict verification gate rather than silently disabling it.

## Validation available without dependency installation

- Vercel preflight: PASS (7/7)
- Architecture gate: PASS
- Games integrity: PASS (20/20)
- API parity: PASS (193/193)
- BFF policy: PASS
- Domain smoke: PASS
- CSS structural audit on the two previously failing files: no duplicate selectors, no known descending-specificity ordering, no adjacent-rule spacing violations.

The full `stylelint`, `typecheck`, `unit`, and `next build` gates still require the Node 24/npm dependency environment used by Vercel.
