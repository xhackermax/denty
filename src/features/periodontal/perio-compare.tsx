import { Text } from "@mantine/core";
import { PERIODONTAL_SITES } from "@/domain/periodontal";
import type { PerioExam } from "@/domain/periodontal/exam";
export function comparePerio(current: PerioExam, previous: PerioExam) {
  let improved = 0,
    worsened = 0,
    unchanged = 0;
  for (const [tooth, data] of Object.entries(current.teeth)) {
    if (data.missing) continue;
    for (const site of PERIODONTAL_SITES) {
      const a = data.sites[site].pd,
        b = previous.teeth[tooth]?.sites[site].pd;
      if (a == null || b == null) continue;
      if (a < b) improved++;
      else if (a > b) worsened++;
      else unchanged++;
    }
  }
  return { improved, worsened, unchanged };
}
export function PerioCompare({ current, previous }: { current: PerioExam; previous: PerioExam }) {
  const c = comparePerio(current, previous);
  return (
    <Text>
      Respecto al examen anterior: {c.improved} sitios mejoran · {c.worsened} empeoran ·{" "}
      {c.unchanged} sin cambio
    </Text>
  );
}
