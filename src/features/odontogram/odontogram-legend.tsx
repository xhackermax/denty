import type { ToothState } from "@/domain";

import styles from "./odontogram.module.css";

export type OdontogramLegendPlacement = "tooth" | "bridge";

export interface OdontogramLegendSelection {
  state: ToothState;
  placement: OdontogramLegendPlacement;
}

interface LegendVariant {
  state: ToothState;
  label: string;
}

interface LegendItem {
  key: string;
  label: string;
  detail: string;
  appliesTo: string;
  placement: OdontogramLegendPlacement;
  variants: readonly LegendVariant[];
  symbol?: string;
  tone?: "danger" | "muted";
}

const LEGEND_ITEMS: readonly LegendItem[] = [
  {
    key: "healthy",
    label: "Sano",
    detail: "Sin hallazgos activos",
    appliesTo: "Diente",
    placement: "tooth",
    variants: [{ state: "healthy", label: "Sano" }],
  },
  {
    key: "caries",
    label: "Caries",
    detail: "Puede marcarse por cara",
    appliesTo: "Cara",
    placement: "tooth",
    variants: [{ state: "caries", label: "Pendiente" }],
  },
  {
    key: "filling",
    label: "Obturación",
    detail: "Realizada, revisar o pendiente",
    appliesTo: "Cara",
    placement: "tooth",
    variants: [
      { state: "filling", label: "Realizada" },
      { state: "filling_bad", label: "Revisar" },
      { state: "filling_pending", label: "Pendiente" },
    ],
  },
  {
    key: "crown",
    label: "Corona",
    detail: "Corona de cobertura total",
    appliesTo: "Diente",
    placement: "tooth",
    variants: [
      { state: "crown", label: "Realizada" },
      { state: "crown_bad", label: "Revisar" },
      { state: "crown_pending", label: "Pendiente" },
    ],
  },
  {
    key: "endo",
    label: "Endodoncia",
    detail: "Tratamiento endodóntico",
    appliesTo: "Diente",
    placement: "tooth",
    variants: [
      { state: "endo", label: "Realizada" },
      { state: "endo_bad", label: "Revisar" },
      { state: "endo_indicated", label: "Indicada" },
    ],
  },
  {
    key: "post",
    label: "Perno",
    detail: "Perno o poste intrarradicular",
    appliesTo: "Diente",
    placement: "tooth",
    variants: [
      { state: "post", label: "Realizado" },
      { state: "post_bad", label: "Revisar" },
      { state: "post_pending", label: "Pendiente" },
    ],
  },
  {
    key: "implant",
    label: "Implante",
    detail: "Implante sobre la posición dental",
    appliesTo: "Diente",
    placement: "tooth",
    variants: [
      { state: "implant", label: "Realizado" },
      { state: "implant_review", label: "Revisar" },
      { state: "implant_indicated", label: "Indicado" },
    ],
  },
  {
    key: "prosthesis",
    label: "Prótesis fija / puente",
    detail: "Selecciona diente inicial y final",
    appliesTo: "Rango",
    placement: "bridge",
    variants: [
      { state: "prosthesis", label: "Realizada" },
      { state: "prosthesis_bad", label: "Revisar" },
      { state: "prosthesis_pending", label: "Pendiente" },
    ],
  },
  {
    key: "removable",
    label: "Prótesis removible",
    detail: "Marca dientes de soporte",
    appliesTo: "Diente",
    placement: "tooth",
    variants: [
      { state: "removable", label: "Realizada" },
      { state: "removable_bad", label: "Revisar" },
      { state: "removable_pending", label: "Pendiente" },
    ],
  },
  {
    key: "extraction",
    label: "Exodoncia",
    detail: "Marca el diente con una X",
    appliesTo: "Diente",
    placement: "tooth",
    variants: [{ state: "extraction", label: "Indicada" }],
    symbol: "×",
    tone: "danger",
  },
  {
    key: "missing",
    label: "Ausente",
    detail: "Marca ausencia dental",
    appliesTo: "Diente",
    placement: "tooth",
    variants: [{ state: "missing", label: "Ausente" }],
    symbol: "—",
    tone: "muted",
  },
] as const;

