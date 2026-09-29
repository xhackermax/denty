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
  IconPill,
  IconReceipt,
  IconRestore,
} from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";

import { dateDMY, epochMillis, hhmm } from "@/domain/dates";
import { formatEUR } from "@/domain/money";
import { ClinicalPipelineCard } from "@/shared/clinical/clinical-pipeline-card";
import { ClinicalSyncCard } from "@/shared/clinical/clinical-sync-card";
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
  const patientQuery = usePatientQuery(patientId);
  const projectionQuery = usePatientProjectionQuery(patientId);
  const updatePatientMutation = useUpdatePatientMutation(patientId);
  const archivePatientMutation = useArchivePatientMutation();
  const restorePatientMutation = useRestorePatientMutation();
  const uploadPhotoMutation = useUploadPatientPhotoMutation();
  const [now] = useState(() => Date.now());
  const [activeTab, setActiveTab] = useState<string | null>("summary");
  const [photoEditorOpen, setPhotoEditorOpen] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [medicalProfileOverride, setMedicalProfileOverride] =
    useState<PatientMedicalProfile | null>(null);

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

  const nextVisitTitle = upcoming
    ? `${dateDMY(upcoming.startsAt)} · ${hhmm(upcoming.startsAt)}`
    : "Sin próxima cita";
  const nextVisitDescription =
    upcoming?.reason ?? upcoming?.title ?? "La agenda no tiene una cita futura activa.";
  const economyValue = formatEUR(openBudgetTotal);
  const economyDescription = `${projection?.budgets.length ?? 0} presupuestos abiertos`;

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
        eyebrow={`Ficha ${recordNumber}`}
        title={fullName || "Paciente"}
        description={`${phone} · ${email}`}
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
            <Button
              size="xs"
              variant="subtle"
              onClick={() => setPhotoEditorOpen((value) => !value)}
            >
              {photoEditorOpen ? "Cerrar foto" : "Cambiar foto"}
            </Button>
          ) : null}
        </div>
      </section>

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
                void uploadPhotoMutation.mutateAsync({ patientId, file: photoFile }).then(() => {
                  setPhotoFile(null);
                  setPhotoEditorOpen(false);
                });
              }}
            >
              Guardar foto
            </Button>
          </Group>
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
          <span className={styles.summaryTileLabel}>Próximo paso</span>
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
              description="Presupuesto, factura y datáfono"
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
    </div>
  );
}
