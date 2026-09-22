# Denty Fase Clinica Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved clinical phase: complete periodontogram, orthodontic odontogram, age-aware pediatric odontogram, and visual endodontic diagnosis marks.

**Architecture:** Extend the existing domain modules first, then wire the clinical workspace tabs to those domain helpers. The odontogram remains the shared model; periodontics, orthodontics, pediatrics, endodontics, voice, and clinical plan consume compatible `DentalEntity` data instead of separate state trees.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Mantine, CSS Modules, Vitest, Testing Library, existing Denty BFF/demo data layer.

**Spec:** `docs/superpowers/specs/2026-09-22-denty-fase-clinica-design.md`

## Global Constraints

- Keep the application inside `apps/web`.
- Preserve the professional folder organization already pushed on `vercel-supabase-r6-deploy`.
- Do not duplicate the odontogram model; extend domain helpers around `DentalEntity`.
- All new business rules require failing tests before production code.
- Use SVG/CSS local marks for tooth visuals; do not add heavy drawing dependencies.
- Historical odontograms remain read-only.
- The final branch must pass domain tests and Vercel build before pushing.

## Review Focus

- Missing birth date: the pediatric selector must fall back to permanent dentition and show manual mode instead of crashing.
- Mixed dentition: temporary and permanent teeth must render together without duplicate React keys or broken FDI ordering.
- Endodontic icons: chronic apical abscess must render near the root without hiding tooth number or surfaces.
- Incompatible clinical states: implant and active caries must stay blocked from every UI path touched in this phase.
- Historical mode: tabs can be viewed, but no periodontal, orthodontic, pediatric, or endodontic edit action should mutate state.

---

## File Structure

- Modify `apps/web/src/domain/odontogram/index.ts`: dentition stage helpers, pediatric tooth sets, pediatric entity helpers, orthodontic entity helpers.
- Modify `apps/web/src/domain/periodontal/index.ts`: complete chart matrix, CAL helpers, risk classification.
- Modify `apps/web/src/domain/endodontics.ts`: visual diagnosis codes and SVG metadata resolver.
- Modify `apps/web/src/domain/index.ts`: export new domain APIs.
- Modify `apps/web/src/domain/__tests__/odontogram.test.ts`: tests for dentition, pediatric and orthodontic helpers, incompatibility regression.
- Modify `apps/web/src/domain/__tests__/periodontal.test.ts`: tests for full chart matrix and classification.
- Modify `apps/web/src/domain/__tests__/endodontics.test.ts`: tests for visual code mapping.
- Create `apps/web/src/features/odontogram/clinical-tabs.tsx`: compact tabs used by the workspace.
- Create `apps/web/src/features/odontogram/periodontogram-panel.tsx`: full periodontal chart UI.
- Create `apps/web/src/features/odontogram/orthodontic-panel.tsx`: orthodontic finding/appliance UI.
- Create `apps/web/src/features/odontogram/pediatric-panel.tsx`: pediatric/mixed/permanent chart UI.
- Create `apps/web/src/features/odontogram/endodontic-panel.tsx`: endodontic diagnosis UI.
- Modify `apps/web/src/features/odontogram/odontogram-workspace.tsx`: integrate tabs, shared render helpers, read-only behavior, and visual overlays.
- Modify `apps/web/src/features/odontogram/odontogram.module.css`: clinical tab layout, periodontogram grid, orthodontic/pediatric/endodontic visual marks.
- Create `apps/web/src/features/odontogram/odontogram-workspace.test.tsx`: smoke coverage for tabs and read-only constraints.

## Task 1: Dentition And Pediatric Domain

**Files:**
- Modify: `apps/web/src/domain/odontogram/index.ts`
- Modify: `apps/web/src/domain/index.ts`
- Test: `apps/web/src/domain/__tests__/odontogram.test.ts`

**Interfaces:**
- Produces: `type DentitionStage = "primary" | "mixed" | "permanent"`
- Produces: `dentitionStageForBirthDate(birthDate: string | undefined, today?: Date): DentitionStage`
- Produces: `teethForDentition(stage: DentitionStage): { upper: readonly string[]; lower: readonly string[] }`
- Produces: `createPediatricEntity(tooth: string, status: PediatricToothStatus): DentalEntity`

- [ ] **Step 1: Write failing dentition tests**

Add to `apps/web/src/domain/__tests__/odontogram.test.ts`:

