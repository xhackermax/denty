import { PERIODONTAL_SITES, type PeriodontalReading } from "@/domain/periodontal";

import styles from "./odontogram.module.css";

type RecordedDepth = Pick<PeriodontalReading, "tooth" | "site" | "probingDepth">;

/**
 * Six small numbers around the anatomical tooth, arranged at the vertices of
 * an imaginary hexagon. No hexagon outlines, tiles or invented zero readings.
 * Red from 4 mm; violet from 6 mm. BOP and suppuration are tooth-level indicators.
 */
export function PerioHexReadings({
  tooth,
  readings,
  showNumbers = true,
  showBleeding = true,
  showSuppuration = true,
}: {
  tooth: string;
  readings: readonly Partial<PeriodontalReading>[];
  showNumbers?: boolean;
  showBleeding?: boolean;
  showSuppuration?: boolean;
}) {
  const toothReadings = readings.filter((reading) => reading.tooth === tooth);
  const bySite = new Map(
    toothReadings
      .filter((reading): reading is RecordedDepth =>
        reading.site !== undefined &&
        typeof reading.probingDepth === "number" &&
        Number.isFinite(reading.probingDepth) &&
        reading.probingDepth >= 0 &&
        reading.probingDepth <= 15,
      )
      .map((reading) => [reading.site, reading.probingDepth] as const),
  );
  const bleeding = showBleeding && toothReadings.some((reading) => reading.bleeding === true);
  const suppuration = showSuppuration &&
    toothReadings.some((reading) => reading.suppuration === true);

  if ((!showNumbers || bySite.size === 0) && !bleeding && !suppuration) return null;

  const finding = bleeding && suppuration ? "both" : bleeding ? "bleeding" : "suppuration";
  const findingLabel = bleeding && suppuration
    ? "Sangrado y supuración"
    : bleeding ? "Sangrado" : "Supuración";

  return (
    <div
      className={styles.perioVertexOverlay}
      role="group"
      aria-label={`Periodoncia del diente ${tooth}`}
    >
      {showNumbers ? PERIODONTAL_SITES.map((site) => {
        const depth = bySite.get(site);
        if (depth === undefined) return null;
        const severity = depth >= 6 ? "purple" : depth >= 4 ? "red" : "normal";
        return (
          <span
            key={site}
            className={styles.perioVertexNumber}
            data-site={site}
            data-depth={depth}
            data-severity={severity}
            role="img"
            aria-label={`${site}: ${depth} milímetros`}
          >
            {depth}
          </span>
        );
      }) : null}
      {bleeding || suppuration ? (
        <span
          className={styles.perioFindingDot}
          role="img"
          aria-label={`${findingLabel} en el diente ${tooth}`}
          data-finding={finding}
        />
      ) : null}
    </div>
  );
}
