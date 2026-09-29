"use client";

import { Progress, type ProgressProps } from "@mantine/core";
import { animate } from "motion";
import { useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

export interface AnimatedProgressProps extends Omit<ProgressProps, "value"> {
  value: number;
  duration?: number;
  delay?: number;
  "aria-label"?: string;
}

export function AnimatedProgress({
  value,
  duration = 0.6,
  delay = 0,
  "aria-label": ariaLabel,
  ...props
}: AnimatedProgressProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const inView = useInView(rootRef, { amount: 0.45, once: true });
  const [displayValue, setDisplayValue] = useState(reducedMotion ? value : 0);

  useEffect(() => {
    if (reducedMotion) {
      setDisplayValue(value);
      return;
    }
    if (!inView) return;
    const controls = animate(0, value, {
      duration,
      delay,
      ease: "easeOut",
      onUpdate: setDisplayValue,
    });
    return () => controls.stop();
  }, [delay, duration, inView, reducedMotion, value]);

  return (
    <div ref={rootRef} aria-label={`${ariaLabel ?? "Progreso"}: ${value}%`}>
      <Progress {...props} value={displayValue} aria-hidden="true" />
    </div>
  );
}
