"use client";

import { Alert, Badge, Group, SegmentedControl, SimpleGrid, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { startOfReportingPeriodMadrid, toMadridISO, type ReportingPeriod } from "@/domain/dates";
import { formatEUR } from "@/domain/money";
import { getBrowserApi } from "@/shared/api/browser";
import {
  AnimatedProgress,
  MotionParallax,
  MotionScrollReveal,
  SpeedingMetric,
} from "@/shared/motion";
import { useActiveTenant } from "@/shared/tenancy/active-context";
import { dentyQueryKeys } from "@/shared/query";
import styles from "@/shared/ui/parity.module.css";

function periodStart(period: ReportingPeriod): string {
  return toMadridISO(startOfReportingPeriodMadrid(period));
}

export function AnalysisModule() {
  const [period, setPeriod] = useState<ReportingPeriod>("month");
  const { activeSiteId } = useActiveTenant();
  const query = useMemo(
    () => ({
      start: periodStart(period),
      end: new Date().toISOString(),
      ...(activeSiteId ? { siteId: activeSiteId } : {}),
    }),
    [period, activeSiteId],
  );
  const summary = useQuery({
    queryKey: dentyQueryKeys.analytics.summary(query),
    queryFn: () => getBrowserApi().analytics.summary(query),
  });
  const treatments = useQuery({
    queryKey: dentyQueryKeys.analytics.treatments(query),
    queryFn: () => getBrowserApi().analytics.treatments(query),
  });
  const waitTimes = useQuery({
    queryKey: dentyQueryKeys.analytics.waitTimes(query),
    queryFn: () =>
      getBrowserApi().agenda.waitTimeMetrics({
        from: query.start,
        to: query.end,
        ...(activeSiteId ? { siteId: activeSiteId } : {}),
      }),
  });

  return (
    <div className={styles.grid}>
      <Group justify="space-between">
        <SegmentedControl
          value={period}
          onChange={(value) => setPeriod(value as ReportingPeriod)}
          data={[
            { label: "Mes", value: "month" },
            { label: "Trimestre", value: "quarter" },
            { label: "Año", value: "year" },
          ]}
        />
        <Badge variant="light">Servidor</Badge>
      </Group>
      {(summary.isError || treatments.isError || waitTimes.isError) && (
        <Alert color="red">No se pudo cargar la analítica real.</Alert>
      )}
      <MotionScrollReveal intensity="normal">
        <MotionParallax intensity="subtle">
          <SimpleGrid cols={{ base: 2, md: 4 }}>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Producción</span>
              <strong className={styles.metricValue}>
                <SpeedingMetric
                  key={`${period}-Producción`}
                  value={(summary.data?.producedCents ?? 0) / 100}
                  kind="currency"
                  aria-label="Producción"
                />
              </strong>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Facturado</span>
              <strong className={styles.metricValue}>
                {formatEUR(summary.data?.invoicedCents ?? 0)}
              </strong>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Cobrado</span>
              <strong className={styles.metricValue}>
                {formatEUR(summary.data?.collectedCents ?? 0)}
              </strong>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Pendiente</span>
              <strong className={styles.metricValue}>
                {formatEUR(summary.data?.pendingCents ?? 0)}
              </strong>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Margen</span>
              <strong className={styles.metricValue}>
                <SpeedingMetric
                  key={`${period}-Margen`}
                  value={(summary.data?.marginCents ?? 0) / 100}
                  kind="currency"
                  aria-label="Margen"
                />
              </strong>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Ticket medio</span>
              <strong className={styles.metricValue}>
                {formatEUR(summary.data?.averageTicketCents ?? 0)}
              </strong>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Conversión</span>
              <strong className={styles.metricValue}>
                <SpeedingMetric
                  key={`${period}-Conversión`}
                  value={summary.data?.conversionPercent ?? 0}
                  kind="percent"
                  decimals={1}
                  aria-label="Conversión"
                />
              </strong>
              <AnimatedProgress
                key={`${period}-Conversión-bar`}
                value={Math.min(100, summary.data?.conversionPercent ?? 0)}
                size="sm"
                mt="xs"
                aria-label="Conversión"
              />
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>No presentados</span>
              <strong className={styles.metricValue}>
                <SpeedingMetric
                  key={`${period}-No presentados`}
                  value={summary.data?.noShowPercent ?? 0}
                  kind="percent"
                  decimals={1}
                  aria-label="No presentados"
                />
              </strong>
              <AnimatedProgress
                key={`${period}-No presentados-bar`}
                value={Math.min(100, summary.data?.noShowPercent ?? 0)}
                size="sm"
                mt="xs"
                aria-label="No presentados"
              />
            </div>
          </SimpleGrid>
        </MotionParallax>
      </MotionScrollReveal>
      <SimpleGrid cols={{ base: 2, md: 4 }}>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Espera media</span>
          <strong className={styles.metricValue}>
            {(waitTimes.data?.avgWaitMinutes ?? 0).toFixed(1)} min
          </strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Tiempo en sillón</span>
          <strong className={styles.metricValue}>
            {(waitTimes.data?.avgChairMinutes ?? 0).toFixed(1)} min
          </strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Puntualidad</span>
          <strong className={styles.metricValue}>
            {(waitTimes.data?.onTimeRate ?? 0).toFixed(1)}%
          </strong>
          <AnimatedProgress
            key={`${period}-puntualidad-bar`}
            value={Math.min(100, waitTimes.data?.onTimeRate ?? 0)}
            size="sm"
            mt="xs"
            aria-label="Puntualidad"
          />
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Retraso llegada</span>
          <strong className={styles.metricValue}>
            {(waitTimes.data?.avgArrivalDelayMinutes ?? 0).toFixed(1)} min
          </strong>
        </div>
      </SimpleGrid>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Tratamientos</h2>
            <p className={styles.sectionDescription}>Filtrados por periodo y sede activa.</p>
          </div>
        </div>
        <div className={styles.rowList}>
          {(treatments.data?.items ?? []).map((item, index) => (
            <div className={styles.row} key={item.id ?? item.treatmentCode ?? String(index)}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>
                  {item.label ?? item.treatment ?? item.name ?? item.treatmentCode ?? "Tratamiento"}
                </span>
                <span className={styles.rowMeta}>
                  {item.count ?? 0} casos · {formatEUR(item.producedCents ?? 0)}
                </span>
              </div>
              <div className={styles.rowMeter}>
                <Text fw={700} ta="right">
                  {(item.conversionPercent ?? 0).toFixed(1)}%
                </Text>
                <AnimatedProgress
                  key={`${period}-${item.treatmentCode ?? index}`}
                  value={Math.min(100, item.conversionPercent ?? 0)}
                  size="xs"
                  aria-label="Conversión del tratamiento"
                />
              </div>
            </div>
          ))}
          {!treatments.isLoading && (treatments.data?.items.length ?? 0) === 0 ? (
            <Text c="dimmed">Sin datos para el periodo.</Text>
          ) : null}
        </div>
      </section>
    </div>
  );
}
