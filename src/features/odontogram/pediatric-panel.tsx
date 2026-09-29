"use client";

import { Alert, Badge, Button, Group, SegmentedControl, Select, Text } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import {
  MIXED_DENTITION_SITES,
  PEDIATRIC_TOOTH_STATUSES,
  TEMPORARY_LOWER,
  TEMPORARY_UPPER,
  createPediatricEntity,
  defaultMixedPresence,
  dentitionStageForBirthDate,
  standardTooth,
  type DentalEntity,
  type DentitionStage,
  type PediatricToothStatus,
} from "@/domain";
import styles from "./odontogram.module.css";

interface PediatricPanelProps {
  patientId: string;
  birthDate?: string;
  readOnly: boolean;
  initialEntities?: readonly DentalEntity[];
  onCommit: (entity: DentalEntity) => void;
}

const STAGE_LABELS: Record<DentitionStage, string> = {
  primary: "Dentición temporal",
  mixed: "Dentición mixta dinámica",
  permanent: "Dentición permanente",
};

const STATUS_LABELS: Record<PediatricToothStatus, string> = {
  healthy: "Sano / presente",
  unerupted: "No erupcionado",
  retained: "Temporal retenido",
  impacted: "Incluido / impactado",
  congenitally_missing: "Agenesia / ausente",
  early_caries: "Caries inicial",
  sealant: "Sellador",
  pulpotomy: "Pulpotomía",
  pulpectomy: "Pulpectomía",
  pediatric_crown: "Corona pediátrica",
  exfoliated: "Exfoliado",
  erupting: "En erupción",
  space_maintainer: "Mantenedor de espacio",
};

const CROWN_PATHS = {
  central_incisor: "M12 14 C17 6 31 6 36 14 L34 35 C31 41 17 41 14 35 Z",
  lateral_incisor: "M14 15 C18 8 30 8 34 15 L32 35 C29 40 19 40 16 35 Z",
  canine: "M12 21 Q17 10 24 7 Q31 10 36 21 L33 37 Q24 45 15 37 Z",
  first_premolar: "M9 20 Q13 10 20 13 Q24 7 28 13 Q35 10 39 20 L36 38 Q24 45 12 38 Z",
  second_premolar: "M9 20 Q13 9 20 12 Q24 7 29 12 Q36 9 40 20 L37 38 Q24 45 12 38 Z",
  first_molar: "M6 21 Q9 9 18 13 Q24 5 30 13 Q39 9 42 21 L39 39 Q33 45 24 42 Q15 45 9 39 Z",
  second_molar: "M7 21 Q10 10 18 13 Q24 6 30 13 Q38 10 41 21 L38 39 Q31 44 24 42 Q16 44 10 39 Z",
  third_molar: "M8 21 Q11 11 18 14 Q24 7 29 14 Q37 11 40 21 L37 38 Q31 43 24 41 Q17 43 11 38 Z",
  primary_first_molar:
    "M8 21 Q12 11 18 13 Q24 7 30 13 Q36 11 40 21 L37 37 Q31 42 24 40 Q17 42 11 37 Z",
  primary_second_molar:
    "M6 21 Q9 10 17 13 Q24 6 31 13 Q39 10 42 21 L39 38 Q32 44 24 41 Q16 44 9 38 Z",
} as const;

