"use client";

import type { CSSProperties } from "react";
import { CLINICAL_FAMILY_LABELS, type ClinicalGlyphModel, type ToothSurface } from "@/domain";
import { ClinicalIconPaths } from "./clinical-icon-paths";
import { SURFACE_MAP_PATHS, surfaceMapLayout } from "./tooth-geometry";
import styles from "./clinical-glyph.module.css";

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
  return [
    glyph.urgent && glyph.family !== "emergency" ? "Urgencia" : null,
    glyph.state === "post_pending" || glyph.state === "post_bad"
      ? "Perno"
      : CLINICAL_FAMILY_LABELS[glyph.family],
    glyph.location,
    glyph.surfaces.map((surface) => SURFACE_NAMES[surface]).join(", "),
    glyph.family === "restorative_surface" && glyph.surfaces.length === 0
      ? "Superficies no especificadas"
      : null,
    glyph.clinicalState === "redo"
      ? "Tratamiento existente insatisfactorio · Rehacer"
      : "Pendiente",
    glyph.label,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Shared clinical symbol for the agenda and treatment selector, with odontogram surface orientation. */
export function ClinicalGlyph({
  glyph,
  mode = "compact",
  showToothNumber = true,
  size,
}: {
  glyph: ClinicalGlyphModel;
  mode?: ClinicalGlyphMode;
  showToothNumber?: boolean;
  size?: number;
}) {
  const description = describeClinicalGlyph(glyph);
  const surfaceMap = glyph.family === "restorative_surface" || glyph.family === "sealant";
  const layout = surfaceMapLayout(glyph.tooth ?? "16");
  const iconStyle: CSSProperties | undefined = size ? { width: size, height: size } : undefined;
  return (
    <span
      className={styles.glyph}
      data-mode={mode}
      data-family={glyph.family}
      data-clinical-state={glyph.clinicalState}
      role="img"
      aria-label={description}
      title={description}
    >
      <svg
        className={styles.icon}
        style={iconStyle}
        viewBox={surfaceMap ? "0 0 44 44" : "0 0 24 24"}
        fill="none"
        stroke="currentColor"
        strokeWidth={surfaceMap ? 2 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {surfaceMap ? (
          <>
            {(["top", "left", "center", "right", "bottom"] as const).map((position) => {
              const surface = layout[position];
              const active =
                (glyph.family === "sealant" &&
                  glyph.surfaces.length === 0 &&
                  position === "center") ||
                glyph.surfaces.some(
                  (item) =>
                    item === surface ||
                    (position === "center" && (item === "O" || item === "I")) ||
                    ((position === "top" || position === "bottom") &&
                      (item === "P" || item === "L") &&
                      (surface === "P" || surface === "L")),
                );
              return (
                <path
                  key={position}
                  className={styles.surface}
                  d={SURFACE_MAP_PATHS[position]}
                  data-surface={surface}
                  data-active={active}
                />
              );
            })}
            {glyph.family === "restorative_surface" && glyph.surfaces.length === 0 ? (
              <path className={styles.unknownOutline} d={SURFACE_MAP_PATHS.frame} />
            ) : null}
          </>
        ) : (
          <>
            <ClinicalIconPaths
              family={glyph.family}
              post={glyph.state === "post_pending" || glyph.state === "post_bad"}
            />
            {glyph.clinicalState === "redo" ? (
              <rect
                className={styles.redoOutline}
                x="0.75"
                y="0.75"
                width="22.5"
                height="22.5"
                rx="5"
              />
            ) : null}
          </>
        )}
      </svg>
      {glyph.location && showToothNumber ? (
        <span className={styles.toothNumber}>{glyph.location}</span>
      ) : null}
      {glyph.urgent && glyph.family !== "emergency" ? (
        <span className={styles.alert} aria-hidden="true">
          !
        </span>
      ) : null}
    </span>
  );
}

/** Overflow opens with the containing appointment, including on touch devices. */
export function ClinicalGlyphs({
  glyphs,
  max = 3,
  mode = "micro",
}: {
  glyphs: readonly ClinicalGlyphModel[];
  max?: number;
  mode?: ClinicalGlyphMode;
}) {
  const visible = glyphs.slice(0, max);
  const remaining = glyphs.slice(max);
  return (
    <span className={styles.list}>
      {visible.map((glyph, index) => (
        <ClinicalGlyph
          key={`${glyph.family}-${glyph.location}-${index}`}
          glyph={glyph}
          mode={mode}
        />
      ))}
      {remaining.length ? (
        <span
          className={styles.overflow}
          aria-label={`${remaining.length} tratamientos más. Abrir cita para ver el detalle.`}
          title={remaining.map(describeClinicalGlyph).join("\n")}
        >
          +{remaining.length}
        </span>
      ) : null}
    </span>
  );
}
