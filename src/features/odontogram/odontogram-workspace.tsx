"use client";
import { Alert, Badge, Button, Group, Select, SimpleGrid, Text } from "@mantine/core";
import { IconArrowBackUp, IconArrowForwardUp, IconArrowRight } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
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
import { hasNewTreatmentWork } from "@/shared/clinical/treatment-flow-steps";
import { ClinicalWorkspace } from "@/shared/clinical/clinical-workspace";
import {
  odontogramEntities,
  useOdontogramQuery,
  useOdontogramSnapshotsQuery,
  useSaveOdontogramBatchMutation,
} from "./odontogram-data";
import { OdontogramHistory } from "./odontogram-history";
import { OdontogramLegend, type OdontogramLegendSelection } from "./odontogram-legend";
import { PeriodontalQuickEntry } from "./periodontal-quick-entry";
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
import { ClinicalTabs, type ClinicalTab } from "./clinical-tabs";
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
import { PeriodontogramPanel } from "./periodontogram-panel";
import { SurgeryPanel } from "./surgery-panel";
import { surgicalVisualsForTooth } from "./surgery-visuals";
const TOOL_OPTIONS = TOOTH_STATES.map((state) => ({
  value: state,
  label: STATE_LABELS[state],
}));
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
  const statusFor = (surface: ToothSurface) => surfaceState(state, tooth, surface) ?? status ?? "";
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
    typeof visualCode === "string" && visualCode in ENDODONTIC_VISUAL_MARKS
      ? ENDODONTIC_VISUAL_MARKS[visualCode as keyof typeof ENDODONTIC_VISUAL_MARKS]
      : undefined;
  const surgicalMarks = surgicalVisualsForTooth(tooth, Object.values(state.entitiesById));
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
      aria-label={`Diente ${tooth}`}
      title={`Diente ${tooth} · doble clic para cambiar el estado completo`}
    >
      <span className={styles.toothLabel}>{tooth}</span>
      <svg
        className={styles.toothSvg}
        data-state={status ?? "healthy"}
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
          data-state={status ?? ""}
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
        data-state={status ?? "healthy"}
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
interface OdontogramEditorProps {
  patientId: string;
  initialSection?: "odontogram" | "diagnosis" | "plan";
  initialAction?: "implant-surgery";
  birthDate?: string;
  initialEntities: readonly DentalEntity[];
  initialPeriodontal: readonly PeriodontalReading[];
  expectedVersion: number | undefined;
  saving: boolean;
  saveError: unknown;
  historical: boolean;
  historicalLabel: string | undefined;
  selectedSnapshotId: string | undefined;
  onSelectSnapshot: (snapshotId: string | null) => void;
  onSave: (entities: readonly DentalEntity[]) => Promise<void>;
  onOpenTreatmentFlow: () => void;
}
function OdontogramEditor({
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
}: OdontogramEditorProps) {
  const [history, setHistory] = useState<BoundedHistory<OdontogramEntityState>>(() =>
    createBoundedHistory(createOdontogramEntityState(initialEntities), 30),
  );
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
  const [activeTab, setActiveTab] = useState<ClinicalTab>(
    initialAction === "implant-surgery"
      ? "surgery"
      : initialSection === "diagnosis"
        ? "endodontic"
        : "general",
  );
  const patchAssistantContext = useOptionalAssistantContextPatch();
  const [clinicalRuleMessage, setClinicalRuleMessage] = useState<string | null>(null);
  const entities = useMemo(
    () => Object.values(history.present.entitiesById).filter((entity) => entity.active),
    [history.present.entitiesById],
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
  const dirty = history.present.revision !== 0;

  useEffect(() => {
    setAdvancedToolsOpen(false);
  }, [activeTab]);

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
          selected={selectedTooth === tooth}
          prosthesisRange={bridgePreviewTeeth.includes(tooth) || persistedBridgeTeeth.has(tooth)}
          prosthesisEndpoint={
            tooth === bridgeFrom || tooth === bridgeTo || persistedBridgeEndpoints.has(tooth)
          }
          readOnly={historical}
          onSelect={() => {
            if (placementMode === "bridge") {
              pickBridgeTooth(tooth);
              return;
            }
            setSelectedTooth(tooth);
            if (!isSurfaceOnlyTool(tool)) applyWhole(tooth);
          }}
          onWholeAction={() =>
            placementMode === "bridge" ? undefined : cycleWholeTreatment(tooth)
          }
          onSurfaceAction={(surface) => applySurface(tooth, surface)}
          onSurfaceCycle={(surface) =>
            placementMode === "bridge" ? undefined : cycleSurfaceTreatment(tooth, surface)
          }
        />
      ))}
    </div>
  );
  const conflict = saveError instanceof DentyApiError && saveError.kind === "conflict";
  return (
    <div className={styles.board}>
      <PageHeader
        eyebrow={historical ? "Histórico" : `Paciente ${patientId}`}
        title={historicalLabel ?? "Odontograma"}
        description={historical ? "Solo lectura." : "Marca hallazgos y tratamientos."}
        actions={
          <Group>
            <Badge variant="light">{historical ? "Histórico" : `v${expectedVersion ?? "?"}`}</Badge>
            {!historical ? (
              <Button
                size="xs"
                loading={saving}
                disabled={!dirty}
                onClick={() => void onSave(Object.values(history.present.entitiesById))}
              >
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
                  void onSave(Object.values(history.present.entitiesById)).then(open, () => {});
                }}
              >
                Plan y presupuesto
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

      {saveError ? (
        <Alert
          color={conflict ? "yellow" : "red"}
          title={conflict ? "Conflicto" : "Error al guardar"}
        >
          {conflict
            ? "Hay cambios nuevos. Recarga antes de guardar."
            : "No se guardaron los cambios."}
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

      <ClinicalTabs active={activeTab} onChange={setActiveTab} />

      {activeTab === "general" ? (
        <>
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
                      disabled={historical}
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
                      disabled={historical || !bridgeFrom}
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
                      disabled={historical || !bridgeReady}
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
                  disabled={historical || placementMode === "bridge"}
                  onClick={() => applyWhole(selectedTooth)}
                >
                  Aplicar al diente seleccionado
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  disabled={historical}
                  onClick={() => applyTemplate("implant")}
                >
                  Implante + pilar + corona
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  disabled={historical}
                  onClick={() => applyTemplate("endo")}
                >
                  Endo + perno + corona
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  disabled={historical}
                  onClick={() => selectTool("prosthesis_pending", "bridge")}
                >
                  Seleccionar prótesis / puente
                </Button>
              </Group>
            </section>
          </details>

          <section className={styles.chartPanel}>
            <div className={styles.chartHeader}>
              <div>
                <Text fw={850}>Odontograma</Text>
              </div>
            </div>
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
          <SupernumeraryPanel entities={entities} readOnly={historical} onCommit={commit} />
        </>
      ) : null}

      {activeTab === "periodontal" ? (
        <PeriodontogramPanel
          patientId={patientId}
          readOnly={historical}
          readings={initialPeriodontal}
        />
      ) : null}
      {activeTab === "orthodontic" ? (
        <OrthodonticPanel patientId={patientId} readOnly={historical} onCommit={commit} />
      ) : null}
      {activeTab === "pediatric" ? (
        <PediatricPanel
          patientId={patientId}
          {...(birthDate === undefined ? {} : { birthDate })}
          readOnly={historical}
          initialEntities={entities}
          onCommit={commit}
        />
      ) : null}
      {activeTab === "endodontic" ? (
        <EndodonticPanel selectedTooth={selectedTooth} readOnly={historical} onCommit={commit} />
      ) : null}
      {activeTab === "surgery" ? (
        <SurgeryPanel
          selectedTooth={selectedTooth}
          entities={entities}
          readOnly={historical}
          onCommitBatch={commitBatch}
          onWarning={setClinicalRuleMessage}
        />
      ) : null}

      {!historical && activeTab === "periodontal" ? (
        <PeriodontalQuickEntry patientId={patientId} />
      ) : null}
      {activeTab === "history" ? (
        <OdontogramHistory
          patientId={patientId}
          selectedSnapshotId={selectedSnapshotId}
          onSelectSnapshot={onSelectSnapshot}
        />
      ) : null}

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
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");
  const actionParam = searchParams.get("action");
  const initialSection =
    sectionParam === "diagnosis" || sectionParam === "plan" ? sectionParam : "odontogram";
  const initialAction = actionParam === "implant-surgery" ? "implant-surgery" : undefined;
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>();
  const query = useOdontogramQuery(patientId);
  const patientQuery = usePatientQuery(patientId);
  const snapshotsQuery = useOdontogramSnapshotsQuery(patientId);
  const saveMutation = useSaveOdontogramBatchMutation(patientId);
  // Lives here, not in the editor: saving remounts the editor with the new version.
  const [treatmentFlowOpen, setTreatmentFlowOpen] = useState(false);
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
      probingDepth: reading.probingDepth ?? 0,
      recession: reading.recession ?? 0,
      bleeding: Boolean(reading.bleeding),
      plaque: Boolean(reading.plaque),
      suppuration: Boolean(reading.suppuration),
      ...(reading.mobility === undefined ? {} : { mobility: reading.mobility }),
      ...(reading.furcation === undefined ? {} : { furcation: reading.furcation }),
    }),
  );
  const expectedVersion = historical ? undefined : query.data.version;
  const birthDate = patientQuery.data?.birthDate ?? undefined;
  const editorKey = selectedSnapshot
    ? `snapshot-${selectedSnapshot.id}`
    : `${query.data.id ?? patientId}-${expectedVersion ?? 0}`;
  return (
    <>
      <TreatmentFlowModal
        patientId={patientId}
        opened={treatmentFlowOpen}
        onClose={() => setTreatmentFlowOpen(false)}
      />
      <OdontogramEditor
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
          // New caries or treatments: carry on straight to plan, budget and appointments.
          if (hasNewTreatmentWork(currentEntities, entities)) setTreatmentFlowOpen(true);
        }}
        onOpenTreatmentFlow={() => setTreatmentFlowOpen(true)}
      />
    </>
  );
}