```ts
it("elige denticion primaria, mixta y permanente por edad", () => {
  const today = new Date("2026-09-22T12:00:00.000Z");
  expect(dentitionStageForBirthDate("2021-09-22", today)).toBe("primary");
  expect(dentitionStageForBirthDate("2020-09-22", today)).toBe("mixed");
  expect(dentitionStageForBirthDate("2014-09-22", today)).toBe("mixed");
  expect(dentitionStageForBirthDate("2013-09-22", today)).toBe("permanent");
  expect(dentitionStageForBirthDate(undefined, today)).toBe("permanent");
});

it("devuelve dientes correctos para denticion primaria y mixta", () => {
  expect(teethForDentition("primary").upper).toEqual([...TEMPORARY_UPPER]);
  expect(teethForDentition("primary").lower).toEqual([...TEMPORARY_LOWER]);
  expect(teethForDentition("mixed").upper).toContain("11");
  expect(teethForDentition("mixed").upper).toContain("51");
  expect(teethForDentition("permanent").lower).toEqual([...PERMANENT_LOWER]);
});
```

Also import `dentitionStageForBirthDate`, `teethForDentition`, `TEMPORARY_UPPER`, and `TEMPORARY_LOWER`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/domain/__tests__/odontogram.test.ts`

Expected: FAIL because `dentitionStageForBirthDate` and `teethForDentition` are not exported.

- [ ] **Step 3: Implement minimal dentition helpers**

In `apps/web/src/domain/odontogram/index.ts`, add:

```ts
export type DentitionStage = "primary" | "mixed" | "permanent";

export function dentitionStageForBirthDate(
  birthDate: string | undefined,
  today = new Date(),
): DentitionStage {
  if (!birthDate) return "permanent";
  const born = new Date(`${birthDate}T00:00:00.000Z`);
  if (Number.isNaN(born.getTime())) return "permanent";
  let age = today.getUTCFullYear() - born.getUTCFullYear();
  const birthdayThisYear = new Date(Date.UTC(today.getUTCFullYear(), born.getUTCMonth(), born.getUTCDate()));
  if (today.getTime() < birthdayThisYear.getTime()) age -= 1;
  if (age <= 5) return "primary";
  if (age <= 12) return "mixed";
  return "permanent";
}

export function teethForDentition(stage: DentitionStage): {
  upper: readonly string[];
  lower: readonly string[];
} {
  if (stage === "primary") return { upper: TEMPORARY_UPPER, lower: TEMPORARY_LOWER };
  if (stage === "mixed") {
    return {
      upper: [...PERMANENT_UPPER, ...TEMPORARY_UPPER],
      lower: [...PERMANENT_LOWER, ...TEMPORARY_LOWER],
    };
  }
  return { upper: PERMANENT_UPPER, lower: PERMANENT_LOWER };
}
```

- [ ] **Step 4: Add pediatric entity test**

Add:

```ts
it("crea entidades pediatricas compatibles con DentalEntity", () => {
  expect(createPediatricEntity("75", "pulpotomy")).toMatchObject({
    tooth: "75",
    entityType: "PEDIATRIC",
    status: "pulpotomy",
    active: true,
  });
});
```

Import `createPediatricEntity`.

- [ ] **Step 5: Run test to verify it fails**

Run: `npm test -- src/domain/__tests__/odontogram.test.ts`

Expected: FAIL because `createPediatricEntity` is not exported.

- [ ] **Step 6: Implement pediatric entity helper**

Add:

```ts
export const PEDIATRIC_TOOTH_STATUSES = [
  "healthy",
  "early_caries",
  "sealant",
  "pulpotomy",
  "pulpectomy",
  "pediatric_crown",
  "exfoliated",
  "erupting",
  "space_maintainer",
] as const;

export type PediatricToothStatus = (typeof PEDIATRIC_TOOTH_STATUSES)[number];

