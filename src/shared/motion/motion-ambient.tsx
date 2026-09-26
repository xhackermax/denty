"use client";

import { motion, useReducedMotion } from "motion/react";

import styles from "./motion-ambient.module.css";

export function MotionAmbientBackdrop() {
  const reducedMotion = useReducedMotion();

  return (
    <div className={styles.ambient} aria-hidden="true">
      <motion.span
        className={`${styles.orb} ${styles.orbA}`}
        animate={
          reducedMotion
            ? { opacity: 0.16 }
            : {
                x: [0, -64, -18, 0],
                y: [0, 46, 18, 0],
                scale: [1, 1.14, 0.96, 1],
                opacity: [0.16, 0.26, 0.18, 0.16],
              }
        }
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.span
        className={`${styles.orb} ${styles.orbB}`}
        animate={
          reducedMotion
            ? { opacity: 0.14 }
            : {
                x: [0, 54, 22, 0],
                y: [0, -38, -12, 0],
                scale: [1, 0.94, 1.12, 1],
                opacity: [0.14, 0.23, 0.17, 0.14],
              }
        }
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.span
        className={`${styles.orb} ${styles.orbC}`}
        animate={
          reducedMotion
            ? { opacity: 0.09 }
            : {
                x: [0, -28, 36, 0],
                y: [0, 34, -24, 0],
                scale: [0.94, 1.08, 1, 0.94],
                opacity: [0.08, 0.16, 0.11, 0.08],
              }
        }
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className={styles.gridGlow} />
    </div>
  );
}
