"use client";

import { Alert, Badge, Button, Group, Menu, SimpleGrid, Tabs, Text, Title } from "@mantine/core";
import {
  IconArchive,
  IconCalendar,
  IconChevronRight,
  IconDots,
  IconFileText,
  IconHeartbeat,
  IconDeviceGamepad2,
  IconPencil,
  IconPill,
  IconReceipt,
  IconRestore,
} from "@tabler/icons-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { dateDMY, dateYMDMadrid, epochMillis, hhmm, todayMadrid } from "@/domain/dates";
import { formatEUR } from "@/domain/money";
import { ClinicalPipelineCard } from "@/shared/clinical/clinical-pipeline-card";
import { ClinicalSyncCard } from "@/shared/clinical/clinical-sync-card";
import { ClinicalWorkspace } from "@/shared/clinical/clinical-workspace";
import { TreatmentFlowModal } from "@/shared/clinical/treatment-flow";
import { useClinicalWorkflowQuery } from "@/shared/clinical/clinical-data";
import { PatientClinicalSummary } from "./patient-clinical-summary";
import styles from "@/shared/ui/parity.module.css";
import {
  useArchivePatientMutation,
  usePatientProjectionQuery,
  usePatientQuery,
  useRestorePatientMutation,
  useUpdatePatientMutation,
  useUploadPatientPhotoMutation,
} from "@/shared/patients/patient-data";
import { HorizontalSnapNav, PageHeader, PatientAvatar } from "@/shared/ui";
import { PatientMedicalHistory } from "./patient-medical-history";
import { PatientEditModal } from "./patient-edit-modal";
import { PatientPhotoCapture } from "./patient-photo-capture";
import {
  optionLabels,
  suggestedDentitionForBirthDate,
  type PatientMedicalProfile,
} from "./patient-admission";

const SOURCE_LABELS: Readonly<Record<string, string>> = {
  GOOGLE: "Google",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  PATIENT_REFERRAL: "Recomendación de paciente",
  PROFESSIONAL_REFERRAL: "Recomendación profesional",
  WALK_IN: "Entrada directa",
  EXISTING_PATIENT: "Paciente existente",
  OTHER: "Otro",
};

function emptyMedicalProfile(birthDate?: string | null): PatientMedicalProfile {
  return {
    allergies: [],
    medications: [],
    conditions: [],
    dentalRisks: [],
    notes: "",
    dentitionStage: suggestedDentitionForBirthDate(birthDate ?? ""),
  };
}

function isClinicalAlert(value: string): boolean {
  return !/^sin (alergias|medicación|antecedentes)/i.test(value);
}

function PatientRouteCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof IconHeartbeat;
  title: string;
  description: string;
}) {
  return (
    <Link className={styles.patientRouteCard} href={href}>
      <span className={styles.patientRouteIcon}>
        <Icon size={20} />
      </span>
      <span className={styles.patientRouteCopy}>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <IconChevronRight size={18} className={styles.patientRouteChevron} />
    </Link>
  );
}

