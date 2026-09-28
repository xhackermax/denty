"use client";

import { motion, useReducedMotion } from "motion/react";

import { formatEUR } from "@/domain/money";
import type { DoctorMetric, MonthlyMetric, TreatmentMetric } from "@/domain";
import styles from "@/shared/ui/parity.module.css";

const SEGMENT_VARS = [
  "--denty-chart-1",
  "--denty-chart-2",
  "--denty-chart-3",
  "--denty-chart-4",
  "--denty-chart-5",
  "--denty-chart-6",
  "--denty-chart-7",
  "--denty-chart-8",
] as const;

function safeTotal(values: readonly number[]) {
  return values.reduce((sum, value) => sum + Math.max(0, Number.isFinite(value) ? value : 0), 0);
}

export function TreatmentDonut({ metrics }: { metrics: readonly TreatmentMetric[] }) {
  const reducedMotion = useReducedMotion();
  const rows = metrics.filter((item) => item.producedCents > 0);
  const total = safeTotal(rows.map((item) => item.producedCents));
  if (!total) return <div className={styles.chartEmpty}>Sin datos</div>;
  let cursor = 0;
  const segments = rows.map((item, index) => {
    const start = cursor;
    cursor += (item.producedCents / total) * 100;
    return `var(${SEGMENT_VARS[index % SEGMENT_VARS.length]}) ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
  });
  const donutStyle = { background: `conic-gradient(${segments.join(",")})` };
  return (
    <div className={styles.chartBlock} aria-label="Producción por tratamiento">
      <div className={styles.donutWrap}>
        <motion.div
          className={styles.donut}
          data-motion="treatment-donut"
          style={donutStyle}
          role="img"
          aria-label={`Producción total ${formatEUR(total)}`}
          initial={reducedMotion ? false : { clipPath: "inset(0 100% 0 0)", opacity: 0.6 }}
          whileInView={{ clipPath: "inset(0 0% 0 0)", opacity: 1 }}
          viewport={{ once: true, amount: 0.45 }}
          transition={{ duration: reducedMotion ? 0 : 0.65, ease: "easeOut" }}
        >
          <span>{formatEUR(total)}</span>
        </motion.div>
        <div className={styles.chartLegend}>
          {rows.map((item, index) => {
            const percent = (item.producedCents / total) * 100;
            return (
              <div className={styles.chartLegendRow} key={item.label}>
                <i data-index={index % SEGMENT_VARS.length} aria-hidden="true" />
                <span>{item.label}</span>
                <strong>
                  {percent.toFixed(0)}% · {formatEUR(item.producedCents)}
                </strong>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function DoctorBars({ metrics }: { metrics: readonly DoctorMetric[] }) {
  const reducedMotion = useReducedMotion();
  const max = Math.max(0, ...metrics.map((item) => item.producedCents));
  if (!max) return <div className={styles.chartEmpty}>Sin datos</div>;
  return (
    <div className={styles.barChart} aria-label="Producción por odontólogo">
      {metrics.map((item, index) => {
        const width = Math.max(2, (item.producedCents / max) * 100);
        return (
          <div className={styles.barRow} key={item.id ?? item.name}>
            <div className={styles.barLabel}>
              <span>{item.name}</span>
              <strong>{formatEUR(item.producedCents)}</strong>
            </div>
            <div className={styles.barTrack} aria-hidden="true">
              <motion.span
                data-motion="doctor-bar"
                style={{ width: `${width}%`, transformOrigin: "left center" }}
                initial={reducedMotion ? false : { scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: reducedMotion ? 0 : 0.6, delay: reducedMotion ? 0 : index * 0.05, ease: "easeOut" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function MonthlyTrend({ metrics }: { metrics: readonly MonthlyMetric[] }) {
  const reducedMotion = useReducedMotion();
  const max = Math.max(0, ...metrics.map((item) => item.producedCents));
  if (!max || metrics.length < 2) return <div className={styles.chartEmpty}>Sin datos</div>;
  const points = metrics
    .map((item, index) => {
      const x = metrics.length === 1 ? 0 : (index / (metrics.length - 1)) * 100;
      const y = 94 - (item.producedCents / max) * 84;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  return (
    <div className={styles.trendChart} aria-label="Evolución mensual de producción">
      <svg
        viewBox="0 0 100 100"
        role="img"
        aria-label="Curva de producción mensual"
        preserveAspectRatio="none"
      >
        <motion.polyline
          data-motion="monthly-line"
          points={points}
          fill="none"
          vectorEffect="non-scaling-stroke"
          initial={reducedMotion ? false : { pathLength: 0, opacity: 0.5 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: reducedMotion ? 0 : 0.7, ease: "easeOut" }}
        />
      </svg>
      <div className={styles.trendLabels}>
        {metrics.map((item) => (
          <span key={item.month}>
            <b>{item.month}</b>
            <small>{formatEUR(item.producedCents)}</small>
          </span>
        ))}
      </div>
    </div>
  );
}
