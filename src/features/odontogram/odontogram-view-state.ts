export const ODONTOGRAM_LAYER_IDS = [
  "general",
  "perio",
  "ortho",
  "endo",
  "surgery",
  "prosthetics",
  "replacement",
  "proposal",
] as const;

export type OdontogramLayerId = (typeof ODONTOGRAM_LAYER_IDS)[number];
export type OdontogramPresetId =
  | "exploration"
  | "periodontal_review"
  | "orthodontic_review"
  | "endodontic_assessment"
  | "implant_prosthetic_assessment"
  | "patient_explanation";
export type OdontogramViewMode = "normal" | "all" | "all_adjusted";
export type OdontogramSubfilters = Record<OdontogramLayerId, readonly string[]>;

export const ODONTOGRAM_LAYER_LABELS: Record<OdontogramLayerId, string> = {
  general: "General",
  perio: "Perio",
  ortho: "Orto",
  endo: "Endo",
  surgery: "Cirugía",
  prosthetics: "Prótesis",
  replacement: "Recambio",
  proposal: "Plan A/B",
};

export interface OdontogramViewSnapshot {
  visibleLayerIds: readonly OdontogramLayerId[];
  subfiltersByLayer: OdontogramSubfilters;
  presetId: OdontogramPresetId | null;
}

export interface OdontogramViewState extends OdontogramViewSnapshot {
  mode: OdontogramViewMode;
  preAllView: OdontogramViewSnapshot | null;
  scenarioId: string | null;
}

export interface OdontogramViewPreference {
  visibleLayerIds: readonly OdontogramLayerId[];
  subfiltersByLayer: OdontogramSubfilters;
  presetId: OdontogramPresetId | null;
}

export const ODONTOGRAM_LAYER_FILTERS: OdontogramSubfilters = {
  general: ["caries", "restauraciones", "defectos", "desgaste"],
  perio: ["sondaje", "recesion", "sangrado", "supuracion", "placa", "movilidad", "furcas"],
  ortho: ["aparatos", "posicion", "espacios", "ipr", "movimientos_propuestos", "relaciones"],
  endo: ["diagnosticos", "conductos", "tratamientos", "hallazgos_apicales", "complicaciones"],
  surgery: ["extracciones", "implantes", "regeneracion", "tejidos", "lesiones"],
  prosthetics: ["fija", "removible", "implantoprotesis", "componentes", "provisionales"],
  replacement: ["temporales", "sucesores", "erupcion", "seguimiento"],
  proposal: ["procedimientos", "fases", "pendientes_de_valorar", "diferencias"],
};

const PRESETS: Record<
  OdontogramPresetId,
  { visibleLayerIds: readonly OdontogramLayerId[]; subfilters?: Partial<OdontogramSubfilters> }
> = {
  exploration: { visibleLayerIds: ["general"] },
  periodontal_review: {
    visibleLayerIds: ["general", "perio"],
    subfilters: {
      perio: ["sondaje", "recesion", "sangrado", "supuracion", "movilidad", "furcas"],
    },
  },
  orthodontic_review: { visibleLayerIds: ["ortho", "replacement"] },
  endodontic_assessment: {
    visibleLayerIds: ["general", "endo", "perio"],
    subfilters: { perio: ["sondaje", "movilidad"] },
  },
  implant_prosthetic_assessment: {
    visibleLayerIds: ["surgery", "prosthetics", "perio"],
    subfilters: { perio: ["sondaje", "sangrado", "supuracion"] },
  },
  patient_explanation: { visibleLayerIds: ["general", "proposal"] },
};

export function isOdontogramPresetId(value: string): value is OdontogramPresetId {
  return Object.prototype.hasOwnProperty.call(PRESETS, value);
}

