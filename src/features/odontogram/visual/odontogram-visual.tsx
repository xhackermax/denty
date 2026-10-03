"use client";

import { memo, useCallback, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import "./odontogram-visual.css";

export type Layer = "restauradora" | "perio" | "endo" | "cirugia" | "orto" | "protesis";

export type Surface = "M" | "D" | "V" | "L" | "O";
export type Site = "MV" | "V" | "DV" | "ML" | "L" | "DL";
export type FindingStatus = "observed" | "planned" | "completed";

export interface Finding {
  id: string;
  layer: Layer;
  label: string;
  status: FindingStatus;
  surface?: Surface;
  site?: Site;
  note?: string;
  recordedAt?: string;
  marker?: "bracket";
}

export interface ToothRecord {
  fdi: number;
  presence?: "present" | "absent" | "implant";
  probing?: Partial<Record<Site, number | null>>;
  findings: readonly Finding[];
}

export type Selection = { kind: "surface"; value: Surface } | { kind: "site"; value: Site };

export interface EditTarget {
  fdi: number;
  selection: Selection | null;
  finding: Finding | null;
}

interface Props {
  /** Identifica paciente y exploración; reinicia los filtros y la selección. */
  recordKey: string;
  teeth: readonly ToothRecord[];
  dentition?: "permanent" | "primary" | "mixed";
  onEdit?: (target: EditTarget) => void;
}

const LAYERS: readonly { id: Layer; label: string }[] = [
  { id: "restauradora", label: "Restauradora" },
  { id: "perio", label: "Perio" },
  { id: "endo", label: "Endo" },
  { id: "cirugia", label: "Cirugía" },
  { id: "orto", label: "Orto" },
  { id: "protesis", label: "Prótesis" },
];

const STATUS: Record<FindingStatus, string> = {
  observed: "Observado",
  planned: "Previsto",
  completed: "Realizado",
};

const PERMANENT = [
  { label: "Superior · derecho", ids: [18, 17, 16, 15, 14, 13, 12, 11] },
  { label: "Superior · izquierdo", ids: [21, 22, 23, 24, 25, 26, 27, 28] },
  { label: "Inferior · derecho", ids: [48, 47, 46, 45, 44, 43, 42, 41] },
  { label: "Inferior · izquierdo", ids: [31, 32, 33, 34, 35, 36, 37, 38] },
];

const PRIMARY = [
  { label: "Temporal superior · derecho", ids: [55, 54, 53, 52, 51] },
  { label: "Temporal superior · izquierdo", ids: [61, 62, 63, 64, 65] },
  { label: "Temporal inferior · derecho", ids: [85, 84, 83, 82, 81] },
  { label: "Temporal inferior · izquierdo", ids: [71, 72, 73, 74, 75] },
];

const SITE_POINTS = [
  [24, 44],
  [64, 24],
  [104, 44],
  [104, 96],
  [64, 116],
  [24, 96],
] as const;

const ICON_PATHS: Record<Layer, string> = {
  restauradora: "M8 4Q12 6 16 4Q21 4 20 11L17 20H7L4 11Q3 4 8 4Z",
  perio: "M4 9Q8 5 12 9T20 9M4 15Q8 11 12 15T20 15",
  endo: "M8 4H16L15 10L13 20M9 10L11 20M12 5V15",
  cirugia: "M5 19L16 8M13 5L19 11M16 8L19 5",
  orto: "M8 8H16V16H8ZM3 12H21M12 3V8M12 16V21",
  protesis: "M5 17L4 7L9 11L12 5L15 11L20 7L19 17ZM6 20H18",
};

function mesialOnRight(fdi: number): boolean {
  return [1, 4, 5, 8].includes(Math.floor(fdi / 10));
}

function sides(fdi: number): {
  left: "M" | "D";
  right: "M" | "D";
} {
  return mesialOnRight(fdi) ? { left: "D", right: "M" } : { left: "M", right: "D" };
}

function sites(fdi: number): Site[] {
  return mesialOnRight(fdi)
    ? ["DV", "V", "MV", "ML", "L", "DL"]
    : ["MV", "V", "DV", "DL", "L", "ML"];
}

function palatal(fdi: number): boolean {
  return [1, 2, 5, 6].includes(Math.floor(fdi / 10));
}

function surfaceLabel(fdi: number, surface: Surface): string {
  if (surface === "L") return palatal(fdi) ? "Palatino" : "Lingual";
  if (surface === "O") return fdi % 10 <= 3 ? "Incisal" : "Oclusal";
  return { M: "Mesial", D: "Distal", V: "Vestibular" }[surface];
}

function siteLabel(fdi: number, site: Site): string {
  const inner = palatal(fdi) ? "palatino" : "lingual";
  return {
    MV: "Mesiovestibular",
    V: "Vestibular",
    DV: "Distovestibular",
    ML: `Mesio${inner}`,
    L: palatal(fdi) ? "Palatino" : "Lingual",
    DL: `Disto${inner}`,
  }[site];
}

function siteAbbreviation(fdi: number, site: Site): string {
  return palatal(fdi) ? site.replace("L", "P") : site;
}

function visibleFindings(
  findings: readonly Finding[],
  layers: readonly Layer[],
  target: Selection | null = null,
): Finding[] {
  return findings.filter(
    (finding) =>
      layers.includes(finding.layer) &&
      (!target ||
        (target.kind === "surface" && finding.surface === target.value) ||
        (target.kind === "site" && finding.site === target.value)),
  );
}

function dateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";

  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Madrid",
  }).format(date);
}

