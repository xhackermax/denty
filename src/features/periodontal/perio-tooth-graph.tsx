import type { PerioTooth } from "@/domain/periodontal/exam";
import { PERIODONTAL_SITES } from "@/domain/periodontal";
export function PerioToothGraph({ tooth, data }: { tooth: string; data: PerioTooth }) {
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
        <g key={`${field}-${index}`}>
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
  return (
    <svg viewBox="0 0 100 60" role="img" aria-label={`Margen rojo e inserción azul del ${tooth}`}>
      <path d="M5 20H95" stroke="#cbd5e1" />
      {graph("gm", "#e05265")}
      {graph("cal", "#4089bd")}
    </svg>
  );
}