const ROOT_PATHS = {
  central_incisor: "M18 36 C18 48 20 58 24 64 C28 58 30 48 30 36",
  lateral_incisor: "M19 36 C19 49 21 59 24 65 C27 59 29 49 29 36",
  canine: "M18 36 C19 52 21 63 24 68 C28 62 30 51 30 36",
  first_premolar:
    "M17 36 C17 49 15 59 18 65 C22 60 23 49 23 38 M26 38 C27 50 28 60 32 65 C35 57 33 47 33 36",
  second_premolar: "M18 36 C18 50 20 61 24 66 C28 60 30 49 30 36",
  first_molar:
    "M13 36 C13 49 10 59 14 65 C19 61 21 49 21 38 M28 38 C29 51 31 62 36 65 C39 57 36 47 36 36",
  second_molar:
    "M14 36 C14 49 11 59 15 65 C20 60 21 49 22 38 M28 38 C29 50 31 61 35 65 C38 57 36 47 35 36",
  third_molar: "M17 36 C17 50 20 61 24 65 C28 59 30 49 30 36",
  primary_first_molar:
    "M12 36 C10 49 9 60 13 66 C18 59 20 48 21 38 M27 38 C28 49 30 60 35 66 C39 57 37 47 36 36",
  primary_second_molar:
    "M11 36 C8 49 8 61 12 67 C18 60 20 48 21 38 M27 38 C29 50 31 62 37 67 C40 57 38 46 37 36",
} as const;

function isVisiblyPresent(status: PediatricToothStatus | undefined, fallback: boolean) {
  if (!status) return fallback;
  return !["unerupted", "exfoliated", "congenitally_missing"].includes(status);
}

function PediatricTooth({
  tooth,
  status,
  present,
  selected,
  disabled,
  onClick,
  onTogglePresence,
}: {
  tooth: string;
  status: PediatricToothStatus;
  present: boolean;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
  onTogglePresence: () => void;
}) {
  const definition = standardTooth(tooth);
  return (
    <div
      className={styles.pediatricToothSlot}
      data-present={present}
      data-dentition={definition.dentition}
    >
      <button
        type="button"
        className={styles.pediatricToothButton}
        data-status={status}
        data-selected={selected}
        data-present={present}
        disabled={disabled}
        onClick={onClick}
        title={`${tooth} · ${definition.dentition === "primary" ? "temporal" : "permanente"} · ${STATUS_LABELS[status]}`}
      >
        <span>{tooth}</span>
        <svg viewBox="0 0 48 70" aria-hidden="true">
          <path className={styles.pediatricRoot} d={ROOT_PATHS[definition.type]} />
          <path className={styles.pediatricCrown} d={CROWN_PATHS[definition.type]} />
          {status === "early_caries" ? (
            <circle cx="24" cy="20" r="6" className={styles.pediatricMark} />
          ) : null}
          {status === "sealant" ? <path d="M15 20 H33" className={styles.pediatricMark} /> : null}
          {status === "pulpotomy" ? (
            <path d="M18 26 H30 M24 26 V39" className={styles.pediatricMark} />
          ) : null}
          {status === "pulpectomy" ? (
            <path d="M20 25 V56 M28 25 V56" className={styles.pediatricMark} />
          ) : null}
          {status === "pediatric_crown" ? (
            <path d="M10 14 C15 9 33 9 38 14 L36 32 H12 Z" className={styles.pediatricMark} />
          ) : null}
          {status === "exfoliated" || status === "congenitally_missing" ? (
            <path d="M9 12 L39 43 M39 12 L9 43" className={styles.pediatricMark} />
          ) : null}
          {status === "erupting" ? (
            <path d="M15 57 H33 M19 53 L24 48 L29 53" className={styles.pediatricMark} />
          ) : null}
          {status === "space_maintainer" ? (
            <path d="M8 32 H40 M8 28 V36 M40 28 V36" className={styles.pediatricMark} />
          ) : null}
          {status === "impacted" ? (
            <path d="M11 55 Q24 45 37 55" className={styles.pediatricMark} />
          ) : null}
          {status === "retained" ? (
            <circle cx="24" cy="53" r="5" className={styles.pediatricMark} />
          ) : null}
        </svg>
      </button>
      <button
        type="button"
        className={styles.pediatricPresenceToggle}
        disabled={disabled}
        onClick={onTogglePresence}
        aria-label={`${present ? "Marcar no presente" : "Marcar presente"} ${tooth}`}
        title={present ? "Marcar como no presente" : "Marcar como presente"}
      >
        {present ? "✓" : "+"}
      </button>
    </div>
  );
}

