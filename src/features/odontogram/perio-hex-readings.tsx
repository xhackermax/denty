import { PERIODONTAL_SITES, type PeriodontalReading } from "@/domain/periodontal";

import styles from "./odontogram.module.css";

type SiteReading = Pick<PeriodontalReading, "tooth" | "site" | "probingDepth">;

/**
 * The six PD measurements are independent of gingival margin (GM).
 * Never turn absent measurements into zeros or derive an unmeasured GM.
 * One small hexagon per site, ordered MV · V · DV / MP · P-L · DP.
 */
export function PerioHexReadings({
  tooth,
  readings,
}: {
  tooth: string;
  readings: readonly Partial<PeriodontalReading>[];
}) {
  const bySite = new Map(
    readings
      .filter((reading): reading is SiteReading =>
        reading.tooth === tooth &&
        reading.site !== undefined &&
        typeof reading.probingDepth === "number" &&
        Number.isFinite(reading.probingDepth) &&
        reading.probingDepth >= 0 &&
        reading.probingDepth <= 15,
      )
      .map((reading) => [reading.site, reading.probingDepth] as const),
  );
  if (!bySite.size) return null;

  return (
    <div
      className={styles.perioHexGrid}
      role="group"
      aria-label={`Sondaje periodontal del diente ${tooth}, milímetros`}
    >
      {PERIODONTAL_SITES.map((site) => {
        const depth = bySite.get(site);
        const valid = depth !== undefined;
        const tier = valid ? (depth >= 6 ? "high" : depth >= 4 ? "moderate" : "low") : "empty";
        return (
          <svg
            key={site}
            viewBox="0 0 20 20"
            className={styles.perioHex}
            data-site={site}
            data-depth={valid ? depth : undefined}
            data-tier={tier}
            role="img"
            aria-label={valid ? `${site}: ${depth} milímetros` : `${site}: sin medir`}
          >
            <polygon points="5,1 15,1 19,10 15,19 5,19 1,10" />
            {valid ? (
              <text x="10" y="10.5" textAnchor="middle" dominantBaseline="middle">
                {depth}
              </text>
            ) : null}
          </svg>
        );
      })}
    </div>
  );
}
