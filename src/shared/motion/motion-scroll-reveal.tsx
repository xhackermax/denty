"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import type { MotionIntensity } from "./motion-tokens";
import { motionTokens } from "./motion-tokens";

export function MotionScrollReveal({
  children,
  className,
  intensity = "normal",
  delay = 0,
}: {
  children: ReactNode;
  className?: string | undefined;
  intensity?: MotionIntensity;
  delay?: number;
}) {
  const reducedMotion = useReducedMotion();
  const distance = intensity === "subtle" ? 18 : intensity === "expressive" ? 58 : 34;
  const initialScale = intensity === "expressive" ? 0.94 : intensity === "normal" ? 0.975 : 0.992;
  const initialBlur = intensity === "expressive" ? "blur(14px)" : intensity === "normal" ? "blur(8px)" : "blur(4px)";

  return (
    <motion.div
      className={className}
      initial={
        reducedMotion
          ? false
          : {
              opacity: 0,
              y: distance,
              scale: initialScale,
              filter: initialBlur,
              rotateX: intensity === "expressive" ? 5 : 0,
            }
      }
      whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)", rotateX: 0 }}
      viewport={{ once: true, amount: intensity === "expressive" ? 0.12 : 0.18 }}
      transition={{
        duration: reducedMotion ? 0 : intensity === "expressive" ? 0.72 : motionTokens.duration.panel,
        delay: reducedMotion ? 0 : delay,
        ease: motionTokens.easing.standard,
      }}
    >
      {children}
    </motion.div>
  );
}
