"use client";

import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useMemo, useState } from "react";

import {
  APICAL_DIAGNOSES,
  BUDGET_CATEGORIES,
  PULPAL_DIAGNOSES,
  budgetCategoryForTreatment,
  endodonticConsistency,
  orderedPlan,
  suggestKennedyClass,
  summarizePeriodontal,
  type ApicalDiagnosis,
  type EndodonticAssessment,
  type PeriodontalClassification,
  type PeriodontalReading,
  type PlanItem,
  type PulpalDiagnosis,
  type TreatmentPlanGraph,
} from "@/domain";
import { formatEUR } from "@/domain/money";
import {
  useClinicalPlanQuery,
  useClinicalSyncQuery,
  useClinicalWorkflowQuery,
  useCreateEndodonticAssessmentMutation,
  useCreateEndodonticPlanMutation,
  useCreatePeriodontalExamMutation,
  useSyncBudgetFromPlanMutation,
  useSyncPlanFromOdontogramMutation,
} from "@/shared/clinical/clinical-data";
import styles from "@/shared/ui/parity.module.css";
import type {
  ClinicalPlan,
  ClinicalSyncState,
  ClinicalWorkflow,
} from "@/shared/api";

const INITIAL_READINGS: readonly PeriodontalReading[] = [
  { tooth: "16", site: "MV", probingDepth: 4, recession: 1, bleeding: true },
  { tooth: "16", site: "V", probingDepth: 3, recession: 0, plaque: true },
  { tooth: "16", site: "DV", probingDepth: 5, recession: 1, bleeding: true },
  { tooth: "16", site: "MP", probingDepth: 4, recession: 0 },
  { tooth: "16", site: "P/L", probingDepth: 3, recession: 0 },
  { tooth: "16", site: "DP", probingDepth: 4, recession: 1, bleeding: true },
] as const;

const PLAN_ITEMS: readonly (PlanItem & { priceCents: number })[] = [
  {
    id: "hygiene",
    treatmentCode: "PERIO-HYGIENE",
    label: "Higiene periodontal",
    phase: 2,
    priority: 90,
    status: "PLANNED",
    priceCents: 6500,
  },
  {
    id: "endo-46",
    treatmentCode: "ENDO",
    label: "Endodoncia 46",
    phase: 1,
    priority: 100,
    status: "PLANNED",
    priceCents: 28000,
  },
  {
    id: "implant-46",
    treatmentCode: "IMPLANT",
    label: "Implante 46",
    phase: 4,
    priority: 70,
    status: "PLANNED",
    priceCents: 95000,
  },
  {
    id: "crown-46",
    treatmentCode: "CROWN-ZR",
    label: "Corona zirconio 46",
    phase: 5,
    priority: 60,
    status: "PLANNED",
    priceCents: 55000,
  },
] as const;

const PLAN_GRAPH: TreatmentPlanGraph = {
  items: PLAN_ITEMS,
  dependencies: [
    {
      itemId: "crown-46",
      dependsOnId: "implant-46",
      reason: "La corona definitiva requiere el implante integrado.",
    },
  ],
};

interface ClinicalPanelProps {
  patientId: string;
  demoMode: boolean;
  workflow: ClinicalWorkflow | undefined;
}

