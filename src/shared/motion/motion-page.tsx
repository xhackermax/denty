"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { motionTokens } from "./motion-tokens";
import { useVisualPreferences } from "@/shared/ui/visual-preferences-provider";
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
  const { animations } = useVisualPreferences();
  const skipMotion = !animations || reducedMotion;
  const pageClassName = className ? `${styles.page} ${className}` : styles.page;

  return (
    <motion.div
      className={pageClassName}
      initial={skipMotion ? false : PAGE_ENTER.initial}
      animate={PAGE_ENTER.animate}
      transition={{ duration: skipMotion ? 0 : PAGE_ENTER.duration, ease: motionTokens.easing.standard }}
    >
      {children}
    </motion.div>
  );
}