export function createPediatricEntity(
  tooth: string,
  status: PediatricToothStatus,
): DentalEntity {
  parseTooth(tooth);
  return {
    id: `pediatric-${tooth}-${status}`,
    tooth,
    entityType: "PEDIATRIC",
    status,
    active: true,
  };
}
```

- [ ] **Step 7: Run task tests**

Run: `npm test -- src/domain/__tests__/odontogram.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/domain/odontogram/index.ts apps/web/src/domain/index.ts apps/web/src/domain/__tests__/odontogram.test.ts
git commit -m "feat: add clinical dentition domain"
```

## Task 2: Complete Periodontal Domain

**Files:**
- Modify: `apps/web/src/domain/periodontal/index.ts`
- Modify: `apps/web/src/domain/__tests__/periodontal.test.ts`

**Interfaces:**
- Consumes: existing `PeriodontalReading`
- Produces: `buildPeriodontalChart(readings: readonly PeriodontalReading[]): PeriodontalChart`
- Produces: `periodontalRiskForSummary(summary: PeriodontalSummary): PeriodontalRisk`

- [ ] **Step 1: Write failing chart matrix test**

Add to `apps/web/src/domain/__tests__/periodontal.test.ts`:

```ts
it("construye una matriz periodontal por diente y sitio con CAL", () => {
  const chart = buildPeriodontalChart([
    { tooth: "16", site: "MV", probingDepth: 6, recession: 2, bleeding: true, plaque: true, suppuration: true },
    { tooth: "16", site: "P/L", probingDepth: 4, recession: 1, mobility: 2, furcation: 1 },
  ]);

  expect(chart.teeth["16"]?.sites.MV).toMatchObject({
    probingDepth: 6,
    recession: 2,
    clinicalAttachmentLoss: 8,
    bleeding: true,
    plaque: true,
    suppuration: true,
  });
  expect(chart.teeth["16"]?.mobility).toBe(2);
  expect(chart.teeth["16"]?.furcation).toBe(1);
});
```

Import `buildPeriodontalChart`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/domain/__tests__/periodontal.test.ts`

Expected: FAIL because `buildPeriodontalChart` is missing.

- [ ] **Step 3: Implement periodontal matrix**

Add interfaces and implementation:

```ts
export interface PeriodontalSiteCell extends PeriodontalReading {
  clinicalAttachmentLoss: number;
}

export interface PeriodontalToothChart {
  tooth: string;
  sites: Partial<Record<PeriodontalSite, PeriodontalSiteCell>>;
  mobility?: number;
  furcation?: number;
}

export interface PeriodontalChart {
  teeth: Record<string, PeriodontalToothChart>;
  summary: PeriodontalSummary;
}

export function buildPeriodontalChart(
  readings: readonly PeriodontalReading[],
): PeriodontalChart {
  const teeth: Record<string, PeriodontalToothChart> = {};
  for (const reading of readings) {
    validatePeriodontalReading(reading);
    const site = normalizePeriodontalSite(reading.site);
    const tooth = teeth[reading.tooth] ?? { tooth: reading.tooth, sites: {} };
    const cell = {
      ...reading,
      site,
      clinicalAttachmentLoss: reading.probingDepth + reading.recession,
    };
    tooth.sites[site] = cell;
    if (reading.mobility !== undefined) tooth.mobility = reading.mobility;
    if (reading.furcation !== undefined) tooth.furcation = reading.furcation;
    teeth[reading.tooth] = tooth;
  }
  return { teeth, summary: summarizePeriodontal(readings) };
}
```

- [ ] **Step 4: Write failing risk classification test**

Add:

```ts
it("clasifica el riesgo periodontal desde el resumen", () => {
  expect(periodontalRiskForSummary({ siteCount: 0, bleedingPct: 0, plaquePct: 0, sitesAtLeast4: 0, sitesAtLeast5: 0, sitesAtLeast6: 0, sitesAtLeast7: 0, maxPD: 0, maxCAL: 0 })).toBe("normal");
  expect(periodontalRiskForSummary({ siteCount: 10, bleedingPct: 15, plaquePct: 20, sitesAtLeast4: 2, sitesAtLeast5: 0, sitesAtLeast6: 0, sitesAtLeast7: 0, maxPD: 4, maxCAL: 4 })).toBe("watch");
  expect(periodontalRiskForSummary({ siteCount: 10, bleedingPct: 35, plaquePct: 45, sitesAtLeast4: 5, sitesAtLeast5: 3, sitesAtLeast6: 1, sitesAtLeast7: 0, maxPD: 6, maxCAL: 6 })).toBe("moderate_periodontitis");
  expect(periodontalRiskForSummary({ siteCount: 10, bleedingPct: 60, plaquePct: 70, sitesAtLeast4: 7, sitesAtLeast5: 5, sitesAtLeast6: 3, sitesAtLeast7: 1, maxPD: 8, maxCAL: 9 })).toBe("advanced_periodontitis");
});
```

Import `periodontalRiskForSummary`.

- [ ] **Step 5: Run test to verify it fails**

Run: `npm test -- src/domain/__tests__/periodontal.test.ts`

Expected: FAIL because `periodontalRiskForSummary` is missing.

- [ ] **Step 6: Implement risk classification**

Add:

