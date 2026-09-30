"use client";

import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  FileButton,
  Group,
  Menu,
  Modal,
  MultiSelect,
  Select,
  SimpleGrid,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import {
  IconChevronLeft,
  IconChevronRight,
  IconDots,
  IconPlus,
  IconSearch,
} from "@tabler/icons-react";
import Link from "next/link";
import { useDeferredValue, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";

import { dateDMY } from "@/domain/dates";
import { formatEUR } from "@/domain/money";
import styles from "@/shared/ui/parity.module.css";
import pageStyles from "./patients-page.module.css";
import {
  buildAdmissionPayload,
  dentalMedicalAdmissionOptions,
  suggestedDentitionForBirthDate,
  type PatientAdmissionDraft,
} from "./patient-admission";
import {
  createPatientPayload,
  parsePatientImportFile,
  validatePatientImportRows,
} from "./patient-import";
import { patientCardFromApi, type PatientCardView } from "./patient-projection";
import {
  useCreatePatientMutation,
  usePatientsQuery,
  useUploadPatientPhotoMutation,
} from "@/shared/patients/patient-data";
import { PageHeader, PatientAvatar } from "@/shared/ui";
import { PatientPhotoCapture } from "./patient-photo-capture";
import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query";

interface ImportNotice {
  color: "green" | "yellow" | "red";
  message: string;
}

const EMPTY_ADMISSION_DRAFT: PatientAdmissionDraft = {
  firstName: "",
  lastName: "",
  birthDate: "",
  dni: "",
  phone: "",
  email: "",
  declaredSource: undefined,
  declaredSourceDetail: "",
  allergies: [],
  medications: [],
  conditions: [],
  dentalRisks: [],
  notes: "",
};

const DENTITION_LABELS = {
  primary: "Dentición primaria",
  mixed: "Dentición mixta",
  permanent: "Dentición permanente",
} as const;

const PAGE_SIZE = 50;

function formatVisitDate(value?: string | null): string {
  return value ? dateDMY(value) : "xx/xx/xxxx";
}

export function PatientsPage() {
  const [query, setQuery] = useState("");
  const [opened, setOpened] = useState(false);
  const [admissionDraft, setAdmissionDraft] =
    useState<PatientAdmissionDraft>(EMPTY_ADMISSION_DRAFT);
  const [notice, setNotice] = useState<ImportNotice | null>(null);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [admissionCampaignId, setAdmissionCampaignId] = useState("");
  const [page, setPage] = useState(1);
  const carouselRef = useRef<HTMLDivElement>(null);
  const campaignsQuery = useQuery({
    queryKey: dentyQueryKeys.campaigns.all,
    queryFn: () => getBrowserApi().engagement.marketing.campaigns(),
    retry: false,
  });
  const deferredQuery = useDeferredValue(query);
  const patientsQuery = usePatientsQuery(true, includeArchived, deferredQuery || undefined, page);
  const createMutation = useCreatePatientMutation();
  const uploadPhotoMutation = useUploadPatientPhotoMutation();

  const patients = useMemo<readonly PatientCardView[]>(
    () => (patientsQuery.data?.items ?? []).map(patientCardFromApi),
    [patientsQuery.data],
  );
  const hasSearch = deferredQuery.trim().length > 0;

  const total = patientsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSearchChange = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  // Infinite scroll: auto-load next page when scrolling near bottom
  const handleScroll = () => {
    if (!carouselRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = carouselRef.current;
    const nearBottom = scrollHeight - (scrollTop + clientHeight) < 200;
    if (nearBottom && page < totalPages && !patientsQuery.isLoading) {
      setPage((p) => p + 1);
    }
  };

  const importPatients = async (file: File | null) => {
    if (!file) return;
    setNotice(null);
    try {
      const rows = await parsePatientImportFile(file);
      if (!rows.length) {
        setNotice({ color: "yellow", message: "No se detectaron filas de pacientes." });
        return;
      }
      const issues = validatePatientImportRows(rows);
      if (issues.length) {
        const first = issues[0];
        setNotice({
          color: "red",
          message: `Importación cancelada antes de guardar: ${issues.length} incidencias. ${first ? `Fila ${first.row}: ${first.message}` : ""}`,
        });
        return;
      }

      let created = 0;
      let failed = 0;
      for (const row of rows) {
        try {
          await createMutation.mutateAsync(createPatientPayload(row));
          created += 1;
        } catch {
          failed += 1;
        }
      }
      setNotice({
        color: failed ? "yellow" : "green",
        message: `${created} pacientes importados; ${failed} rechazados. Los números de ficha existentes se conservan.`,
      });
    } catch (error) {
      setNotice({
        color: "red",
        message:
          error instanceof Error ? error.message : "No se pudo leer el archivo de importación.",
      });
    }
  };

  const createPatient = async () => {
    const basePayload = buildAdmissionPayload(admissionDraft);
    if (!basePayload.firstName || !basePayload.lastName || !admissionDraft.birthDate) return;
    const payload = admissionCampaignId
      ? { ...basePayload, declaredCampaignId: admissionCampaignId }
      : basePayload;
    const created = await createMutation.mutateAsync(payload);
    if (photoFile) {
      try {
        await uploadPhotoMutation.mutateAsync({ patientId: created.id, file: photoFile });
      } catch {
        setNotice({
          color: "yellow",
          message:
            "Paciente creado, pero la foto no pudo guardarse. Puedes repetirla desde la ficha.",
        });
      }
    }

    setAdmissionDraft(EMPTY_ADMISSION_DRAFT);
    setPhotoFile(null);
    setAdmissionCampaignId("");
    setOpened(false);
  };

  const suggestedDentition = suggestedDentitionForBirthDate(admissionDraft.birthDate);
  const admissionReady = Boolean(
    admissionDraft.firstName.trim() &&
    admissionDraft.lastName.trim() &&
    admissionDraft.birthDate.trim(),
  );

  const updateAdmissionDraft = <Key extends keyof PatientAdmissionDraft>(
    key: Key,
    value: PatientAdmissionDraft[Key],
  ) => {
    setAdmissionDraft((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className={styles.grid}>
      <PageHeader
        eyebrow="Pacientes"
        title="Pacientes"
        description="Busca y abre una ficha."
        actions={
          <Group gap="xs">
            <Button leftSection={<IconPlus size={16} />} onClick={() => setOpened(true)}>
              Nuevo paciente
            </Button>
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <Button variant="default" px="sm" aria-label="Más acciones">
                  <IconDots size={18} />
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Pacientes</Menu.Label>
                <Menu.Item onClick={() => setIncludeArchived((current) => !current)}>
                  {includeArchived ? "Ocultar archivados" : "Mostrar archivados"}
                </Menu.Item>
                <FileButton
                  onChange={(file) => void importPatients(file)}
                  accept=".csv,.tsv,.json,.xlsx,text/csv,text/tab-separated-values,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                >
                  {(props) => <Menu.Item {...props}>Importar CSV / JSON / XLSX</Menu.Item>}
                </FileButton>
              </Menu.Dropdown>
            </Menu>
          </Group>
        }
      />

      {patientsQuery.isError ? (
        <Alert color="red" title="Error al cargar pacientes">
          Revisa la conexión con Denty e inténtalo de nuevo.
        </Alert>
      ) : null}
      {notice ? (
        <Alert color={notice.color} onClose={() => setNotice(null)} withCloseButton>
          {notice.message}
        </Alert>
      ) : null}

      <TextInput
        value={query}
        onChange={(event) => handleSearchChange(event.currentTarget.value)}
        leftSection={<IconSearch size={16} />}
        placeholder="Buscar por nombre, ficha o DNI"
      />

      <section
        className={styles.section}
        aria-label="Resultados de pacientes"
        ref={carouselRef}
        onScroll={handleScroll}
      >
        <div className={styles.patientCarouselHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Pacientes</h2>
            <p className={styles.sectionDescription}>
              {patientsQuery.isLoading
                ? "Cargando fichas..."
                : hasSearch
                  ? `${total} ${total === 1 ? "ficha encontrada" : "fichas encontradas"}${
                      totalPages > 1 ? ` · página ${page} de ${totalPages}` : ""
                    }`
                  : `Últimos ${Math.min(PAGE_SIZE, total)} pacientes de ${total}${
                      totalPages > 1 ? ` · página ${page} de ${totalPages}` : ""
                    }`}
            </p>
          </div>
          {totalPages > 1 ? (
            <div className={styles.carouselControls}>
              <ActionIcon
                variant="default"
                size="lg"
                aria-label="Página anterior"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <IconChevronLeft size={18} />
              </ActionIcon>
              <span className={styles.carouselCounter}>
                {page} / {totalPages}
              </span>
              <ActionIcon
                variant="default"
                size="lg"
                aria-label="Página siguiente"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <IconChevronRight size={18} />
              </ActionIcon>
            </div>
          ) : null}
        </div>

        {patients.length ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={`page-${page}`}
              className={pageStyles.patientCardContainer}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {patients.map((patient, index) => {
                const fullName = `${patient.firstName} ${patient.lastName}`;
                return (
                  <motion.div
                    key={patient.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.02 }}
                  >
                    <Link
                      className={pageStyles.patientCardLink}
                      href={`/app/patients/${patient.id}`}
                      aria-label={`Abrir ficha de ${fullName}`}
                    >
                      <PatientAvatar name={fullName} src={patient.photoUrl} size={44} />
                      <div className={pageStyles.patientCardContent}>
                        <div className={pageStyles.patientCardHeader}>
                          <span className={pageStyles.patientCardName}>{fullName}</span>
                          {patient.archivedAt ? (
                            <Badge color="gray" size="xs">
                              Archivado
                            </Badge>
                          ) : null}
                        </div>
                        <span className={pageStyles.patientCardMeta}>
                          Ficha {patient.recordNumber}
                          {patient.dni ? ` · ${patient.dni}` : ""}
                        </span>
                      </div>
                      <div className={pageStyles.patientCardActions}>
                        {patient.balanceCents === undefined ? null : patient.balanceCents > 0 ? (
                          <Badge color="yellow" size="sm">
                            {formatEUR(patient.balanceCents)}
                          </Badge>
                        ) : (
                          <Badge color="green" size="sm">
                            Al día
                          </Badge>
                        )}
                        <IconChevronRight size={18} className={pageStyles.patientCardChevron} aria-hidden="true" />
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        ) : (
          <Text c="dimmed" size="sm">
            {patientsQuery.isLoading ? "Cargando pacientes..." : "Sin resultados."}
          </Text>
        )}
      </section>

      <Modal opened={opened} onClose={() => setOpened(false)} title="Nuevo paciente" size="xl">
        <Text size="sm" c="dimmed" mb="md">
          Crea la ficha básica. Los datos clínicos se completan dentro del paciente.
        </Text>
        <div className={styles.grid}>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeaderText}>
                <h3 className={styles.sectionTitle}>Identificación</h3>
                <p className={styles.sectionDescription}>
                  La fecha de nacimiento decide si el odontograma parte de dentición primaria, mixta
                  o permanente.
                </p>
              </div>
              <Badge color="teal" variant="light">
                {DENTITION_LABELS[suggestedDentition]}
              </Badge>
            </div>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput
                label="Nombre"
                required
                value={admissionDraft.firstName}
                onChange={(event) => updateAdmissionDraft("firstName", event.currentTarget.value)}
              />
              <TextInput
                label="Apellidos"
                required
                value={admissionDraft.lastName}
                onChange={(event) => updateAdmissionDraft("lastName", event.currentTarget.value)}
              />
              <TextInput
                label="Fecha de nacimiento"
                required
                type="date"
                value={admissionDraft.birthDate}
                onChange={(event) => updateAdmissionDraft("birthDate", event.currentTarget.value)}
              />
              <TextInput
                label="DNI / NIE"
                description="Opcional; puede completarse más adelante."
                value={admissionDraft.dni ?? ""}
                onChange={(event) => updateAdmissionDraft("dni", event.currentTarget.value)}
              />
              <TextInput
                label="Teléfono"
                value={admissionDraft.phone ?? ""}
                onChange={(event) => updateAdmissionDraft("phone", event.currentTarget.value)}
              />
              <TextInput
                label="Email"
                type="email"
                value={admissionDraft.email ?? ""}
                onChange={(event) => updateAdmissionDraft("email", event.currentTarget.value)}
              />
              <Select
                label="¿Cómo nos conoció?"
                clearable
                data={[
                  { value: "GOOGLE", label: "Google" },
                  { value: "INSTAGRAM", label: "Instagram" },
                  { value: "FACEBOOK", label: "Facebook" },
                  { value: "PATIENT_REFERRAL", label: "Recomendación de paciente" },
                  { value: "PROFESSIONAL_REFERRAL", label: "Recomendación profesional" },
                  { value: "WALK_IN", label: "Pasó por la clínica" },
                  { value: "EXISTING_PATIENT", label: "Paciente existente" },
                  { value: "OTHER", label: "Otro" },
                ]}
                value={admissionDraft.declaredSource ?? null}
                onChange={(value) =>
                  updateAdmissionDraft(
                    "declaredSource",
                    (value || undefined) as PatientAdmissionDraft["declaredSource"],
                  )
                }
              />
              <TextInput
                label="Detalle del origen"
                value={admissionDraft.declaredSourceDetail ?? ""}
                onChange={(event) =>
                  updateAdmissionDraft("declaredSourceDetail", event.currentTarget.value)
                }
              />
              {!campaignsQuery.isError ? (
                <Select
                  searchable
                  clearable
                  label="Campaña atribuida"
                  data={(campaignsQuery.data?.items ?? []).map((campaign) => ({
                    value: campaign.id ?? campaign.externalId,
                    label: `${campaign.name} · ${campaign.provider}`,
                  }))}
                  value={admissionCampaignId || null}
                  onChange={(value) => setAdmissionCampaignId(value ?? "")}
                />
              ) : null}
            </SimpleGrid>
          </section>

          <section className={styles.section}>
            <PatientPhotoCapture
              value={photoFile}
              onPhotoReady={setPhotoFile}
              disabled={createMutation.isPending || uploadPhotoMutation.isPending}
            />
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeaderText}>
                <h3 className={styles.sectionTitle}>Anamnesis odontológica</h3>
                <p className={styles.sectionDescription}>
                  Selecciona antecedentes, medicación y riesgos que cambian anestesia, cirugía,
                  prescripción o planificación.
                </p>
              </div>
            </div>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <MultiSelect
                label="Alergias"
                searchable
                clearable
                data={dentalMedicalAdmissionOptions.allergies}
                value={[...admissionDraft.allergies]}
                onChange={(value) => updateAdmissionDraft("allergies", value)}
              />
              <MultiSelect
                label="Medicación habitual"
                searchable
                clearable
                data={dentalMedicalAdmissionOptions.medications}
                value={[...admissionDraft.medications]}
                onChange={(value) => updateAdmissionDraft("medications", value)}
              />
              <MultiSelect
                label="Enfermedades o condiciones"
                searchable
                clearable
                data={dentalMedicalAdmissionOptions.conditions}
                value={[...admissionDraft.conditions]}
                onChange={(value) => updateAdmissionDraft("conditions", value)}
              />
              <MultiSelect
                label="Riesgos odontológicos"
                searchable
                clearable
                data={dentalMedicalAdmissionOptions.dentalRisks}
                value={[...admissionDraft.dentalRisks]}
                onChange={(value) => updateAdmissionDraft("dentalRisks", value)}
              />
            </SimpleGrid>
            <Textarea
              mt="md"
              label="Notas clínicas iniciales"
              minRows={3}
              autosize
              value={admissionDraft.notes}
              onChange={(event) => updateAdmissionDraft("notes", event.currentTarget.value)}
            />
          </section>
        </div>
        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={() => setOpened(false)}>
            Cancelar
          </Button>
          <Button
            loading={createMutation.isPending || uploadPhotoMutation.isPending}
            disabled={!admissionReady}
            onClick={() => void createPatient()}
          >
            Crear paciente
          </Button>
        </Group>
      </Modal>
    </div>
  );
}
