"use client";
import { QuickDiagnosisBar } from "@/features/diagnosis/quick-diagnosis-bar";
import { deriveMouthState } from "@/domain/odontogram/mouth-state";
import OdontogramVisual from "./visual/odontogram-visual";
import { OdontogramViewSwitch } from "./visual/odontogram-view-switch";
import { toVisualDentition, toVisualTeeth } from "./visual/visual-adapter";
import { MouthStateProvider } from "./mouth-state-context";
import { MouthMiniMap } from "./mouth-mini-map";
import { useUnsavedChangesGuard } from "@/shared/navigation/use-unsaved-changes-guard";
import { useAutosave, type AutosaveStatus } from "./use-autosave";
import { Alert, Badge, Button, Group, Select, SimpleGrid, Text } from "@mantine/core";
import { IconArrowBackUp, IconArrowForwardUp, IconArrowRight } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useOptionalAssistantContextPatch } from "@/features/assistant/assistant-context";
import {
  ENDODONTIC_VISUAL_MARKS,
  PERMANENT_LOWER,
  PERMANENT_UPPER,
  TOOTH_STATES,
  archForTooth,
  bridgeTeethFromEndpoints,
  toothType,
  createBridgeEntities,
  createBoundedHistory,
  cycleClinicalState,
  createEndoPostCrown,
  createImplantStack,
  createOdontogramEntityState,
  executeValidatedOdontogramBatch,
  executeValidatedOdontogramCommand,
  redoHistory,
  undoHistory,
  type BoundedHistory,
  type DentalEntity,
  type PeriodontalReading,
  type OdontogramEntityState,
  type ToothState,
  type ToothSurface,
  type TriStateFamily,
} from "@/domain";
import { ClinicalPipelineCard } from "@/shared/clinical/clinical-pipeline-card";
import { TreatmentFlowModal } from "@/shared/clinical/treatment-flow";
import { getBrowserApi } from "@/shared/api/browser";
import { createClinicalAutoSync } from "@/shared/clinical/auto-sync";
import { invalidateClinicalPatient } from "@/shared/clinical/clinical-data";
import { ClinicalWorkspace } from "@/shared/clinical/clinical-workspace";
import {
  odontogramEntities,
  useOdontogramQuery,
  useOdontogramSnapshotsQuery,
  useSaveOdontogramBatchMutation,
} from "./odontogram-data";
import { OdontogramHistory } from "./odontogram-history";
import { OdontogramLegend, type OdontogramLegendSelection } from "./odontogram-legend";
import { createPerioDraftOwner, type PerioDraftOwner } from "@/features/periodontal/draft-owner";
import type { PerioPresenceChange } from "@/domain/periodontal/entry-cursor";
import { PerioChart } from "@/features/periodontal/perio-chart";
import { RetainedFlowStep } from "@/shared/clinical/retained-flow-step";
import { ImplantSurgeryPanel } from "./implant-surgery-panel";
import {
  createStateEntity,
  persistedEntityToDomain,
  toothStateFromEntity,
} from "@/shared/odontogram/odontogram-wire";
import parityStyles from "@/shared/ui/parity.module.css";
import { DentyApiError } from "@/shared/api";
import { usePatientQuery } from "@/shared/patients/patient-data";
import { PageHeader } from "@/shared/ui";
import { type ClinicalTab } from "./clinical-tabs";
import { EndodonticPanel } from "./endodontic-panel";
import styles from "./odontogram.module.css";
import {
  CROWN_PATHS,
  ROOT_PATHS,
  SURFACE_MAP_PATHS,
  TOOTH_MARK_PATHS,
  surfaceMapLayout,
} from "@/shared/odontogram/tooth-geometry";
import { TOOTH_STATE_LABELS as STATE_LABELS } from "@/shared/odontogram/tooth-state-labels";
import { OrthodonticPanel } from "./orthodontic-panel";
import { PediatricPanel } from "./pediatric-panel";
import { SupernumeraryPanel } from "./supernumerary-panel";
import { OdontogramLayerControls } from "./odontogram-layer-controls";
import { readBrowserStorageItem, writeBrowserStorageItem } from "@/shared/browser/browser-storage";
import {
  applyViewPreset,
  createInitialOdontogramViewState,
  createOdontogramViewPreference,
  isToothStatusVisible,
  layerForToothState,
  ODONTOGRAM_LAYER_LABELS,
  resetOdontogramView,
  restoreOdontogramViewPreference,
  subfilterForToothStatus,
  toggleOdontogramLayer,
  toggleOdontogramSubfilter,
  toggleShowAllLayers,
  type OdontogramPresetId,
  type OdontogramViewState,
} from "./odontogram-view-state";
import {
  orthodonticMarkForTooth,
  periodontalMarksForTooth,
  pediatricReplacementForTooth,
} from "./odontogram-layer-projection";

import { patientLine } from "./patient-line";
import { SurgeryPanel } from "./surgery-panel";
import { surgicalVisualsForTooth } from "./surgery-visuals";
const TOOL_OPTIONS = TOOTH_STATES.map((state) => ({
  value: state,
  label: STATE_LABELS[state],
}));
const VIEW_PREFERENCE_KEY = "denty:odontogram:view:v2";
function triStateFamily(state: string | undefined): TriStateFamily | null {
  if (!state) return null;
  if (state.startsWith("filling")) return "filling";
  if (state.startsWith("crown")) return "crown";
  if (state.startsWith("endo")) return "endo";
  if (state.startsWith("post")) return "post";
  if (state.startsWith("implant")) return "implant";
  return null;
}
function cycleTreatmentState(state: string | undefined): ToothState | null {
  const family = triStateFamily(state);
  if (!family || !state) return null;
  return cycleClinicalState(family, state as ToothState);
}

function isSurfaceOnlyTool(tool: ToothState): boolean {
  return ["caries", "filling", "filling_bad", "filling_pending"].includes(tool);
}

function bridgeTeethFromEntity(entity: DentalEntity): string[] {
  const teeth = entity.attributes?.teeth;
  return Array.isArray(teeth)
    ? teeth.filter((tooth): tooth is string => typeof tooth === "string")
    : [];
}

