import { archForTooth, occlusalSurfaceForTooth, toothType, type ToothSurface } from "@/domain";

// Single source of tooth geometry: the odontogram and every compact clinical glyph
// (agenda, plan, budget…) draw the same anatomy with the same surface positions.
export const CROWN_PATHS = {
  incisor: "M16 15 C19 8 45 8 48 15 L46 44 C44 52 20 52 18 44 Z",
  canine: "M17 21 Q23 10 32 7 Q41 10 47 21 L44 45 Q32 55 20 45 Z",
  premolar: "M14 20 Q17 10 27 13 Q32 6 37 13 Q47 10 50 20 L47 46 Q32 56 17 46 Z",
  molar: "M10 21 Q13 9 24 13 Q32 6 40 13 Q51 9 54 21 L51 47 Q44 55 32 52 Q20 55 13 47 Z",
} as const;

export const ROOT_PATHS = {
  incisor: "M23 45 C24 61 26 78 31 86 C35 79 40 61 41 45",
  canine: "M24 45 C25 64 28 82 32 88 C36 81 39 63 40 45",
  premolar:
    "M22 45 C22 60 19 76 23 85 C29 78 30 61 31 47 " +
    "M34 47 C35 62 36 78 41 84 C45 73 42 58 42 45",
  molar:
    "M18 45 C18 60 14 74 18 84 C24 79 27 61 28 47 " +
    "M36 47 C37 62 39 79 46 84 C50 73 46 58 46 45",
} as const;

export const SURFACE_PATHS = {
  V: "M7 6 H57 L45 27 H19 Z",
  left: "M7 6 L19 27 V45 L7 59 Z",
  occlusal: "M19 27 H45 V45 H19 Z",
  right: "M57 6 L45 27 V45 L57 59 Z",
  inner: "M7 59 H57 L45 45 H19 Z",
} as const;

export const TOOTH_MARK_PATHS = {
  endo: "M31 46 C31 58 30 70 31 82",
  post: "M32 35 L32 73",
  implantBody: "M27 48 L37 48 L39 75 L32 84 L25 75 Z",
  implantThreads: "M26 55 H38 M26 61 H38 M27 67 H37 M28 73 H36",
  prosthesis: "M15 18 Q32 8 49 18 L45 38 Q32 31 19 38 Z",
  extraction: "M14 18 L50 70 M50 18 L14 70",
  missing: "M13 45 H51",
} as const;

export interface ToothSurfaceLayout {
  left: ToothSurface;
  right: ToothSurface;
  occlusal: ToothSurface;
  inner: ToothSurface;
}

/** Anatomical orientation shared by the odontogram and its compact renderings. */
export function toothSurfaceLayout(tooth: string): ToothSurfaceLayout {
  const quadrant = Number(tooth[0]);
  // Right side of the patient (1, 4 and primary 5, 8) is drawn on the left of the chart.
  const mesialOnRight = [1, 4, 5, 8].includes(quadrant);
  return {
    left: mesialOnRight ? "D" : "M",
    right: mesialOnRight ? "M" : "D",
    occlusal: occlusalSurfaceForTooth(tooth),
    inner: archForTooth(tooth) === "upper" ? "P" : "L",
  };
}

export { archForTooth, toothType };

/**
 * Classic five-area surface map (outer square, inner square and diagonals), drawn
 * next to each tooth so every surface has a clearly delimited, clickable area.
 * viewBox 0 0 44 44.
 */
export const SURFACE_MAP_PATHS = {
  frame: "M1 1 H43 V43 H1 Z",
  top: "M1 1 H43 L30 14 H14 Z",
  left: "M1 1 L14 14 V30 L1 43 Z",
  center: "M14 14 H30 V30 H14 Z",
  right: "M43 1 L30 14 V30 L43 43 Z",
  bottom: "M1 43 H43 L30 30 H14 Z",
} as const;

export interface SurfaceMapLayout {
  top: ToothSurface;
  bottom: ToothSurface;
  left: ToothSurface;
  right: ToothSurface;
  center: ToothSurface;
}

/**
 * Orientation of the surface map as the chart is read (patient facing us: the
 * patient's right, quadrants 1 and 4, on the left of the screen):
 * - mesial always faces the midline: on the right for quadrants 1/4 (and 5/8),
 *   on the left for quadrants 2/3 (and 6/7);
 * - vestibular faces outwards (top for the maxilla, bottom for the mandible) and
 *   palatal/lingual faces the occlusal plane in the middle of the chart;
 * - the centre is occlusal on posterior teeth and incisal on anterior teeth.
 */
export function surfaceMapLayout(tooth: string): SurfaceMapLayout {
  const { left, right, occlusal, inner } = toothSurfaceLayout(tooth);
  const upper = archForTooth(tooth) === "upper";
  return {
    top: upper ? "V" : inner,
    bottom: upper ? inner : "V",
    left,
    right,
    center: occlusal,
  };
}
