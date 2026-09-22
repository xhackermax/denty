"use client";

import { Badge, Button, Group, Select, Text } from "@mantine/core";
import { useMemo, useState } from "react";

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
  birthDate?: string;
  readOnly: boolean;
  onCommit: (entity: DentalEntity) => void;
}

const STAGE_LABELS: Record<DentitionStage, string> = {
  primary: "Denticion primaria",
  mixed: "Denticion mixta",
  permanent: "Denticion permanente",
};

const DEMO_TODAY = "2026-09-22T12:00:00.000Z";

export function PediatricPanel({ birthDate, readOnly, onCommit }: PediatricPanelProps) {
  const suggestedStage = dentitionStageForBirthDate(birthDate, DEMO_TODAY);
  const [stage, setStage] = useState<DentitionStage>(suggestedStage);
  const [selectedTooth, setSelectedTooth] = useState("75");
  const [status, setStatus] = useState<PediatricToothStatus>("erupting");
  const teeth = useMemo(() => teethForDentition(stage), [stage]);
  const allTeeth = [...teeth.upper, ...teeth.lower];

  return (
    <section className={styles.clinicalPanel} aria-label="Odontograma pediatrico">
      <Group justify="space-between">
        <div>
          <Text fw={850}>Odontograma pediatrico</Text>
          <Text size="xs" c="dimmed">
            Seleccion automatica por edad con ajuste manual para pruebas.
          </Text>
        </div>
        <Badge>{STAGE_LABELS[stage]}</Badge>
      </Group>
      <Group mt="md" align="flex-end">
        <Select
          label="Denticion"
          value={stage}
          onChange={(value) => setStage((value ?? suggestedStage) as DentitionStage)}
          data={[
            { value: "primary", label: "Denticion primaria" },
            { value: "mixed", label: "Denticion mixta" },
            { value: "permanent", label: "Denticion permanente" },
          ]}
          disabled={readOnly}
        />
        <Select
          label="Diente"
          value={selectedTooth}
          onChange={(value) => setSelectedTooth(value ?? allTeeth[0] ?? "75")}
          data={allTeeth}
          disabled={readOnly}
        />
        <Select
          label="Estado pediatrico"
          value={status}
          onChange={(value) => setStatus((value ?? "erupting") as PediatricToothStatus)}
          data={PEDIATRIC_TOOTH_STATUSES.map((value) => ({ value, label: value }))}
          disabled={readOnly}
        />
        <Button
          size="xs"
          disabled={readOnly}
          onClick={() => onCommit(createPediatricEntity(selectedTooth, status))}
        >
          Aplicar
        </Button>
      </Group>
      <div className={styles.pediatricToothGrid}>
        {allTeeth.map((tooth) => (
          <span className={styles.pediatricTooth} key={tooth}>{tooth}</span>
        ))}
      </div>
      <Text className={styles.ghostRoot} size="xs">Raices fantasma</Text>
    </section>
  );
}