function bridgeEndpointTeethFromEntity(entity: DentalEntity): string[] {
  const pillars = entity.attributes?.pillars;
  if (Array.isArray(pillars)) {
    return pillars.filter((tooth): tooth is string => typeof tooth === "string");
  }
  const teeth = bridgeTeethFromEntity(entity);
  return [teeth[0], teeth.at(-1)].filter((tooth): tooth is string => Boolean(tooth));
}
function surgicalMarkFilter(kind: string): string {
  if (kind === "implant" || kind === "implant-lost") return "implantes";
  if (kind === "graft") return "regeneracion";
  if (kind === "lesion") return "lesiones";
  if (kind === "extraction") return "extracciones";
  return "tejidos";
}
function wholeEntity(
  state: OdontogramEntityState,
  tooth: string,
  tool?: ToothState,
): DentalEntity | undefined {
  const toolType = tool ? createStateEntity(tooth, tool).entityType : undefined;
  const matches = Object.values(state.entitiesById).filter(
    (entity) =>
      entity.active &&
      entity.tooth === tooth &&
      !entity.surfaces?.length &&
      (toolType === undefined || entity.entityType === toolType),
  );
  if (toolType !== undefined) return matches.at(-1);
  return matches.filter((entity) => toothStateFromEntity(entity) !== null).at(-1) ?? matches.at(-1);
}
function wholeState(state: OdontogramEntityState, tooth: string): string | undefined {
  const entity = wholeEntity(state, tooth);
  return entity ? (toothStateFromEntity(entity) ?? entity.status) : undefined;
}
function surfaceEntity(
  state: OdontogramEntityState,
  tooth: string,
  surface: ToothSurface,
): DentalEntity | undefined {
  return Object.values(state.entitiesById).find(
    (entity) => entity.active && entity.tooth === tooth && entity.surfaces?.includes(surface),
  );
}
function surfaceState(
  state: OdontogramEntityState,
  tooth: string,
  surface: ToothSurface,
): string | undefined {
  const entity = surfaceEntity(state, tooth, surface);
  return entity ? (toothStateFromEntity(entity) ?? entity.status) : undefined;
}
interface ToothProps {
  tooth: string;
  state: OdontogramEntityState;
  viewState: OdontogramViewState;
  periodontalReadings: readonly PeriodontalReading[];
  selected: boolean;
  prosthesisRange: boolean;
  prosthesisEndpoint: boolean;
  readOnly: boolean;
  onSelect: () => void;
  onWholeAction: () => void;
  onSurfaceAction: (surface: ToothSurface) => void;
  onSurfaceCycle: (surface: ToothSurface) => void;
}
const SURFACE_NAMES: Readonly<Record<ToothSurface, string>> = {
  V: "vestibular",
  M: "mesial",
  O: "oclusal",
  I: "incisal",
  D: "distal",
  P: "palatina",
  L: "lingual",
};
function Tooth({
  tooth,
  state,
  viewState,
  periodontalReadings,
  selected,
  prosthesisRange,
  prosthesisEndpoint,
  readOnly,
  onSelect,
  onWholeAction,
  onSurfaceAction,
  onSurfaceCycle,
}: ToothProps) {
  const status = wholeState(state, tooth);
  const type = toothType(tooth);
  const arch = archForTooth(tooth);
  const map = surfaceMapLayout(tooth);
  const displayStatus = isToothStatusVisible(status, viewState) ? status : undefined;
  const statusFor = (surface: ToothSurface) => {
    const surfaceValue = surfaceState(state, tooth, surface);
    if (surfaceValue && !isToothStatusVisible(surfaceValue, viewState)) return "";
    return surfaceValue ?? displayStatus ?? "";
  };
  const surfaceProps = (surface: ToothSurface) => ({
    onClick: (event: React.MouseEvent<SVGElement>) => {
      event.stopPropagation();
      if (!readOnly) onSurfaceAction(surface);
    },
    onDoubleClick: (event: React.MouseEvent<SVGElement>) => {
      event.stopPropagation();
      if (!readOnly) onSurfaceCycle(surface);
    },
  });
  const implant = status?.startsWith("implant");
  const prosthesis = status?.startsWith("prosthesis");
  const endo = status?.startsWith("endo");
  const post = status?.startsWith("post");
  const extraction = status === "extraction";
  const missing = status === "missing";
  const endodonticDiagnosis = Object.values(state.entitiesById).find(
    (entity) =>
      entity.active &&
      entity.tooth === tooth &&
      entity.entityType === "ENDO" &&
      entity.status === "diagnosis",
  );
  const visualCode = endodonticDiagnosis?.attributes?.visualCode;
  const visualMark =
    viewState.visibleLayerIds.includes("endo") &&
    (viewState.subfiltersByLayer.endo.includes("diagnosticos") ||
      viewState.subfiltersByLayer.endo.includes("hallazgos_apicales")) &&
    typeof visualCode === "string" &&
    visualCode in ENDODONTIC_VISUAL_MARKS
      ? ENDODONTIC_VISUAL_MARKS[visualCode as keyof typeof ENDODONTIC_VISUAL_MARKS]
      : undefined;
  const surgicalMarks =
    viewState.visibleLayerIds.includes("surgery") && viewState.subfiltersByLayer.surgery.length > 0
      ? surgicalVisualsForTooth(tooth, Object.values(state.entitiesById)).filter((mark) =>
          viewState.subfiltersByLayer.surgery.includes(surgicalMarkFilter(mark.kind)),
        )
      : [];
  const orthodonticMark = orthodonticMarkForTooth(state, tooth, viewState);
  const replacement = pediatricReplacementForTooth(state, tooth, viewState);
  const perioSummary = periodontalMarksForTooth(periodontalReadings, tooth, viewState);
  const layerDescription = [
    orthodonticMark ? `Ortodoncia: ${orthodonticMark}` : null,
    replacement?.label ? `Recambio: ${replacement.label}` : null,
    ...perioSummary,
  ]
    .filter((mark): mark is string => Boolean(mark))
    .join(", ");
  return (
    <button
      className={styles.toothButton}
      type="button"
      data-selected={selected}
      data-prosthesis-range={prosthesisRange}
      data-prosthesis-endpoint={prosthesisEndpoint}
      data-arch={arch}
      data-type={type}
      aria-disabled={readOnly}
      onClick={onSelect}
      onDoubleClick={onWholeAction}
      aria-label={`Diente ${tooth}${layerDescription ? `, ${layerDescription}` : ""}`}
      title={`Diente ${tooth} · doble clic para cambiar el estado completo`}
    >
      <span className={styles.toothLabel}>{tooth}</span>
      {orthodonticMark ? (
        <span className={styles.toothLayerMark} data-layer="ortho">
          Orto · {orthodonticMark}
        </span>
      ) : null}
      {replacement ? (
        <span className={styles.toothLayerMark} data-layer="replacement">
          {replacement.label}
        </span>
      ) : null}
      {perioSummary.length ? (
        <span
          className={styles.toothLayerMark}
          data-layer="perio"
          aria-label={perioSummary.join(", ")}
        >
          {perioSummary.join(" · ")}
        </span>
      ) : null}
      <svg
        className={styles.toothSvg}
        data-state={displayStatus ?? "healthy"}
        data-arch={arch}
        data-type={type}
        viewBox="0 0 64 90"
        role="img"
        aria-label={`Odontograma anatómico del diente ${tooth}`}
      >
        <path className={styles.rootShape} d={ROOT_PATHS[type]} />
        <path className={styles.crownBase} d={CROWN_PATHS[type]} />
        <path
          className={`${styles.surface} ${styles.crownFill}`}
          data-state={displayStatus ?? ""}
          d={CROWN_PATHS[type]}
        />
        <path className={styles.crownOutline} d={CROWN_PATHS[type]} />
        {endo ? <path className={styles.endoMark} d={TOOTH_MARK_PATHS.endo} /> : null}
        {post ? <path className={styles.postMark} d={TOOTH_MARK_PATHS.post} /> : null}
        {implant ? (
          <g className={styles.implantMark}>
            <path d={TOOTH_MARK_PATHS.implantBody} />
            <path d={TOOTH_MARK_PATHS.implantThreads} />
          </g>
        ) : null}
        {prosthesis ? (
          <path className={styles.prosthesisMark} d={TOOTH_MARK_PATHS.prosthesis} />
        ) : null}
        {extraction ? (
          <path className={styles.extractionMark} d={TOOTH_MARK_PATHS.extraction} />
        ) : null}
        {missing ? <path className={styles.missingMark} d={TOOTH_MARK_PATHS.missing} /> : null}
        {visualMark ? (
          <g className={styles.endoVisualMark} data-severity={visualMark.severity}>
            <path d={visualMark.svgPath} />
          </g>
        ) : null}
        {surgicalMarks.map((mark) => (
          <g
            key={mark.key}
            className={styles.surgeryVisualMark}
            data-kind={mark.kind}
            data-lifecycle={mark.lifecycle}
            role="img"
            aria-label={mark.ariaLabel}
          >
            <path d={mark.path} />
          </g>
        ))}
      </svg>
      <svg
        className={styles.surfaceMap}
        data-state={displayStatus ?? "healthy"}
        viewBox="0 0 44 44"
        role="group"
        aria-label={`Caras del diente ${tooth}`}
      >
        {(["top", "left", "center", "right", "bottom"] as const).map((area) => {
          const surface = map[area];
          return (
            <path
              key={area}
              className={`${styles.surface} ${styles.surfaceMapArea}`}
              data-area={area}
              data-surface={surface}
              data-state={statusFor(surface)}
              d={SURFACE_MAP_PATHS[area]}
              role="button"
              aria-label={`Diente ${tooth} superficie ${SURFACE_NAMES[surface]}`}
              {...surfaceProps(surface)}
            />
          );
        })}
        <path className={styles.surfaceMapFrame} d={SURFACE_MAP_PATHS.frame} />
      </svg>
    </button>
  );
}
type ClinicalSyncStatus = "idle" | "syncing" | "updated" | "error";