function LayerIcon({ layer }: { layer: Layer }) {
  return (
    <svg
      className="ov-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICON_PATHS[layer]} />
    </svg>
  );
}

interface DiagramProps {
  fdi: number;
  tooth: ToothRecord | undefined;
  findings: readonly Finding[];
  showPerio: boolean;
  interactive?: boolean;
  selection?: Selection | null;
  onSelect?: (selection: Selection) => void;
}

function ToothDiagram({
  fdi,
  tooth,
  findings,
  showPerio,
  interactive = false,
  selection = null,
  onSelect,
}: DiagramProps) {
  const orientation = sides(fdi);
  const positions = sites(fdi);

  const surfaces: { surface: Surface; path: string }[] = [
    { surface: "V", path: "M44 48H84L74 58H54Z" },
    { surface: "L", path: "M44 88H84L74 78H54Z" },
    { surface: orientation.left, path: "M44 48L54 58V78L44 88Z" },
    { surface: orientation.right, path: "M84 48L74 58V78L84 88Z" },
    { surface: "O", path: "M54 58H74V78H54Z" },
  ];

  function keyboardSelect(event: KeyboardEvent<SVGPathElement>, surface: Surface) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect?.({ kind: "surface", value: surface });
    }
  }

  const bracket = findings.find(
    (finding) => finding.layer === "orto" && finding.marker === "bracket",
  );

  return (
    <div className="ov-diagram" data-interactive={interactive}>
      <svg
        className="ov-map"
        viewBox="0 0 128 140"
        role={interactive ? "group" : undefined}
        aria-label={interactive ? `Superficies del diente ${fdi}` : undefined}
        aria-hidden={interactive ? undefined : true}
      >
        <text x="64" y="9" className="ov-direction">
          V
        </text>
        <text x="64" y="137" className="ov-direction">
          {palatal(fdi) ? "P" : "L"}
        </text>

        {tooth?.presence === "absent" ? (
          <g className="ov-absent">
            <path d="M45 49L83 87M83 49L45 87" />
            <text x="64" y="104">
              Ausente
            </text>
          </g>
        ) : tooth?.presence === "implant" ? (
          <g className="ov-implant">
            <circle cx="64" cy="68" r="22" />
            <circle cx="64" cy="68" r="12" />
            <path d="M56 68H72M64 60V76" />
            <text x="64" y="104">
              Implante
            </text>
          </g>
        ) : (
          <>
            {surfaces.map(({ surface, path }) => {
              const matches = findings.filter((finding) => finding.surface === surface);
              const selected = selection?.kind === "surface" && selection.value === surface;

              return (
                <path
                  key={surface}
                  d={path}
                  className="ov-surface"
                  data-status={
                    matches.length > 1 ? "multiple" : (matches[0]?.status ?? "unrecorded")
                  }
                  data-selected={selected}
                  role={interactive ? "button" : undefined}
                  tabIndex={interactive ? 0 : undefined}
                  aria-label={
                    interactive
                      ? `${fdi}, ${surfaceLabel(fdi, surface)}, ${matches.length} anotaciones`
                      : undefined
                  }
                  aria-pressed={interactive ? selected : undefined}
                  onClick={
                    interactive ? () => onSelect?.({ kind: "surface", value: surface }) : undefined
                  }
                  onKeyDown={interactive ? (event) => keyboardSelect(event, surface) : undefined}
                />
              );
            })}

            {bracket && (
              <g className="ov-bracket" data-status={bracket.status} pointerEvents="none">
                <path d="M37 68H91" />
                <rect x="57" y="61" width="14" height="14" rx="3" />
                <path d="M61 64H67V72H61Z" />
              </g>
            )}
          </>
        )}

        {showPerio &&
          !interactive &&
          positions.map((site, index) => {
            const [x, y] = SITE_POINTS[index] ?? SITE_POINTS[0];
            return (
              <g key={site} className="ov-probe-reading">
                <text x={x} y={y - 7} className="ov-site-label">
                  {siteAbbreviation(fdi, site)}
                </text>
                <text x={x} y={y + 6}>
                  {tooth?.probing?.[site] ?? "—"}
                </text>
              </g>
            );
          })}
      </svg>

      {showPerio &&
        interactive &&
        positions.map((site, index) => {
          const value = tooth?.probing?.[site];
          const selected = selection?.kind === "site" && selection.value === site;

          return (
            <button
              key={site}
              type="button"
              className="ov-site"
              data-slot={index}
              aria-pressed={selected}
              aria-label={`${fdi}, ${siteLabel(fdi, site)}, ${
                value == null ? "sin registro" : `sondaje ${value} milímetros`
              }`}
              onClick={() => onSelect?.({ kind: "site", value: site })}
            >
              <small>{siteAbbreviation(fdi, site)}</small>
              <strong>{value ?? "—"}</strong>
            </button>
          );
        })}
    </div>
  );
}

