"use client";

import { Alert, Badge, Button, Group, Select, SimpleGrid, Text } from "@mantine/core";
import { IconArrowBackUp, IconArrowForwardUp } from "@tabler/icons-react";
import { useMemo, useState } from "react";

import {
  PERMANENT_LOWER,
  PERMANENT_UPPER,
  TOOTH_STATES,
  archForTooth,
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
import { PeriodontalQuickEntry } from "./periodontal-quick-entry";
import {
  createStateEntity,
  persistedEntityToDomain,
  toothStateFromEntity,
} from "@/shared/odontogram/odontogram-wire";
import parityStyles from "@/shared/ui/parity.module.css";
import { DentyApiError } from "@/shared/api";
import { publicEnv } from "@/shared/config/env";
import { PageHeader } from "@/shared/ui";

import styles from "./odontogram.module.css";

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
  filling: "Obturación realizada",
  filling_bad: "Obturación insatisfactoria",
  filling_pending: "Obturación pendiente",
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
  prosthesis: "Prótesis fija realizada",
  prosthesis_bad: "Prótesis fija insatisfactoria",
  prosthesis_pending: "Prótesis fija pendiente",
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
  return Object.values(state.entitiesById).find(
    (entity) =>
      entity.active &&
      entity.tooth === tooth &&
      !entity.surfaces?.length &&
      (toolType === undefined || entity.entityType === toolType),
  );
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
    (entity) =>
      entity.active && entity.tooth === tooth && entity.surfaces?.includes(surface),
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

function Tooth({
  tooth,
  state,
  selected,
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
  const mesialOnRight = quadrant === 1 || quadrant === 4;
  const left: ToothSurface = mesialOnRight ? "D" : "M";
  const right: ToothSurface = mesialOnRight ? "M" : "D";
  const clipId = `denty-crown-${tooth}`;
  const statusFor = (surface: ToothSurface) =>
    surfaceState(state, tooth, surface) ?? status ?? "";
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
  const endo = status?.startsWith("endo");
  const post = status?.startsWith("post");
  const extraction = status === "extraction";
  const missing = status === "missing";

  return (
    <button
      className={styles.toothButton}
      type="button"
      data-selected={selected}
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
            d="M7 6 H57 L45 27 H19 Z"
            {...surfaceProps("V")}
          />
          <path
            className={styles.surface}
            data-state={statusFor(left)}
            d="M7 6 L19 27 V45 L7 59 Z"
            {...surfaceProps(left)}
          />
          <path
            className={styles.surface}
            data-state={statusFor(occlusal)}
            d="M19 27 H45 V45 H19 Z"
            {...surfaceProps(occlusal)}
          />
          <path
            className={styles.surface}
            data-state={statusFor(right)}
            d="M57 6 L45 27 V45 L57 59 Z"
            {...surfaceProps(right)}
          />
          <path
            className={styles.surface}
            data-state={statusFor(inner)}
            d="M7 59 H57 L45 45 H19 Z"
            {...surfaceProps(inner)}
          />
        </g>
        <path className={styles.crownOutline} d={CROWN_PATHS[type]} />
        {endo ? <path className={styles.endoMark} d="M31 46 C31 58 30 70 31 82" /> : null}
        {post ? <path className={styles.postMark} d="M32 35 L32 73" /> : null}
        {implant ? (
          <g className={styles.implantMark}>
            <path d="M27 48 L37 48 L39 75 L32 84 L25 75 Z" />
            <path d="M26 55 H38 M26 61 H38 M27 67 H37 M28 73 H36" />
          </g>
        ) : null}
        {extraction ? (
          <path
            className={styles.extractionMark}
            d="M14 18 L50 70 M50 18 L14 70"
          />
        ) : null}
        {missing ? <path className={styles.missingMark} d="M13 45 H51" /> : null}
      </svg>
    </button>
  );
}

interface OdontogramEditorProps {
  patientId: string;
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
  const [selectedTooth, setSelectedTooth] = useState("25");
  const [bridgeFrom, setBridgeFrom] = useState("13");
  const [bridgeTo, setBridgeTo] = useState("23");

  const entities = useMemo(
    () => Object.values(history.present.entitiesById).filter((entity) => entity.active),
    [history.present.entitiesById],
  );
  const dirty = history.present.revision !== 0;

  const commit = (entity: DentalEntity) => {
    if (historical) return;
    setHistory((current) =>
      executeOdontogramCommand(current, { type: "UPSERT_ENTITY", entity }),
    );
  };

  const applyWhole = (tooth: string, status = tool) => {
    commit(createStateEntity(tooth, status));
  };

  const applySurface = (tooth: string, surface: ToothSurface) => {
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
    const entitiesToAdd =
      template === "implant"
        ? createImplantStack(selectedTooth)
        : template === "endo"
          ? createEndoPostCrown(selectedTooth)
          : createBridgeEntities(bridgeFrom, bridgeTo);
    setHistory((current) =>
      executeOdontogramCommand(current, {
        type: "UPSERT_ENTITIES",
        entities: entitiesToAdd,
      }),
    );
  };

  const renderArch = (teeth: readonly string[]) => (
    <div className={styles.arch}>
      {teeth.map((tooth) => (
        <Tooth
          key={tooth}
          tooth={tooth}
          state={history.present}
          selected={selectedTooth === tooth}
          readOnly={historical}
          onSelect={() => setSelectedTooth(tooth)}
          onWholeAction={() => cycleWholeTreatment(tooth)}
          onSurfaceAction={(surface) => applySurface(tooth, surface)}
          onSurfaceCycle={(surface) => cycleSurfaceTreatment(tooth, surface)}
        />
      ))}
    </div>
  );

  const conflict =
    saveError instanceof DentyApiError && saveError.kind === "conflict";

  return (
    <div className={styles.board}>
      <PageHeader
        eyebrow={historical ? "Odontograma histórico" : `Paciente ${patientId}`}
        title={historicalLabel ?? "Odontograma clínico"}
        description={
          historical
            ? "Snapshot persistido en modo solo lectura."
            : "5 caras, estados clínicos, plantillas e historial compartido con voz."
        }
        actions={
          <Group>
            <Badge variant="light">
              {demoMode ? "Demo" : historical ? "Histórico" : `v${expectedVersion ?? "?"}`}
            </Badge>
            {!demoMode && !historical ? (
              <Button
                size="xs"
                loading={saving}
                disabled={!dirty}
                onClick={() => void onSave(Object.values(history.present.entitiesById))}
              >
                Guardar cambios
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
            ? "El odontograma cambió en otro dispositivo. Recarga antes de sobrescribirlo."
            : "No se pudieron guardar los cambios del odontograma."}
        </Alert>
      ) : null}

      <section className={styles.controlPanel}>
        <div className={styles.panelHeading}>
          <div>
            <Text fw={850}>Herramientas clínicas</Text>
            <Text size="xs" c="dimmed">
              Selecciona una herramienta y actúa sobre el diente o una superficie.
            </Text>
          </div>
          <Badge variant="light">Diente {selectedTooth}</Badge>
        </div>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
          <Select
            label="Herramienta"
            value={tool}
            onChange={(value) => setTool((value ?? "caries") as ToothState)}
            data={[...TOOL_OPTIONS]}
            disabled={historical}
          />
          <Select
            label="Diente seleccionado"
            value={selectedTooth}
            onChange={(value) => setSelectedTooth(value ?? "46")}
            data={[...PERMANENT_UPPER, ...PERMANENT_LOWER]}
          />
          <Select
            label="Puente desde"
            value={bridgeFrom}
            onChange={(value) => setBridgeFrom(value ?? "13")}
            data={[...PERMANENT_UPPER, ...PERMANENT_LOWER]}
            disabled={historical}
          />
          <Select
            label="Puente hasta"
            value={bridgeTo}
            onChange={(value) => setBridgeTo(value ?? "23")}
            data={[...PERMANENT_UPPER, ...PERMANENT_LOWER]}
            disabled={historical}
          />
        </SimpleGrid>
        <Group mt="md">
          <Button
            size="xs"
            disabled={historical}
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
            onClick={() => applyTemplate("bridge")}
          >
            Puente
          </Button>
        </Group>
      </section>

      <section className={styles.chartPanel}>
        <div className={styles.chartHeader}>
          <div>
            <Text fw={850}>Odontograma</Text>
            <Text size="xs" c="dimmed">FDI permanente · M / D / V / P-L / O-I</Text>
          </div>
          <div className={styles.surfaceKey} aria-label="Superficies dentales">
            <span><b>M</b> Mesial</span><span><b>D</b> Distal</span><span><b>V</b> Vestibular</span>
            <span><b>P/L</b> Palatina / lingual</span><span><b>O/I</b> Oclusal / incisal</span>
          </div>
        </div>
        <div className={styles.archBlock}>
          <Text className={styles.archLabel} fw={800}>Maxilar</Text>
          {renderArch(PERMANENT_UPPER)}
        </div>
        <div className={styles.occlusalPlane}><span>Plano oclusal</span></div>
        <div className={styles.archBlock}>
          {renderArch(PERMANENT_LOWER)}
          <Text className={styles.archLabel} fw={800}>Mandíbula</Text>
        </div>
      </section>

      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} /> Realizado / correcto · doble clic cambia estado
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} data-tone="red" /> Caries / pendiente
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} data-tone="green" /> Sano final
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} data-tone="violet" /> Implante / prótesis
        </span>
      </div>

      <ClinicalPipelineCard active={2} />
      {!historical ? (
        <PeriodontalQuickEntry patientId={patientId} demoMode={demoMode} />
      ) : null}
      <OdontogramHistory
        patientId={patientId}
        demoMode={demoMode}
        selectedSnapshotId={selectedSnapshotId}
        onSelectSnapshot={onSelectSnapshot}
      />
      {!historical ? (
        <ClinicalWorkspace patientId={patientId} demoMode={demoMode} />
      ) : (
        <Alert color="yellow" title="Plan clínico actual no modificado">
          El snapshot histórico no sincroniza plan ni presupuesto. Vuelve al odontograma
          actual para realizar cambios clínicos.
        </Alert>
      )}

      <section className={parityStyles.section}>
        <div className={parityStyles.sectionHeader}>
          <div>
            <h2 className={parityStyles.sectionTitle}>Entidades activas</h2>
            <p className={parityStyles.sectionDescription}>
              El odontograma usa entidades clínicas, no pixels ni estados duplicados.
            </p>
          </div>
          <Badge>{entities.length}</Badge>
        </div>
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
  );
}

