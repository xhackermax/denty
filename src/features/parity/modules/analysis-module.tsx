"use client";

import { Alert, Badge, Group, SegmentedControl, SimpleGrid, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { formatEUR } from "@/domain/money";
import { getBrowserApi } from "@/shared/api/browser";
import { useActiveTenant } from "@/shared/tenancy/active-context";
import { dentyQueryKeys } from "@/shared/query";
import styles from "@/shared/ui/parity.module.css";

function periodStart(period: string): string {
  const date = new Date();
  if (period === "year") date.setMonth(0, 1);
  else if (period === "quarter") date.setMonth(Math.floor(date.getMonth() / 3) * 3, 1);
  else date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

export function AnalysisModule() {
  const [period, setPeriod] = useState("month");
  const { activeSiteId } = useActiveTenant();
  const query = useMemo(() => ({ start: periodStart(period), end: new Date().toISOString(), ...(activeSiteId ? { siteId: activeSiteId } : {}) }), [period, activeSiteId]);
  const summary = useQuery({ queryKey: dentyQueryKeys.analytics.summary(query), queryFn: () => getBrowserApi().analytics.summary(query) });
  const treatments = useQuery({ queryKey: dentyQueryKeys.analytics.treatments(query), queryFn: () => getBrowserApi().analytics.treatments(query) });

  return (
    <div className={styles.grid}>
      <Group justify="space-between"><SegmentedControl value={period} onChange={setPeriod} data={[{label:"Mes",value:"month"},{label:"Trimestre",value:"quarter"},{label:"Año",value:"year"}]} /><Badge variant="light">Servidor</Badge></Group>
      {(summary.isError || treatments.isError) && <Alert color="red">No se pudo cargar la analítica real.</Alert>}
      <SimpleGrid cols={{ base: 2, md: 4 }}>
        <div className={styles.metric}><span className={styles.metricLabel}>Producción</span><strong className={styles.metricValue}>{formatEUR(summary.data?.producedCents ?? 0)}</strong></div>
        <div className={styles.metric}><span className={styles.metricLabel}>Cobrado</span><strong className={styles.metricValue}>{formatEUR(summary.data?.collectedCents ?? 0)}</strong></div>
        <div className={styles.metric}><span className={styles.metricLabel}>Margen</span><strong className={styles.metricValue}>{formatEUR(summary.data?.marginCents ?? 0)}</strong></div>
        <div className={styles.metric}><span className={styles.metricLabel}>Conversión</span><strong className={styles.metricValue}>{(summary.data?.conversionPercent ?? 0).toFixed(1)}%</strong></div>
      </SimpleGrid>
      <section className={styles.section}>
        <div className={styles.sectionHeader}><div><h2 className={styles.sectionTitle}>Tratamientos</h2><p className={styles.sectionDescription}>Filtrados por periodo y sede activa.</p></div></div>
        <div className={styles.rowList}>
          {(treatments.data?.items ?? []).map((item, index) => <div className={styles.row} key={item.id ?? item.treatmentCode ?? String(index)}><div className={styles.rowMain}><span className={styles.rowTitle}>{item.label ?? item.treatment ?? item.name ?? item.treatmentCode ?? "Tratamiento"}</span><span className={styles.rowMeta}>{item.count ?? 0} casos · {formatEUR(item.producedCents ?? 0)}</span></div><Text fw={700}>{(item.conversionPercent ?? 0).toFixed(1)}%</Text></div>)}
          {!treatments.isLoading && (treatments.data?.items.length ?? 0) === 0 ? <Text c="dimmed">Sin datos para el periodo.</Text> : null}
        </div>
      </section>
    </div>
  );
}