const PRIMARY_KEYS = new Set([
  "healthy",
  "caries",
  "filling",
  "crown",
  "endo",
  "prosthesis",
  "extraction",
]);

function selectedItem(item: LegendItem, selection: OdontogramLegendSelection): boolean {
  if (item.placement !== selection.placement) return false;
  return item.variants.some((variant) => variant.state === selection.state);
}

function nextVariant(item: LegendItem, selection: OdontogramLegendSelection): LegendVariant {
  const currentIndex = item.variants.findIndex((variant) => variant.state === selection.state);
  if (currentIndex < 0) return item.variants[0]!;
  return item.variants[(currentIndex + 1) % item.variants.length]!;
}

export function OdontogramLegend({
  selection,
  onSelect,
  disabled = false,
}: {
  selection: OdontogramLegendSelection;
  onSelect: (selection: OdontogramLegendSelection) => void;
  disabled?: boolean;
}) {
  const activeItem = LEGEND_ITEMS.find((item) => selectedItem(item, selection));
  const activeVariant = activeItem?.variants.find((variant) => variant.state === selection.state);
  const primaryItems = LEGEND_ITEMS.filter((item) => PRIMARY_KEYS.has(item.key));
  const advancedItems = LEGEND_ITEMS.filter((item) => !PRIMARY_KEYS.has(item.key));

  const renderItem = (item: LegendItem) => {
    const isSelected = selectedItem(item, selection);
    const variant = isSelected ? nextVariant(item, selection) : item.variants[0]!;
    const currentVariant = isSelected
      ? (item.variants.find((entry) => entry.state === selection.state) ?? item.variants[0]!)
      : item.variants[0]!;

    return (
      <button
        className={styles.legendEntry}
        key={item.key}
        type="button"
        disabled={disabled}
        data-selected={isSelected}
        aria-pressed={isSelected}
        aria-label={`${item.label}. ${currentVariant.label}. Se aplica a ${item.appliesTo}.`}
        title={
          item.variants.length > 1
            ? `${item.label}: pulsa de nuevo para cambiar a ${variant.label}`
            : item.detail
        }
        onClick={() => {
          const next = isSelected ? nextVariant(item, selection) : item.variants[0]!;
          onSelect({ state: next.state, placement: item.placement });
        }}
      >
        {item.symbol ? (
          <span className={styles.legendSymbol} data-tone={item.tone} aria-hidden="true">
            {item.symbol}
          </span>
        ) : (
          <span
            className={styles.legendSwatch}
            data-state={currentVariant.state}
            aria-hidden="true"
          />
        )}
        <span className={styles.legendCopy}>
          <strong>{item.label}</strong>
          <small>
            {currentVariant.label} · {item.appliesTo}
          </small>
        </span>
      </button>
    );
  };

  return (
    <aside className={styles.legendCard} aria-label="Leyenda clínica interactiva del odontograma">
      <div className={styles.legendHeading}>
        <div>
          <strong>Herramientas</strong>
          <span>Pulsa una opción y después el diente o la cara.</span>
        </div>
        <span className={styles.legendHint}>
          Activa · {activeItem?.label ?? "Herramienta"} · {activeVariant?.label ?? selection.state}
        </span>
      </div>

      <div className={styles.legendGrid}>{primaryItems.map(renderItem)}</div>

      <details className={styles.legendMore}>
        <summary>Más tratamientos</summary>
        <div className={styles.legendGrid}>{advancedItems.map(renderItem)}</div>
      </details>

      <div className={styles.surfaceLegend}>
        <strong>Caras:</strong>
        <span>
          <b>M</b> Mesial
        </span>
        <span>
          <b>D</b> Distal
        </span>
        <span>
          <b>V</b> Vestibular
        </span>
        <span>
          <b>P/L</b> Palatina / lingual
        </span>
        <span>
          <b>O/I</b> Oclusal / incisal
        </span>
      </div>
    </aside>
  );
}
