"use client";

import { IconAlertTriangleFilled } from "@tabler/icons-react";

import type { ClinicalGlyphModel, ToothSurface } from "@/domain";
import odontogramStyles from "@/features/odontogram/odontogram.module.css";
import styles from "./clinical-glyph.module.css";
import {
  CROWN_PATHS,
  ROOT_PATHS,
  SURFACE_PATHS,
  TOOTH_MARK_PATHS,
  archForTooth,
  toothSurfaceLayout,
  toothType,
} from "./tooth-geometry";
import { TOOTH_STATE_LABELS } from "./tooth-state-labels";

const SURFACE_NAMES: Readonly<Record<ToothSurface, string>> = {
  V: "vestibular",
  M: "mesial",
  O: "oclusal",
  I: "incisal",
  D: "distal",
  P: "palatina",
  L: "lingual",
};

export type ClinicalGlyphMode = "compact" | "micro";

export function describeClinicalGlyph(glyph: ClinicalGlyphModel): string {
  const parts: string[] = [];
  if (glyph.urgent) parts.push("Urgencia");
  if (glyph.state) parts.push(TOOTH_STATE_LABELS[glyph.state]);
  if (glyph.tooth) parts.push(`pieza ${glyph.tooth}`);
  if (glyph.surfaces.length) {
    parts.push(glyph.surfaces.map((surface) => SURFACE_NAMES[surface]).join(", "));
  }
  return parts.join(" · ");
}

/**
 * Read-only miniature of the odontogram tooth. Same geometry, same surface
 * orientation and same CSS state classes as the odontogram itself.
 */
export function ClinicalGlyph({
  glyph,
  mode = "compact",
  showToothNumber = true,
}: {
  glyph: ClinicalGlyphModel;
  mode?: ClinicalGlyphMode;
  showToothNumber?: boolean;
}) {
  const description = describeClinicalGlyph(glyph);
  const tooth = glyph.tooth;
  return (
    <span className={styles.glyph} data-mode={mode} role="img" aria-label={description}>
      {glyph.urgent ? (
        <IconAlertTriangleFilled className={styles.alert} aria-hidden="true" />
      ) : null}
      {tooth ? <ToothMiniature tooth={tooth} glyph={glyph} /> : null}
      {tooth && showToothNumber ? <span className={styles.toothNumber}>{tooth}</span> : null}
    </span>
  );
}

function ToothMiniature({ tooth, glyph }: { tooth: string; glyph: ClinicalGlyphModel }) {
  const type = toothType(tooth);
  const arch = archForTooth(tooth);
  const layout = toothSurfaceLayout(tooth);
  const whole = glyph.surfaces.length === 0;
  const state = glyph.state ?? "";
  const stateFor = (surface: ToothSurface) =>
    whole || glyph.surfaces.includes(surface) ? state : "";
  const clipId = `denty-glyph-${tooth}-${state || "none"}-${glyph.surfaces.join("")}`;
  const surface = (key: keyof typeof SURFACE_PATHS, name: ToothSurface) => (
    <path className={odontogramStyles.surface} data-state={stateFor(name)} d={SURFACE_PATHS[key]} />
  );

  return (
    <svg
      className={styles.tooth}
      data-arch={arch}
      data-state={state || "healthy"}
      viewBox="0 0 64 90"
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>
          <path d={CROWN_PATHS[type]} />
        </clipPath>
      </defs>
      <path className={odontogramStyles.rootShape} d={ROOT_PATHS[type]} />
      <path className={odontogramStyles.crownBase} d={CROWN_PATHS[type]} />
      <g clipPath={`url(#${clipId})`}>
        {surface("V", "V")}
        {surface("left", layout.left)}
        {surface("occlusal", layout.occlusal)}
        {surface("right", layout.right)}
        {surface("inner", layout.inner)}
      </g>
      <path className={odontogramStyles.crownOutline} d={CROWN_PATHS[type]} />
      {state.startsWith("endo") ? (
        <path className={odontogramStyles.endoMark} d={TOOTH_MARK_PATHS.endo} />
      ) : null}
      {state.startsWith("implant") ? (
        <g className={odontogramStyles.implantMark}>
          <path d={TOOTH_MARK_PATHS.implantBody} />
          <path d={TOOTH_MARK_PATHS.implantThreads} />
        </g>
      ) : null}
      {state === "extraction" ? (
        <path className={odontogramStyles.extractionMark} d={TOOTH_MARK_PATHS.extraction} />
      ) : null}
      {state === "missing" ? (
        <path className={odontogramStyles.missingMark} d={TOOTH_MARK_PATHS.missing} />
      ) : null}
    </svg>
  );
}
