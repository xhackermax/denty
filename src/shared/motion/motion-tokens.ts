export const motionTokens = {
  duration: {
    instant: 0.11,
    fast: 0.24,
    panel: 0.42,
  },
  distance: {
    page: 16,
    reveal: 24,
    hover: 3,
  },
  spring: {
    spatial: { type: "spring", stiffness: 360, damping: 34, mass: 0.72 } as const,
    expressive: { type: "spring", stiffness: 250, damping: 26, mass: 0.82 } as const,
  },
  easing: {
    standard: [0.22, 1, 0.36, 1] as [number, number, number, number],
  },
} as const;

export type MotionIntensity = "subtle" | "normal" | "expressive";