```ts
export type PeriodontalRisk =
  | "normal"
  | "watch"
  | "moderate_periodontitis"
  | "advanced_periodontitis";

export function periodontalRiskForSummary(summary: PeriodontalSummary): PeriodontalRisk {
  if (summary.maxPD >= 7 || summary.maxCAL >= 8 || summary.sitesAtLeast7 > 0) {
    return "advanced_periodontitis";
  }
  if (summary.maxPD >= 6 || summary.maxCAL >= 6 || summary.sitesAtLeast6 > 0) {
    return "moderate_periodontitis";
  }
  if (summary.maxPD >= 4 || summary.bleedingPct >= 10 || summary.plaquePct >= 20) {
    return "watch";
  }
  return "normal";
}
```

- [ ] **Step 7: Run task tests**

Run: `npm test -- src/domain/__tests__/periodontal.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/domain/periodontal/index.ts apps/web/src/domain/__tests__/periodontal.test.ts
git commit -m "feat: expand periodontal chart domain"
```

## Task 3: Endodontic Visual Diagnosis Domain

**Files:**
- Modify: `apps/web/src/domain/endodontics.ts`
- Modify: `apps/web/src/domain/__tests__/endodontics.test.ts`

**Interfaces:**
- Produces: `type EndodonticVisualCode`
- Produces: `endodonticVisualCodeForApicalDiagnosis(diagnosis: ApicalDiagnosis): EndodonticVisualCode`
- Produces: `ENDODONTIC_VISUAL_MARKS`

- [ ] **Step 1: Write failing visual code tests**

Add to `apps/web/src/domain/__tests__/endodontics.test.ts`:

```ts
it("asigna codigos visuales estables a diagnosticos apicales", () => {
  expect(endodonticVisualCodeForApicalDiagnosis("Tejidos apicales normales")).toBe("normal_apex");
  expect(endodonticVisualCodeForApicalDiagnosis("Absceso apical cronico")).toBe("chronic_apical_abscess");
  expect(endodonticVisualCodeForApicalDiagnosis("Absceso apical crónico")).toBe("chronic_apical_abscess");
});

it("define una marca SVG propia para absceso apical cronico", () => {
  expect(ENDODONTIC_VISUAL_MARKS.chronic_apical_abscess).toMatchObject({
    label: "Absceso apical cronico",
    severity: "warning",
  });
  expect(ENDODONTIC_VISUAL_MARKS.chronic_apical_abscess.svgPath).toContain("C");
});
```

Import `endodonticVisualCodeForApicalDiagnosis` and `ENDODONTIC_VISUAL_MARKS`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/domain/__tests__/endodontics.test.ts`

Expected: FAIL because the visual helpers do not exist.

- [ ] **Step 3: Implement visual code mapping**

Add:

```ts
export type EndodonticVisualCode =
  | "normal_apex"
  | "symptomatic_apical_periodontitis"
  | "asymptomatic_apical_periodontitis"
  | "acute_apical_abscess"
  | "chronic_apical_abscess"
  | "condensing_osteitis";

export interface EndodonticVisualMark {
  code: EndodonticVisualCode;
  label: string;
  severity: "neutral" | "info" | "warning" | "danger";
  svgPath: string;
}

export const ENDODONTIC_VISUAL_MARKS: Record<EndodonticVisualCode, EndodonticVisualMark> = {
  normal_apex: { code: "normal_apex", label: "Apice normal", severity: "neutral", svgPath: "M28 76 H36" },
  symptomatic_apical_periodontitis: { code: "symptomatic_apical_periodontitis", label: "Periodontitis apical sintomatica", severity: "warning", svgPath: "M24 75 C30 70 36 70 42 75" },
  asymptomatic_apical_periodontitis: { code: "asymptomatic_apical_periodontitis", label: "Periodontitis apical asintomatica", severity: "info", svgPath: "M24 75 C30 73 36 73 42 75" },
  acute_apical_abscess: { code: "acute_apical_abscess", label: "Absceso apical agudo", severity: "danger", svgPath: "M22 74 C26 66 38 66 42 74 C39 82 25 82 22 74" },
  chronic_apical_abscess: { code: "chronic_apical_abscess", label: "Absceso apical cronico", severity: "warning", svgPath: "M23 75 C25 67 39 67 41 75 C39 83 25 83 23 75 M41 75 C48 72 50 67 53 62" },
  condensing_osteitis: { code: "condensing_osteitis", label: "Osteitis condensante", severity: "info", svgPath: "M22 75 H42 M25 70 H39 M27 80 H37" },
};