interface CardProps {
  fdi: number;
  tooth: ToothRecord | undefined;
  active: readonly Layer[];
  selected: boolean;
  onSelect: (fdi: number) => void;
}

const ToothCard = memo(function ToothCard({ fdi, tooth, active, selected, onSelect }: CardProps) {
  const findings = visibleFindings(tooth?.findings ?? [], active);
  const hasProbing = Object.values(tooth?.probing ?? {}).some((value) => value != null);

  return (
    <button
      type="button"
      className="ov-tooth"
      aria-pressed={selected}
      aria-label={`Diente ${fdi}, ${findings.length} anotaciones visibles${
        hasProbing && active.includes("perio") ? ", con sondaje registrado" : ""
      }`}
      onClick={() => onSelect(fdi)}
    >
      <span className="ov-tooth-number">{fdi}</span>

      <ToothDiagram
        fdi={fdi}
        tooth={tooth}
        findings={findings}
        showPerio={active.includes("perio")}
      />

      <span className="ov-badges">
        {LAYERS.filter(({ id }) => active.includes(id)).map(({ id, label }) => {
          const count = findings.filter((finding) => finding.layer === id).length;
          if (!count && !(id === "perio" && hasProbing)) return null;

          return (
            <span key={id} className="ov-badge" data-layer={id}>
              {label}
              {count ? ` · ${count}` : ""}
            </span>
          );
        })}
      </span>

      {!tooth && <span className="ov-muted">Sin registro</span>}
    </button>
  );
});

export default function OdontogramVisual({ recordKey, ...props }: Props) {
  return <Workspace key={recordKey} {...props} />;
}

