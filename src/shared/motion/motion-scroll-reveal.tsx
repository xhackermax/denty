"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import type { MotionIntensity } from "./motion-tokens";
import { motionTokens } from "./motion-tokens";
import { useVisualPreferences } from "@/shared/ui/visual-preferences-provider";

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
  const { animations } = useVisualPreferences();
  const skipMotion = !animations || reducedMotion;
  const distance = intensity === "subtle" ? 18 : intensity === "expressive" ? 58 : 34;

  return (
    <motion.div
      className={className}
      initial={
        skipMotion
          ? false
          : {
              y: distance,
            }
      }
      whileInView={{ y: 0 }}
      viewport={{ once: true, amount: intensity === "expressive" ? 0.12 : 0.18 }}
      transition={{
        duration: skipMotion
          ? 0
          : intensity === "expressive"
            ? 0.72
            : motionTokens.duration.panel,
        delay: skipMotion ? 0 : delay,
        ease: motionTokens.easing.standard,
      }}
    >
      {children}
    </motion.div>
  );
}