function autosaveLabel(status: AutosaveStatus, dirty: boolean, sync: ClinicalSyncStatus): string {
  if (status === "saving") return "Guardando…";
  if (status === "error") return "Sin guardar";
  if (dirty) return "Cambios pendientes…";
  if (sync === "syncing") return "Guardado · actualizando plan y presupuesto…";
  if (sync === "updated") return "Guardado · plan y presupuesto al día";
  if (sync === "error") return "Guardado · no se pudo actualizar el plan";
  return status === "saved" ? "Guardado" : "Se guarda automáticamente";
}

interface OdontogramEditorProps {
  perioOwner: PerioDraftOwner;
  activeTab: ClinicalTab;
  setActiveTab: (tab: ClinicalTab) => void;
  patientId: string;
  initialSection?: "odontogram" | "diagnosis" | "plan";
  initialAction?: "implant-surgery";
  birthDate?: string;
  initialEntities: readonly DentalEntity[];
  initialPeriodontal: readonly Partial<PeriodontalReading>[];
  expectedVersion: number | undefined;
  saving: boolean;
  saveError: unknown;
  historical: boolean;
  historicalLabel: string | undefined;
  selectedSnapshotId: string | undefined;
  onSelectSnapshot: (snapshotId: string | null) => void;
  onSave: (entities: readonly DentalEntity[]) => Promise<void>;
  onOpenTreatmentFlow: () => void;
  clinicalSync: ClinicalSyncStatus;
}
function OdontogramEditor({
  perioOwner,
  activeTab,
  setActiveTab,
  patientId,
  initialSection = "odontogram",
  initialAction,
  birthDate,
  initialEntities,
  initialPeriodontal,
  expectedVersion,
  saving,
  saveError,
  historical,
  historicalLabel,
  selectedSnapshotId,
  onSelectSnapshot,
  onSave,
  onOpenTreatmentFlow,
  clinicalSync,
}: OdontogramEditorProps) {
  const [currentPerioReadings, setCurrentPerioReadings] = useState<PeriodontalReading[]>(
    initialPeriodontal.filter(
      (r): r is PeriodontalReading =>
        r.tooth !== undefined &&
        r.site !== undefined &&
        r.probingDepth !== undefined &&
        r.recession !== undefined,
    ),
  );
  const [history, setHistory] = useState<BoundedHistory<OdontogramEntityState>>(() =>
    createBoundedHistory(createOdontogramEntityState(initialEntities), 30),
  );
  const historyRef = useRef(history);
  historyRef.current = history;
  const [tool, setTool] = useState<ToothState>("caries");
  const [placementMode, setPlacementMode] = useState<"tooth" | "bridge">("tooth");
  const [selectedTooth, setSelectedTooth] = useState(() => {
    if (initialAction === "implant-surgery") {
      const plannedImplant = initialEntities.find(
        (entity) => entity.active && entity.entityType === "IMPLANT" && entity.tooth,
      );
      if (plannedImplant?.tooth) return plannedImplant.tooth;
    }
    return "25";
  });
  const [bridgeFrom, setBridgeFrom] = useState<string | null>(null);
  const [bridgeTo, setBridgeTo] = useState<string | null>(null);
  const [bridgePick, setBridgePick] = useState<"from" | "to">("from");
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const [advancedToolsOpen, setAdvancedToolsOpen] = useState(false);
  const [perioEditorOpen, setPerioEditorOpen] = useState(false);
  const [viewState, setViewState] = useState(createInitialOdontogramViewState);
  const [viewPreferenceLoaded, setViewPreferenceLoaded] = useState(false);
  const [viewPreferenceError, setViewPreferenceError] = useState(false);
  const patchAssistantContext = useOptionalAssistantContextPatch();
  const [clinicalRuleMessage, setClinicalRuleMessage] = useState<string | null>(null);
  const entities = useMemo(
    () => Object.values(history.present.entitiesById).filter((entity) => entity.active),
    [history.present.entitiesById],
  );

  const mouthState = useMemo(
    () => deriveMouthState(entities, birthDate ? { birthDate } : {}),
    [entities, birthDate],
  );
  const persistedBridgeTeeth = useMemo(
    () =>
      new Set(
        entities.filter((entity) => entity.entityType === "BRIDGE").flatMap(bridgeTeethFromEntity),
      ),
    [entities],
  );
  const persistedBridgeEndpoints = useMemo(
    () =>
      new Set(
        entities
          .filter((entity) => entity.entityType === "BRIDGE")
          .flatMap(bridgeEndpointTeethFromEntity),
      ),
    [entities],
  );
  const bridgePreviewTeeth = useMemo(() => {
    if (placementMode !== "bridge" || !bridgeFrom) return [] as string[];
    if (!bridgeTo) return [bridgeFrom];
    try {
      return bridgeTeethFromEndpoints(bridgeFrom, bridgeTo);
    } catch {
      return [bridgeFrom];
    }
  }, [bridgeFrom, bridgeTo, placementMode]);
  const bridgeReady = bridgePreviewTeeth.length >= 2 && Boolean(bridgeFrom && bridgeTo);
  const legendSelection: OdontogramLegendSelection = { state: tool, placement: placementMode };
  const activeToolLayer = layerForToothState(tool);
  const activeToolFilter = subfilterForToothStatus(tool);
  const activeToolVisible = isToothStatusVisible(tool, viewState);
  // Every edit is saved on its own a moment later; plan and budget follow (see the workspace).
  const patient = usePatientQuery(patientId).data;
  const autosave = useAutosave({
    value: history.present.entitiesById,
    enabled: !historical,
    save: (entitiesById) => onSave(Object.values(entitiesById)),
  });
  const dirty = autosave.dirty;
  const saveNow = () => autosave.flush().catch(() => undefined);
  const discardChanges = () => {
    const restored = createBoundedHistory(createOdontogramEntityState(initialEntities), 30);
    setHistory(restored);
    autosave.reset(restored.present.entitiesById);
  };
  useUnsavedChangesGuard({
    dirty: dirty && !historical,
    onSave: autosave.flush,
    onDiscard: discardChanges,
  });

  useEffect(() => {
    setAdvancedToolsOpen(false);
  }, [activeTab]);

  useEffect(() => {
    let restored = createInitialOdontogramViewState();
    const stored = readBrowserStorageItem(VIEW_PREFERENCE_KEY);
    if (stored.ok && stored.value !== null) {
      try {
        restored = restoreOdontogramViewPreference(JSON.parse(stored.value));
      } catch {
        setViewPreferenceError(true);
      }
    } else if (!stored.ok) setViewPreferenceError(true);
    if (initialAction === "implant-surgery" && !restored.visibleLayerIds.includes("surgery"))
      restored = toggleOdontogramLayer(restored, "surgery");
    if (initialSection === "diagnosis" && !restored.visibleLayerIds.includes("endo"))
      restored = toggleOdontogramLayer(restored, "endo");
    setViewState(restored);
    setViewPreferenceLoaded(true);
  }, [initialAction, initialSection]);

  useEffect(() => {
    if (!viewPreferenceLoaded) return;
    if (
      !writeBrowserStorageItem(
        VIEW_PREFERENCE_KEY,
        JSON.stringify(createOdontogramViewPreference(viewState)),
      )
    )
      setViewPreferenceError(true);
  }, [viewPreferenceLoaded, viewState]);

  useEffect(() => {
    patchAssistantContext({ patientId, selectedTooth });
    return () => patchAssistantContext({ patientId: undefined, selectedTooth: undefined });
  }, [patientId, patchAssistantContext, selectedTooth]);
  const commit = (entity: DentalEntity) => {
    if (historical) return;
    setHistory((current) => {
      const result = executeValidatedOdontogramCommand(current, { type: "UPSERT_ENTITY", entity });
      setClinicalRuleMessage(result.evaluation.messages[0] ?? null);
      return result.history;
    });
  };
  const changePresence = (tooth: string, presence: "missing" | "implant"): PerioPresenceChange => {
    const applied = createStateEntity(tooth, presence);
    const previous = historyRef.current.present.entitiesById[applied.id] ?? null;
    const result = executeValidatedOdontogramCommand(historyRef.current, {
      type: "UPSERT_ENTITY",
      entity: applied,
    });
    if (result.history === historyRef.current)
      throw new Error(result.evaluation.messages[0] ?? "No se pudo modificar la presencia.");
    historyRef.current = result.history;
    setHistory(result.history);
    return { tooth, entityId: applied.id, previous, applied };
  };
  const restorePresence = (change: PerioPresenceChange) => {
    const marker = historyRef.current.present.entitiesById[change.entityId];
    if (
      !marker ||
      marker.status !== change.applied.status ||
      marker.active !== change.applied.active ||
      marker.entityType !== change.applied.entityType
    )
      throw new Error(
        "La presencia cambió en otra edición; revisa el odontograma antes de deshacer.",
      );
    const result = executeValidatedOdontogramCommand(
      historyRef.current,
      change.previous
        ? { type: "UPSERT_ENTITY", entity: change.previous }
        : { type: "REMOVE_ENTITY", entityId: change.entityId },
    );
    if (result.history === historyRef.current)
      throw new Error(result.evaluation.messages[0] ?? "No se pudo restaurar la presencia.");
    historyRef.current = result.history;
    setHistory(result.history);
    return deriveMouthState(
      Object.values(result.history.present.entitiesById).filter((entity) => entity.active),
      birthDate ? { birthDate } : {},
    );
  };
  const commitBatch = (batch: readonly DentalEntity[]) => {
    if (historical) return;
    setHistory((current) => {
      const result = executeValidatedOdontogramBatch(current, batch);
      setClinicalRuleMessage(result.evaluation.messages[0] ?? null);
      return result.history;
    });
  };
  const applyWhole = (tooth: string, status = tool) => {
    commit(createStateEntity(tooth, status));
  };
  const selectTool = (nextTool: ToothState, nextPlacement?: "tooth" | "bridge") => {
    const placement = nextPlacement ?? (nextTool.startsWith("prosthesis") ? "bridge" : "tooth");
    setTool(nextTool);
    if (placement === "bridge" && placementMode !== "bridge") {
      setBridgeFrom(null);
      setBridgeTo(null);
      setBridgePick("from");
      setBridgeError(null);
    }
    setPlacementMode(placement);
  };
  const pickBridgeTooth = (tooth: string) => {
    if (historical) return;
    setSelectedTooth(tooth);
    if (bridgePick === "from" || !bridgeFrom) {
      setBridgeFrom(tooth);
      setBridgeTo(null);
      setBridgePick("to");
      setBridgeError(null);
      return;
    }
    try {
      const range = bridgeTeethFromEndpoints(bridgeFrom, tooth);
      if (range.length < 2) {
        setBridgeError("Elige otro diente final.");
        return;
      }
      setBridgeTo(tooth);
      setBridgePick("from");
      setBridgeError(null);
    } catch {
      setBridgeTo(null);
      setBridgeError("Usa dientes de la misma arcada.");
    }
  };
  const applySurface = (tooth: string, surface: ToothSurface) => {
    if (placementMode === "bridge") {
      pickBridgeTooth(tooth);
      return;
    }
    if (!isSurfaceOnlyTool(tool)) {
      applyWhole(tooth);
      return;
    }
    commit(createStateEntity(tooth, tool, [surface]));
  };
  const cycleWholeTreatment = (tooth: string) => {
    if (historical) return;
    const currentEntity = wholeEntity(history.present, tooth, tool);
    const current = currentEntity
      ? (toothStateFromEntity(currentEntity) ?? currentEntity.status)
      : undefined;
    const next = cycleTreatmentState(current);
    if (!next || !currentEntity) return;
    commit({ ...currentEntity, status: next });
  };
  const cycleSurfaceTreatment = (tooth: string, surface: ToothSurface) => {
    if (historical) return;
    const currentEntity = surfaceEntity(history.present, tooth, surface);
    const current = currentEntity
      ? (toothStateFromEntity(currentEntity) ?? currentEntity.status)
      : undefined;
    const next = cycleTreatmentState(current);
    if (!next || !currentEntity) return;
    commit({ ...currentEntity, status: next });
  };
  const applyTemplate = (template: "implant" | "endo" | "bridge") => {
    if (historical) return;
    if (template === "bridge" && (!bridgeFrom || !bridgeTo)) {
      setBridgeError("Elige inicio y final.");
      return;
    }
    const prosthesisState = (
      ["prosthesis", "prosthesis_bad", "prosthesis_pending"] as const
    ).includes(tool as "prosthesis" | "prosthesis_bad" | "prosthesis_pending")
      ? (tool as "prosthesis" | "prosthesis_bad" | "prosthesis_pending")
      : "prosthesis_pending";
    let entitiesToAdd: DentalEntity[];
    try {
      entitiesToAdd =
        template === "implant"
          ? createImplantStack(selectedTooth)
          : template === "endo"
            ? createEndoPostCrown(selectedTooth)
            : createBridgeEntities(bridgeFrom!, bridgeTo!, prosthesisState);
    } catch (error) {
      setBridgeError(error instanceof Error ? error.message : "No se pudo crear la prótesis.");
      return;
    }
    commitBatch(entitiesToAdd);
    if (template === "bridge") {
      setBridgeError(null);
      setBridgeFrom(null);
      setBridgeTo(null);
      setBridgePick("from");
    }
  };
  const renderArch = (teeth: readonly string[]) => (
    <div className={styles.arch}>
      {teeth.map((tooth) => (
        <Tooth
          key={tooth}
          tooth={tooth}
          state={history.present}
          viewState={viewState}
          periodontalReadings={currentPerioReadings}
          selected={selectedTooth === tooth}
          prosthesisRange={
            viewState.visibleLayerIds.includes("prosthetics") &&
            viewState.subfiltersByLayer.prosthetics.includes("fija") &&
            (bridgePreviewTeeth.includes(tooth) || persistedBridgeTeeth.has(tooth))
          }
          prosthesisEndpoint={
            viewState.visibleLayerIds.includes("prosthetics") &&
            viewState.subfiltersByLayer.prosthetics.includes("fija") &&
            (tooth === bridgeFrom || tooth === bridgeTo || persistedBridgeEndpoints.has(tooth))
          }
          readOnly={historical || !activeToolVisible}
          onSelect={() => {
            if (placementMode === "bridge") {
              pickBridgeTooth(tooth);
              return;
            }
            setSelectedTooth(tooth);
            if (!isSurfaceOnlyTool(tool)) applyWhole(tooth);
          }}
          onWholeAction={() => {
            if (!activeToolVisible || historical) return;
            if (placementMode !== "bridge") cycleWholeTreatment(tooth);
          }}
          onSurfaceAction={(surface) => applySurface(tooth, surface)}
          onSurfaceCycle={(surface) =>
            activeToolVisible && !historical && placementMode !== "bridge"
              ? cycleSurfaceTreatment(tooth, surface)
              : undefined
          }
        />
      ))}
    </div>
  );
  const failure = autosave.error ?? saveError;
  const conflict = failure instanceof DentyApiError && failure.kind === "conflict";
  return (
    <div className={styles.board}>
      <PageHeader
        title={historicalLabel ?? "Odontograma"}
        description={historical ? "Solo lectura." : patientLine(patient)}
        actions={
          <Group>
            <Badge variant="light">{historical ? "Histórico" : `v${expectedVersion ?? "?"}`}</Badge>
            {!historical ? (
              <Text size="xs" c="dimmed" role="status" aria-live="polite">
                {autosaveLabel(autosave.status, dirty, clinicalSync)}
              </Text>
            ) : null}
            {!historical ? (
              <Button size="xs" loading={saving} disabled={!dirty} onClick={() => void saveNow()}>
                Guardar
              </Button>
            ) : null}
            {!historical ? (
              <Button
                size="xs"
                color="teal"
                rightSection={<IconArrowRight size={15} />}
                loading={saving}
                onClick={() => {
                  const open = () => onOpenTreatmentFlow();
                  if (!dirty) return open();
                  void autosave.flush().then(open, () => {});
                }}
              >
                Plan y presupuesto
              </Button>
            ) : null}
            {!historical ? (
              <Button
                size="xs"
                variant="subtle"
                disabled={!dirty || saving}
                onClick={discardChanges}
              >
                Descartar cambios
              </Button>
            ) : null}
            <Button
              size="xs"
              variant="light"
              leftSection={<IconArrowBackUp size={15} />}
              disabled={historical || !history.past.length}
              onClick={() => setHistory((current) => undoHistory(current))}
            >
              Deshacer
            </Button>
            <Button
              size="xs"
              variant="light"
              leftSection={<IconArrowForwardUp size={15} />}
              disabled={historical || !history.future.length}
              onClick={() => setHistory((current) => redoHistory(current))}
            >
              Rehacer
            </Button>
          </Group>
        }
      />

      {failure ? (
        <Alert
          color={conflict ? "yellow" : "red"}
          title={conflict ? "Conflicto" : "Error al guardar"}
        >
          <Group justify="space-between" gap="xs">
            <span>
              {conflict
                ? "Otro dispositivo ha cambiado este odontograma. Recarga la página para continuar."
                : "No se han guardado los últimos cambios."}
            </span>
            {conflict ? null : (
              <Button size="xs" variant="light" color="red" onClick={() => void saveNow()}>
                Reintentar
              </Button>
            )}
          </Group>
        </Alert>
      ) : null}
      {clinicalRuleMessage ? (
        <Alert
          color="yellow"
          title="Regla clínica"
          withCloseButton
          onClose={() => setClinicalRuleMessage(null)}
        >
          {clinicalRuleMessage}
        </Alert>
      ) : null}

      {initialAction === "implant-surgery" ? (
        <div className={parityStyles.section}>
          <ImplantSurgeryPanel
            entities={entities}
            selectedTooth={selectedTooth}
            readOnly={historical}
            onSelectTooth={setSelectedTooth}
            onCommit={commit}
          />
        </div>
      ) : null}

      <MouthStateProvider state={mouthState}>
        <QuickDiagnosisBar
          patientId={patientId}
          readings={currentPerioReadings}
          readOnly={historical}
        />
        <MouthMiniMap selectedTooth={selectedTooth} onSelect={setSelectedTooth} />
        <OdontogramLayerControls
          state={viewState}
          onToggleLayer={(layerId) =>
            setViewState((current) => toggleOdontogramLayer(current, layerId))
          }
          onToggleSubfilter={(layerId, subfilterId) =>
            setViewState((current) => toggleOdontogramSubfilter(current, layerId, subfilterId))
          }
          onShowAll={() => setViewState((current) => toggleShowAllLayers(current))}
          onApplyPreset={(presetId) =>
            setViewState((current) => applyViewPreset(current, presetId))
          }
          onReset={() => setViewState((current) => resetOdontogramView(current))}
          onOpenHistory={() => setActiveTab(activeTab === "history" ? "general" : "history")}
        />
        {viewPreferenceError ? (
          <Alert color="yellow" title="No se pudo restaurar o guardar la preferencia de vista">
            Las capas siguen disponibles durante esta sesión. Comprueba el almacenamiento local del
            navegador para conservar esta configuración.
          </Alert>
        ) : null}
        {!activeToolVisible && activeToolLayer ? (
          <Alert color="yellow" title="La herramienta activa pertenece a una capa oculta">
            Reactiva {ODONTOGRAM_LAYER_LABELS[activeToolLayer]} o cambia de herramienta antes de
            registrar una marca.
            <Button
              size="xs"
              ml="sm"
              onClick={() =>
                setViewState((current) => {
                  if (!current.visibleLayerIds.includes(activeToolLayer))
                    return toggleOdontogramLayer(current, activeToolLayer);
                  return activeToolFilter
                    ? toggleOdontogramSubfilter(current, activeToolLayer, activeToolFilter)
                    : current;
                })
              }
            >
              Reactivar capa
            </Button>
          </Alert>
        ) : null}

        {viewState.visibleLayerIds.includes("general") ? (
          <details
            className={styles.advancedTools}
            open={advancedToolsOpen}
            onToggle={(event) => setAdvancedToolsOpen(event.currentTarget.open)}
          >
            <summary>
              <span>
                <strong>Más herramientas</strong>
                <small>
                  Plantillas, selección directa y prótesis por rango · diente {selectedTooth}
                </small>
              </span>
            </summary>
            <section className={styles.controlPanel}>
              <div className={styles.panelHeading}>
                <div>
                  <Text fw={850}>Herramientas</Text>
                  <Text size="xs" c="dimmed">
                    Elige y marca.
                  </Text>
                </div>
                <Badge variant="light">Diente {selectedTooth}</Badge>
              </div>
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <Select
                  label="Herramienta"
                  value={tool}
                  onChange={(value) => selectTool((value ?? "caries") as ToothState)}
                  data={[...TOOL_OPTIONS]}
                  disabled={historical}
                />
                <Select
                  label="Diente"
                  value={selectedTooth}
                  onChange={(value) => setSelectedTooth(value ?? "46")}
                  data={[...PERMANENT_UPPER, ...PERMANENT_LOWER]}
                />
              </SimpleGrid>
              {placementMode === "bridge" ? (
                <div className={styles.bridgePicker}>
                  <div className={styles.bridgePickerHeading}>
                    <div>
                      <Text fw={820} size="sm">
                        Prótesis fija / puente
                      </Text>
                      <Text size="xs" c="dimmed">
                        {bridgeReady && bridgeFrom && bridgeTo
                          ? `Rango ${bridgeFrom} -> ${bridgeTo}. Confirma para aplicar.`
                          : bridgePick === "from"
                            ? "Pulsa el diente inicial en el odontograma."
                            : `Inicio ${bridgeFrom}. Elige el final.`}
                      </Text>
                    </div>
                    <Badge variant="light">{bridgePreviewTeeth.length || 0} dientes</Badge>
                  </div>
                  <SimpleGrid cols={{ base: 1, sm: 2 }}>
                    <Select
                      label="Diente inicial"
                      placeholder="Seleccionar"
                      value={bridgeFrom}
                      onChange={(value) => {
                        setBridgeFrom(value);
                        setBridgeTo(null);
                        setBridgePick(value ? "to" : "from");
                        setBridgeError(null);
                      }}
                      data={[...PERMANENT_UPPER, ...PERMANENT_LOWER]}
                      disabled={historical || !activeToolVisible}
                    />
                    <Select
                      label="Diente final"
                      placeholder="Seleccionar"
                      value={bridgeTo}
                      onChange={(value) => {
                        if (!value) {
                          setBridgeTo(null);
                          setBridgePick("to");
                          return;
                        }
                        if (!bridgeFrom) {
                          setBridgeError("Selecciona primero el diente inicial.");
                          return;
                        }
                        try {
                          const range = bridgeTeethFromEndpoints(bridgeFrom, value);
                          if (range.length < 2) {
                            setBridgeError("Elige otro diente final.");
                            return;
                          }
                          setBridgeTo(value);
                          setBridgePick("from");
                          setBridgeError(null);
                        } catch {
                          setBridgeTo(null);
                          setBridgeError("Usa la misma arcada.");
                        }
                      }}
                      data={[...PERMANENT_UPPER, ...PERMANENT_LOWER]}
                      disabled={historical || !activeToolVisible || !bridgeFrom}
                    />
                  </SimpleGrid>
                  <Group justify="space-between" mt="sm">
                    <Text size="xs" c="dimmed">
                      {bridgeReady && bridgeFrom && bridgeTo
                        ? `Vista previa: ${bridgeFrom} → ${bridgeTo} · ${bridgePreviewTeeth.join(
                            ", ",
                          )}`
                        : "El rango se ilumina antes de aplicarlo."}
                    </Text>
                    <Button
                      size="xs"
                      disabled={historical || !activeToolVisible || !bridgeReady}
                      onClick={() => applyTemplate("bridge")}
                    >
                      Aplicar prótesis / puente
                    </Button>
                  </Group>
                  {bridgeError ? (
                    <Text size="xs" c="red" mt="xs">
                      {bridgeError}
                    </Text>
                  ) : null}
                </div>
              ) : null}
              <Group mt="md">
                <Button
                  size="xs"
                  disabled={historical || !activeToolVisible || placementMode === "bridge"}
                  onClick={() => applyWhole(selectedTooth)}
                >
                  Aplicar al diente seleccionado
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  disabled={historical || !activeToolVisible}
                  onClick={() => applyTemplate("implant")}
                >
                  Implante + pilar + corona
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  disabled={historical || !activeToolVisible}
                  onClick={() => applyTemplate("endo")}
                >
                  Endo + perno + corona
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  disabled={historical || !activeToolVisible}
                  onClick={() => selectTool("prosthesis_pending", "bridge")}
                >
                  Seleccionar prótesis / puente
                </Button>
              </Group>
            </section>
          </details>
        ) : null}

        <section className={styles.chartPanel}>
          <div className={styles.chartHeader}>
            <div>
              <Text fw={850}>Odontograma</Text>
            </div>
            {!viewState.visibleLayerIds.includes("general") ? (
              <Text size="xs" c="dimmed">
                Anatomía, identidad y presencia permanecen visibles.
              </Text>
            ) : null}
          </div>
          {viewState.visibleLayerIds.includes("general") ? (
            <>
              <OdontogramLegend
                selection={legendSelection}
                disabled={historical}
                onSelect={(selection) => selectTool(selection.state, selection.placement)}
              />
              {placementMode === "bridge" ? (
                <div className={styles.bridgeSelectionBanner}>
                  <strong>
                    {bridgeReady
                      ? "✓ Rango listo"
                      : bridgePick === "from"
                        ? "1 · Inicio"
                        : "2 · Final"}
                  </strong>
                  <span>
                    {bridgeReady && bridgeFrom && bridgeTo
                      ? `${bridgeFrom} → ${bridgeTo}. ` +
                        "Pulsa Aplicar prótesis / puente para confirmarlo."
                      : bridgePick === "from"
                        ? "Pulsa el primer diente de la prótesis fija."
                        : `Inicio ${bridgeFrom}. Pulsa el último diente de la misma arcada.`}
                  </span>
                </div>
              ) : null}
            </>
          ) : null}
          <div className={styles.archBlock}>
            <Text className={styles.archLabel} fw={800}>
              Maxilar
            </Text>
            {renderArch(PERMANENT_UPPER)}
          </div>
          <div className={styles.occlusalPlane}>
            <span>Plano oclusal</span>
          </div>
          <div className={styles.archBlock}>
            {renderArch(PERMANENT_LOWER)}
            <Text className={styles.archLabel} fw={800}>
              Mandíbula
            </Text>
          </div>
        </section>
        {viewState.visibleLayerIds.includes("general") ? (
          <SupernumeraryPanel entities={entities} readOnly={historical} onCommit={commit} />
        ) : null}

        <RetainedFlowStep active={viewState.visibleLayerIds.includes("perio")}>
          <details
            className={styles.layerEditor}
            onToggle={(event) => setPerioEditorOpen(event.currentTarget.open)}
          >
            <summary>Editar periodonto</summary>
            <PerioChart
              patientId={patientId}
              active={viewState.visibleLayerIds.includes("perio") && perioEditorOpen}
              readOnly={historical}
              readings={initialPeriodontal}
              visibleIndicators={viewState.subfiltersByLayer.perio}
              onReadingsChange={setCurrentPerioReadings}
              owner={perioOwner}
              onPresenceChange={changePresence}
              onPresenceRestore={restorePresence}
              onBeforeFinalize={async () => {
                await autosave.flush();
              }}
            />
          </details>
        </RetainedFlowStep>
        <RetainedFlowStep active={viewState.visibleLayerIds.includes("ortho")}>
          <details className={styles.layerEditor}>
            <summary>Editar ortodoncia</summary>
            <OrthodonticPanel patientId={patientId} readOnly={historical} onCommit={commit} />
          </details>
        </RetainedFlowStep>
        <RetainedFlowStep active={viewState.visibleLayerIds.includes("replacement")}>
          <details className={styles.layerEditor}>
            <summary>Editar recambio y dentición</summary>
            <PediatricPanel
              patientId={patientId}
              {...(birthDate === undefined ? {} : { birthDate })}
              readOnly={historical}
              initialEntities={entities}
              onCommit={commit}
            />
          </details>
        </RetainedFlowStep>
        <RetainedFlowStep active={viewState.visibleLayerIds.includes("endo")}>
          <details className={styles.layerEditor}>
            <summary>Editar endodoncia</summary>
            <EndodonticPanel
              selectedTooth={selectedTooth}
              readOnly={historical}
              onCommit={commit}
            />
          </details>
        </RetainedFlowStep>
        <RetainedFlowStep active={viewState.visibleLayerIds.includes("surgery")}>
          <details className={styles.layerEditor}>
            <summary>Editar cirugía</summary>
            <SurgeryPanel
              selectedTooth={selectedTooth}
              entities={entities}
              readOnly={historical}
              onCommitBatch={commitBatch}
              onWarning={setClinicalRuleMessage}
            />
          </details>
        </RetainedFlowStep>

        {activeTab === "history" ? (
          <OdontogramHistory
            patientId={patientId}
            selectedSnapshotId={selectedSnapshotId}
            onSelectSnapshot={onSelectSnapshot}
          />
        ) : null}
        {viewState.visibleLayerIds.includes("proposal") ? (
          <Alert color="blue" title="Propuestas del plan">
            Selecciona un plan para mostrar sus propuestas.
          </Alert>
        ) : null}
      </MouthStateProvider>
      <details
        className={parityStyles.disclosure}
        id="clinical-flow"
        {...(initialSection === "plan" ? { open: true } : {})}
      >
        <summary>
          <span>
            <strong>Plan, presupuesto y sincronización</strong>
            <small>Herramientas del flujo clínico completo</small>
          </span>
        </summary>
        <div className={parityStyles.disclosureBody}>
          <ClinicalPipelineCard patientId={patientId} />
          {!historical ? (
            <ClinicalWorkspace patientId={patientId} />
          ) : (
            <Alert color="yellow" title="Plan clínico actual no modificado">
              El snapshot histórico no sincroniza plan ni presupuesto. Vuelve al odontograma actual
              para realizar cambios clínicos.
            </Alert>
          )}
        </div>
      </details>

      <details className={parityStyles.disclosure}>
        <summary>
          <span>
            <strong>Información técnica del odontograma</strong>
            <small>{entities.length} entidades clínicas activas</small>
          </span>
        </summary>
        <div className={parityStyles.disclosureBody}>
          <section className={parityStyles.section}>
            <div className={styles.entityList}>
              {entities.map((entity) => (
                <div className={styles.entityRow} key={entity.id}>
                  <span>
                    {entity.tooth ?? entity.arch ?? "Arcada"} · {entity.entityType}
                  </span>
                  <Badge variant="light">{entity.status}</Badge>
                </div>
              ))}
            </div>
          </section>
        </div>
      </details>
    </div>
  );
}
export function OdontogramWorkspace({ patientId }: { patientId: string }) {
  const perioOwner = useMemo(() => createPerioDraftOwner(), [patientId]);
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");
  const actionParam = searchParams.get("action");
  const initialSection =
    sectionParam === "diagnosis" || sectionParam === "plan" ? sectionParam : "odontogram";
  const initialAction = actionParam === "implant-surgery" ? "implant-surgery" : undefined;
  const [activeTab, setActiveTab] = useState<ClinicalTab>(
    initialAction === "implant-surgery"
      ? "surgery"
      : initialSection === "diagnosis"
        ? "endodontic"
        : "general",
  );
  useEffect(() => {
    setActiveTab(
      initialAction === "implant-surgery"
        ? "surgery"
        : initialSection === "diagnosis"
          ? "endodontic"
          : "general",
    );
  }, [initialAction, initialSection]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>();
  const query = useOdontogramQuery(patientId);
  const patientQuery = usePatientQuery(patientId);
  const snapshotsQuery = useOdontogramSnapshotsQuery(patientId);
  // Our own saves bump the version too; only a version written elsewhere reloads the editor.
  const ownVersionsRef = useRef(new Set<number>());
  const saveMutation = useSaveOdontogramBatchMutation(patientId, {
    onCommitted: (version) => ownVersionsRef.current.add(version),
  });
  const [treatmentFlowOpen, setTreatmentFlowOpen] = useState(false);
  const [clinicalSync, setClinicalSync] = useState<ClinicalSyncStatus>("idle");
  const queryClient = useQueryClient();
  // Plan and budget follow every save on their own; the guided flow stays optional.
  const autoSync = useMemo(
    () =>
      createClinicalAutoSync({
        syncPlan: () => getBrowserApi().clinical.sync.plan(patientId),
        syncBudget: () => getBrowserApi().clinical.sync.budget(patientId),
        onDone: (outcome) => {
          setClinicalSync(outcome.ok ? "updated" : "error");
          invalidateClinicalPatient(queryClient, patientId);
        },
      }),
    [patientId, queryClient],
  );
  const liveVersion = query.data?.version;
  const [editorVersion, setEditorVersion] = useState(liveVersion);
  useEffect(() => {
    if (liveVersion !== undefined && !ownVersionsRef.current.has(liveVersion))
      setEditorVersion(liveVersion);
  }, [liveVersion]);
  if (query.isError) {
    return (
      <Alert color="red" title="No se pudo cargar el odontograma">
        Revisa la conexión con Denty e inténtalo de nuevo.
      </Alert>
    );
  }
  if (!query.data) {
    return (
      <PageHeader
        title="Cargando odontograma"
        description="Consultando entidades y versión clínica del paciente."
      />
    );
  }
  const selectedSnapshot = snapshotsQuery.data?.items.find(
    (snapshot) => snapshot.id === selectedSnapshotId,
  );
  const historical = Boolean(selectedSnapshot);
  const currentEntities = odontogramEntities(query.data);
  const initialEntities = selectedSnapshot
    ? selectedSnapshot.entities.map(persistedEntityToDomain)
    : currentEntities;
  const initialPeriodontal = (selectedSnapshot?.periodontal ?? query.data.periodontal).map(
    (reading) => ({
      tooth: reading.tooth,
      site: reading.site as PeriodontalReading["site"],
      ...(reading.probingDepth === undefined ? {} : { probingDepth: reading.probingDepth }),
      ...(reading.recession === undefined ? {} : { recession: reading.recession }),
      bleeding: Boolean(reading.bleeding),
      plaque: Boolean(reading.plaque),
      suppuration: Boolean(reading.suppuration),
      ...(reading.mobility === undefined ? {} : { mobility: reading.mobility }),
      ...(reading.furcation === undefined ? {} : { furcation: reading.furcation }),
    }),
  );
  const expectedVersion = historical ? undefined : query.data.version;
  const birthDate = patientQuery.data?.birthDate ?? undefined;
  const mouth = deriveMouthState(initialEntities, birthDate ? { birthDate } : {});
  const editorKey = selectedSnapshot
    ? `snapshot-${selectedSnapshot.id}`
    : `${query.data.id ?? patientId}-${editorVersion ?? 0}`;
  return (
    <>
      <TreatmentFlowModal
        patientId={patientId}
        opened={treatmentFlowOpen}
        onClose={() => setTreatmentFlowOpen(false)}
      />
      <OdontogramViewSwitch
        editor={
          <OdontogramEditor
            perioOwner={perioOwner}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            key={`${editorKey}-${initialSection}-${initialAction ?? "default"}`}
            patientId={patientId}
            initialSection={initialSection}
            {...(initialAction ? { initialAction } : {})}
            {...(birthDate === undefined ? {} : { birthDate })}
            initialEntities={initialEntities}
            initialPeriodontal={initialPeriodontal}
            expectedVersion={expectedVersion}
            saving={saveMutation.isPending}
            saveError={saveMutation.error}
            historical={historical}
            historicalLabel={selectedSnapshot?.label ?? undefined}
            selectedSnapshotId={selectedSnapshotId}
            onSelectSnapshot={(snapshotId) => setSelectedSnapshotId(snapshotId ?? undefined)}
            onSave={async (entities) => {
              if (expectedVersion === undefined) return;
              await saveMutation.mutateAsync({ expectedVersion, entities });
              setClinicalSync("syncing");
              void autoSync.request();
            }}
            onOpenTreatmentFlow={() => setTreatmentFlowOpen(true)}
            clinicalSync={clinicalSync}
          />
        }
        visual={(openEditor) => (
          <OdontogramVisual
            recordKey={editorKey}
            teeth={toVisualTeeth(initialEntities, initialPeriodontal, mouth)}
            dentition={toVisualDentition(mouth)}
            onEdit={openEditor}
          />
        )}
      />
    </>
  );
}
