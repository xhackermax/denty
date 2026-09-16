### Task 6: Bundle, Documentation, Final Verification And Push

**Files:**
- Create: `docs/ODONTOGRAMA-V3.md`
- Modify generated: `apps/legacy-preview/denty-app.bundle.js`, `apps/web/public/denty-app.bundle.js`, `apps/web/public/styles/styles.css`, possibly `apps/web/src/lib/legacy-shell.ts`

**Interfaces:**
- Consumes: Tasks 1-5.
- Produces: shipped local build and GitHub update.

- [ ] **Step 1: Write documentation**

Create `docs/ODONTOGRAMA-V3.md`:

```md
# Odontograma V3

Odontograma V3 anade entidades clinicas compartidas por odontograma, voz y plan clinico.

## Entidades

- `bridge`: puente con dientes, pilares y ponticos.
- `implant_restoration`: implante, pilar y corona relacionados.
- `removable_prosthesis`: protesis por arco.
- `orthodontics`: tratamiento ortodontico por arco y componentes.
- `pediatric`: tratamientos de odontopediatria.
- `periodontal_chart`: resumen visual periodontal.
- `snapshot`: corte temporal para comparar antes y ahora.

## Compatibilidad

El odontograma legacy sigue funcionando. Las entidades V3 sincronizan estados legacy cuando es necesario, pero no borran datos anteriores.

## Voz y plan clinico

La voz crea entidades V3 para tratamientos complejos. El plan clinico deriva items desde esas mismas entidades para evitar modelos paralelos.
```

- [ ] **Step 2: Run all Odontograma V3 tests**

Run:

```bash
node tests\verify_odontogram_v3_model.mjs
node tests\verify_odontogram_v3_clinical_plan.mjs
node tests\verify_odontogram_v3_voice.mjs
node tests\verify_odontogram_v3_snapshots_perio.mjs
node tests\verify_odontogram_v3_ui.mjs
node tests\verify_visual_odontogram.mjs
node tests\verify_multi_treatment_odontogram.mjs
node tests\verify_odontogram_back_to_patient.mjs
node tests\verify_patient_portal_treatment_panel.mjs
```

Expected: all PASS.

- [ ] **Step 3: Rebuild legacy bundle**

Run:

```bash
node apps\legacy-preview\build-static-bundle.mjs
pnpm --filter @denty/web sync:legacy
```

Expected: bundle generated and web public assets synced.

- [ ] **Step 4: Build web**

Stop local dev servers on ports `8767` and `8766`, remove `apps/web/.next` and `apps/web/out`, then run:

```bash
pnpm --filter @denty/web build
```

Expected: Next build succeeds.

- [ ] **Step 5: Restart local server**

Run:

```powershell
pnpm exec next dev -H 127.0.0.1 -p 8767
```

from `apps/web`, or use the existing hidden-window start command.

Verify:

```powershell
(Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8767/?odontogram-v3=1 -TimeoutSec 15).StatusCode
```

Expected: `200`.

- [ ] **Step 6: Commit final generated/docs changes**

```bash
git add docs/ODONTOGRAMA-V3.md apps/legacy-preview/denty-app.bundle.js apps/web/public/denty-app.bundle.js apps/web/public/styles/styles.css apps/web/src/lib/legacy-shell.ts
git commit -m "Document and ship odontogram v3"
```

If there are no shell changes in `apps/web/src/lib/legacy-shell.ts`, omit it from the commit.

- [ ] **Step 7: Push**

```bash
git push origin main
```

Expected: GitHub `main` contains Odontograma V3.


