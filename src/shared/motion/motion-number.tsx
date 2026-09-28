"use client";

import { SpeedingMetric } from "./speeding-metric";

export interface MotionNumberProps {
  value: number;
  format?: "number" | "currency" | "percent";
  duration?: number;
  decimals?: number;
  ariaLabel?: string;
  className?: string;
}

export function MotionNumber({
  value,
  format = "number",
  duration = 1,
  decimals,
  ariaLabel,
  className,
}: MotionNumberProps) {
  return (
    <SpeedingMetric
      value={value}
      kind={format}
      duration={duration}
      decimals={decimals}
      travel={14}
      maxBlur={0}
      aria-label={ariaLabel}
      className={className}
    />
  );
}