function Workspace({ teeth, dentition = "permanent", onEdit }: Omit<Props, "recordKey">) {
  const titleId = useId();
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const [active, setActive] = useState<Layer[]>(LAYERS.map(({ id }) => id));
  const [selected, setSelected] = useState<number | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);

  const rows = useMemo(() => {
    if (dentition === "primary") return PRIMARY;
    if (dentition === "mixed") return [...PERMANENT, ...PRIMARY];
    return PERMANENT;
  }, [dentition]);

  const index = useMemo(
    () => new Map<number, ToothRecord>(teeth.map((tooth) => [tooth.fdi, tooth] as const)),
    [teeth],
  );

  const validIds = rows.flatMap((row) => row.ids);
  const current = selected !== null && validIds.includes(selected) ? selected : (validIds[0] ?? 11);

  const currentSelection = selected === current ? selection : null;
  const tooth = index.get(current);
  const allVisible = visibleFindings(tooth?.findings ?? [], active);
  const displayed = visibleFindings(tooth?.findings ?? [], active, currentSelection);

  const selectTooth = useCallback((fdi: number) => {
    setSelected(fdi);
    setSelection(null);

    if (window.matchMedia("(max-width: 900px)").matches) {
      requestAnimationFrame(() => detailHeading.current?.focus());
    }
  }, []);

  function toggleLayer(layer: Layer) {
    setActive((previous) =>
      previous.includes(layer) ? previous.filter((item) => item !== layer) : [...previous, layer],
    );
    setSelection(null);
  }

  function requestEdit(finding: Finding | null = null) {
    onEdit?.({
      fdi: current,
      selection: currentSelection,
      finding,
    });
  }

  const locationLabel = currentSelection
    ? currentSelection.kind === "surface"
      ? surfaceLabel(current, currentSelection.value)
      : siteLabel(current, currentSelection.value)
    : "Diente completo";

  return (
    <section className="ov" aria-labelledby={titleId}>
      <header className="ov-header">
        <div>
          <h2 id={titleId}>Odontograma</h2>
          <p>Activa las especialidades y selecciona un diente.</p>
        </div>
        <button
          type="button"
          className="ov-preset"
          onClick={() => {
            setActive(["perio", "endo"]);
            setSelection(null);
          }}
        >
          Perio + Endo
        </button>
      </header>

      <div className="ov-toolbar" role="group" aria-label="Capas visibles">
        <button
          type="button"
          aria-pressed={active.length === LAYERS.length}
          onClick={() => {
            setActive(LAYERS.map(({ id }) => id));
            setSelection(null);
          }}
        >
          Todas
        </button>

        {LAYERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={active.includes(id)}
            onClick={() => toggleLayer(id)}
          >
            <LayerIcon layer={id} />
            {label}
          </button>
        ))}
      </div>

      <div className="ov-legend">
        {Object.entries(STATUS).map(([status, label]) => (
          <span key={status} className="ov-state" data-status={status}>
            {label}
          </span>
        ))}
        <span className="ov-muted">— Sin registro</span>
      </div>

      <p className="ov-convention">
        Esquema oclusal: vestibular arriba y palatino/lingual abajo. Mesial orientado hacia la línea
        media. Sondaje en mm.
      </p>

      <div className="ov-workspace">
        <div className="ov-chart">
          {rows.map((row) => (
            <section key={row.label} className="ov-quadrant">
              <h3>{row.label}</h3>
              <div
                className="ov-scroll"
                tabIndex={0}
                role="region"
                aria-label={`Dientes: ${row.label}`}
              >
                <div className="ov-row" data-count={row.ids.length}>
                  {row.ids.map((fdi) => (
                    <ToothCard
                      key={fdi}
                      fdi={fdi}
                      tooth={index.get(fdi)}
                      active={active}
                      selected={fdi === current}
                      onSelect={selectTooth}
                    />
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>

        <aside className="ov-detail" aria-label={`Detalle del diente ${current}`}>
          <header className="ov-detail-header">
            <h3 ref={detailHeading} tabIndex={-1} aria-live="polite">
              Diente {current}
            </h3>
            <span>{allVisible.length} anotaciones visibles</span>
          </header>

          <ToothDiagram
            fdi={current}
            tooth={tooth}
            findings={allVisible}
            showPerio={active.includes("perio")}
            interactive
            selection={currentSelection}
            onSelect={setSelection}
          />

          <div className="ov-location">
            <strong>{locationLabel}</strong>
            {currentSelection && (
              <button type="button" onClick={() => setSelection(null)}>
                Ver todo el diente
              </button>
            )}
          </div>

          {onEdit && (
            <button type="button" className="ov-edit" onClick={() => requestEdit()}>
              Abrir en el editor
            </button>
          )}

          <div className="ov-findings">
            {LAYERS.filter(({ id }) => active.includes(id)).map(({ id, label }) => {
              const records = displayed.filter((finding) => finding.layer === id);
              if (!records.length) return null;

              return (
                <section key={id} className="ov-finding-group">
                  <h4>
                    <LayerIcon layer={id} />
                    {label}
                  </h4>

                  {records.map((finding) => (
                    <article key={finding.id} className="ov-finding">
                      <div className="ov-finding-title">
                        <strong>{finding.label}</strong>
                        <span className="ov-state" data-status={finding.status}>
                          {STATUS[finding.status]}
                        </span>
                      </div>

                      {(finding.surface || finding.site) && (
                        <p className="ov-muted">
                          {finding.surface && surfaceLabel(current, finding.surface)}
                          {finding.surface && finding.site && " · "}
                          {finding.site && siteLabel(current, finding.site)}
                        </p>
                      )}

                      {finding.note && <p>{finding.note}</p>}

                      {finding.recordedAt && (
                        <time dateTime={finding.recordedAt}>{dateLabel(finding.recordedAt)}</time>
                      )}

                      {onEdit && (
                        <button type="button" onClick={() => requestEdit(finding)}>
                          Editar anotación
                        </button>
                      )}
                    </article>
                  ))}
                </section>
              );
            })}

            {!displayed.length && (
              <p className="ov-empty">No hay anotaciones en las capas y la zona seleccionadas.</p>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
