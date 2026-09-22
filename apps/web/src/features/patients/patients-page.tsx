"use client";

import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  FileButton,
  Group,
  Modal,
  Text,
  TextInput,
} from "@mantine/core";
import {
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
  IconSearch,
} from "@tabler/icons-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { dateDMY } from "@/domain/dates";
import { formatEUR } from "@/domain/money";
import { DEMO_PATIENTS, type DemoPatient } from "@/shared/demo/demo-data";
import styles from "@/shared/ui/parity.module.css";
import {
  createPatientPayload,
  parsePatientCsv,
  type ParsedPatientRow,
} from "./patient-import";
import {
  patientCardFromApi,
  patientCardFromDemo,
  type PatientCardView,
} from "./patient-projection";
import {
  useCreatePatientMutation,
  usePatientsQuery,
} from "@/shared/patients/patient-data";
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
  const [demoPatients, setDemoPatients] =
    useState<readonly DemoPatient[]>(DEMO_PATIENTS);
  const [draftName, setDraftName] = useState("");
  const [notice, setNotice] = useState<ImportNotice | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
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
    const suffix = hasLegacyNumbers
      ? " El backend actual asigna un número de ficha nuevo."
      : "";
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
        source: "Alta rápida",
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

  const safeActiveIndex = filtered.length
    ? Math.min(activeIndex, filtered.length - 1)
    : 0;

  const goToCard = (index: number) => {
    const next = Math.max(0, Math.min(index, filtered.length - 1));
    const card = carouselRef.current?.querySelector<HTMLElement>(
      `[data-carousel-index="${next}"]`,
    );
    card?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    setActiveIndex(next);
  };

  const moveCarousel = (direction: -1 | 1) => goToCard(safeActiveIndex + direction);

  const syncCarouselIndex = () => {
    const viewport = carouselRef.current;
    if (!viewport) return;
    const viewportCenter = viewport.getBoundingClientRect().left + viewport.clientWidth / 2;
    const cards = Array.from(viewport.querySelectorAll<HTMLElement>("[data-carousel-index]"));
    if (!cards.length) return;
    let closest = 0;
    let distance = Number.POSITIVE_INFINITY;
    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      const cardDistance = Math.abs(rect.left + rect.width / 2 - viewportCenter);
      if (cardDistance < distance) {
        distance = cardDistance;
        closest = Number(card.dataset.carouselIndex ?? 0);
      }
    }
    setActiveIndex(closest);
  };

  return (
    <div className={styles.grid}>
      <PageHeader
        eyebrow="Pacientes"
        title="Fichas clínicas"
        description="Vista común para usuarios y administradores, con búsqueda rápida."
        actions={
          <Group>
            <Badge variant="light">{demoMode ? "Demo" : "Servidor"}</Badge>
            <FileButton
              onChange={(file) => void importCsv(file)}
              accept=".csv,.tsv,text/csv,text/tab-separated-values"
            >
              {(props) => (
                <Button {...props} variant="light">
                  Importar CSV/TSV
                </Button>
              )}
            </FileButton>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => setOpened(true)}
            >
              Nuevo paciente
            </Button>
          </Group>
        }
      />

      {patientsQuery.isError && !demoMode ? (
        <Alert color="red" title="No se pudieron cargar los pacientes">
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
                  }`}
            </p>
          </div>
          <div className={styles.carouselControls}>
            <ActionIcon
              variant="default"
              size="lg"
              aria-label="Ver pacientes anteriores"
              disabled={safeActiveIndex === 0}
              onClick={() => moveCarousel(-1)}
            >
              <IconChevronLeft size={18} />
            </ActionIcon>
            <span className={styles.carouselCounter}>
              {filtered.length ? `${safeActiveIndex + 1} / ${filtered.length}` : "0 / 0"}
            </span>
            <ActionIcon
              variant="default"
              size="lg"
              aria-label="Ver pacientes siguientes"
              disabled={safeActiveIndex >= filtered.length - 1}
              onClick={() => moveCarousel(1)}
            >
              <IconChevronRight size={18} />
            </ActionIcon>
          </div>
        </div>

        {filtered.length ? (
          <>
          <div
            className={styles.patientCarouselViewport}
            ref={carouselRef}
            onScroll={syncCarouselIndex}
          >
            {filtered.map((patient, index) => {
              const fullName = `${patient.firstName} ${patient.lastName}`;
              return (
                <motion.article
                  className={styles.patientCarouselCard}
                  key={patient.id}
                  data-carousel-index={index}
                  data-active={safeActiveIndex === index}
                  animate={{
                    scale: safeActiveIndex === index ? 1 : 0.965,
                    opacity: safeActiveIndex === index ? 1 : 0.82,
                    y: safeActiveIndex === index ? 0 : 3,
                  }}
                  transition={{ type: "spring", stiffness: 280, damping: 28 }}
                >
                  <Link
                    className={styles.patientCarouselCardLink}
                    href={`/app/patients/${patient.id}`}
                    aria-label={`Abrir ficha de ${fullName}`}
                  >
                    <PatientAvatar
                      name={fullName}
                      src={patient.photoUrl}
                      size={76}
                    />
                    <div className={styles.patientCarouselInfo}>
                      <div>
                        <span className={styles.patientCarouselName}>{fullName}</span>
                        <span className={styles.patientCarouselRecord}>
                          Ficha {patient.recordNumber}
                        </span>
                      </div>
                      <dl className={styles.patientVisitGrid}>
                        <div className={styles.patientVisitCell}>
                          <dt>Última visita</dt>
                          <dd>{formatVisitDate(patient.lastVisitAt)}</dd>
                        </div>
                        <div className={styles.patientVisitCell}>
                          <dt>Próxima visita</dt>
                          <dd data-empty={patient.nextVisitAt ? undefined : "true"}>
                            {formatVisitDate(patient.nextVisitAt)}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </Link>
                  <div className={styles.patientCarouselFooter}>
                    {patient.balanceCents === undefined ? null : patient.balanceCents > 0 ? (
                      <Badge color="yellow">
                        Pendiente {formatEUR(patient.balanceCents)}
                      </Badge>
                    ) : (
                      <Badge color="green">Al día</Badge>
                    )}
                    <Button
                      component={Link}
                      href={`/app/patients/${patient.id}`}
                      size="xs"
                    >
                      Abrir ficha
                    </Button>
                  </div>
                </motion.article>
              );
            })}
          </div>
          <div className={styles.carouselDots} aria-label="Posición del carrusel">
            {filtered.map((patient, index) => (
              <button
                key={patient.id}
                type="button"
                className={styles.carouselDot}
                data-active={safeActiveIndex === index}
                aria-label={`Ir a ${patient.firstName} ${patient.lastName}`}
                aria-current={safeActiveIndex === index ? "true" : undefined}
                onClick={() => goToCard(index)}
              />
            ))}
          </div>
          </>
        ) : (
          <Text c="dimmed" size="sm">
            {patientsQuery.isLoading && !demoMode
              ? "Cargando pacientes…"
              : "No hay pacientes que coincidan con la búsqueda."}
          </Text>
        )}
      </section>

      <Modal opened={opened} onClose={() => setOpened(false)} title="Alta rápida">
        <Text size="sm" c="dimmed" mb="md">
          Crea la ficha básica. Los datos clínicos se completan dentro del paciente.
        </Text>
        <TextInput
          label="Nombre y apellidos"
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
