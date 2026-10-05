"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { motionTokens } from "./motion-tokens";
import styles from "./motion-page.module.css";

// Keep foreground contrast stable during frequent page changes; a short positional settle is enough.
export const PAGE_ENTER = { initial: { y: 4 }, animate: { y: 0 }, duration: 0.12 } as const;

export function MotionPage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string | undefined;
}) {
  const reducedMotion = useReducedMotion();
  const pageClassName = className ? `${styles.page} ${className}` : styles.page;

  return (
    <motion.div
      className={pageClassName}
      initial={reducedMotion ? false : PAGE_ENTER.initial}
      animate={PAGE_ENTER.animate}
      transition={{ duration: PAGE_ENTER.duration, ease: motionTokens.easing.standard }}
    >
      {children}
    </motion.div>
  );
}
