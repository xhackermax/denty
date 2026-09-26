"use client";

import { Badge, Button, Group, Progress, SegmentedControl, SimpleGrid, Text } from "@mantine/core";
import { useState } from "react";

import { formatEUR } from "@/domain/money";

import { FINANCE_KPIS } from "@/shared/demo/demo-data";
import { MotionParallax, MotionPressable, MotionScrollReveal, SpeedingMetric } from "@/shared/motion";
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
      <MotionScrollReveal intensity="normal">
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
          <Button size="xs" variant="light">
            Exportar análisis
          </Button>
        </Group>
      </MotionScrollReveal>

      <MotionScrollReveal intensity="expressive" delay={0.04}>
        <MotionParallax intensity="expressive">
          <SimpleGrid className={styles.analysisMetricGrid} cols={{ base: 2, md: 4 }}>
            {[
              ["Producción", FINANCE_KPIS.producedCents / 100, "currency", "Producción del periodo"],
              ["Margen", FINANCE_KPIS.marginCents / 100, "currency", "Margen del periodo"],
              ["Conversión", 71, "percent", "Conversión"],
              ["No presentados", 4.8, "percent", "No presentados"],
            ].map(([label, value, kind, ariaLabel], index) => (
              <MotionScrollReveal key={`${period}-${String(label)}`} intensity="expressive" delay={index * 0.08}>
                <MotionPressable intensity="expressive" className={styles.analysisMetricMotion}>
                  <div className={`${styles.metric} ${styles.analysisMetric}`}>
                    <span className={styles.metricLabel}>{label}</span>
                    <SpeedingMetric
                      className={`${styles.metricValue} ${styles.analysisMetricValue}`}
                      value={Number(value)}
                      kind={kind as "currency" | "percent"}
                      decimals={label === "No presentados" ? 1 : undefined}
                      aria-label={String(ariaLabel)}
                    />
                  </div>
                </MotionPressable>
              </MotionScrollReveal>
            ))}
          </SimpleGrid>
        </MotionParallax>
      </MotionScrollReveal>

      <MotionScrollReveal intensity="normal" delay={0.08}>
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
            {TREATMENTS.map(([name, cases, conversion, production], index) => (
              <MotionScrollReveal key={name} intensity="subtle" delay={index * 0.045}>
                <div className={styles.row}>
                  <div className={styles.rowMain}>
                    <span className={styles.rowTitle}>{name}</span>
                    <span className={styles.rowMeta}>
                      {cases} casos · Producción {formatEUR(production)}
                    </span>
                  </div>
                  <div className={styles.rowActions}>
                    <Text size="sm" fw={700}>
                      {conversion}%
                    </Text>
                    <Progress value={conversion} w={120} />
                  </div>
                </div>
              </MotionScrollReveal>
            ))}
          </div>
        </section>
      </MotionScrollReveal>

      <MotionScrollReveal intensity="expressive" delay={0.1}>
        <section className={styles.section}>
          <div className={styles.sectionHeaderText}>
            <h2 className={styles.sectionTitle}>Pérdidas y oportunidades</h2>
            <p className={styles.sectionDescription}>
              Presupuestos no aceptados, cancelaciones, re-trabajos y huecos de agenda.
            </p>
          </div>
          <SimpleGrid cols={{ base: 1, md: 3 }} mt="md">
            <div>
              <Text size="sm" fw={700}>
                Presupuesto no aceptado
              </Text>
              <Progress value={29} mt="xs" />
              <Text size="xs" c="dimmed" mt="xs">
                29% del valor presentado
              </Text>
            </div>
            <div>
              <Text size="sm" fw={700}>
                Repeticiones de laboratorio
              </Text>
              <Progress value={7} mt="xs" />
              <Text size="xs" c="dimmed" mt="xs">
                7% de trabajos
              </Text>
            </div>
            <div>
              <Text size="sm" fw={700}>
                Huecos no ocupados
              </Text>
              <Progress value={12} mt="xs" />
              <Text size="xs" c="dimmed" mt="xs">
                12% de capacidad
              </Text>
            </div>
          </SimpleGrid>
        </section>
      </MotionScrollReveal>
    </div>
  );
}