function EndodonticsPanel({ patientId, demoMode, workflow }: ClinicalPanelProps) {
  const [tooth, setTooth] = useState("46");
  const [pulpal, setPulpal] = useState<PulpalDiagnosis>(
    "Pulpitis irreversible sintomática",
  );
  const [apical, setApical] = useState<ApicalDiagnosis>(
    "Periodontitis apical sintomática",
  );
  const [lingering, setLingering] = useState(18);
  const [includeCrown, setIncludeCrown] = useState(true);
  const assessmentMutation = useCreateEndodonticAssessmentMutation(patientId);
  const planMutation = useCreateEndodonticPlanMutation(patientId);

  const assessment: EndodonticAssessment = {
    pulpalDiagnosis: pulpal,
    apicalDiagnosis: apical,
    confidence: "MODERATE",
    complexity: "MODERATE",
    restorability: "FAVORABLE",
    findings: {
      spontaneousPain: true,
      nocturnalPain: false,
      lingeringColdSeconds: lingering,
      coldResponsePresent: true,
      percussion: "POSITIVE",
    },
  };
  const notices = endodonticConsistency(assessment);
  const latestAssessment = workflow?.endodonticAssessments.find(
    (item) => item.tooth === tooth,
  );
  const assessmentId = assessmentMutation.data?.id ?? latestAssessment?.id;

  const saveAssessment = async () => {
    if (demoMode) return;
    await assessmentMutation.mutateAsync({
      tooth,
      pulpalDiagnosis: pulpal,
      apicalDiagnosis: apical,
      diagnosticSystem: "AAE",
      diagnosticVersion: "2009",
      confidence: "MODERATE",
      symptoms: {
        spontaneousPain: true,
        nocturnalPain: false,
      },
      sensibilityTests: {
        coldResponsePresent: true,
        lingeringColdSeconds: lingering,
      },
      apicalTests: { percussion: "POSITIVE" },
      prognosis: { restorability: "FAVORABLE" },
      confirm: true,
    });
  };

  const createPlan = async () => {
    if (demoMode) return;
    await planMutation.mutateAsync({
      tooth,
      reason: `${pulpal} · ${apical}`,
      ...(assessmentId ? { assessmentId } : {}),
      includeCrown,
    });
  };

  return (
    <section className={styles.section}>
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={3}>Endodoncia · AAE 2009</Title>
          <Text c="dimmed" size="sm" mt="xs">
            Denty organiza hallazgos y coherencia; la decisión diagnóstica sigue siendo clínica.
          </Text>
        </div>
        <Badge variant="light">{demoMode ? "Demo" : "Servidor"}</Badge>
      </Group>
      <SimpleGrid cols={{ base: 1, md: 4 }} mt="lg">
        <TextInput
          label="Diente"
          value={tooth}
          onChange={(event) => setTooth(event.currentTarget.value)}
        />
        <Select
          label="Diagnóstico pulpar"
          value={pulpal}
          onChange={(value) => value && setPulpal(value as PulpalDiagnosis)}
          data={[...PULPAL_DIAGNOSES]}
        />
        <Select
          label="Diagnóstico apical"
          value={apical}
          onChange={(value) => value && setApical(value as ApicalDiagnosis)}
          data={[...APICAL_DIAGNOSES]}
        />
        <NumberInput
          label="Frío persistente (s)"
          min={0}
          max={120}
          value={lingering}
          onChange={(value) => setLingering(Number(value) || 0)}
        />
      </SimpleGrid>
      <div className={styles.rowList}>
        {notices.map((notice) => (
          <div className={styles.row} key={notice.code}>
            <div className={styles.rowMain}>
              <span className={styles.rowTitle}>{notice.message}</span>
              <span className={styles.rowMeta}>{notice.code}</span>
            </div>
            <Badge color={notice.severity === "WARNING" ? "yellow" : "blue"}>
              {notice.severity}
            </Badge>
          </div>
        ))}
      </div>
      {!demoMode && latestAssessment ? (
        <Alert mt="lg" color="green" title="Evaluación registrada">
          {latestAssessment.pulpalDiagnosis ?? "Sin diagnóstico pulpar"} ·{" "}
          {latestAssessment.apicalDiagnosis ?? "Sin diagnóstico apical"}
        </Alert>
      ) : null}
      {assessmentMutation.isError || planMutation.isError ? (
        <Alert mt="lg" color="red" title="No se pudo guardar el flujo endodóntico">
          El servidor rechazó la operación. Los datos locales no sustituyen el registro clínico.
        </Alert>
      ) : null}
      <Group mt="lg">
        <Button
          size="xs"
          loading={assessmentMutation.isPending}
          onClick={() => void saveAssessment()}
          disabled={demoMode || !tooth.trim()}
        >
          Guardar evaluación
        </Button>
        <Checkbox
          checked={includeCrown}
          onChange={(event) => setIncludeCrown(event.currentTarget.checked)}
          label="Incluir corona"
        />
        <Button
          size="xs"
          variant="light"
          loading={planMutation.isPending}
          onClick={() => void createPlan()}
          disabled={demoMode || !tooth.trim()}
        >
          Crear plan desde diagnóstico
        </Button>
      </Group>
    </section>
  );
}