export function layerForToothState(status: string): OdontogramLayerId | null {
  if (status === "caries") return "general";
  if (status === "early_caries" || status === "sealant") return "general";
  if (status.startsWith("filling")) return "general";
  if (
    status.startsWith("crown") ||
    status === "pediatric_crown" ||
    status.startsWith("prosthesis") ||
    status.startsWith("removable")
  )
    return "prosthetics";
  if (
    status.startsWith("endo") ||
    status.startsWith("post") ||
    status === "pulpotomy" ||
    status === "pulpectomy"
  )
    return "endo";
  if (status.startsWith("implant")) return "surgery";
  if (
    status === "unerupted" ||
    status === "retained" ||
    status === "impacted" ||
    status === "congenitally_missing" ||
    status === "exfoliated" ||
    status === "erupting" ||
    status === "space_maintainer"
  )
    return "replacement";
  if (status === "missing" || status === "extraction") return null;
  return null;
}

export function subfilterForToothStatus(status: string): string | null {
  if (status === "caries" || status === "early_caries") return "caries";
  if (status === "sealant") return "restauraciones";
  if (status.startsWith("filling")) return "restauraciones";
  if (status.startsWith("crown")) return "fija";
  if (status === "pediatric_crown") return "fija";
  if (
    status.startsWith("endo") ||
    status.startsWith("post") ||
    status === "pulpotomy" ||
    status === "pulpectomy"
  )
    return "tratamientos";
  if (status.startsWith("implant")) return "implantes";
  if (status.startsWith("prosthesis")) return "fija";
  if (status.startsWith("removable")) return "removible";
  if (status === "unerupted" || status === "erupting") return "erupcion";
  if (status === "retained" || status === "exfoliated") return "temporales";
  if (status === "impacted" || status === "congenitally_missing") return "sucesores";
  if (status === "space_maintainer") return "seguimiento";
  return null;
}

export function isToothStatusVisible(
  status: string | undefined,
  state: OdontogramViewState,
): boolean {
  if (!status) return true;
  const layerId = layerForToothState(status);
  if (!layerId) return true;
  const subfilterId = subfilterForToothStatus(status);
  return (
    state.visibleLayerIds.includes(layerId) &&
    (subfilterId === null || state.subfiltersByLayer[layerId].includes(subfilterId))
  );
}

function copyFilters(filters: OdontogramSubfilters): OdontogramSubfilters {
  const result: OdontogramSubfilters = { ...filters };
  for (const id of ODONTOGRAM_LAYER_IDS) result[id] = [...filters[id]];
  return result;
}

function snapshot(state: OdontogramViewState): OdontogramViewSnapshot {
  return {
    visibleLayerIds: [...state.visibleLayerIds],
    subfiltersByLayer: copyFilters(state.subfiltersByLayer),
    presetId: state.presetId,
  };
}

function withVisualChange(
  state: OdontogramViewState,
  next: Pick<OdontogramViewState, "visibleLayerIds" | "subfiltersByLayer" | "presetId">,
): OdontogramViewState {
  return {
    ...state,
    ...next,
    mode: state.mode === "normal" ? "normal" : "all_adjusted",
    presetId: state.mode === "normal" ? null : next.presetId,
  };
}

export function createInitialOdontogramViewState(): OdontogramViewState {
  return {
    mode: "normal",
    visibleLayerIds: ["general"],
    subfiltersByLayer: copyFilters(ODONTOGRAM_LAYER_FILTERS),
    presetId: "exploration",
    preAllView: null,
    scenarioId: null,
  };
}

export function toggleOdontogramLayer(
  state: OdontogramViewState,
  layerId: OdontogramLayerId,
): OdontogramViewState {
  const visible = state.visibleLayerIds.includes(layerId);
  const visibleLayerIds = visible
    ? state.visibleLayerIds.filter((id) => id !== layerId)
    : [...state.visibleLayerIds, layerId];
  return withVisualChange(state, { ...snapshot(state), visibleLayerIds, presetId: null });
}