export function endodonticVisualCodeForApicalDiagnosis(
  diagnosis: ApicalDiagnosis | "Absceso apical cronico",
): EndodonticVisualCode {
  if (diagnosis === "Tejidos apicales normales") return "normal_apex";
  if (diagnosis === "Periodontitis apical sintomatica") return "symptomatic_apical_periodontitis";
  if (diagnosis === "Periodontitis apical sintomÃ¡tica") return "symptomatic_apical_periodontitis";
  if (diagnosis === "Periodontitis apical asintomatica") return "asymptomatic_apical_periodontitis";
  if (diagnosis === "Periodontitis apical asintomÃ¡tica") return "asymptomatic_apical_periodontitis";
  if (diagnosis === "Absceso apical agudo") return "acute_apical_abscess";
  if (diagnosis === "Absceso apical cronico" || diagnosis === "Absceso apical crÃ³nico") return "chronic_apical_abscess";
  return "condensing_osteitis";
}
```

- [ ] **Step 4: Run task tests**

Run: `npm test -- src/domain/__tests__/endodontics.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/domain/endodontics.ts apps/web/src/domain/__tests__/endodontics.test.ts
git commit -m "feat: add endodontic visual diagnosis domain"
```

## Task 4: Orthodontic Domain Helpers

**Files:**
- Modify: `apps/web/src/domain/odontogram/index.ts`
- Modify: `apps/web/src/domain/__tests__/odontogram.test.ts`

**Interfaces:**
- Produces: `type OrthodonticAppliance`
- Produces: `createOrthodonticEntity(patientId: string, attributes: OrthodonticAttributes): DentalEntity`

- [ ] **Step 1: Write failing orthodontic helper test**

Add:

```ts
it("crea una entidad ortodontica de paciente sin duplicar dientes", () => {
  const entity = createOrthodonticEntity("patient-1", {
    molarClassRight: "I",
    molarClassLeft: "II",
    overjetMm: 4,
    overbitePct: 60,
    appliances: ["aligners", "retainer"],
  });

  expect(entity).toMatchObject({
    id: "orthodontic-patient-1",
    entityType: "ORTHODONTIC",
    status: "active",
    active: true,
  });
  expect(entity.tooth).toBeUndefined();
  expect(entity.attributes).toMatchObject({ overjetMm: 4, appliances: ["aligners", "retainer"] });
});
```

Import `createOrthodonticEntity`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/domain/__tests__/odontogram.test.ts`

Expected: FAIL because `createOrthodonticEntity` is missing.

- [ ] **Step 3: Implement orthodontic helper**

Add:

```ts
export type OrthodonticClass = "I" | "II" | "III";
export type OrthodonticAppliance =
  | "brackets"
  | "aligners"
  | "retainer"
  | "expander"
  | "lingual_arch"
  | "space_maintainer";

export interface OrthodonticAttributes {
  molarClassRight?: OrthodonticClass;
  molarClassLeft?: OrthodonticClass;
  canineClassRight?: OrthodonticClass;
  canineClassLeft?: OrthodonticClass;
  overjetMm?: number;
  overbitePct?: number;
  crossbite?: boolean;
  openBite?: boolean;
  deepBite?: boolean;
  midlineDeviationMm?: number;
  upperCrowdingMm?: number;
  lowerCrowdingMm?: number;
  upperSpacingMm?: number;
  lowerSpacingMm?: number;
  appliances?: readonly OrthodonticAppliance[];
  notes?: string;
}

export function createOrthodonticEntity(
  patientId: string,
  attributes: OrthodonticAttributes,
): DentalEntity {
  return {
    id: `orthodontic-${patientId}`,
    entityType: "ORTHODONTIC",
    status: "active",
    attributes: { ...attributes },
    active: true,
  };
}
```

- [ ] **Step 4: Run task tests**

Run: `npm test -- src/domain/__tests__/odontogram.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/domain/odontogram/index.ts apps/web/src/domain/__tests__/odontogram.test.ts
git commit -m "feat: add orthodontic odontogram domain"
```

## Task 5: Clinical Workspace Tabs

**Files:**
- Create: `apps/web/src/features/odontogram/clinical-tabs.tsx`
- Modify: `apps/web/src/features/odontogram/odontogram-workspace.tsx`
- Modify: `apps/web/src/features/odontogram/odontogram.module.css`
- Test: `apps/web/src/features/odontogram/odontogram-workspace.test.tsx`

