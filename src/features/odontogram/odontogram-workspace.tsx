"use client";
import { Alert, Badge, Button, Group, Select, SimpleGrid, Text } from "@mantine/core";
import { IconArrowBackUp, IconArrowForwardUp } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ENDODONTIC_VISUAL_MARKS,
  PERMANENT_LOWER,
  PERMANENT_UPPER,
  TOOTH_STATES,
  archForTooth,
  bridgeTeethFromEndpoints,
  occlusalSurfaceForTooth,
  toothType,
  createBridgeEntities,
  createBoundedHistory,
  cycleClinicalState,
  createEndoPostCrown,
  createImplantStack,
  createOdontogramEntityState,
  executeOdontogramCommand,
  redoHistory,
  undoHistory,
  type BoundedHistory,
  type DentalEntity,
  type OdontogramEntityState,
  type ToothState,
  type ToothSurface,
  type TriStateFamily,
} from "@/domain";
import { ClinicalPipelineCard } from "@/shared/clinical/clinical-pipeline-card";
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
import { publicEnv } from "@/shared/config/env";
import { DEMO_PATIENTS } from "@/shared/demo/demo-data";
import { usePatientQuery } from "@/shared/patients/patient-data";
import { PageHeader } from "@/shared/ui";
import { ClinicalTabs, type ClinicalTab } from "./clinical-tabs";
import { EndodonticPanel } from "./endodontic-panel";
import styles from "./odontogram.module.css";
import { OrthodonticPanel } from "./orthodontic-panel";
import { PediatricPanel } from "./pediatric-panel";
import { PeriodontogramPanel } from "./periodontogram-panel";
import { SurgeryPanel } from "./surgery-panel";
const INITIAL_ENTITIES: readonly DentalEntity[] = [
  {
    id: "state-46",
    tooth: "46",
    entityType: "CARIES",
    status: "caries",
    active: true,
  },
  {
    id: "restoration-11-V",
    tooth: "11",
    entityType: "RESTORATION",
    status: "filling",
    surfaces: ["V"],
    active: true,
  },
];
const STATE_LABELS: Readonly<Record<ToothState, string>> = {
  healthy: "Sano",
  filling: "ObturaciÃ³n realizada",
  filling_bad: "ObturaciÃ³n insatisfactoria",
  filling_pending: "ObturaciÃ³n pendiente",
  crown: "Corona realizada",
  crown_bad: "Corona insatisfactoria",
  crown_pending: "Corona pendiente",
  endo: "Endodoncia realizada",
  endo_bad: "Endodoncia insatisfactoria",
  endo_indicated: "Endodoncia indicada",
  post: "Perno realizado",
  post_bad: "Perno insatisfactorio",
  post_pending: "Perno pendiente",
  implant: "Implante realizado",
  implant_review: "Implante a revisar",
  implant_indicated: "Implante indicado",
  prosthesis: "PrÃ³tesis fija realizada",
  prosthesis_bad: "PrÃ³tesis fija insatisfactoria",
  prosthesis_pending: "PrÃ³tesis fija pendiente",
  removable: "Removible realizada",
  removable_bad: "Removible insatisfactoria",
  removable_pending: "Removible pendiente",
  caries: "Caries",
  extraction: "Exodoncia indicada",
  missing: "Ausente",
};
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
const CROWN_PATHS = {
  incisor: "M16 15 C19 8 45 8 48 15 L46 44 C44 52 20 52 18 44 Z",
  canine: "M17 21 Q23 10 32 7 Q41 10 47 21 L44 45 Q32 55 20 45 Z",
  premolar: "M14 20 Q17 10 27 13 Q32 6 37 13 Q47 10 50 20 L47 46 Q32 56 17 46 Z",
  molar: "M10 21 Q13 9 24 13 Q32 6 40 13 Q51 9 54 21 L51 47 Q44 55 32 52 Q20 55 13 47 Z",
} as const;
const ROOT_PATHS = {
  incisor: "M23 45 C24 61 26 78 31 86 C35 79 40 61 41 45",
  canine: "M24 45 C25 64 28 82 32 88 C36 81 39 63 40 45",
  premolar:
    "M22 45 C22 60 19 76 23 85 C29 78 30 61 31 47 " +
    "M34 47 C35 62 36 78 41 84 C45 73 42 58 42 45",
  molar:
    "M18 45 C18 60 14 74 18 84 C24 79 27 61 28 47 " +
    "M36 47 C37 62 39 79 46 84 C50 73 46 58 46 45",
} as const;
const SURFACE_PATHS = {
  V: "M7 6 H57 L45 27 H19 Z",
  left: "M7 6 L19 27 V45 L7 59 Z",
  occlusal: "M19 27 H45 V45 H19 Z",
  right: "M57 6 L45 27 V45 L57 59 Z",
  inner: "M7 59 H57 L45 45 H19 Z",
} as const;
const SURFACE_HITBOX_PATHS = {
  regular: {
    left: "M4 5 L23 27 V46 L4 61 Z",
    right: "M60 5 L41 27 V46 L60 61 Z",
  },
  expanded: {
    left: "M2 4 L26 27 V47 L2 63 Z",
    right: "M62 4 L38 27 V47 L62 63 Z",
  },
} as const;
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
  const occlusal = occlusalSurfaceForTooth(tooth);
  const inner: ToothSurface = arch === "upper" ? "P" : "L";
  const quadrant = Number(tooth[0]);
  const position = Number(tooth[1]);
  const mesialOnRight = quadrant === 1 || quadrant === 4;
  const left: ToothSurface = mesialOnRight ? "D" : "M";
  const right: ToothSurface = mesialOnRight ? "M" : "D";
  const clipId = `denty-crown-${tooth}`;
  const statusFor = (surface: ToothSurface) => surfaceState(state, tooth, surface) ?? status ?? "";
  const sideHitboxes =
    position <= 5 ? SURFACE_HITBOX_PATHS.expanded : SURFACE_HITBOX_PATHS.regular;
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
      title={`Diente ${tooth} Â· doble clic para cambiar el estado completo`}
    >
      <span className={styles.toothLabel}>{tooth}</span>
      <svg
        className={styles.toothSvg}
        data-state={status ?? "healthy"}
        data-arch={arch}
        data-type={type}
        viewBox="0 0 64 90"
        role="img"
        aria-label={`Odontograma anatÃ³mico del diente ${tooth}`}
      >
        <defs>
          <clipPath id={clipId}>
            <path d={CROWN_PATHS[type]} />
          </clipPath>
        </defs>
        <path className={styles.rootShape} d={ROOT_PATHS[type]} />
        <path className={styles.crownBase} d={CROWN_PATHS[type]} />
        <g clipPath={`url(#${clipId})`}>
          <path
            className={styles.surface}
            data-state={statusFor("V")}
            d={SURFACE_PATHS.V}
            {...surfaceProps("V")}
          />
          <path
            className={styles.surface}
            data-state={statusFor(left)}
            d={SURFACE_PATHS.left}
            {...surfaceProps(left)}
          />
          <path
            className={styles.surface}
            data-state={statusFor(occlusal)}
            d={SURFACE_PATHS.occlusal}
            {...surfaceProps(occlusal)}
          />
          <path
            className={styles.surface}
            data-state={statusFor(right)}
            d={SURFACE_PATHS.right}
            {...surfaceProps(right)}
          />
          <path
            className={styles.surface}
            data-state={statusFor(inner)}
            d={SURFACE_PATHS.inner}
            {...surfaceProps(inner)}
          />
        </g>
        <path className={styles.crownOutline} d={CROWN_PATHS[type]} />
        <path
          className={styles.surfaceHitbox}
          data-surface={left}
          data-proximal-hitbox={position <= 5 ? "expanded" : "regular"}
          d={sideHitboxes.left}
          aria-label={`Diente ${tooth} superficie ${SURFACE_NAMES[left]}`}
          {...surfaceProps(left)}
        />
        <path
          className={styles.surfaceHitbox}
          data-surface={right}
          data-proximal-hitbox={position <= 5 ? "expanded" : "regular"}
          d={sideHitboxes.right}
          aria-label={`Diente ${tooth} superficie ${SURFACE_NAMES[right]}`}
          {...surfaceProps(right)}
        />
        {endo ? <path className={styles.endoMark} d="M31 46 C31 58 30 70 31 82" /> : null}
        {post ? <path className={styles.postMark} d="M32 35 L32 73" /> : null}
        {implant ? (
          <g className={styles.implantMark}>
            <path d="M27 48 L37 48 L39 75 L32 84 L25 75 Z" />
            <path d="M26 55 H38 M26 61 H38 M27 67 H37 M28 73 H36" />
          </g>
        ) : null}
        {prosthesis ? (
          <path className={styles.prosthesisMark} d="M15 18 Q32 8 49 18 L45 38 Q32 31 19 38 Z" />
        ) : null}
        {extraction ? (
          <path className={styles.extractionMark} d="M14 18 L50 70 M50 18 L14 70" />
        ) : null}
        {missing ? <path className={styles.missingMark} d="M13 45 H51" /> : null}
        {visualMark ? (
          <g className={styles.endoVisualMark} data-severity={visualMark.severity}>
            <path d={visualMark.svgPath} />
          </g>
        ) : null}
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
  demoMode: boolean;
  expectedVersion: number | undefined;
  saving: boolean;
  saveError: unknown;
  historical: boolean;
  historicalLabel: string | undefined;
  selectedSnapshotId: string | undefined;
  onSelectSnapshot: (snapshotId: string | null) => void;
  onSave: (entities: readonly DentalEntity[]) => Promise<void>;
}
function OdontogramEditor({
  patientId,
  initialSection = "odontogram",
  initialAction,
  birthDate,
  initialEntities,
  demoMode,
  expectedVersion,
  saving,
  saveError,
  historical,
  historicalLabel,
  selectedSnapshotId,
  onSelectSnapshot,
  onSave,
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
  const [activeTab, setActiveTab] = useState<ClinicalTab>(
    initialAction === "implant-surgery" ? "surgery" : initialSection === "diagnosis" ? "endodontic" : "general",
  );
  const entities = useMemo(
    () => Object.values(history.present.entitiesById).filter((entity) => entity.active),
    [history.present.entitiesById],
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
  const commit = (entity: DentalEntity) => {
    if (historical) return;
    setHistory((current) => executeOdontogramCommand(current, { type: "UPSERT_ENTITY", entity }));
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
    if (!["caries", "filling", "filling_bad", "filling_pending"].includes(tool)) {
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
      setBridgeError(error instanceof Error ? error.message : "No se pudo crear la prÃ³tesis.");
      return;
    }
    setHistory((current) =>
      executeOdontogramCommand(current, {
        type: "UPSERT_ENTITIES",
        entities: entitiesToAdd,
      }),
    );
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
          prosthesisRange={bridgePreviewTeeth.includes(tooth)}
          prosthesisEndpoint={tooth === bridgeFrom || tooth === bridgeTo}
          readOnly={historical}
          onSelect={() =>
            placementMode === "bridge" ? pickBridgeTooth(tooth) : setSelectedTooth(tooth)
          }
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
        eyebrow={historical ? "HistÃ³rico" : `Paciente ${patientId}`}
        title={historicalLabel ?? "Odontograma"}
        description={historical ? "Solo lectura." : "Marca hallazgos y tratamientos."}
        actions={
          <Group>
            <Badge variant="light">
              {demoMode ? "Demo" : historical ? "HistÃ³rico" : `v${expectedVersion ?? "?"}`}
            </Badge>
            {!demoMode && !historical ? (
              <Button
                size="xs"
                loading={saving}
                disabled={!dirty}
                onClick={() => void onSave(Object.values(history.present.entitiesById))}
              >
                Guardar
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
          <details className={styles.advancedTools}>
            <summary>
              <span>
                <strong>MÃ¡s herramientas</strong>
                <small>
                  Plantillas, selecciÃ³n directa y prÃ³tesis por rango Â· diente {selectedTooth}
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
                        PrÃ³tesis fija / puente
                      </Text>
                      <Text size="xs" c="dimmed">
                        {bridgeReady && bridgeFrom && bridgeTo
                          ? `Rango ${bridgeFrom} â†’ ${bridgeTo}. Confirma para aplicar.`
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
                      Aplicar prÃ³tesis / puente
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
                  Seleccionar prÃ³tesis / puente
                </Button>
              </Group>
            </section>
          </details>

          <section className={styles.chartPanel}>
            <div className={styles.chartHeader}>
              <div>
                <Text fw={850}>Odontograma</Text>
                <Text size="xs" c="dimmed">
                  FDI permanente Â· M / D / V / P-L / O-I
                </Text>
              </div>
              <div className={styles.surfaceKey} aria-label="Superficies dentales">
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
                    ? "âœ“ Rango listo"
                    : bridgePick === "from"
                      ? "1 Â· Inicio"
                      : "2 Â· Final"}
                </strong>
                <span>
                  {bridgeReady && bridgeFrom && bridgeTo
                    ? `${bridgeFrom} → ${bridgeTo}. ` +
                      "Pulsa Aplicar prótesis / puente para confirmarlo."
                    : bridgePick === "from"
                      ? "Pulsa el primer diente de la prÃ³tesis fija."
                      : `Inicio ${bridgeFrom}. Pulsa el Ãºltimo diente de la misma arcada.`}
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
                MandÃ­bula
              </Text>
            </div>
          </section>
        </>
      ) : null}

      {activeTab === "periodontal" ? (
        <PeriodontogramPanel patientId={patientId} readOnly={historical} />
      ) : null}
      {activeTab === "orthodontic" ? (
        <OrthodonticPanel patientId={patientId} readOnly={historical} onCommit={commit} />
      ) : null}
      {activeTab === "pediatric" ? (
        <PediatricPanel
          patientId={patientId}
          {...(birthDate === undefined ? {} : { birthDate })}
          readOnly={historical}
          onCommit={commit}
        />
      ) : null}
      {activeTab === "endodontic" ? (
        <EndodonticPanel selectedTooth={selectedTooth} readOnly={historical} onCommit={commit} />
      ) : null}
      {activeTab === "surgery" ? (
        <SurgeryPanel selectedTooth={selectedTooth} readOnly={historical} onCommit={commit} />
      ) : null}

      {!historical && activeTab === "periodontal" ? (
        <PeriodontalQuickEntry patientId={patientId} demoMode={demoMode} />
      ) : null}
      {activeTab === "history" ? (
        <OdontogramHistory
          patientId={patientId}
          demoMode={demoMode}
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
            <strong>Plan, presupuesto y sincronizaciÃ³n</strong>
            <small>Herramientas del flujo clÃ­nico completo</small>
          </span>
        </summary>
        <div className={parityStyles.disclosureBody}>
          <ClinicalPipelineCard patientId={patientId} />
          {!historical ? (
            <ClinicalWorkspace patientId={patientId} demoMode={demoMode} />
          ) : (
            <Alert color="yellow" title="Plan clÃ­nico actual no modificado">
              El snapshot histÃ³rico no sincroniza plan ni presupuesto. Vuelve al odontograma actual
              para realizar cambios clÃ­nicos.
            </Alert>
          )}
        </div>
      </details>

      <details className={parityStyles.disclosure}>
        <summary>
          <span>
            <strong>InformaciÃ³n tÃ©cnica del odontograma</strong>
            <small>{entities.length} entidades clÃ­nicas activas</small>
          </span>
        </summary>
        <div className={parityStyles.disclosureBody}>
          <section className={parityStyles.section}>
            <div className={styles.entityList}>
              {entities.map((entity) => (
                <div className={styles.entityRow} key={entity.id}>
                  <span>
                    {entity.tooth ?? entity.arch ?? "Arcada"} Â· {entity.entityType}
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
  const demoMode = publicEnv.NEXT_PUBLIC_DEMO_MODE === "true";
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>();
  const query = useOdontogramQuery(patientId, !demoMode);
  const patientQuery = usePatientQuery(patientId, !demoMode);
  const snapshotsQuery = useOdontogramSnapshotsQuery(patientId, !demoMode);
  const saveMutation = useSaveOdontogramBatchMutation(patientId);
  if (!demoMode && query.isError) {
    return (
      <Alert color="red" title="No se pudo cargar el odontograma">
        Revisa la conexiÃ³n con Denty. No se ha sustituido por un odontograma demo.
      </Alert>
    );
  }
  if (!demoMode && !query.data) {
    return (
      <PageHeader
        title="Cargando odontograma"
        description="Consultando entidades y versiÃ³n clÃ­nica del paciente."
      />
    );
  }
  const selectedSnapshot = snapshotsQuery.data?.items.find(
    (snapshot) => snapshot.id === selectedSnapshotId,
  );
  const historical = Boolean(selectedSnapshot);
  const currentEntities = demoMode ? INITIAL_ENTITIES : odontogramEntities(query.data!);
  const initialEntities = selectedSnapshot
    ? selectedSnapshot.entities.map(persistedEntityToDomain)
    : currentEntities;
  const expectedVersion = demoMode || historical ? undefined : query.data?.version;
  const demoPatient = demoMode
    ? DEMO_PATIENTS.find((patient) => patient.id === patientId)
    : undefined;
  const birthDate = demoPatient?.birthDate ?? patientQuery.data?.birthDate ?? undefined;
  const editorKey = selectedSnapshot
    ? `snapshot-${selectedSnapshot.id}`
    : demoMode
      ? `demo-${patientId}`
      : `${query.data?.id ?? patientId}-${expectedVersion ?? 0}`;
  return (
    <OdontogramEditor
      key={`${editorKey}-${initialSection}-${initialAction ?? "default"}`}
      patientId={patientId}
      initialSection={initialSection}
      {...(initialAction ? { initialAction } : {})}
      {...(birthDate === undefined ? {} : { birthDate })}
      initialEntities={initialEntities}
      demoMode={demoMode}
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
      }}
    />
  );
}