export function PatientProfile({ patientId }: { patientId: string }) {
  const searchParams = useSearchParams();
  const requestedView = searchParams.get("view");
  const requestedAction = searchParams.get("action");
  const requestedBudgetId = searchParams.get("budgetId") ?? undefined;
  const initialTab =
    requestedView === "plan"
      ? "plan"
      : requestedView === "budgets"
        ? "budgets"
        : requestedView === "clinical"
          ? "clinical"
          : "summary";
  const patientQuery = usePatientQuery(patientId);
  const projectionQuery = usePatientProjectionQuery(patientId);
  const workflowQuery = useClinicalWorkflowQuery(patientId);
  const updatePatientMutation = useUpdatePatientMutation(patientId);
  const archivePatientMutation = useArchivePatientMutation();
  const restorePatientMutation = useRestorePatientMutation();
  const uploadPhotoMutation = useUploadPatientPhotoMutation();
  const [now] = useState(() => Date.now());
  const [activeTab, setActiveTab] = useState<string | null>(initialTab);
  const [treatmentFlowOpen, setTreatmentFlowOpen] = useState(false);
  const [treatmentFlowStartAt, setTreatmentFlowStartAt] = useState<
    "plan" | "consents" | "signature" | undefined
  >(undefined);
  const [treatmentFlowBudgetId, setTreatmentFlowBudgetId] = useState<string | undefined>(
    undefined,
  );
  const [photoEditorOpen, setPhotoEditorOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [medicalProfileOverride, setMedicalProfileOverride] =
    useState<PatientMedicalProfile | null>(null);


  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (initialTab === "budgets" && requestedAction === "sign") {
      setTreatmentFlowStartAt(requestedBudgetId ? "signature" : undefined);
      setTreatmentFlowBudgetId(requestedBudgetId);
      setTreatmentFlowOpen(true);
    }
  }, [initialTab, requestedAction, requestedBudgetId]);

  if (patientQuery.isError) {
    return (
      <Alert color="red" title="Error al cargar ficha">
        Revisa la conexión con Denty.
      </Alert>
    );
  }

  if (!patientQuery.data) {
    return <PageHeader title="Cargando" description="Cargando datos del paciente." />;
  }

  const patient = patientQuery.data;
  const fullName = `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim();
  const recordNumber = patient.recordNumber ?? "—";
  const phone = patient.phone ?? "Sin teléfono";
  const email = patient.email ?? "Sin email";
  const source = patient.declaredSource
    ? (SOURCE_LABELS[patient.declaredSource] ?? patient.declaredSource)
    : "Sin origen registrado";

  const archivePatient = async () => {
    await archivePatientMutation.mutateAsync({ patientId, expectedVersion: patient.version });
  };

  const restorePatient = async () => {
    await restorePatientMutation.mutateAsync({ patientId, expectedVersion: patient.version });
  };

  const projection = projectionQuery.data;
  const upcoming = [...(projection?.appointments ?? [])]
    .filter(
      (appointment) =>
        !["CANCELLED", "NO_SHOW", "COMPLETED"].includes(appointment.status) &&
        epochMillis(appointment.startsAt) >= now,
    )
    .sort((left, right) => epochMillis(left.startsAt) - epochMillis(right.startsAt))[0];
  const completed = [...(projection?.appointments ?? [])]
    .filter((appointment) => appointment.status === "COMPLETED")
    .sort((left, right) => epochMillis(right.startsAt) - epochMillis(left.startsAt))[0];
  const openBudgetTotal = (projection?.budgets ?? []).reduce(
    (sum, budget) => sum + budget.totalCents,
    0,
  );
  const latestNextVisit = workflowQuery.data?.encounters
    .map((encounter) => encounter.nextVisit?.trim())
    .find((note): note is string => Boolean(note));
  const upcomingIsToday =
    upcoming !== undefined && dateYMDMadrid(upcoming.startsAt) === todayMadrid(now);
  const showPlannedToday =
    Boolean(upcomingIsToday && latestNextVisit) &&
    !workflowQuery.isPending &&
    !workflowQuery.isError;

  const nextVisitTitle = projectionQuery.isPending
    ? "Cargando citas…"
    : projectionQuery.isError
      ? "No disponible"
      : upcoming
        ? `${dateDMY(upcoming.startsAt)} · ${hhmm(upcoming.startsAt)}`
        : "Sin próxima cita";
  const nextVisitLabel = showPlannedToday ? "Previsto para hoy" : "Próximo paso";
  const nextVisitDescription = projectionQuery.isPending
    ? "Consultando las próximas visitas."
    : projectionQuery.isError
      ? "No se pudieron cargar las citas."
      : showPlannedToday && latestNextVisit
        ? latestNextVisit
        : (upcoming?.reason ?? upcoming?.title ?? "La agenda no tiene una cita futura activa.");
  const economyValue = projectionQuery.isPending
    ? "Cargando…"
    : projectionQuery.isError
      ? "No disponible"
      : formatEUR(openBudgetTotal);
  const economyDescription = projectionQuery.isPending
    ? "Consultando presupuestos."
    : projectionQuery.isError
      ? "No se pudieron cargar los presupuestos."
      : `${projection?.budgets.length ?? 0} presupuestos abiertos`;

  const baseMedicalProfile = patient.medicalProfile ?? emptyMedicalProfile(patient.birthDate);
  const medicalProfile = medicalProfileOverride ?? baseMedicalProfile;
  const saveMedicalProfile = async (nextProfile: PatientMedicalProfile) => {
    await updatePatientMutation.mutateAsync({
      expectedVersion: patient.version,
      medicalProfile: nextProfile,
    });
    setMedicalProfileOverride(nextProfile);
  };

  const medicalItems = [
    ...optionLabels("allergies", medicalProfile.allergies)
      .filter(isClinicalAlert)
      .map((item) => ({ label: `Alergia · ${item}`, tone: "red" as const })),
    ...optionLabels("medications", medicalProfile.medications)
      .filter(isClinicalAlert)
      .map((item) => ({ label: `Medicación · ${item}`, tone: "blue" as const })),
    ...optionLabels("conditions", medicalProfile.conditions)
      .filter(isClinicalAlert)
      .map((item) => ({ label: item, tone: "yellow" as const })),
    ...optionLabels("dentalRisks", medicalProfile.dentalRisks)
      .filter(isClinicalAlert)
      .map((item) => ({ label: item, tone: "violet" as const })),
  ];

  return (
    <div className={styles.grid}>
      <PageHeader
        title={fullName || "Paciente"}
        description={`Ficha ${recordNumber} · ${phone} · ${email}`}
        actions={
          <Group gap="xs">
            <Button
              component={Link}
              href={`/app/patients/${patientId}/odontogram`}
              leftSection={<IconHeartbeat size={17} />}
            >
              Odontograma
            </Button>
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <Button variant="default" px="sm" aria-label="Más acciones">
                  <IconDots size={18} />
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                {!patient.archivedAt ? (
                  <Menu.Item
                    leftSection={<IconPencil size={16} />}
                    onClick={() => setEditOpen(true)}
                  >
                    Editar datos
                  </Menu.Item>
                ) : null}
                <Menu.Item
                  component={Link}
                  href={`/app/agenda?patientId=${patientId}`}
                  leftSection={<IconCalendar size={16} />}
                >
                  Dar cita
                </Menu.Item>
                <Menu.Item
                  component={Link}
                  href={`/app/documents?patientId=${patientId}`}
                  leftSection={<IconFileText size={16} />}
                >
                  Documentos
                </Menu.Item>
                <Menu.Item
                  component={Link}
                  href="/app/prescriptions"
                  leftSection={<IconPill size={16} />}
                >
                  Recetas
                </Menu.Item>
                <Menu.Item
                  component={Link}
                  href={`/app/finance?patientId=${patientId}`}
                  leftSection={<IconReceipt size={16} />}
                >
                  Cobros
                </Menu.Item>
                <Menu.Item
                  component={Link}
                  href={`/app/patients/${patientId}/games`}
                  leftSection={<IconDeviceGamepad2 size={16} />}
                >
                  Denty Games
                </Menu.Item>
                <Menu.Divider />
                {patient.archivedAt ? (
                  <Menu.Item
                    leftSection={<IconRestore size={16} />}
                    onClick={() => void restorePatient()}
                    disabled={restorePatientMutation.isPending}
                  >
                    Restaurar ficha
                  </Menu.Item>
                ) : (
                  <Menu.Item
                    color="gray"
                    leftSection={<IconArchive size={16} />}
                    onClick={() => void archivePatient()}
                    disabled={archivePatientMutation.isPending}
                  >
                    Archivar ficha
                  </Menu.Item>
                )}
              </Menu.Dropdown>
            </Menu>
          </Group>
        }
      />

      <section className={styles.patientHero}>
        <PatientAvatar name={fullName || "Paciente"} size={58} src={patient.photoUrl} />
        <div className={styles.patientHeroIdentity}>
          <strong>{fullName}</strong>
          <span>
            Ficha {recordNumber} · {source}
          </span>
        </div>
        <div className={styles.patientHeroStatus}>
          {patient.archivedAt ? (
            <Badge color="gray" variant="light">
              Archivado
            </Badge>
          ) : null}
          <Badge variant="light">Servidor</Badge>
          {!patient.archivedAt ? (
            <>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconPencil size={14} />}
                onClick={() => setEditOpen(true)}
              >
                Editar datos
              </Button>
              <Button
                size="xs"
                variant="subtle"
                onClick={() => setPhotoEditorOpen((value) => !value)}
              >
                {photoEditorOpen ? "Cerrar foto" : "Cambiar foto"}
              </Button>
            </>
          ) : null}
        </div>
      </section>

      <PatientEditModal patient={patient} opened={editOpen} onClose={() => setEditOpen(false)} />

      {photoEditorOpen ? (
        <section className={styles.section}>
          <PatientPhotoCapture
            value={photoFile}
            onPhotoReady={setPhotoFile}
            disabled={uploadPhotoMutation.isPending}
          />
          <Group mt="sm">
            <Button
              disabled={!photoFile}
              loading={uploadPhotoMutation.isPending}
              onClick={() => {
                if (!photoFile) return;
                uploadPhotoMutation.mutate(
                  { patientId, file: photoFile },
                  {
                    onSuccess: () => {
                      setPhotoFile(null);
                      setPhotoEditorOpen(false);
                    },
                  },
                );
              }}
            >
              Guardar foto
            </Button>
          </Group>
          {uploadPhotoMutation.isError ? (
            <Alert mt="sm" color="red">
              No se pudo guardar la foto:{" "}
              {uploadPhotoMutation.error instanceof Error
                ? uploadPhotoMutation.error.message
                : "error desconocido"}
            </Alert>
          ) : null}
        </section>
      ) : null}

      {medicalItems.length ? (
        <div className={styles.patientAlertStrip} aria-label="Alertas clínicas del paciente">
          {medicalItems.map((item) => (
            <Badge key={item.label} color={item.tone} variant="light">
              {item.label}
            </Badge>
          ))}
        </div>
      ) : null}

      {projectionQuery.isError ? (
        <Alert color="yellow" title="Resumen incompleto">
          Faltan algunos datos clínicos.
        </Alert>
      ) : null}

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <section className={styles.summaryTile}>
          <span className={styles.summaryTileLabel}>{nextVisitLabel}</span>
          <Title order={3}>{nextVisitTitle}</Title>
          <Text c="dimmed" size="sm">
            {nextVisitDescription}
          </Text>
          {completed ? (
            <Text c="dimmed" size="xs">
              Última visita: {dateDMY(completed.startsAt)} · {hhmm(completed.startsAt)}
            </Text>
          ) : null}
        </section>
        <section className={styles.summaryTile}>
          <span className={styles.summaryTileLabel}>Economía</span>
          <Title order={3}>{economyValue}</Title>
          <Text c="dimmed" size="sm">
            {economyDescription}
          </Text>
        </section>
      </SimpleGrid>

      <HorizontalSnapNav
        ariaLabel="Ficha del paciente"
        value={activeTab ?? "summary"}
        onChange={setActiveTab}
        items={[
          { value: "summary", label: "Resumen" },
          { value: "clinical", label: "Clínica" },
          { value: "plan", label: "Plan" },
          { value: "budgets", label: "Presupuestos" },
          { value: "documents", label: "Documentos" },
          { value: "finance", label: "Cobros" },
          { value: "more", label: "Más" },
        ]}
      />

      <Tabs
        value={activeTab}
        onChange={setActiveTab}
        className={styles.patientTabs}
        keepMounted={false}
      >
        <Tabs.Panel value="summary" pt="lg">
          <div className={styles.patientRouteGrid}>
            <PatientRouteCard
              href={`/app/patients/${patientId}/odontogram`}
              icon={IconHeartbeat}
              title="Clínica"
              description="Odontograma y especialidades"
            />
            <PatientRouteCard
              href={`/app/patients/${patientId}?view=plan`}
              icon={IconFileText}
              title="Plan de tratamiento"
              description="Qué vamos a hacer y en qué orden"
            />
            <PatientRouteCard
              href={`/app/patients/${patientId}?view=budgets`}
              icon={IconReceipt}
              title="Presupuestos"
              description="Opciones, comparación, precios y firma"
            />
            <PatientRouteCard
              href={`/app/agenda?patientId=${patientId}`}
              icon={IconCalendar}
              title="Citas"
              description="Citas y cambios"
            />
            <PatientRouteCard
              href={`/app/documents?patientId=${patientId}`}
              icon={IconFileText}
              title="Documentos"
              description="Firmados y pendientes"
            />
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="clinical" pt="lg">
          <div className={styles.grid}>
            <PatientMedicalHistory
              profile={medicalProfile}
              saving={updatePatientMutation.isPending}
              onSave={saveMedicalProfile}
            />
            <ClinicalPipelineCard patientId={patientId} />
            <ClinicalSyncCard patientId={patientId} />
            <PatientClinicalSummary patientId={patientId} />
          </div>
        </Tabs.Panel>


        <Tabs.Panel value="plan" pt="lg">
          <ClinicalWorkspace
            patientId={patientId}
            mode="plan"
            onOpenGuidedFlow={(budgetId) => {
              setTreatmentFlowStartAt("consents");
              setTreatmentFlowBudgetId(budgetId);
              setTreatmentFlowOpen(true);
            }}
          />
        </Tabs.Panel>

        <Tabs.Panel value="budgets" pt="lg">
          <ClinicalWorkspace
            patientId={patientId}
            mode="budget"
            onOpenGuidedFlow={() => {
              setTreatmentFlowStartAt(undefined);
              setTreatmentFlowBudgetId(undefined);
              setTreatmentFlowOpen(true);
            }}
          />
        </Tabs.Panel>

        <Tabs.Panel value="documents" pt="lg">
          <div className={styles.patientRouteGrid}>
            <PatientRouteCard
              href={`/app/documents?patientId=${patientId}`}
              icon={IconFileText}
              title="Documentos"
              description="Firmados, pendientes y archivo"
            />
            <PatientRouteCard
              href="/app/prescriptions"
              icon={IconPill}
              title="Recetas"
              description="Prescripción y firma"
            />
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="finance" pt="lg">
          <div className={styles.patientRouteGrid}>
            <PatientRouteCard
              href={`/app/finance?patientId=${patientId}`}
              icon={IconReceipt}
              title="Pagos"
              description="Facturas, cobros y datáfono"
            />
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="more" pt="lg">
          <div className={styles.patientRouteGrid}>
            <PatientRouteCard
              href={`/app/patients/${patientId}/games`}
              icon={IconDeviceGamepad2}
              title="Denty Games"
              description={`Récords y bonos de la ficha ${recordNumber}`}
            />
            <PatientRouteCard
              href="/app/agenda"
              icon={IconCalendar}
              title="Agenda"
              description="Citas y seguimiento"
            />
          </div>
        </Tabs.Panel>
      </Tabs>

      <TreatmentFlowModal
        patientId={patientId}
        opened={treatmentFlowOpen}
        startAt={treatmentFlowStartAt}
        preferredBudgetId={treatmentFlowBudgetId}
        onClose={() => {
          setTreatmentFlowOpen(false);
          setTreatmentFlowStartAt(undefined);
          setTreatmentFlowBudgetId(undefined);
        }}
      />
    </div>
  );
}