export function OdontogramWorkspace({ patientId }: { patientId: string }) {
  const demoMode = publicEnv.NEXT_PUBLIC_DEMO_MODE === "true";
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>();
  const query = useOdontogramQuery(patientId, !demoMode);
  const snapshotsQuery = useOdontogramSnapshotsQuery(patientId, !demoMode);
  const saveMutation = useSaveOdontogramBatchMutation(patientId);

  if (!demoMode && query.isError) {
    return (
      <Alert color="red" title="No se pudo cargar el odontograma">
        Revisa la conexión con Denty. No se ha sustituido por un odontograma demo.
      </Alert>
    );
  }

  if (!demoMode && !query.data) {
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
  const currentEntities = demoMode ? INITIAL_ENTITIES : odontogramEntities(query.data!);
  const initialEntities = selectedSnapshot
    ? selectedSnapshot.entities.map(persistedEntityToDomain)
    : currentEntities;
  const expectedVersion = demoMode || historical ? undefined : query.data?.version;
  const editorKey = selectedSnapshot
    ? `snapshot-${selectedSnapshot.id}`
    : demoMode
      ? `demo-${patientId}`
      : `${query.data?.id ?? patientId}-${expectedVersion ?? 0}`;

  return (
    <OdontogramEditor
      key={editorKey}
      patientId={patientId}
      initialEntities={initialEntities}
      demoMode={demoMode}
      expectedVersion={expectedVersion}
      saving={saveMutation.isPending}
      saveError={saveMutation.error}
      historical={historical}
      historicalLabel={selectedSnapshot?.label ?? undefined}
      selectedSnapshotId={selectedSnapshotId}
      onSelectSnapshot={(snapshotId) =>
        setSelectedSnapshotId(snapshotId ?? undefined)
      }
      onSave={async (entities) => {
        if (expectedVersion === undefined) return;
        await saveMutation.mutateAsync({ expectedVersion, entities });
      }}
    />
  );
}
