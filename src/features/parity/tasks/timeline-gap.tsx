import { formatDuration, type ScheduleGap } from "./task-timeline";
import styles from "./tasks-timeline.module.css";

export function TimelineGap({ gap }: { gap: ScheduleGap }) {
  return (
    <li className={styles.item} aria-label="Pausa">
      <span className={styles.time} aria-hidden="true" />
      <span className={styles.rail} aria-hidden="true" />
      <div className={styles.gap}>
        <p className={styles.gapText}>
          {gap.elapsed
            ? "Intervalo terminado. ¿Qué sigue?"
            : `Pausa de ${formatDuration(gap.minutes)}`}
        </p>
      </div>
    </li>
  );
}
