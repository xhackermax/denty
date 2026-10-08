"use client";

import { useLayoutEffect, useRef } from "react";
import styles from "./odontogram.module.css";

/**
 * The anatomical canvas always fits its own available rectangular viewport,
 * regardless of sidebar width, browser zoom, phone orientation or screen height.
 * Coordinates remain in the original tooth layout so SVG and periodontal marks
 * shrink together; CSS transforms preserve mouse/touch hit-testing.
 */
export function calculateMouthScale(
  viewportWidth: number,
  viewportHeight: number,
  canvasWidth: number,
  canvasHeight: number,
): number {
  if (
    viewportWidth <= 0 || viewportHeight <= 0 ||
    canvasWidth <= 0 || canvasHeight <= 0 ||
    ![viewportWidth, viewportHeight, canvasWidth, canvasHeight].every(Number.isFinite)
  ) return 0;
  return Math.min(1, viewportWidth / canvasWidth, viewportHeight / canvasHeight);
}

export function FittedMouthCanvas({ children }: { children: React.ReactNode }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const stage = stageRef.current;
    if (!viewport || !stage) return;

    const fit = () => {
      // offsetWidth/Height ignore the current transform: no feedback loop.
      const scale = calculateMouthScale(
        viewport.clientWidth - 2,
        viewport.clientHeight - 2,
        stage.offsetWidth,
        stage.offsetHeight,
      );
      if (scale > 0) stage.style.setProperty("--mouth-scale", String(scale));
    };

    fit();
    window.addEventListener("resize", fit);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(fit);
    observer?.observe(viewport);
    observer?.observe(stage);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, []);

  return (
    <div ref={viewportRef} className={styles.mouthFitViewport} aria-label="Odontograma completo ajustado">
      <div ref={stageRef} className={styles.mouthFitStage} data-mouth-fit="complete">
        {children}
      </div>
    </div>
  );
}