const NO_ENTITIES: readonly DentalEntity[] = [];

export function PediatricPanel({
  patientId,
  birthDate,
  readOnly,
  initialEntities = NO_ENTITIES,
  onCommit,
}: PediatricPanelProps) {
  const suggestedStage = useMemo(() => dentitionStageForBirthDate(birthDate), [birthDate]);
  const suggestedPediatricStage: Extract<DentitionStage, "primary" | "mixed"> =
    !birthDate || suggestedStage === "primary" ? "primary" : "mixed";
  const [stage, setStage] =
    useState<Extract<DentitionStage, "primary" | "mixed">>(suggestedPediatricStage);
  const persistedStates = useMemo(() => {
    const result: Record<string, PediatricToothStatus> = {};
    for (const entity of initialEntities) {
      if (!entity.active || entity.entityType !== "PEDIATRIC" || !entity.tooth) continue;
      if ((PEDIATRIC_TOOTH_STATUSES as readonly string[]).includes(entity.status)) {
        result[entity.tooth] = entity.status as PediatricToothStatus;
      }
    }
    return result;
  }, [initialEntities]);
  const persistedSignature = JSON.stringify(persistedStates);
  const [toothStates, setToothStates] =
    useState<Record<string, PediatricToothStatus>>(persistedStates);
  const [selectedTooth, setSelectedTooth] = useState("55");
  const [status, setStatus] = useState<PediatricToothStatus>("healthy");
  const [saved, setSaved] = useState(false);
  const mixedDefault = useMemo(() => defaultMixedPresence(), []);

  const primaryTeeth = useMemo(() => [...TEMPORARY_UPPER, ...TEMPORARY_LOWER], []);
  const mixedTeeth = useMemo(
    () =>
      [...MIXED_DENTITION_SITES.upper, ...MIXED_DENTITION_SITES.lower].flatMap((site) =>
        site.primaryFdi ? [site.permanentFdi, site.primaryFdi] : [site.permanentFdi],
      ),
    [],
  );
  const allTeeth = stage === "primary" ? primaryTeeth : mixedTeeth;

  useEffect(() => setStage(suggestedPediatricStage), [suggestedPediatricStage]);
  useEffect(() => {
    setToothStates(persistedStates);
    setSaved(Object.keys(persistedStates).length > 0);
  }, [patientId, persistedSignature]);
  useEffect(() => {
    if (!allTeeth.includes(selectedTooth)) setSelectedTooth(allTeeth[0] ?? "55");
  }, [allTeeth, selectedTooth]);

  const fallbackPresence = (tooth: string) =>
    stage === "primary" ? true : mixedDefault.has(tooth);
  const presentFor = (tooth: string) =>
    isVisiblyPresent(toothStates[tooth], fallbackPresence(tooth));

  const commitStatus = (tooth: string, nextStatus: PediatricToothStatus) => {
    if (readOnly) return;
    setToothStates((current) => ({ ...current, [tooth]: nextStatus }));
    onCommit(createPediatricEntity(tooth, nextStatus));
    setSaved(false);
  };

  const togglePresence = (tooth: string) => {
    const definition = standardTooth(tooth);
    const present = presentFor(tooth);
    const next: PediatricToothStatus = present
      ? definition.dentition === "primary"
        ? "exfoliated"
        : "unerupted"
      : definition.dentition === "primary" && stage === "mixed"
        ? "retained"
        : "healthy";
    commitStatus(tooth, next);
  };

  const renderTooth = (tooth: string) => (
    <PediatricTooth
      key={tooth}
      tooth={tooth}
      status={toothStates[tooth] ?? "healthy"}
      present={presentFor(tooth)}
      selected={selectedTooth === tooth}
      disabled={readOnly}
      onClick={() => {
        setSelectedTooth(tooth);
        setStatus(toothStates[tooth] ?? "healthy");
      }}
      onTogglePresence={() => togglePresence(tooth)}
    />
  );

  const renderMixedArch = (arch: "upper" | "lower") => (
    <div className={styles.pediatricMixedArch} data-arch={arch}>
      {MIXED_DENTITION_SITES[arch].map((site) => (
        <div
          className={styles.pediatricReplacementSite}
          key={site.siteId}
          data-replacement={site.replacementSite}
        >
          {renderTooth(site.permanentFdi)}
          {site.primaryFdi ? renderTooth(site.primaryFdi) : null}
        </div>
      ))}
    </div>
  );

  return (
    <section className={styles.clinicalPanel} aria-label="Odontograma pediátrico">
      <Group justify="space-between" align="flex-start">
        <div>
          <Text fw={850}>Odontograma pediátrico</Text>
          <Text size="xs" c="dimmed">
            La edad solo sugiere el modo. La presencia real se confirma pieza por pieza.
          </Text>
        </div>
        <Group gap="xs">
          <Badge>{STAGE_LABELS[stage]}</Badge>
          {saved ? <Badge variant="light">Datos recuperados</Badge> : null}
        </Group>
      </Group>

      {!birthDate ? (
        <Alert color="yellow" mt="md" title="Falta fecha de nacimiento">
          Sin fecha de nacimiento Denty inicia en temporal. El profesional puede cambiar a mixta y
          definir cada pieza.
        </Alert>
      ) : null}

      <Group mt="md" align="flex-end">
        <SegmentedControl
          aria-label="Dentición pediátrica"
          value={stage}
          onChange={(value) => setStage(value as Extract<DentitionStage, "primary" | "mixed">)}
          data={[
            { label: "Temporal", value: "primary" },
            { label: "Mixta", value: "mixed" },
          ]}
          disabled={readOnly}
        />
        <Select
          label="Diente seleccionado"
          value={selectedTooth}
          onChange={(value) => setSelectedTooth(value ?? allTeeth[0] ?? "55")}
          data={allTeeth}
          disabled={readOnly}
          searchable
        />
        <Select
          label="Hallazgo / estado"
          value={status}
          onChange={(value) => setStatus((value ?? "healthy") as PediatricToothStatus)}
          data={PEDIATRIC_TOOTH_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }))}
          disabled={readOnly}
        />
        <Button size="xs" disabled={readOnly} onClick={() => commitStatus(selectedTooth, status)}>
          Aplicar al {selectedTooth}
        </Button>
      </Group>

      {stage === "mixed" ? (
        <Alert mt="md" color="blue" title="Dentición mixta dinámica">
          Cada sitio de recambio muestra el temporal y su sucesor permanente. Pueden coexistir,
          estar en erupción o marcarse como no presentes sin cambiar toda la arcada.
        </Alert>
      ) : null}

      <Text fw={800} size="sm" mt="md">
        Maxilar
      </Text>
      <Text size="xs" c="dimmed" ta="center">
        Derecha del paciente · línea media · Izquierda del paciente
      </Text>
      {stage === "primary" ? (
        <div className={styles.pediatricArch}>{TEMPORARY_UPPER.map(renderTooth)}</div>
      ) : (
        renderMixedArch("upper")
      )}
      <div className={styles.orthoOcclusalLine}>Plano oclusal</div>
      {stage === "primary" ? (
        <div className={styles.pediatricArch}>{TEMPORARY_LOWER.map(renderTooth)}</div>
      ) : (
        renderMixedArch("lower")
      )}
      <Text fw={800} size="sm">
        Mandíbula
      </Text>
      <Text size="xs" c="dimmed" mt="sm">
        ✓ = pieza clínicamente presente. + = pieza no presente/no erupcionada; pulsa para
        incorporarla. La morfología cambia según incisivo, canino, premolar o molar y según
        temporal/permanente.
      </Text>
    </section>
  );
}
