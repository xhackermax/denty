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
  Text,
  TextInput,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronRight,
  IconChevronUp,
  IconDots,
  IconPlus,
  IconSearch,
} from "@tabler/icons-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { dateDMY } from "@/domain/dates";
import { formatEUR } from "@/domain/money";
import { DEMO_PATIENTS, type DemoPatient } from "@/shared/demo/demo-data";
import styles from "@/shared/ui/parity.module.css";
import { createPatientPayload, parsePatientCsv, type ParsedPatientRow } from "./patient-import";
import {
  patientCardFromApi,
  patientCardFromDemo,
  type PatientCardView,
} from "./patient-projection";
import { useCreatePatientMutation, usePatientsQuery } from "@/shared/patients/patient-data";
import { publicEnv } from "@/shared/config/env";
import { PageHeader, PatientAvatar } from "@/shared/ui";

interface ImportNotice {
  color: "green" | "yellow" | "red";
  message: string;
}

function formatVisitDate(value?: string | null): string {
  return value ? dateDMY(value) : "xx/xx/xxxx";
}

function demoPatientFromRow(
  row: ParsedPatientRow,
  index: number,
  currentCount: number,
): DemoPatient {
  const generated = String(800 + currentCount + index).padStart(6, "0");
  return {
    id: `import-${row.legacyRecordNumber ?? generated}-${index}`,
    recordNumber: row.legacyRecordNumber?.padStart(6, "0") ?? generated,
    firstName: row.firstName,
    lastName: row.lastName,
    dni: row.dni ?? "Pendiente",
    phone: row.phone ?? "Pendiente",
    email: row.email ?? "Pendiente",
    source: "Importación CSV",
    nextStep: "Revisar ficha importada",
    balanceCents: 0,
  };
}

