"use client";

import {
  isOdontogramPresetId,
  ODONTOGRAM_LAYER_IDS,
  ODONTOGRAM_LAYER_LABELS,
  type OdontogramLayerId,
  type OdontogramPresetId,
  type OdontogramViewState,
} from "./odontogram-view-state";
import styles from "./odontogram.module.css";

const SUBFILTER_LABELS: Record<OdontogramLayerId, Readonly<Record<string, string>>> = {
  general: {
    caries: "Caries",
    restauraciones: "Restauraciones",
    defectos: "Defectos",
    desgaste: "Desgaste",
  },
  perio: {
    sondaje: "Sondaje",
    recesion: "Recesión",
    sangrado: "Sangrado",
    supuracion: "Supuración",
    placa: "Placa",
    movilidad: "Movilidad",
    furcas: "Furcas",
  },
  ortho: {
    aparatos: "Aparatos",
    posicion: "Posición",
    espacios: "Espacios",
    ipr: "IPR",
    movimientos_propuestos: "Movimientos propuestos",
    relaciones: "Relaciones oclusales",
  },
  endo: {
    diagnosticos: "Diagnósticos",
    conductos: "Conductos",
    tratamientos: "Tratamientos",
    hallazgos_apicales: "Hallazgos apicales",
    complicaciones: "Complicaciones",
  },
  surgery: {
    extracciones: "Extracciones",
    implantes: "Implantes",
    regeneracion: "Regeneración",
    tejidos: "Tejidos",
    lesiones: "Lesiones",
  },
  prosthetics: {
    fija: "Fija",
    removible: "Removible",
    implantoprotesis: "Implantoprótesis",
    componentes: "Componentes",
    provisionales: "Provisionales",
  },
  replacement: {
    temporales: "Temporales",
    sucesores: "Sucesores",
    erupcion: "Erupción",
    seguimiento: "Seguimiento",
  },
  proposal: {
    procedimientos: "Procedimientos",
    fases: "Fases",
    pendientes_de_valorar: "Pendientes de valorar",
    diferencias: "Diferencias",
  },
};

const FREQUENT_LAYERS: readonly OdontogramLayerId[] = ["general", "perio", "endo", "prosthetics"];
const MORE_LAYERS = ODONTOGRAM_LAYER_IDS.filter((layerId) => !FREQUENT_LAYERS.includes(layerId));
const PRESETS: readonly { id: OdontogramPresetId; label: string }[] = [
  { id: "exploration", label: "Exploración" },
  { id: "periodontal_review", label: "Revisión periodontal" },
  { id: "orthodontic_review", label: "Revisión ortodóncica" },
  { id: "endodontic_assessment", label: "Valoración endodóntica" },
  { id: "implant_prosthetic_assessment", label: "Valoración implantoprotésica" },
  { id: "patient_explanation", label: "Explicar al paciente" },
];

interface OdontogramLayerControlsProps {
  state: OdontogramViewState;
  focusedLayer: OdontogramLayerId | null;
  onFocusLayer: (layerId: OdontogramLayerId) => void;
  onToggleLayer: (layerId: OdontogramLayerId) => void;
  onToggleSubfilter: (layerId: OdontogramLayerId, subfilterId: string) => void;
  onShowAll: () => void;
  onApplyPreset: (presetId: OdontogramPresetId) => void;
  onReset: () => void;
  onOpenHistory: () => void;
}

