"use client";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  NumberInput,
  SegmentedControl,
  SimpleGrid,
  Text,
} from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import {
  PERIODONTAL_SITES,
  PERMANENT_LOWER,
  PERMANENT_UPPER,
  buildPeriodontalChart,
  periodontalRiskForSummary,
  type PeriodontalReading,
  type PeriodontalSite,
} from "@/domain";
import { useCreatePeriodontalExamMutation } from "@/shared/clinical/clinical-data";
import { publicEnv } from "@/shared/config/env";
import styles from "./odontogram.module.css";
const DEMO_READINGS: readonly PeriodontalReading[] = [
  { tooth: "16", site: "MV", probingDepth: 6, recession: 2, bleeding: true, plaque: true },
  { tooth: "16", site: "V", probingDepth: 5, recession: 1, bleeding: true },
  { tooth: "16", site: "P/L", probingDepth: 4, recession: 1, mobility: 2, furcation: 1 },
  { tooth: "36", site: "DV", probingDepth: 5, recession: 1, plaque: true, suppuration: true },
];
interface PeriodontogramPanelProps {
  patientId: string;
  readOnly: boolean;
  readings?: readonly PeriodontalReading[];
}
const RISK_LABELS = {
  normal: "Normal",
  watch: "Vigilancia",
  moderate_periodontitis: "Periodontitis moderada",
  advanced_periodontitis: "Periodontitis avanzada",
} as const;
const ALL_TEETH = [...PERMANENT_UPPER, ...PERMANENT_LOWER] as readonly string[];
type FieldMode = "probing" | "recession";
function keyFor(tooth: string, site: PeriodontalSite) {
  return `${tooth}:${site}`;
}
function buildCompleteReadings(seed: readonly PeriodontalReading[]): PeriodontalReading[] {
  const indexed = new Map(seed.map((reading) => [keyFor(reading.tooth, reading.site), reading]));
  return ALL_TEETH.flatMap((tooth) =>
    PERIODONTAL_SITES.map((site) => {
      const existing = indexed.get(keyFor(tooth, site));
      return existing ?? { tooth, site, probingDepth: 0, recession: 0 };
    }),
  );
}
const PERIODONTAL_DRAFTS = new Map<string, PeriodontalReading[]>();
export function PeriodontogramPanel({
  patientId,
  readOnly,
  readings = DEMO_READINGS,
}: PeriodontogramPanelProps) {
  const demoMode = publicEnv.NEXT_PUBLIC_DEMO_MODE === "true";
  const examMutation = useCreatePeriodontalExamMutation(patientId);
  const [fieldMode, setFieldMode] = useState<FieldMode>("probing");
  const [values, setValues] = useState<PeriodontalReading[]>(() => buildCompleteReadings(readings));
  const [savedAt, setSavedAt] = useState<string | null>(null);
  useEffect(() => {
    const draft = PERIODONTAL_DRAFTS.get(patientId);
    setValues(buildCompleteReadings(draft ?? readings));
    setSavedAt(draft ? "Sesión actual" : null);
  }, [patientId, readings]);
  const chart = useMemo(() => buildPeriodontalChart(values), [values]);
  const risk = periodontalRiskForSummary(chart.summary);
  const updateSite = (tooth: string, site: PeriodontalSite, patch: Partial<PeriodontalReading>) => {
    if (readOnly) return;
    setValues((current) =>
      current.map((reading) =>
        reading.tooth === tooth && reading.site === site ? { ...reading, ...patch } : reading,
      ),
    );
  };
  const updateTooth = (
    tooth: string,
    patch: Pick<PeriodontalReading, "mobility" | "furcation">,
  ) => {
    if (readOnly) return;
    setValues((current) =>
      current.map((reading) =>
        reading.tooth === tooth && reading.site === "MV" ? { ...reading, ...patch } : reading,
      ),
    );
  };
  const save = async () => {
    if (readOnly) return;
    PERIODONTAL_DRAFTS.set(
      patientId,
      values.map((reading) => ({ ...reading })),
    );
    const displayTime = new Date().toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
    if (demoMode) {
      setSavedAt(displayTime);
      return;
    }
    try {
      await examMutation.mutateAsync({
        title: "Periodontograma completo",
        measuredAt: new Date().toISOString(),
        sites: values.map((reading) => ({
          tooth: reading.tooth,
          site: reading.site,
          probingDepth: reading.probingDepth ?? 0,
          recession: reading.recession ?? 0,
          mobility: reading.mobility ?? 0,
          furcation: reading.furcation ?? 0,
          bleeding: Boolean(reading.bleeding),
          plaque: Boolean(reading.plaque),
          suppuration: Boolean(reading.suppuration),
        })),
        risk: {
          band: risk,
          bleedingPct: chart.summary.bleedingPct,
          plaquePct: chart.summary.plaquePct,
          maxPD: chart.summary.maxPD,
          maxCAL: chart.summary.maxCAL,
          sitesAtLeast4: chart.summary.sitesAtLeast4,
          sitesAtLeast5: chart.summary.sitesAtLeast5,
          sitesAtLeast6: chart.summary.sitesAtLeast6,
          sitesAtLeast7: chart.summary.sitesAtLeast7,
        },
      });
      setSavedAt(displayTime);
    } catch {
      setSavedAt("borrador local");
    }
  };
  const reset = () => {
    if (readOnly) return;
    setValues(buildCompleteReadings([]));
    PERIODONTAL_DRAFTS.delete(patientId);
    setSavedAt(null);
  };
  const renderArch = (teeth: readonly string[]) => (
    <div className={styles.perioArch}>
      {teeth.map((tooth) => {
        const toothChart = chart.teeth[tooth];
        const mv = toothChart?.sites.MV;
        return (
          <article className={styles.perioToothCard} key={tooth}>
            <div className={styles.perioToothHeader}>
              <strong>{tooth}</strong>
              <div className={styles.perioToothMeta}>
                <NumberInput
                  aria-label={`Movilidad diente ${tooth}`}
                  size="xs"
                  min={0}
                  max={3}
                  value={toothChart?.mobility ?? 0}
                  disabled={readOnly}
                  onChange={(value) =>
                    updateTooth(tooth, {
                      mobility: Number(value || 0),
                      furcation: toothChart?.furcation ?? 0,
                    })
                  }
                  prefix="M "
                />
                <NumberInput
                  aria-label={`Furca diente ${tooth}`}
                  size="xs"
                  min={0}
                  max={3}
                  value={toothChart?.furcation ?? 0}
                  disabled={readOnly}
                  onChange={(value) =>
                    updateTooth(tooth, {
                      mobility: toothChart?.mobility ?? mv?.mobility ?? 0,
                      furcation: Number(value || 0),
                    })
                  }
                  prefix="F "
                />
              </div>
            </div>

            <div className={styles.perioSiteStrip}>
              {PERIODONTAL_SITES.map((site) => {
                const cell = toothChart?.sites[site];
                const reading = values.find((item) => item.tooth === tooth && item.site === site);
                const numericValue =
                  fieldMode === "probing"
                    ? (reading?.probingDepth ?? 0)
                    : (reading?.recession ?? 0);
                return (
                  <div className={styles.perioSiteCell} key={`${tooth}-${site}`}>
                    <span className={styles.perioSiteName}>{site}</span>
                    <NumberInput
                      size="xs"
                      hideControls
                      aria-label={`${tooth} ${site} ${fieldMode}`}
                      value={numericValue}
                      min={fieldMode === "probing" ? 0 : -5}
                      max={15}
                      disabled={readOnly}
                      onChange={(value) =>
                        updateSite(tooth, site, {
                          [fieldMode]: Number(value || 0),
                        })
                      }
                    />
                    <span className={styles.perioCal}>CAL {cell?.clinicalAttachmentLoss ?? 0}</span>
                    <div className={styles.perioFlags}>
                      <Checkbox
                        size="xs"
                        aria-label={`Sangrado ${tooth} ${site}`}
                        title="Sangrado"
                        checked={Boolean(reading?.bleeding)}
                        disabled={readOnly}
                        onChange={(event) =>
                          updateSite(tooth, site, {
                            bleeding: event.currentTarget.checked,
                          })
                        }
                      />
                      <Checkbox
                        size="xs"
                        aria-label={`Placa ${tooth} ${site}`}
                        title="Placa"
                        checked={Boolean(reading?.plaque)}
                        disabled={readOnly}
                        onChange={(event) =>
                          updateSite(tooth, site, { plaque: event.currentTarget.checked })
                        }
                      />
                      <Checkbox
                        size="xs"
                        aria-label={`Supuración ${tooth} ${site}`}
                        title="Supuración"
                        checked={Boolean(reading?.suppuration)}
                        disabled={readOnly}
                        onChange={(event) =>
                          updateSite(tooth, site, {
                            suppuration: event.currentTarget.checked,
                          })
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        );
      })}
    </div>
  );
  return (
    <section className={styles.clinicalPanel} aria-label="Periodontograma completo">
      <Group justify="space-between" align="flex-start">
        <div>
          <Text fw={850}>Periodontograma completo</Text>
          <Text size="xs" c="dimmed">
            32 dientes · 6 sitios por diente · sondaje, recesión, CAL, sangrado, placa, supuración,
            movilidad y furca.
          </Text>
        </div>
        <Group gap="xs">
          <Badge className={styles.riskBadge}>{RISK_LABELS[risk]}</Badge>
          {savedAt ? <Badge variant="light">Guardado {savedAt}</Badge> : null}
        </Group>
      </Group>

      <SimpleGrid className={styles.clinicalSummary} cols={{ base: 2, sm: 4, lg: 8 }}>
        <div>
          <span>BOP</span>
          <strong>{chart.summary.bleedingPct}%</strong>
        </div>
        <div>
          <span>Placa</span>
          <strong>{chart.summary.plaquePct}%</strong>
        </div>
        <div>
          <span>Máx. PD</span>
          <strong>{chart.summary.maxPD} mm</strong>
        </div>
        <div>
          <span>Máx. CAL</span>
          <strong>{chart.summary.maxCAL} mm</strong>
        </div>
        <div>
          <span>≥4 mm</span>
          <strong>{chart.summary.sitesAtLeast4}</strong>
        </div>
        <div>
          <span>≥5 mm</span>
          <strong>{chart.summary.sitesAtLeast5}</strong>
        </div>
        <div>
          <span>≥6 mm</span>
          <strong>{chart.summary.sitesAtLeast6}</strong>
        </div>
        <div>
          <span>≥7 mm</span>
          <strong>{chart.summary.sitesAtLeast7}</strong>
        </div>
      </SimpleGrid>

      <Group justify="space-between" mt="md" align="flex-end">
        <SegmentedControl
          size="xs"
          value={fieldMode}
          onChange={(value) => setFieldMode(value as FieldMode)}
          data={[
            { value: "probing", label: "Sondaje (PD)" },
            { value: "recession", label: "Recesión" },
          ]}
        />
        <Group gap="xs">
          <Text size="xs" c="dimmed">
            Checks: sangrado · placa · supuración
          </Text>
          <Button size="xs" variant="light" disabled={readOnly} onClick={reset}>
            Limpiar
          </Button>
          <Button
            size="xs"
            disabled={readOnly}
            loading={examMutation.isPending}
            onClick={() => void save()}
          >
            Guardar periodontograma
          </Button>
        </Group>
      </Group>

      {examMutation.isError ? (
        <Alert mt="md" color="red" title="No se pudo sincronizar">
          El periodontograma queda como borrador local de esta sesión. Reintenta cuando el servidor
          vuelva a estar disponible.
        </Alert>
      ) : null}

      <Text fw={800} size="sm" mt="lg">
        Maxilar
      </Text>
      {renderArch(PERMANENT_UPPER)}
      <div className={styles.perioDivider}>Plano oclusal</div>
      {renderArch(PERMANENT_LOWER)}
      <Text fw={800} size="sm">
        Mandíbula
      </Text>
    </section>
  );
}
