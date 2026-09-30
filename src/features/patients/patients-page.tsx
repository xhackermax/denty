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
  IconChevronDown,
  IconChevronRight,
  IconChevronUp,
  IconDots,
  IconPlus,
  IconSearch,
} from "@tabler/icons-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { dateDMY } from "@/domain/dates";
import { formatEUR } from "@/domain/money";
import styles from "@/shared/ui/parity.module.css";
import {
  buildAdmissionPayload,
  dentalMedicalAdmissionOptions,
  optionLabels,
  suggestedDentitionForBirthDate,
  type PatientAdmissionDraft,
} from "./patient-admission";
import {
  getInfiniteCarouselRecenteringDelta,
  PATIENT_CAROUSEL_SCROLL_SETTLE_MS,
} from "./patient-carousel-loop";
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

function formatVisitDate(value?: string | null): string {
  return value ? dateDMY(value) : "xx/xx/xxxx";
}

export function PatientsPage() {
  const reducedMotion = useReducedMotion();
  const [query, setQuery] = useState("");
  const [opened, setOpened] = useState(false);
  const [admissionDraft, setAdmissionDraft] =
    useState<PatientAdmissionDraft>(EMPTY_ADMISSION_DRAFT);
  const [notice, setNotice] = useState<ImportNotice | null>(null);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [admissionCampaignId, setAdmissionCampaignId] = useState("");
  const campaignsQuery = useQuery({
    queryKey: dentyQueryKeys.campaigns.all,
    queryFn: () => getBrowserApi().engagement.marketing.campaigns(),
    retry: false,
  });
  const carouselRef = useRef<HTMLDivElement>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const scrollSettleTimerRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const deferredQuery = useDeferredValue(query);
  const patientsQuery = usePatientsQuery(true, includeArchived, deferredQuery || undefined);
  const createMutation = useCreatePatientMutation();
  const uploadPhotoMutation = useUploadPatientPhotoMutation();

  const filtered = useMemo<readonly PatientCardView[]>(
    () => (patientsQuery.data?.items ?? []).map(patientCardFromApi),
    [patientsQuery.data],
  );

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

  const safeActiveIndex = filtered.length ? Math.min(activeIndex, filtered.length - 1) : 0;

  const getCarouselCards = useCallback(() => {
    const viewport = carouselRef.current;
    if (!viewport) return [] as HTMLElement[];
    return Array.from(viewport.querySelectorAll<HTMLElement>("[data-carousel-index]"));
  }, []);

  const getClosestCarouselCard = useCallback(() => {
    const viewport = carouselRef.current;
    if (!viewport) return null;
    const cards = getCarouselCards();
    if (!cards.length) return null;

    const viewportRect = viewport.getBoundingClientRect();
    const viewportCenter = viewportRect.top + viewportRect.height / 2;
    let closest: HTMLElement | null = null;
    let distance = Number.POSITIVE_INFINITY;

    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      const cardDistance = Math.abs(rect.top + rect.height / 2 - viewportCenter);
      if (cardDistance < distance) {
        distance = cardDistance;
        closest = card;
      }
    }

    return closest;
  }, [getCarouselCards]);

  const scrollCardToCenter = useCallback(
    (card: HTMLElement, behavior: ScrollBehavior = "smooth") => {
      const viewport = carouselRef.current;
      if (!viewport) return;
      const viewportRect = viewport.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const delta =
        cardRect.top + cardRect.height / 2 - (viewportRect.top + viewportRect.height / 2);
      viewport.scrollTo({ top: viewport.scrollTop + delta, behavior });
    },
    [],
  );

  const centerPatient = useCallback(
    (patientIndex: number, behavior: ScrollBehavior = "smooth") => {
      const viewport = carouselRef.current;
      if (!viewport || !filtered.length) return;

      const normalizedIndex =
        ((patientIndex % filtered.length) + filtered.length) % filtered.length;
      const candidates = getCarouselCards().filter(
        (card) => Number(card.dataset.carouselIndex) === normalizedIndex,
      );
      if (!candidates.length) return;

      const viewportRect = viewport.getBoundingClientRect();
      const viewportCenter = viewportRect.top + viewportRect.height / 2;
      const middleCopy = candidates.find((card) => card.dataset.carouselCopy === "1");
      const target =
        candidates.reduce<HTMLElement | null>((best, card) => {
          if (!best) return card;
          const cardRect = card.getBoundingClientRect();
          const bestRect = best.getBoundingClientRect();
          const cardDistance = Math.abs(cardRect.top + cardRect.height / 2 - viewportCenter);
          const bestDistance = Math.abs(bestRect.top + bestRect.height / 2 - viewportCenter);
          return cardDistance < bestDistance ? card : best;
        }, null) ??
        middleCopy ??
        candidates[0];

      if (target) scrollCardToCenter(target, behavior);
      setActiveIndex(normalizedIndex);
    },
    [filtered.length, getCarouselCards, scrollCardToCenter],
  );

  const moveCarousel = useCallback(
    (direction: -1 | 1) => {
      const viewport = carouselRef.current;
      if (!viewport || filtered.length <= 1) return;

      const cards = getCarouselCards();
      const current = getClosestCarouselCard();
      if (!current) {
        centerPatient(safeActiveIndex + direction);
        return;
      }

      const currentPosition = cards.indexOf(current);
      const target = cards[currentPosition + direction];
      if (target) {
        scrollCardToCenter(target);
        setActiveIndex(Number(target.dataset.carouselIndex ?? safeActiveIndex));
      } else {
        centerPatient(safeActiveIndex + direction);
      }
    },
    [
      centerPatient,
      filtered.length,
      getCarouselCards,
      getClosestCarouselCard,
      safeActiveIndex,
      scrollCardToCenter,
    ],
  );

  const normalizeCarouselAfterScroll = useCallback(() => {
    const viewport = carouselRef.current;
    const closest = getClosestCarouselCard();
    if (!viewport || !closest || filtered.length <= 1) return;

    const firstCycle = viewport.querySelector<HTMLElement>('[data-carousel-cycle="0"]');
    const middleCycle = viewport.querySelector<HTMLElement>('[data-carousel-cycle="1"]');
    if (!firstCycle || !middleCycle) return;

    const copy = Number(closest.dataset.carouselCopy ?? 1);
    const cycleSpan = middleCycle.offsetTop - firstCycle.offsetTop;
    const delta = getInfiniteCarouselRecenteringDelta({
      copy,
      cycleSpan,
      settled: true,
    });

    if (delta !== 0) {
      viewport.scrollTop += delta;
    }
  }, [filtered.length, getClosestCarouselCard]);

  const scheduleCarouselNormalization = useCallback(() => {
    if (scrollSettleTimerRef.current !== null) {
      window.clearTimeout(scrollSettleTimerRef.current);
    }

    scrollSettleTimerRef.current = window.setTimeout(() => {
      scrollSettleTimerRef.current = null;
      normalizeCarouselAfterScroll();
    }, PATIENT_CAROUSEL_SCROLL_SETTLE_MS);
  }, [normalizeCarouselAfterScroll]);

  const syncCarouselIndex = useCallback(() => {
    scheduleCarouselNormalization();
    if (scrollFrameRef.current !== null) return;

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      const closest = getClosestCarouselCard();
      if (!closest) return;

      const nextIndex = Number(closest.dataset.carouselIndex ?? 0);
      setActiveIndex(nextIndex);
    });
  }, [getClosestCarouselCard, scheduleCarouselNormalization]);

  useEffect(() => {
    if (!filtered.length) {
      setActiveIndex(0);
      return;
    }

    setActiveIndex(0);
    const frame = window.requestAnimationFrame(() => {
      const viewport = carouselRef.current;
      if (!viewport) return;
      const copy = filtered.length > 1 ? 1 : 0;
      const target = viewport.querySelector<HTMLElement>(
        `[data-carousel-copy="${copy}"][data-carousel-index="0"]`,
      );
      if (target) scrollCardToCenter(target, "auto");
    });

    return () => window.cancelAnimationFrame(frame);
  }, [filtered.length, query, scrollCardToCenter]);

  useEffect(
    () => () => {
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
      if (scrollSettleTimerRef.current !== null) {
        window.clearTimeout(scrollSettleTimerRef.current);
      }
    },
    [],
  );

  const carouselCopies = filtered.length > 1 ? [0, 1, 2] : [0];
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
        onChange={(event) => setQuery(event.currentTarget.value)}
        leftSection={<IconSearch size={16} />}
        placeholder="Buscar por nombre, ficha o DNI"
      />

      <section className={styles.section} aria-label="Resultados de pacientes">
        <div className={styles.patientCarouselHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Pacientes</h2>
            <p className={styles.sectionDescription}>
              {patientsQuery.isLoading
                ? "Cargando fichas…"
                : `${filtered.length} ${
                    filtered.length === 1 ? "ficha encontrada" : "fichas encontradas"
                  } · desplázate con la rueda o las flechas`}
            </p>
          </div>
          <div className={styles.carouselControls}>
            <ActionIcon
              variant="default"
              size="lg"
              aria-label="Paciente anterior"
              disabled={filtered.length <= 1}
              onClick={() => moveCarousel(-1)}
            >
              <IconChevronUp size={18} />
            </ActionIcon>
            <span className={styles.carouselCounter}>
              {filtered.length ? `${safeActiveIndex + 1} / ${filtered.length}` : "0 / 0"}
            </span>
            <ActionIcon
              variant="default"
              size="lg"
              aria-label="Paciente siguiente"
              disabled={filtered.length <= 1}
              onClick={() => moveCarousel(1)}
            >
              <IconChevronDown size={18} />
            </ActionIcon>
          </div>
        </div>

        {filtered.length ? (
          <div className={styles.patientCarouselStage}>
            <div className={styles.patientCarouselFocus} aria-hidden="true" />
            <div
              className={styles.patientCarouselViewport}
              ref={carouselRef}
              onScroll={syncCarouselIndex}
              onKeyDown={(event) => {
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  moveCarousel(-1);
                } else if (event.key === "ArrowDown") {
                  event.preventDefault();
                  moveCarousel(1);
                }
              }}
              role="listbox"
              aria-label="Carrusel vertical de pacientes"
              tabIndex={0}
            >
              <div
                className={styles.patientCarouselTrack}
                data-single={filtered.length === 1 ? "true" : undefined}
              >
                {carouselCopies.map((copy) => (
                  <div
                    className={styles.patientCarouselCycle}
                    data-carousel-cycle={copy}
                    key={`copy-${copy}`}
                    aria-hidden={copy !== (filtered.length > 1 ? 1 : 0) ? "true" : undefined}
                  >
                    {filtered.map((patient, index) => {
                      const fullName = `${patient.firstName} ${patient.lastName}`;
                      const active = safeActiveIndex === index;
                      const forwardDistance =
                        (index - safeActiveIndex + filtered.length) % filtered.length;
                      const backwardDistance =
                        (safeActiveIndex - index + filtered.length) % filtered.length;
                      const distance = Math.min(forwardDistance, backwardDistance);
                      return (
                        <motion.article
                          className={styles.patientCarouselCard}
                          key={`${copy}-${patient.id}`}
                          data-carousel-index={index}
                          data-carousel-copy={copy}
                          data-active={active}
                          animate={
                            reducedMotion
                              ? { scale: 1, opacity: 1, x: 0, rotateY: 0, z: 0 }
                              : {
                                  scale: active ? 1.065 : distance === 1 ? 0.93 : 0.84,
                                  opacity: active ? 1 : distance === 1 ? 0.58 : 0.2,
                                  x: active ? 0 : Math.min(distance, 2) * 34,
                                  rotateY: active ? 0 : -Math.min(distance, 2) * 9,
                                  z: active ? 58 : -Math.min(distance, 2) * 18,
                                }
                          }
                          transition={{ type: "spring", stiffness: 330, damping: 31, mass: 0.72 }}
                          role="option"
                          aria-selected={active}
                        >
                          <Link
                            className={styles.patientCarouselCardLink}
                            href={`/app/patients/${patient.id}`}
                            aria-label={`Abrir ficha de ${fullName}`}
                            tabIndex={copy === (filtered.length > 1 ? 1 : 0) ? 0 : -1}
                          >
                            <motion.div
                              className={styles.patientCarouselAvatar}
                              animate={
                                reducedMotion
                                  ? { x: 0, y: 0, scale: 1 }
                                  : {
                                      x: active ? 0 : -Math.min(distance, 2) * 8,
                                      y: active ? 0 : distance === 1 ? 2 : 4,
                                      scale: active ? 1.14 : 0.9,
                                    }
                              }
                              transition={{ type: "spring", stiffness: 350, damping: 32 }}
                            >
                              <PatientAvatar name={fullName} src={patient.photoUrl} size={56} />
                            </motion.div>
                            <motion.div
                              className={styles.patientCarouselInfo}
                              animate={
                                reducedMotion
                                  ? { x: 0 }
                                  : { x: active ? 0 : Math.min(distance, 2) * 15 }
                              }
                              transition={{ type: "spring", stiffness: 350, damping: 32 }}
                            >
                              <div className={styles.patientCarouselIdentity}>
                                <span className={styles.patientCarouselName}>
                                  {fullName}
                                  {patient.archivedAt ? (
                                    <Badge color="gray" size="xs" ml="xs">
                                      Archivado
                                    </Badge>
                                  ) : null}
                                </span>
                                <span className={styles.patientCarouselRecord}>
                                  Ficha {patient.recordNumber}
                                  {patient.dni ? ` · ${patient.dni}` : ""}
                                </span>
                              </div>
                              <dl className={styles.patientVisitGrid}>
                                <div className={styles.patientVisitCell}>
                                  <dt>Última</dt>
                                  <dd>{formatVisitDate(patient.lastVisitAt)}</dd>
                                </div>
                                <div className={styles.patientVisitCell}>
                                  <dt>Próxima</dt>
                                  <dd data-empty={patient.nextVisitAt ? undefined : "true"}>
                                    {formatVisitDate(patient.nextVisitAt)}
                                  </dd>
                                </div>
                              </dl>
                            </motion.div>
                            <div className={styles.patientCarouselAside}>
                              {patient.balanceCents === undefined ? null : patient.balanceCents >
                                0 ? (
                                <Badge color="yellow" size="sm">
                                  {formatEUR(patient.balanceCents)}
                                </Badge>
                              ) : (
                                <Badge color="green" size="sm">
                                  Al día
                                </Badge>
                              )}
                              <IconChevronRight
                                className={styles.patientCarouselOpenIcon}
                                size={18}
                                aria-hidden="true"
                              />
                            </div>
                          </Link>
                        </motion.article>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <Text c="dimmed" size="sm">
            {patientsQuery.isLoading ? "Cargando pacientes…" : "Sin resultados."}
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
