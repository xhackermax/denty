"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import type { MotionIntensity } from "./motion-tokens";
import { motionTokens } from "./motion-tokens";

export function MotionPressable({
  children,
  className,
  intensity = "normal",
}: {
  children: ReactNode;
  className?: string | undefined;
  intensity?: MotionIntensity;
}) {
  const reducedMotion = useReducedMotion();
  const hoverY = intensity === "subtle" ? -1 : intensity === "expressive" ? -8 : -4;
  const hoverScale = intensity === "expressive" ? 1.025 : intensity === "normal" ? 1.008 : 1;
  const pressedScale = intensity === "expressive" ? 0.95 : intensity === "normal" ? 0.97 : 0.985;

  return (
    <motion.div
      className={className}
      whileHover={
        reducedMotion
          ? { y: 0, scale: 1, rotateX: 0 }
          : { y: hoverY, scale: hoverScale, rotateX: intensity === "expressive" ? 1.2 : 0 }
      }
      whileTap={{ scale: reducedMotion ? 1 : pressedScale }}
      transition={intensity === "expressive" ? motionTokens.spring.expressive : motionTokens.spring.spatial}
    >
      {children}
    </motion.div>
  );
}
