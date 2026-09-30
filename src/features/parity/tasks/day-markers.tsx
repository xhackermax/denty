import { markerLabel, type DayMarker } from "./task-timeline";
import styles from "./tasks-timeline.module.css";

export function DayMarkers({ marker }: { marker: DayMarker | undefined }) {
  if (!marker || marker.total === 0) {
    return <span className={styles.markers} aria-hidden="true" />;
  }
  return (
    <span className={styles.markers} role="img" aria-label={markerLabel(marker)}>
      {marker.dots.map((dot, index) => (
        <span
          key={index}
          className={styles.dot}
          data-dot=""
          data-priority={dot.priority}
          data-done={dot.done}
        />
      ))}
      {marker.extra > 0 ? <span className={styles.markerExtra}>+{marker.extra}</span> : null}
    </span>
  );
}