function PeriodontalPanel({ patientId, demoMode, workflow }: ClinicalPanelProps) {
  const [classification, setClassification] = useState<PeriodontalClassification>({
    stage: "III",
    grade: "B",
    extent: "GENERALIZED",
  });
  const examMutation = useCreatePeriodontalExamMutation(patientId);
  const summary = summarizePeriodontal(INITIAL_READINGS);
  const latestExam = workflow?.periodontalExams[0];

  const saveExam = async () => {
    if (demoMode) return;
    await examMutation.mutateAsync({
      title: "Periodontograma completo",
      sites: INITIAL_READINGS.map((reading) => ({
        tooth: reading.tooth,
        site: reading.site,
        ...(reading.probingDepth !== undefined
          ? { probingDepth: reading.probingDepth }
          : {}),
        ...(reading.recession !== undefined ? { recession: reading.recession } : {}),
        ...(reading.bleeding !== undefined ? { bleeding: reading.bleeding } : {}),
        ...(reading.plaque !== undefined ? { plaque: reading.plaque } : {}),
        ...(reading.mobility !== undefined ? { mobility: reading.mobility } : {}),
        ...(reading.furcation !== undefined ? { furcation: reading.furcation } : {}),
      })),
      diagnosis: "Periodontitis",
      stage: classification.stage,
      grade: classification.grade,
      extent: classification.extent,
    });
  };

  return (
    <section className={styles.section}>
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={3}>Periodontograma</Title>
          <Text c="dimmed" size="sm" mt="xs">
            Seis sitios por diente, recesión, sangrado, placa, movilidad, furca y resumen.
          </Text>
        </div>
        <Badge variant="light">{demoMode ? "Demo" : "Servidor"}</Badge>
      </Group>
      <SimpleGrid cols={{ base: 2, md: 4 }} mt="lg">
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Sitios ≥4 mm</span>
          <strong className={styles.metricValue}>{summary.sitesAtLeast4}</strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Sitios ≥6 mm</span>
          <strong className={styles.metricValue}>{summary.sitesAtLeast6}</strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Sangrado</span>
          <strong className={styles.metricValue}>{summary.bleedingPct}%</strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>PD máximo</span>
          <strong className={styles.metricValue}>{summary.maxPD} mm</strong>
        </div>
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1, md: 3 }} mt="lg">
        <Select
          label="Stage"
          value={classification.stage}
          onChange={(value) =>
            value &&
            setClassification((current) => ({
              ...current,
              stage: value as "I" | "II" | "III" | "IV",
            }))
          }
          data={["I", "II", "III", "IV"]}
        />
        <Select
          label="Grade"
          value={classification.grade}
          onChange={(value) =>
            value &&
            setClassification((current) => ({
              ...current,
              grade: value as "A" | "B" | "C",
            }))
          }
          data={["A", "B", "C"]}
        />
        <Select
          label="Extensión"
          value={classification.extent}
          onChange={(value) =>
            value &&
            setClassification((current) => ({
              ...current,
              extent: value as "LOCALIZED" | "GENERALIZED" | "MOLAR_INCISOR",
            }))
          }
          data={[
            { value: "LOCALIZED", label: "Localizada" },
            { value: "GENERALIZED", label: "Generalizada" },
            { value: "MOLAR_INCISOR", label: "Molar-incisivo" },
          ]}
        />
      </SimpleGrid>
      {!demoMode && latestExam ? (
        <Alert mt="lg" color="green" title="Último examen guardado">
          {latestExam.stage ?? "Stage —"} · {latestExam.grade ?? "Grade —"} ·{" "}
          {latestExam.extent ?? "Extensión —"}
        </Alert>
      ) : null}
      {examMutation.isError ? (
        <Alert mt="lg" color="red" title="No se pudo guardar el examen periodontal">
          El examen no se ha sustituido por datos demo.
        </Alert>
      ) : null}
      <Button
        mt="lg"
        size="xs"
        loading={examMutation.isPending}
        onClick={() => void saveExam()}
        disabled={demoMode}
      >
        Guardar examen periodontal
      </Button>
    </section>
  );
}

