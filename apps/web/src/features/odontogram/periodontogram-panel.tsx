"use client";

import { Badge, Group, NumberInput, SimpleGrid, Text } from "@mantine/core";

import {
  PERIODONTAL_SITES,
  buildPeriodontalChart,
  periodontalRiskForSummary,
  type PeriodontalReading,
} from "@/domain";
import styles from "./odontogram.module.css";

const DEMO_READINGS: readonly PeriodontalReading[] = [
  { tooth: "16", site: "MV", probingDepth: 6, recession: 2, bleeding: true, plaque: true },
  { tooth: "16", site: "P/L", probingDepth: 4, recession: 1, mobility: 2, furcation: 1 },
  { tooth: "36", site: "DV", probingDepth: 5, recession: 1, plaque: true, suppuration: true },
];

interface PeriodontogramPanelProps {
  readOnly: boolean;
  readings?: readonly PeriodontalReading[];
}

const RISK_LABELS = {
  normal: "Normal",
  watch: "Vigilancia",
  moderate_periodontitis: "Periodontitis moderada",
  advanced_periodontitis: "Periodontitis avanzada",
} as const;

export function PeriodontogramPanel({
  readOnly,
  readings = DEMO_READINGS,
}: PeriodontogramPanelProps) {
  const chart = buildPeriodontalChart(readings);
  const risk = periodontalRiskForSummary(chart.summary);
  const teeth = Object.values(chart.teeth);

  return (
    <section className={styles.clinicalPanel} aria-label="Periodontograma completo">
      <Group justify="space-between" align="flex-start">
        <div>
          <Text fw={850}>Periodontograma completo</Text>
          <Text size="xs" c="dimmed">
            Seis sitios por diente con sondaje, recesion, CAL y signos inflamatorios.
          </Text>
        </div>
        <Badge className={styles.riskBadge}>{RISK_LABELS[risk]}</Badge>
      </Group>

      <SimpleGrid className={styles.clinicalSummary} cols={{ base: 2, sm: 4 }}>
        <div><span>BOP</span><strong>{chart.summary.bleedingPct}%</strong></div>
        <div><span>Placa</span><strong>{chart.summary.plaquePct}%</strong></div>
        <div><span>Max PD</span><strong>{chart.summary.maxPD} mm</strong></div>
        <div><span>Max CAL</span><strong>{chart.summary.maxCAL} mm</strong></div>
      </SimpleGrid>

      <div className={styles.periodontalGrid}>
        {teeth.map((tooth) => (
          <div className={styles.periodontalTooth} key={tooth.tooth}>
            <Group justify="space-between">
              <Text fw={800}>{tooth.tooth}</Text>
              <Text size="xs" c="dimmed">Furca {tooth.furcation ?? 0}</Text>
            </Group>
            <div className={styles.periodontalSites}>
              {PERIODONTAL_SITES.map((site) => {
                const cell = tooth.sites[site];
                return (
                  <label className={styles.periodontalCell} key={`${tooth.tooth}-${site}`}>
                    <span>{site}</span>
                    <NumberInput
                      aria-label={`${tooth.tooth} ${site} sondaje`}
                      value={cell?.probingDepth ?? 0}
                      min={0}
                      max={15}
                      size="xs"
                      disabled={readOnly}
                    />
                    <small>CAL {cell?.clinicalAttachmentLoss ?? 0}</small>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
