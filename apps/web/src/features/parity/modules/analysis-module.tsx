"use client";

import { Badge, Button, Group, Progress, SegmentedControl, SimpleGrid, Text } from "@mantine/core";
import { useState } from "react";

import { formatEUR } from "@/domain/money";

import { FINANCE_KPIS } from "@/shared/demo/demo-data";
import styles from "@/shared/ui/parity.module.css";

const TREATMENTS = [
  ["Implantes", 12, 72, 640000],
  ["Ortodoncia", 9, 68, 520000],
  ["Endodoncia", 18, 84, 378000],
  ["Prótesis", 14, 76, 492000],
] as const;

export function AnalysisModule() {
  const [period, setPeriod] = useState("month");

  return (
    <div className={styles.grid}>
      <Group justify="space-between" align="center">
        <SegmentedControl
          value={period}
          onChange={setPeriod}
          data={[
            { label: "Mes", value: "month" },
            { label: "Trimestre", value: "quarter" },
            { label: "Año", value: "year" },
          ]}
        />
        <Button size="xs" variant="light">Exportar análisis</Button>
      </Group>

      <SimpleGrid cols={{ base: 2, md: 4 }}>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Producción</span>
          <strong className={styles.metricValue}>{formatEUR(FINANCE_KPIS.producedCents)}</strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Margen</span>
          <strong className={styles.metricValue}>{formatEUR(FINANCE_KPIS.marginCents)}</strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Conversión</span>
          <strong className={styles.metricValue}>71%</strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>No presentados</span>
          <strong className={styles.metricValue}>4,8%</strong>
        </div>
      </SimpleGrid>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeaderText}>
            <h2 className={styles.sectionTitle}>Rentabilidad por tratamiento</h2>
            <p className={styles.sectionDescription}>
              Casos, conversión y producción atribuida en el periodo seleccionado.
            </p>
          </div>
          <Badge variant="light">{period}</Badge>
        </div>
        <div className={styles.rowList}>
          {TREATMENTS.map(([name, cases, conversion, production]) => (
            <div className={styles.row} key={name}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{name}</span>
                <span className={styles.rowMeta}>
                  {cases} casos · Producción {formatEUR(production)}
                </span>
              </div>
              <div className={styles.rowActions}>
                <Text size="sm" fw={700}>{conversion}%</Text>
                <Progress value={conversion} w={120} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeaderText}>
          <h2 className={styles.sectionTitle}>Pérdidas y oportunidades</h2>
          <p className={styles.sectionDescription}>
            Presupuestos no aceptados, cancelaciones, re-trabajos y huecos de agenda.
          </p>
        </div>
        <SimpleGrid cols={{ base: 1, md: 3 }} mt="md">
          <div>
            <Text size="sm" fw={700}>Presupuesto no aceptado</Text>
            <Progress value={29} mt="xs" />
            <Text size="xs" c="dimmed" mt="xs">29% del valor presentado</Text>
          </div>
          <div>
            <Text size="sm" fw={700}>Repeticiones de laboratorio</Text>
            <Progress value={7} mt="xs" />
            <Text size="xs" c="dimmed" mt="xs">7% de trabajos</Text>
          </div>
          <div>
            <Text size="sm" fw={700}>Huecos no ocupados</Text>
            <Progress value={12} mt="xs" />
            <Text size="xs" c="dimmed" mt="xs">12% de capacidad</Text>
          </div>
        </SimpleGrid>
      </section>
    </div>
  );
}