function LayerButton({
  layerId,
  state,
  focused,
  onToggle,
  onFocus,
}: {
  layerId: OdontogramLayerId;
  state: OdontogramViewState;
  focused: boolean;
  onToggle: (layerId: OdontogramLayerId) => void;
  onFocus: (layerId: OdontogramLayerId) => void;
}) {
  const active = state.visibleLayerIds.includes(layerId);
  const hasPartialFilters =
    state.subfiltersByLayer[layerId].length < Object.keys(SUBFILTER_LABELS[layerId]).length;
  return (
    <span className={styles.layerButtonPair} data-focused={focused}>
      <button
        type="button"
        className={styles.layerToggle}
        data-active={active}
        data-filtered={active && hasPartialFilters}
        aria-pressed={active}
        aria-label={`Mostrar capa ${ODONTOGRAM_LAYER_LABELS[layerId]}`}
        onClick={() => onToggle(layerId)}
      >
        {ODONTOGRAM_LAYER_LABELS[layerId]}
        {active && hasPartialFilters ? <span aria-label="Filtros activos"> ·</span> : null}
      </button>
      {active ? (
        <button
          type="button"
          className={styles.layerFocusAction}
          data-active={focused}
          aria-pressed={focused}
          aria-label={`Editar área ${ODONTOGRAM_LAYER_LABELS[layerId]}`}
          onClick={() => onFocus(layerId)}
        >
          Editar
        </button>
      ) : null}
    </span>
  );
}

export function OdontogramLayerControls({
  state,
  focusedLayer,
  onFocusLayer,
  onToggleLayer,
  onToggleSubfilter,
  onShowAll,
  onApplyPreset,
  onReset,
  onOpenHistory,
}: OdontogramLayerControlsProps) {
  return (
    <nav className={styles.layerControls} aria-label="Capas del odontograma">
      <p className={styles.layerHelp}>
        Pulsa las áreas para superponer varias en el mismo dibujo. «Editar» abre sus herramientas sin crear otro odontograma.
      </p>
      <div className={styles.layerToolbar}>
        <div className={styles.layerButtons} aria-label="Capas frecuentes">
          {FREQUENT_LAYERS.map((layerId) => (
            <LayerButton key={layerId} layerId={layerId} state={state} focused={focusedLayer === layerId} onToggle={onToggleLayer} onFocus={onFocusLayer} />
          ))}
        </div>
        <details className={styles.layerDisclosure}>
          <summary>Más capas</summary>
          <div className={styles.layerButtons} aria-label="Más capas">
            {MORE_LAYERS.map((layerId) => (
              <LayerButton key={layerId} layerId={layerId} state={state} focused={focusedLayer === layerId} onToggle={onToggleLayer} onFocus={onFocusLayer} />
            ))}
          </div>
        </details>
        <button type="button" className={styles.layerAction} onClick={onShowAll}>
          {state.mode === "normal" ? "Mostrar todo" : "Volver a vista anterior"}
        </button>
      </div>

      <div className={styles.layerSecondaryActions}>
        <label className={styles.layerPreset}>
          Preset
          <select
            aria-label="Preset de vista"
            value={state.presetId ?? ""}
            onChange={(event) => {
              const presetId = event.currentTarget.value;
              if (isOdontogramPresetId(presetId)) onApplyPreset(presetId);
            }}
          >
            <option value="">Seleccionar vista</option>
            {PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className={styles.layerAction} onClick={onReset}>
          Restablecer vista
        </button>
        <button type="button" className={styles.layerAction} onClick={onOpenHistory}>
          Historial
        </button>
      </div>

      {state.mode === "all_adjusted" ? (
        <p className={styles.layerStatus} role="status">
          Vista completa ajustada
        </p>
      ) : state.mode === "all" ? (
        <p className={styles.layerStatus} role="status">
          Todas las capas
        </p>
      ) : null}

      <details className={styles.layerDisclosure}>
        <summary>Filtros de capas</summary>
        <div className={styles.layerFilters}>
          {ODONTOGRAM_LAYER_IDS.map((layerId) => (
            <fieldset key={layerId} className={styles.layerFilterGroup}>
              <legend>{ODONTOGRAM_LAYER_LABELS[layerId]}</legend>
              {Object.entries(SUBFILTER_LABELS[layerId]).map(([filterId, label]) => (
                <label key={filterId}>
                  <input
                    type="checkbox"
                    checked={state.subfiltersByLayer[layerId].includes(filterId)}
                    onChange={() => onToggleSubfilter(layerId, filterId)}
                  />
                  {label}
                </label>
              ))}
            </fieldset>
          ))}
        </div>
      </details>
    </nav>
  );
}