function DemoPlanBudgetPanel() {
  const ordered = orderedPlan(PLAN_GRAPH);
  const [selected, setSelected] = useState<readonly string[]>(
    PLAN_ITEMS.map((item) => item.id),
  );
  const kennedy = suggestKennedyClass(["36", "37", "46", "47"]);
  const total = useMemo(
    () =>
      PLAN_ITEMS.filter((item) => selected.includes(item.id)).reduce(
        (sum, item) => sum + item.priceCents,
        0,
      ),
    [selected],
  );

  return (
    <div className={styles.gridTwo}>
      <section className={styles.section}>
        <Title order={3}>Plan por fases · demo</Title>
        <div className={styles.rowList}>
          {ordered.map((item) => (
            <div className={styles.row} key={item.id}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>
                  Fase {item.phase} · {item.label}
                </span>
                <span className={styles.rowMeta}>
                  {budgetCategoryForTreatment(item)} · prioridad {item.priority}
                </span>
              </div>
              <Badge variant="light">{item.status}</Badge>
            </div>
          ))}
        </div>
        <Badge mt="lg" color="violet">
          Kennedy sugerida: {kennedy}
        </Badge>
      </section>
      <section className={styles.section}>
        <Title order={3}>Presupuesto desde plan · demo</Title>
        <div className={styles.rowList}>
          {PLAN_ITEMS.map((item) => (
            <div className={styles.row} key={item.id}>
              <Checkbox
                checked={selected.includes(item.id)}
                onChange={(event) =>
                  setSelected((current) =>
                    event.currentTarget.checked
                      ? [...current, item.id]
                      : current.filter((id) => id !== item.id),
                  )
                }
                label={item.label}
              />
              <Text fw={750}>{formatEUR(item.priceCents)}</Text>
            </div>
          ))}
        </div>
        <Group justify="space-between" mt="lg">
          <div>
            <Text size="xs" c="dimmed">
              Categorías
            </Text>
            <Text size="sm">{BUDGET_CATEGORIES.join(" · ")}</Text>
          </div>
          <Title order={2}>{formatEUR(total)}</Title>
        </Group>
      </section>
    </div>
  );
}

interface ServerPlanBudgetPanelProps {
  patientId: string;
  plan: ClinicalPlan;
  sync: ClinicalSyncState;
}