export function PatientsPage() {
  const demoMode = publicEnv.NEXT_PUBLIC_DEMO_MODE === "true";
  const [query, setQuery] = useState("");
  const [opened, setOpened] = useState(false);
  const [demoPatients, setDemoPatients] = useState<readonly DemoPatient[]>(DEMO_PATIENTS);
  const [draftName, setDraftName] = useState("");
  const [notice, setNotice] = useState<ImportNotice | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const patientsQuery = usePatientsQuery(!demoMode);
  const createMutation = useCreatePatientMutation();

  const patients = useMemo<readonly PatientCardView[]>(() => {
    if (demoMode) return demoPatients.map(patientCardFromDemo);
    return (patientsQuery.data?.items ?? []).map(patientCardFromApi);
  }, [demoMode, demoPatients, patientsQuery.data]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    if (!normalized) return patients;
    return patients.filter((patient) => {
      const haystack = [
        patient.firstName,
        patient.lastName,
        patient.recordNumber,
        patient.dni ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase("es");
      return haystack.includes(normalized);
    });
  }, [patients, query]);

  const importCsv = async (file: File | null) => {
    if (!file) return;
    setNotice(null);
    const rows = parsePatientCsv(await file.text());
    if (!rows.length) {
      setNotice({ color: "yellow", message: "No se detectaron filas válidas." });
      return;
    }

    if (demoMode) {
      const imported = rows.map((row, index) =>
        demoPatientFromRow(row, index, demoPatients.length),
      );
      setDemoPatients((current) => [...imported, ...current]);
      setNotice({
        color: "green",
        message: `${imported.length} pacientes importados en modo demo.`,
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

    const hasLegacyNumbers = rows.some((row) => Boolean(row.legacyRecordNumber));
    const suffix = hasLegacyNumbers ? " El backend actual asigna un número de ficha nuevo." : "";
    setNotice({
      color: failed ? "yellow" : "green",
      message: `${created} creados; ${failed} rechazados.${suffix}`,
    });
  };

  const createPatient = async () => {
    const value = draftName.trim();
    if (!value) return;
    const [firstName = "Paciente", ...rest] = value.split(/\s+/);
    const lastName = rest.join(" ") || "Nuevo";

    if (demoMode) {
      const nextNumber = String(700 + demoPatients.length).padStart(6, "0");
      const patient: DemoPatient = {
        id: `demo-${nextNumber}`,
        recordNumber: nextNumber,
        firstName,
        lastName,
        dni: "Pendiente",
        phone: "Pendiente",
        email: "Pendiente",
        source: "Nuevo paciente",
        nextStep: "Completar ficha y anamnesis",
        balanceCents: 0,
      };
      setDemoPatients((current) => [patient, ...current]);
    } else {
      await createMutation.mutateAsync({ firstName, lastName });
    }

    setDraftName("");
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

  const syncCarouselIndex = useCallback(() => {
    if (scrollFrameRef.current !== null) return;

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      const viewport = carouselRef.current;
      const closest = getClosestCarouselCard();
      if (!viewport || !closest) return;

      const nextIndex = Number(closest.dataset.carouselIndex ?? 0);
      const copy = Number(closest.dataset.carouselCopy ?? 0);
      setActiveIndex(nextIndex);

      if (filtered.length > 1 && (copy === 0 || copy === 2)) {
        const firstCycle = viewport.querySelector<HTMLElement>('[data-carousel-cycle="0"]');
        const middleCycle = viewport.querySelector<HTMLElement>('[data-carousel-cycle="1"]');
        if (!firstCycle || !middleCycle) return;

        const cycleSpan = middleCycle.offsetTop - firstCycle.offsetTop;
        if (cycleSpan <= 0) return;

        viewport.scrollTop += copy === 0 ? cycleSpan : -cycleSpan;
      }
    });
  }, [filtered.length, getClosestCarouselCard]);

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
    },
    [],
  );

  const carouselCopies = filtered.length > 1 ? [0, 1, 2] : [0];

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
                <Menu.Label>{demoMode ? "Modo demo" : "Pacientes"}</Menu.Label>
                <FileButton
                  onChange={(file) => void importCsv(file)}
                  accept=".csv,.tsv,text/csv,text/tab-separated-values"
                >
                  {(props) => <Menu.Item {...props}>Importar CSV / TSV</Menu.Item>}
                </FileButton>
              </Menu.Dropdown>
            </Menu>
          </Group>
        }
      />

      {patientsQuery.isError && !demoMode ? (
        <Alert color="red" title="Error al cargar pacientes">
          Revisa la conexión con el backend Denty. No se ha usado información demo.
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
              {patientsQuery.isLoading && !demoMode
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
                          animate={{
                            scale: active ? 1 : distance === 1 ? 0.975 : 0.94,
                            opacity: active ? 1 : distance === 1 ? 0.72 : 0.4,
                            x: active ? 0 : Math.min(distance, 2) * 8,
                          }}
                          transition={{ type: "spring", stiffness: 310, damping: 30 }}
                          role="option"
                          aria-selected={active}
                        >
                          <Link
                            className={styles.patientCarouselCardLink}
                            href={`/app/patients/${patient.id}`}
                            aria-label={`Abrir ficha de ${fullName}`}
                            tabIndex={copy === (filtered.length > 1 ? 1 : 0) ? 0 : -1}
                          >
                            <PatientAvatar name={fullName} src={patient.photoUrl} size={56} />
                            <div className={styles.patientCarouselInfo}>
                              <div className={styles.patientCarouselIdentity}>
                                <span className={styles.patientCarouselName}>{fullName}</span>
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
                            </div>
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
            {patientsQuery.isLoading && !demoMode ? "Cargando pacientes…" : "Sin resultados."}
          </Text>
        )}
      </section>

      <Modal opened={opened} onClose={() => setOpened(false)} title="Nuevo paciente">
        <Text size="sm" c="dimmed" mb="md">
          Crea la ficha básica. Los datos clínicos se completan dentro del paciente.
        </Text>
        <TextInput
          label="Nombre completo"
          value={draftName}
          onChange={(event) => setDraftName(event.currentTarget.value)}
        />
        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={() => setOpened(false)}>
            Cancelar
          </Button>
          <Button
            loading={createMutation.isPending && !demoMode}
            onClick={() => void createPatient()}
          >
            Crear paciente
          </Button>
        </Group>
      </Modal>
    </div>
  );
}
