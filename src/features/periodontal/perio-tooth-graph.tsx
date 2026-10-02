import type { PerioTooth } from "@/domain/periodontal/exam";
import { PERIODONTAL_SITES } from "@/domain/periodontal";
export function PerioToothGraph({
  tooth,
  data,
  visibleIndicators,
}: {
  tooth: string;
  data: PerioTooth;
  visibleIndicators?: readonly string[];
}) {
  const indicators = visibleIndicators ?? ["sondaje", "recesion"];
  const showRecession = indicators.includes("recesion");
  const showProbing = indicators.includes("sondaje");
  const graph = (field: "gm" | "cal", color: string) => {
    const points = PERIODONTAL_SITES.map((site, index) => {
      const r = data.sites[site];
      if (r.gm === null || (field === "cal" && r.pd === null)) return null;
      return {
        x: 10 + index * 16,
        y: 20 + (field === "gm" ? -r.gm : Math.max(0, (r.pd ?? 0) - r.gm)) * 2,
      };
    });
    return points.map((point, index) => {
      if (!point) return null;
      const previous = index === 3 ? null : points[index - 1];
      return (
        <g key={`${field}-${index}`} data-indicator={field === "gm" ? "recesion" : "sondaje"}>
          <circle cx={point.x} cy={point.y} r="1.8" fill={color} />
          {previous ? (
            <line
              x1={previous.x}
              y1={previous.y}
              x2={point.x}
              y2={point.y}
              stroke={color}
              strokeWidth="2"
            />
          ) : null}
        </g>
      );
    });
  };
  const graphLabel =
    showRecession && showProbing
      ? `Margen rojo e inserción azul del ${tooth}`
      : `${showRecession ? "Margen" : ""}${showRecession && showProbing ? " e " : ""}${showProbing ? "Sondaje" : ""} del ${tooth}`;
  return (
    <svg
      viewBox="0 0 100 60"
      role="img"
      aria-label={graphLabel}
      data-testid={`perio-graph-${tooth}`}
    >
      <path d="M5 20H95" stroke="#cbd5e1" />
      {showRecession ? graph("gm", "#e05265") : null}
      {showProbing ? graph("cal", "#4089bd") : null}
    </svg>
  );
}
