import { Group, Text } from "@mantine/core";
import { perioSummary, type PerioExam } from "@/domain/periodontal/exam";
export function PerioSummaryBar({ exam }: { exam: PerioExam }) {
  const s = perioSummary(exam);
  return (
    <Group aria-label="Resumen periodontal">
      <Text>PD media {s.siteCount ? s.meanPD : "—"} mm</Text>
      <Text>CAL media {s.calSiteCount ? s.meanCAL : "—"} mm</Text>
      <Text>
        Sangrado {s.bleedingPct}% · Placa {s.plaquePct}%
      </Text>
      <Text>
        ≥4/5/6 mm: {s.sitesAtLeast4}/{s.sitesAtLeast5}/{s.sitesAtLeast6}
      </Text>
      <Text>{s.remainingSites} sitios pendientes</Text>
    </Group>
  );
}
