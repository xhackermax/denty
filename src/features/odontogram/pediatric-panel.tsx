"use client";
import { Alert, Badge, Button, Group, Select, Text } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import {
  PEDIATRIC_TOOTH_STATUSES,
  createPediatricEntity,
  dentitionStageForBirthDate,
  teethForDentition,
  type DentalEntity,
  type DentitionStage,
  type PediatricToothStatus,
} from "@/domain";
import styles from "./odontogram.module.css";
interface PediatricPanelProps {
  patientId: string;
  birthDate?: string;
  readOnly: boolean;
  onCommit: (entity: DentalEntity) => void;
}
const STAGE_LABELS: Record<DentitionStage, string> = {
  primary: "Dentición primaria",
  mixed: "Dentición mixta",
  permanent: "Dentición permanente",
};
const STATUS_LABELS: Record<PediatricToothStatus, string> = {
  healthy: "Sano",
  early_caries: "Caries inicial",
  sealant: "Sellador",
  pulpotomy: "Pulpotomía",
  pulpectomy: "Pulpectomía",
  pediatric_crown: "Corona pediátrica",
  exfoliated: "Exfoliado",
  erupting: "En erupción",
  space_maintainer: "Mantenedor de espacio",
};
const PEDIATRIC_DRAFTS = new Map<string, Record<string, PediatricToothStatus>>();
function PediatricTooth({
  tooth,
  status,
  selected,
  disabled,
  onClick,
}: {
  tooth: string;
  status: PediatricToothStatus;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={styles.pediatricToothButton}
      data-status={status}
      data-selected={selected}
      disabled={disabled}
      onClick={onClick}
      title={`${tooth} · ${STATUS_LABELS[status]}`}
    >
      <span>{tooth}</span>
      <svg viewBox="0 0 48 62" aria-hidden="true">
        <path
          className={styles.pediatricCrown}
          d="M8 12 C11 5 37 5 40 12 L37 34 C34 41 14 41 11 34 Z"
        />
        <path
          className={styles.pediatricRoot}
          d="M16 35 C15 47 18 56 23 59 M32 35 C33 47 30 56 25 59"
        />
        {status === "early_caries" ? (
          <circle cx="24" cy="19" r="6" className={styles.pediatricMark} />
        ) : null}
        {status === "sealant" ? <path d="M15 19 H33" className={styles.pediatricMark} /> : null}
        {status === "pulpotomy" ? (
          <path d="M18 25 H30 M24 25 V38" className={styles.pediatricMark} />
        ) : null}
        {status === "pulpectomy" ? (
          <path d="M20 24 V51 M28 24 V51" className={styles.pediatricMark} />
        ) : null}
        {status === "pediatric_crown" ? (
          <path d="M10 13 C15 8 33 8 38 13 L36 31 H12 Z" className={styles.pediatricMark} />
        ) : null}
        {status === "exfoliated" ? (
          <path d="M9 12 L39 42 M39 12 L9 42" className={styles.pediatricMark} />
        ) : null}
        {status === "erupting" ? (
          <path d="M15 48 H33 M19 44 L24 39 L29 44" className={styles.pediatricMark} />
        ) : null}
        {status === "space_maintainer" ? (
          <path d="M8 31 H40 M8 27 V35 M40 27 V35" className={styles.pediatricMark} />
        ) : null}
      </svg>
    </button>
  );
}
export function PediatricPanel({ patientId, birthDate, readOnly, onCommit }: PediatricPanelProps) {
  const stage = useMemo(() => dentitionStageForBirthDate(birthDate), [birthDate]);
  const teeth = useMemo(() => teethForDentition(stage), [stage]);
  const allTeeth = useMemo(() => [...teeth.upper, ...teeth.lower], [teeth]);
  const [selectedTooth, setSelectedTooth] = useState(allTeeth[0] ?? "75");
  const [status, setStatus] = useState<PediatricToothStatus>("healthy");
  const [toothStates, setToothStates] = useState<Record<string, PediatricToothStatus>>({});
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setSelectedTooth(allTeeth[0] ?? "75");
  }, [allTeeth]);
  useEffect(() => {
    setToothStates({ ...(PEDIATRIC_DRAFTS.get(patientId) ?? {}) });
    setSaved(PEDIATRIC_DRAFTS.has(patientId));
  }, [patientId]);
  const apply = (tooth = selectedTooth, nextStatus = status) => {
    if (readOnly) return;
    setToothStates((current) => ({ ...current, [tooth]: nextStatus }));
    onCommit(createPediatricEntity(tooth, nextStatus));
    setSaved(false);
  };
  const save = () => {
    if (readOnly) return;
    PEDIATRIC_DRAFTS.set(patientId, { ...toothStates });
    setSaved(true);
  };
  const renderArch = (arch: readonly string[]) => (
    <div className={styles.pediatricArch}>
      {arch.map((tooth) => (
        <PediatricTooth
          key={tooth}
          tooth={tooth}
          status={toothStates[tooth] ?? "healthy"}
          selected={selectedTooth === tooth}
          disabled={readOnly}
          onClick={() => {
            setSelectedTooth(tooth);
            const current = toothStates[tooth];
            if (current) setStatus(current);
          }}
        />
      ))}
    </div>
  );
  return (
    <section className={styles.clinicalPanel} aria-label="Odontograma pediátrico">
      <Group justify="space-between" align="flex-start">
        <div>
          <Text fw={850}>Odontograma pediátrico</Text>
          <Text size="xs" c="dimmed">
            Dentición seleccionada automáticamente a partir de la fecha de nacimiento.
          </Text>
        </div>
        <Group gap="xs">
          <Badge>{STAGE_LABELS[stage]}</Badge>
          {saved ? <Badge variant="light">Guardado</Badge> : null}
        </Group>
      </Group>

      {!birthDate ? (
        <Alert color="yellow" mt="md" title="Falta fecha de nacimiento">
          Sin fecha de nacimiento Denty usa dentición permanente. Añade la fecha a la ficha para
          activar automáticamente primaria o mixta.
        </Alert>
      ) : (
        <Text size="xs" c="dimmed" mt="sm">
          Fecha de nacimiento:
          {birthDate.slice(0, 10)}
        </Text>
      )}

      <Group mt="md" align="flex-end">
        <Select
          label="Diente seleccionado"
          value={selectedTooth}
          onChange={(value) => setSelectedTooth(value ?? allTeeth[0] ?? "75")}
          data={allTeeth}
          disabled={readOnly}
        />
        <Select
          label="Hallazgo / tratamiento"
          value={status}
          onChange={(value) => setStatus((value ?? "healthy") as PediatricToothStatus)}
          data={PEDIATRIC_TOOTH_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }))}
          disabled={readOnly}
        />
        <Button size="xs" disabled={readOnly} onClick={() => apply()}>
          Aplicar al {selectedTooth}
        </Button>
        <Button size="xs" variant="light" disabled={readOnly} onClick={save}>
          Guardar
        </Button>
      </Group>

      <div className={styles.pediatricLegend}>
        {PEDIATRIC_TOOTH_STATUSES.map((value) => (
          <span key={value} data-status={value}>
            {STATUS_LABELS[value]}
          </span>
        ))}
      </div>

      <Text fw={800} size="sm" mt="md">
        Maxilar
      </Text>
      {renderArch(teeth.upper)}
      <div className={styles.orthoOcclusalLine}>Plano oclusal</div>
      <Text size="xs" c="dimmed">
        Raíces fantasma visibles en dientes removibles y temporales.
      </Text>
      {renderArch(teeth.lower)}
      <Text fw={800} size="sm">
        Mandíbula
      </Text>
    </section>
  );
}