function ServerPlanBudgetPanel({
  patientId,
  plan,
  sync,
}: ServerPlanBudgetPanelProps) {
  const planSync = useSyncPlanFromOdontogramMutation(patientId);
  const budgetSync = useSyncBudgetFromPlanMutation(patientId);
  const ordered = plan.route.length ? plan.route : plan.items;

  return (
    <div className={styles.gridTwo}>
      <section className={styles.section}>
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={3}>Plan por fases</Title>
            <Text c="dimmed" size="sm" mt="xs">
              El plan se persiste separado del odontograma y conserva dependencias y prioridad.
            </Text>
          </div>
          <Badge color={sync.plan.outdated ? "yellow" : "green"}>
            {sync.plan.outdated ? "Pendiente de sincronizar" : `v${sync.plan.version}`}
          </Badge>
        </Group>
        <div className={styles.rowList}>
          {ordered.map((item) => (
            <div className={styles.row} key={item.id}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>
                  Fase {item.phase} · {item.label}
                </span>
                <span className={styles.rowMeta}>
                  {item.tooth ? `Diente ${item.tooth} · ` : ""}
                  prioridad {item.priority}
                </span>
              </div>
              <Badge variant="light">{item.status}</Badge>
            </div>
          ))}
          {!ordered.length ? (
            <Text c="dimmed" size="sm">
              No hay tratamientos en el plan activo.
            </Text>
          ) : null}
        </div>
        {planSync.isError ? (
          <Alert mt="lg" color="red" title="No se pudo sincronizar el plan">
            El odontograma y el plan conservan sus versiones actuales.
          </Alert>
        ) : null}
        <Button
          mt="lg"
          size="xs"
          loading={planSync.isPending}
          onClick={() => void planSync.mutateAsync()}
        >
          Sincronizar plan desde odontograma
        </Button>
      </section>
      <section className={styles.section}>
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={3}>Presupuesto desde plan</Title>
            <Text c="dimmed" size="sm" mt="xs">
              Solo se presupuesta el plan clínico persistido. No se inventan líneas desde la UI.
            </Text>
          </div>
          <Badge color={sync.budget?.outdated ? "yellow" : "green"}>
            {sync.budget ? sync.budget.status : "Sin presupuesto"}
          </Badge>
        </Group>
        {sync.budget ? (
          <div className={styles.metric}>
            <span className={styles.metricLabel}>{sync.budget.code}</span>
            <strong className={styles.metricValue}>
              {formatEUR(sync.budget.totalCents)}
            </strong>
          </div>
        ) : (
          <Text mt="lg" c="dimmed" size="sm">
            Todavía no existe un presupuesto derivado del plan.
          </Text>
        )}
        <Text mt="lg" size="sm">
          Próxima acción: <strong>{sync.nextAction}</strong>
        </Text>
        {budgetSync.isError ? (
          <Alert mt="lg" color="red" title="No se pudo sincronizar el presupuesto">
            No se ha creado un presupuesto local alternativo.
          </Alert>
        ) : null}
        <Button
          mt="lg"
          size="xs"
          loading={budgetSync.isPending}
          onClick={() => void budgetSync.mutateAsync()}
          disabled={sync.plan.outdated}
        >
          Sincronizar presupuesto desde plan
        </Button>
      </section>
    </div>
  );
}

interface ClinicalWorkspaceProps {
  patientId: string;
  demoMode: boolean;
}

export function ClinicalWorkspace({ patientId, demoMode }: ClinicalWorkspaceProps) {
  const [tab, setTab] = useState("endo");
  const workflowQuery = useClinicalWorkflowQuery(patientId, !demoMode);
  const planQuery = useClinicalPlanQuery(patientId, !demoMode);
  const syncQuery = useClinicalSyncQuery(patientId, !demoMode);
  const serverError = workflowQuery.isError || planQuery.isError || syncQuery.isError;

  if (!demoMode && serverError) {
    return (
      <Alert color="red" title="No se pudo cargar el flujo clínico">
        Denty no ha sustituido el workflow, el plan ni el presupuesto por datos demo.
      </Alert>
    );
  }

  if (!demoMode && (!workflowQuery.data || !planQuery.data || !syncQuery.data)) {
    return (
      <Alert color="blue" title="Cargando flujo clínico">
        Consultando diagnóstico, plan y estado de sincronización del paciente.
      </Alert>
    );
  }

  return (
    <div className={styles.grid}>
      <SegmentedControl
        fullWidth
        value={tab}
        onChange={setTab}
        data={[
          { value: "endo", label: "Endodoncia" },
          { value: "perio", label: "Periodoncia" },
          { value: "plan", label: "Plan + presupuesto" },
        ]}
      />
      {tab === "endo" ? (
        <EndodonticsPanel
          patientId={patientId}
          demoMode={demoMode}
          workflow={workflowQuery.data}
        />
      ) : null}
      {tab === "perio" ? (
        <PeriodontalPanel
          patientId={patientId}
          demoMode={demoMode}
          workflow={workflowQuery.data}
        />
      ) : null}
      {tab === "plan" && demoMode ? <DemoPlanBudgetPanel /> : null}
      {tab === "plan" && !demoMode && planQuery.data && syncQuery.data ? (
        <ServerPlanBudgetPanel
          patientId={patientId}
          plan={planQuery.data}
          sync={syncQuery.data}
        />
      ) : null}
    </div>
  );
}
