"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { motionTokens } from "./motion-tokens";
import styles from "./motion-page.module.css";

// Staff switch sections hundreds of times a day: a slide or an exit animation makes every switch
// feel slower. A short fade-in only softens the content swap; the old page leaves at once.
export const PAGE_ENTER = { initial: { opacity: 0 }, duration: 0.12 } as const;

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
      animate={{ opacity: 1 }}
      transition={{ duration: PAGE_ENTER.duration, ease: motionTokens.easing.standard }}
    >
      {children}
    </motion.div>
  );
}
