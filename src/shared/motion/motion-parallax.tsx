"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import type { ReactNode } from "react";
import { useRef } from "react";

import styles from "./motion-parallax.module.css";
import type { MotionIntensity } from "./motion-tokens";

export function MotionParallax({
  children,
  className,
  intensity = "subtle",
}: {
  children: ReactNode;
  className?: string | undefined;
  intensity?: Exclude<MotionIntensity, "normal">;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const range = intensity === "expressive" ? 64 : 20;
  const parallaxY = useTransform(scrollYProgress, [0, 1], [range, -range]);
  const motionStyle = { y: reducedMotion ? 0 : parallaxY };
  const classes = [styles.parallax, className].filter(Boolean).join(" ");

  return (
    <motion.div ref={ref} className={classes} style={motionStyle}>
      {children}
    </motion.div>
  );
}
