"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { motionTokens } from "./motion-tokens";
import type { RouteTransitionDirection, RouteTransitionKind } from "./route-transition";
import styles from "./motion-page.module.css";

function transitionFrames(kind: RouteTransitionKind, direction: RouteTransitionDirection) {
  if (kind === "glide") {
    return {
      initial: { opacity: 0, x: direction * 16, scale: 0.995 },
      exit: { opacity: 0, x: direction * -12, scale: 0.995 },
      duration: 0.3,
    } as const;
  }
  if (kind === "lift") return { initial: { opacity: 0, y: 12, scale: 0.99 }, exit: { opacity: 0, y: -8, scale: 0.99 }, duration: 0.28 } as const;
  return {
    initial: { opacity: 0, x: direction * 6 },
    exit: { opacity: 0, x: direction * -4 },
    duration: 0.24,
  } as const;
}

export function MotionPage({
  children,
  className,
  transitionKind = "settle",
  transitionDirection = 1,
}: {
  children: ReactNode;
  className?: string | undefined;
  transitionKind?: RouteTransitionKind;
  transitionDirection?: RouteTransitionDirection;
}) {
  const reducedMotion = useReducedMotion();
  const frames = transitionFrames(transitionKind, transitionDirection);
  const pageClassName = className ? `${styles.page} ${className}` : styles.page;

  return (
    <motion.div
      className={pageClassName}
      data-transition-kind={transitionKind}
      data-transition-direction={transitionDirection}
      initial={reducedMotion ? false : frames.initial}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      exit={reducedMotion ? { opacity: 1 } : frames.exit}
      transition={{
        duration: reducedMotion ? 0 : frames.duration,
        ease: motionTokens.easing.standard,
      }}
    >
      {children}
    </motion.div>
  );
}
