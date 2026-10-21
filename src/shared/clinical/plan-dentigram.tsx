"use client";

import { clinicalPhaseGroup, CLINICAL_PHASE_GROUPS, type ComparedTreatment } from "@/domain/plan";
import styles from "./plan-alternatives-board.module.css";

const UPPER = [
  "18",
  "17",
  "16",
  "15",
  "14",
  "13",
  "12",
  "11",
  "21",
  "22",
  "23",
  "24",
  "25",
  "26",
  "27",
  "28",
];
const LOWER = [
  "48",
  "47",
  "46",
  "45",
  "44",
  "43",
  "42",
  "41",
  "31",
  "32",
  "33",
  "34",
  "35",
  "36",
  "37",
  "38",
];
const UPPER_DECIDUOUS = ["55", "54", "53", "52", "51", "61", "62", "63", "64", "65"];
const LOWER_DECIDUOUS = ["85", "84", "83", "82", "81", "71", "72", "73", "74", "75"];
const CELL = 22;
const GAP = 2;
const PHASE_ORDER = CLINICAL_PHASE_GROUPS.map((group) => group.key);

/** Compact read-only chart: each tooth a plan touches is tinted with its earliest phase. */
export function PlanDentigram({
  letter,
  treatments,
}: {
  letter: string;
  treatments: readonly ComparedTreatment[];
}) {
  const phaseByTooth = new Map<string, string>();
  for (const treatment of treatments) {
    if (!treatment.tooth) continue;
    const phase = clinicalPhaseGroup(treatment);
    const current = phaseByTooth.get(treatment.tooth);
    if (!current || PHASE_ORDER.indexOf(phase) < PHASE_ORDER.indexOf(current as typeof phase)) {
      phaseByTooth.set(treatment.tooth, phase);
    }
  }
  const hasDeciduous = [...phaseByTooth.keys()].some((tooth) => /^[5-8]/.test(tooth));
  const rows = hasDeciduous ? [UPPER, UPPER_DECIDUOUS, LOWER_DECIDUOUS, LOWER] : [UPPER, LOWER];
  const width = UPPER.length * (CELL + GAP);
  const height = rows.length * (CELL + GAP) + GAP * 3;

  return (
    <svg
      className={styles.dentigram}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Dentigrama Plan ${letter}: ${phaseByTooth.size} piezas con tratamiento`}
    >
      {rows.map((row, rowIndex) => {
        // Deciduous rows are centred under the permanent arch, as on a paper chart.
        const offset = ((UPPER.length - row.length) / 2) * (CELL + GAP);
        const y = rowIndex * (CELL + GAP) + (rowIndex >= rows.length / 2 ? GAP * 3 : 0);
        return row.map((tooth, index) => {
          const phase = phaseByTooth.get(tooth);
          return (
            <g key={tooth} data-tooth={tooth} data-phase={phase ?? "none"}>
              <rect
                x={offset + index * (CELL + GAP)}
                y={y}
                width={CELL}
                height={CELL}
                rx={5}
                className={styles.tooth}
              />
              <text
                x={offset + index * (CELL + GAP) + CELL / 2}
                y={y + CELL / 2 + 3.5}
                textAnchor="middle"
                className={styles.toothLabel}
              >
                {tooth}
              </text>
            </g>
          );
        });
      })}
    </svg>
  );
}