**Interfaces:**
- Consumes: existing `OdontogramEditor`
- Produces: `type ClinicalTab = "general" | "periodontal" | "orthodontic" | "pediatric" | "endodontic" | "history"`
- Produces: `ClinicalTabs` component

- [ ] **Step 1: Write failing UI smoke test**

Create `apps/web/src/features/odontogram/odontogram-workspace.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ClinicalTabs } from "./clinical-tabs";

describe("ClinicalTabs", () => {
  it("muestra las vistas clinicas principales", () => {
    render(<ClinicalTabs active="general" onChange={() => undefined} />);
    expect(screen.getByRole("button", { name: "General" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Periodonto" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ortodoncia" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pediatrico" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Endodoncia" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Historial" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/odontogram/odontogram-workspace.test.tsx`

Expected: FAIL because `clinical-tabs.tsx` does not exist.

- [ ] **Step 3: Implement ClinicalTabs**

Create `clinical-tabs.tsx`:

```tsx
"use client";

import { Button, Group } from "@mantine/core";

import styles from "./odontogram.module.css";

export type ClinicalTab =
  | "general"
  | "periodontal"
  | "orthodontic"
  | "pediatric"
  | "endodontic"
  | "history";

const TABS: readonly { value: ClinicalTab; label: string }[] = [
  { value: "general", label: "General" },
  { value: "periodontal", label: "Periodonto" },
  { value: "orthodontic", label: "Ortodoncia" },
  { value: "pediatric", label: "Pediatrico" },
  { value: "endodontic", label: "Endodoncia" },
  { value: "history", label: "Historial" },
];

interface ClinicalTabsProps {
  active: ClinicalTab;
  onChange: (tab: ClinicalTab) => void;
}

export function ClinicalTabs({ active, onChange }: ClinicalTabsProps) {
  return (
    <Group className={styles.clinicalTabs} gap={6}>
      {TABS.map((tab) => (
        <Button
          key={tab.value}
          type="button"
          size="xs"
          variant={active === tab.value ? "filled" : "light"}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </Button>
      ))}
    </Group>
  );
}
```

- [ ] **Step 4: Add basic styles**

Add to `odontogram.module.css`:

```css
.clinicalTabs {
  border-bottom: 1px solid var(--denty-border-subtle);
  padding-bottom: 8px;
}
```

- [ ] **Step 5: Run task tests**

Run: `npm test -- src/features/odontogram/odontogram-workspace.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/odontogram/clinical-tabs.tsx apps/web/src/features/odontogram/odontogram-workspace.test.tsx apps/web/src/features/odontogram/odontogram.module.css
git commit -m "feat: add clinical odontogram tabs"
```

## Task 6: Periodontogram Panel UI

**Files:**
- Create: `apps/web/src/features/odontogram/periodontogram-panel.tsx`
- Modify: `apps/web/src/features/odontogram/odontogram-workspace.tsx`
- Modify: `apps/web/src/features/odontogram/odontogram.module.css`
- Modify: `apps/web/src/features/odontogram/odontogram-workspace.test.tsx`

**Interfaces:**
- Consumes: `buildPeriodontalChart`, `periodontalRiskForSummary`
- Produces: `PeriodontogramPanel`

- [ ] **Step 1: Write failing render test**

Add:

```tsx
it("muestra resumen periodontal completo", () => {
  render(<PeriodontogramPanel readOnly={false} />);
  expect(screen.getByText("Periodontograma completo")).toBeInTheDocument();
  expect(screen.getByText("BOP")).toBeInTheDocument();
  expect(screen.getByText("Max PD")).toBeInTheDocument();
  expect(screen.getByText("Furca")).toBeInTheDocument();
});
```