export function toggleOdontogramSubfilter(
  state: OdontogramViewState,
  layerId: OdontogramLayerId,
  subfilterId: string,
): OdontogramViewState {
  const current = state.subfiltersByLayer[layerId];
  if (!ODONTOGRAM_LAYER_FILTERS[layerId].includes(subfilterId)) return state;
  const subfiltersByLayer = copyFilters(state.subfiltersByLayer);
  subfiltersByLayer[layerId] = current.includes(subfilterId)
    ? current.filter((id) => id !== subfilterId)
    : [...current, subfilterId];
  return withVisualChange(state, { ...snapshot(state), subfiltersByLayer, presetId: null });
}

export function toggleShowAllLayers(state: OdontogramViewState): OdontogramViewState {
  if (state.mode !== "normal") {
    const previous = state.preAllView;
    if (!previous) return createInitialOdontogramViewState();
    return {
      ...state,
      ...previous,
      mode: "normal",
      preAllView: null,
    };
  }

  return {
    ...state,
    mode: "all",
    visibleLayerIds: [...ODONTOGRAM_LAYER_IDS],
    subfiltersByLayer: copyFilters(ODONTOGRAM_LAYER_FILTERS),
    presetId: null,
    preAllView: snapshot(state),
  };
}

export function applyViewPreset(
  state: OdontogramViewState,
  presetId: OdontogramPresetId,
): OdontogramViewState {
  const preset = PRESETS[presetId];
  const subfiltersByLayer = copyFilters(ODONTOGRAM_LAYER_FILTERS);
  for (const id of ODONTOGRAM_LAYER_IDS) {
    const presetFilters = preset.subfilters?.[id];
    if (presetFilters) subfiltersByLayer[id] = [...presetFilters];
  }
  return {
    ...state,
    mode: "normal",
    visibleLayerIds: [...preset.visibleLayerIds],
    subfiltersByLayer,
    presetId,
    preAllView: null,
  };
}

export function resetOdontogramView(state: OdontogramViewState): OdontogramViewState {
  return {
    ...createInitialOdontogramViewState(),
    scenarioId: state.scenarioId,
  };
}

export function createOdontogramViewPreference(
  state: OdontogramViewState,
): OdontogramViewPreference {
  const normal = state.mode === "normal" ? state : state.preAllView;
  if (!normal) return createOdontogramViewPreference(createInitialOdontogramViewState());
  return {
    visibleLayerIds: [...normal.visibleLayerIds],
    subfiltersByLayer: copyFilters(normal.subfiltersByLayer),
    presetId: normal.presetId,
  };
}

export function restoreOdontogramViewPreference(value: unknown): OdontogramViewState {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return createInitialOdontogramViewState();
  const preference = value as Record<string, unknown>;
  const storedLayers = preference.visibleLayerIds;
  const storedFilters = preference.subfiltersByLayer;
  if (!Array.isArray(storedLayers) || !storedFilters || typeof storedFilters !== "object")
    return createInitialOdontogramViewState();

  const visibleLayerIds = storedLayers.filter(
    (id): id is OdontogramLayerId =>
      typeof id === "string" && ODONTOGRAM_LAYER_IDS.includes(id as OdontogramLayerId),
  );
  const subfiltersByLayer = copyFilters(ODONTOGRAM_LAYER_FILTERS);
  for (const id of ODONTOGRAM_LAYER_IDS) {
    const stored = (storedFilters as Record<string, unknown>)[id];
    if (Array.isArray(stored)) {
      subfiltersByLayer[id] = stored.filter(
        (filter): filter is string =>
          typeof filter === "string" && ODONTOGRAM_LAYER_FILTERS[id].includes(filter),
      );
    }
  }
  const presetId =
    typeof preference.presetId === "string" && isOdontogramPresetId(preference.presetId)
      ? preference.presetId
      : null;
  return {
    mode: "normal",
    visibleLayerIds: [...new Set(visibleLayerIds)],
    subfiltersByLayer,
    presetId,
    preAllView: null,
    scenarioId: null,
  };
}
