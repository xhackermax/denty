"use client";

import { animate } from "motion";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { motionTokens } from "./motion-tokens";
import { shouldStartSpeedingMetric } from "./speeding-metric-trigger";
import styles from "./speeding-metric.module.css";

type MetricKind = "number" | "currency" | "percent";

interface MetricFormatOptions {
  kind?: MetricKind;
  locale?: string;
  decimals?: number | undefined;
  currency?: string;
}

interface SpeedingMetricProps extends MetricFormatOptions {
  value: number;
  className?: string | undefined;
  duration?: number | undefined;
  travel?: number | undefined;
  maxBlur?: number | undefined;
  "aria-label"?: string | undefined;
}

export function formatSpeedingMetric(
  value: number,
  { kind = "number", locale = "es-ES", decimals, currency = "EUR" }: MetricFormatOptions = {},
): string {
  if (kind === "currency") {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: decimals ?? 0,
      minimumFractionDigits: decimals ?? 0,
    }).format(value);
  }

  if (kind === "percent") {
    return new Intl.NumberFormat(locale, {
      style: "percent",
      maximumFractionDigits: decimals ?? 0,
      minimumFractionDigits: decimals ?? 0,
    }).format(value / 100);
  }

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: decimals ?? 0,
    minimumFractionDigits: decimals ?? 0,
    useGrouping: true,
  }).format(value);
}

export function SpeedingMetric({
  value,
  className,
  duration = 2.2,
  travel = 90,
  maxBlur = 14,
  kind = "number",
  locale = "es-ES",
  decimals,
  currency = "EUR",
  "aria-label": ariaLabel,
}: SpeedingMetricProps) {
  const reducedMotion = useReducedMotion();
  const rootRef = useRef<HTMLSpanElement>(null);
  const hasPlayedRef = useRef(false);
  const inView = useInView(rootRef, { amount: 0.55 });
  const [hasScrolled, setHasScrolled] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);
  const [speeding, setSpeeding] = useState(false);
  const finalText = formatSpeedingMetric(value, { kind, locale, decimals, currency });
  const displayText = formatSpeedingMetric(displayValue, { kind, locale, decimals, currency });

  useEffect(() => {
    if (reducedMotion || hasScrolled) return;

    const armFromScroll = () => setHasScrolled(true);
    window.addEventListener("scroll", armFromScroll, { capture: true, passive: true });

    return () => window.removeEventListener("scroll", armFromScroll, true);
  }, [hasScrolled, reducedMotion]);

  useEffect(() => {
    if (reducedMotion) {
      hasPlayedRef.current = true;
      setDisplayValue(value);
      setSpeeding(false);
      return;
    }

    if (
      !shouldStartSpeedingMetric({
        hasScrolled,
        inView,
        reducedMotion: false,
        hasPlayed: hasPlayedRef.current,
      })
    ) {
      return;
    }

    hasPlayedRef.current = true;
    setDisplayValue(0);
    setSpeeding(true);

    const controls = animate(0, value, {
      duration,
      ease: motionTokens.easing.standard,
      onUpdate: setDisplayValue,
      onComplete: () => {
        setDisplayValue(value);
        setSpeeding(false);
      },
    });

    return () => controls.stop();
  }, [duration, hasScrolled, inView, reducedMotion, value]);

  const settled = reducedMotion || !speeding;

  return (
    <span
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(" ")}
      aria-label={ariaLabel ? `${ariaLabel}: ${finalText}` : finalText}
      data-speeding={speeding ? "true" : undefined}
    >
      <motion.span
        aria-hidden="true"
        className={styles.value}
        initial={false}
        animate={
          settled
            ? { x: 0, skewX: 0, scaleX: 1, filter: "blur(0px)", opacity: 1 }
            : {
                x: [travel, -travel * 0.16, 0],
                skewX: [-14, 5, 0],
                scaleX: [1.28, 0.94, 1],
                filter: [`blur(${maxBlur}px)`, `blur(${Math.max(3, maxBlur * 0.42)}px)`, "blur(0px)"],
                opacity: [0.2, 1, 1],
              }
        }
        transition={{ duration, ease: motionTokens.easing.standard }}
      >
        {displayText}
      </motion.span>

      <motion.span
        aria-hidden="true"
        data-speeding-trail="near"
        className={styles.trail}
        initial={false}
        animate={
          settled
            ? { x: 0, opacity: 0, filter: "blur(0px)", skewX: 0 }
            : {
                x: [travel * 1.35, travel * 0.18, 0],
                opacity: [0, 0.32, 0],
                filter: [`blur(${maxBlur}px)`, `blur(${Math.max(5, maxBlur * 0.62)}px)`, "blur(0px)"],
                skewX: [-18, -5, 0],
              }
        }
        transition={{ duration: duration * 0.82, ease: motionTokens.easing.standard }}
      >
        {displayText}
      </motion.span>

      <motion.span
        aria-hidden="true"
        data-speeding-trail="far"
        className={`${styles.trail} ${styles.trailFar}`}
        initial={false}
        animate={
          settled
            ? { x: 0, opacity: 0, filter: "blur(0px)", skewX: 0 }
            : {
                x: [travel * 1.9, travel * 0.42, 0],
                opacity: [0, 0.16, 0],
                filter: [`blur(${maxBlur}px)`, `blur(${Math.max(7, maxBlur * 0.78)}px)`, "blur(0px)"],
                skewX: [-22, -8, 0],
              }
        }
        transition={{ duration: duration * 0.68, ease: motionTokens.easing.standard }}
      >
        {displayText}
      </motion.span>
    </span>
  );
}