Import `PeriodontogramPanel`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/odontogram/odontogram-workspace.test.tsx`

Expected: FAIL because `PeriodontogramPanel` does not exist.

- [ ] **Step 3: Implement PeriodontogramPanel**

Create a compact panel with demo readings for teeth 16 and 36, summary chips, and a grid that displays PD, REC, CAL, BOP, plaque, suppuration, mobility and furcation. Inputs are disabled when `readOnly` is true.

- [ ] **Step 4: Add periodontal styles**

Add classes: `.clinicalPanel`, `.clinicalSummary`, `.periodontalGrid`, `.periodontalCell`, `.riskBadge`.

- [ ] **Step 5: Wire tab in workspace**

In `odontogram-workspace.tsx`, create `const [activeTab, setActiveTab] = useState<ClinicalTab>("general");`, render `ClinicalTabs`, and show `PeriodontogramPanel` when active tab is `periodontal`.

- [ ] **Step 6: Run task tests**

Run: `npm test -- src/features/odontogram/odontogram-workspace.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/odontogram/periodontogram-panel.tsx apps/web/src/features/odontogram/odontogram-workspace.tsx apps/web/src/features/odontogram/odontogram.module.css apps/web/src/features/odontogram/odontogram-workspace.test.tsx
git commit -m "feat: add periodontogram panel"
```

## Task 7: Orthodontic Panel UI

**Files:**
- Create: `apps/web/src/features/odontogram/orthodontic-panel.tsx`
- Modify: `apps/web/src/features/odontogram/odontogram-workspace.tsx`
- Modify: `apps/web/src/features/odontogram/odontogram.module.css`
- Modify: `apps/web/src/features/odontogram/odontogram-workspace.test.tsx`

**Interfaces:**
- Consumes: `createOrthodonticEntity`
- Produces: `OrthodonticPanel`

- [ ] **Step 1: Write failing render test**

Add:

```tsx
it("muestra controles de odontograma ortodontico", () => {
  render(<OrthodonticPanel patientId="patient-1" readOnly={false} onCommit={() => undefined} />);
  expect(screen.getByText("Odontograma ortodontico")).toBeInTheDocument();
  expect(screen.getByLabelText("Clase molar derecha")).toBeInTheDocument();
  expect(screen.getByLabelText("Overjet")).toBeInTheDocument();
  expect(screen.getByText("Alineadores")).toBeInTheDocument();
});
```

Import `OrthodonticPanel`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/odontogram/odontogram-workspace.test.tsx`

Expected: FAIL because `OrthodonticPanel` does not exist.

- [ ] **Step 3: Implement OrthodonticPanel**

Create a Mantine panel with selects for molar/canine classes, numeric inputs for overjet/overbite, toggles for bite findings, checkboxes for appliances, and a button that commits `createOrthodonticEntity(patientId, attributes)`.

- [ ] **Step 4: Wire tab in workspace**

Render `OrthodonticPanel` for `activeTab === "orthodontic"` and pass `commit` as `onCommit`. Disable in historical mode.

- [ ] **Step 5: Run task tests**

Run: `npm test -- src/features/odontogram/odontogram-workspace.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/odontogram/orthodontic-panel.tsx apps/web/src/features/odontogram/odontogram-workspace.tsx apps/web/src/features/odontogram/odontogram.module.css apps/web/src/features/odontogram/odontogram-workspace.test.tsx
git commit -m "feat: add orthodontic odontogram panel"
```

## Task 8: Pediatric Panel And Automatic Dentition UI

**Files:**
- Create: `apps/web/src/features/odontogram/pediatric-panel.tsx`
- Modify: `apps/web/src/features/odontogram/odontogram-workspace.tsx`
- Modify: `apps/web/src/features/odontogram/odontogram.module.css`
- Modify: `apps/web/src/features/odontogram/odontogram-workspace.test.tsx`

**Interfaces:**
- Consumes: `dentitionStageForBirthDate`, `teethForDentition`, `createPediatricEntity`
- Produces: `PediatricPanel`

- [ ] **Step 1: Write failing render test**

Add:

```tsx
it("muestra denticion pediatrica sugerida por edad", () => {
  render(<PediatricPanel birthDate="2020-09-22" readOnly={false} onCommit={() => undefined} />);
  expect(screen.getByText("Odontograma pediatrico")).toBeInTheDocument();
  expect(screen.getByText("Denticion mixta")).toBeInTheDocument();
  expect(screen.getByText("Raices fantasma")).toBeInTheDocument();
});
```

