"use client";

import type { CSSProperties } from "react";

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
  const rows = metrics.filter((item) => item.producedCents > 0);
  const total = safeTotal(rows.map((item) => item.producedCents));
  if (!total) return <div className={styles.chartEmpty}>Sin datos</div>;
  let cursor = 0;
  const segments = rows.map((item, index) => {
    const start = cursor;
    cursor += (item.producedCents / total) * 100;
    return `var(${SEGMENT_VARS[index % SEGMENT_VARS.length]}) ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
  });
  const donutStyle = { background: `conic-gradient(${segments.join(",")})` } as CSSProperties;
  return (
    <div className={styles.chartBlock} aria-label="Producción por tratamiento">
      <div className={styles.donutWrap}>
        <div
          className={styles.donut}
          style={donutStyle}
          role="img"
          aria-label={`Producción total ${formatEUR(total)}`}
        >
          <span>{formatEUR(total)}</span>
        </div>
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
  const max = Math.max(0, ...metrics.map((item) => item.producedCents));
  if (!max) return <div className={styles.chartEmpty}>Sin datos</div>;
  return (
    <div className={styles.barChart} aria-label="Producción por odontólogo">
      {metrics.map((item) => {
        const width = Math.max(2, (item.producedCents / max) * 100);
        return (
          <div className={styles.barRow} key={item.id ?? item.name}>
            <div className={styles.barLabel}>
              <span>{item.name}</span>
              <strong>{formatEUR(item.producedCents)}</strong>
            </div>
            <div className={styles.barTrack} aria-hidden="true">
              <span style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function MonthlyTrend({ metrics }: { metrics: readonly MonthlyMetric[] }) {
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
        <polyline points={points} fill="none" vectorEffect="non-scaling-stroke" />
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