Import `PediatricPanel`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/odontogram/odontogram-workspace.test.tsx`

Expected: FAIL because `PediatricPanel` does not exist.

- [ ] **Step 3: Implement PediatricPanel**

Create a compact chart selector that displays suggested stage, manual override, pediatric action select, upper/lower tooth chips from `teethForDentition`, and a "Raices fantasma" legend. Commit selected pediatric entities through `onCommit`.

- [ ] **Step 4: Wire tab in workspace**

Add an optional `patientBirthDate?: string` prop to `OdontogramEditor` if patient data exposes it. If not available yet, pass `undefined`; the panel still works in manual mode.

- [ ] **Step 5: Add ghost root styles**

Add `.ghostRoot`, `.pediatricToothGrid`, and visual state classes for `exfoliated` and `erupting`.

- [ ] **Step 6: Run task tests**

Run: `npm test -- src/features/odontogram/odontogram-workspace.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/odontogram/pediatric-panel.tsx apps/web/src/features/odontogram/odontogram-workspace.tsx apps/web/src/features/odontogram/odontogram.module.css apps/web/src/features/odontogram/odontogram-workspace.test.tsx
git commit -m "feat: add pediatric odontogram panel"
```

## Task 9: Endodontic Panel And SVG Tooth Overlays

**Files:**
- Create: `apps/web/src/features/odontogram/endodontic-panel.tsx`
- Modify: `apps/web/src/features/odontogram/odontogram-workspace.tsx`
- Modify: `apps/web/src/features/odontogram/odontogram.module.css`
- Modify: `apps/web/src/features/odontogram/odontogram-workspace.test.tsx`

**Interfaces:**
- Consumes: `ENDODONTIC_VISUAL_MARKS`, `endodonticVisualCodeForApicalDiagnosis`
- Produces: `EndodonticPanel`
- Updates: `Tooth` renders endodontic visual marks from entity attributes.

- [ ] **Step 1: Write failing endodontic panel test**

Add:

```tsx
it("muestra diagnostico visual de absceso apical cronico", () => {
  render(<EndodonticPanel selectedTooth="11" readOnly={false} onCommit={() => undefined} />);
  expect(screen.getByText("Endodoncia visual")).toBeInTheDocument();
  expect(screen.getByLabelText("Diagnostico apical")).toBeInTheDocument();
  expect(screen.getByText("Absceso apical cronico")).toBeInTheDocument();
});
```

Import `EndodonticPanel`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/odontogram/odontogram-workspace.test.tsx`

Expected: FAIL because `EndodonticPanel` does not exist.

- [ ] **Step 3: Implement EndodonticPanel**

Create a panel with pulpal diagnosis select, apical diagnosis select, confidence select, and a commit button that writes a `DentalEntity` with `entityType: "ENDO"`, `status: "diagnosis"`, `tooth: selectedTooth`, and attributes containing `visualCode`.

- [ ] **Step 4: Render visual mark in Tooth SVG**

In `Tooth`, find active ENDO diagnosis entities for the tooth. If `attributes.visualCode` maps to `ENDODONTIC_VISUAL_MARKS`, render:

```tsx
<g className={styles.endoVisualMark} data-severity={mark.severity}>
  <path d={mark.svgPath} />
</g>
```

The chronic abscess mark must sit in the apical/root area.

- [ ] **Step 5: Wire tab in workspace**

Render `EndodonticPanel` for `activeTab === "endodontic"` and pass `selectedTooth`, `historical`, and `commit`.

- [ ] **Step 6: Run task tests**

Run: `npm test -- src/features/odontogram/odontogram-workspace.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/odontogram/endodontic-panel.tsx apps/web/src/features/odontogram/odontogram-workspace.tsx apps/web/src/features/odontogram/odontogram.module.css apps/web/src/features/odontogram/odontogram-workspace.test.tsx
git commit -m "feat: add endodontic visual odontogram"
```

## Task 10: Workspace Integration, Build, And Push

**Files:**
- Modify as needed from previous tasks only.

**Interfaces:**
- Consumes: all panels and domain helpers.
- Produces: final verified branch pushed to GitHub.

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm test -- src/domain/__tests__/odontogram.test.ts src/domain/__tests__/periodontal.test.ts src/domain/__tests__/endodontics.test.ts src/features/odontogram/odontogram-workspace.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run full test/build verification**

Run:

```bash
node scripts/pipeline/run.mjs vercel-build
```

Expected: PASS.

- [ ] **Step 3: Inspect changed files**

Run:

```bash
git status --short
git diff --stat
```

Expected: only clinical-phase files and generated build cache excluded.

- [ ] **Step 4: Revert unintended config churn**

If `apps/web/tsconfig.json` changed only because Next.js rewrote JSX settings, restore the previous intended value. Remove `.next` if created.

- [ ] **Step 5: Commit final integration if needed**

```bash
git add apps/web/src/domain apps/web/src/features/odontogram
git commit -m "feat: integrate clinical odontogram phase"
```

- [ ] **Step 6: Push to GitHub**

```bash
git push origin vercel-supabase-r6-deploy
```

Expected: branch is updated on `https://github.com/xhackermax/denty/tree/vercel-supabase-r6-deploy`.

- [ ] **Step 7: Report**

Report:

- Commit hashes.
- Tests/build run.
- Any deferred items from the spec.
- Whether the Vercel production deploy was triggered by GitHub.
